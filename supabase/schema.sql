-- Supabase SQL Editor 에 붙여넣고 한 번 실행하세요.

create table if not exists public.categories (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  id         text not null,
  name       text not null,
  color      text not null,
  position   double precision not null default 0,
  deleted    boolean not null default false,
  updated_at timestamptz not null,
  synced_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.todos (
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  id          text not null,
  title       text not null,
  date        date not null,
  category_id text not null,
  done        boolean not null default false,
  position    double precision not null default 0,
  deleted     boolean not null default false,
  updated_at  timestamptz not null,
  synced_at   timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists todos_synced_idx on public.todos (user_id, synced_at);
create index if not exists categories_synced_idx on public.categories (user_id, synced_at);

-- 서버 시각으로 synced_at 을 찍어서 기기들이 "마지막으로 받은 시점 이후" 변경만 가져가게 함
create or replace function public.touch_synced_at() returns trigger language plpgsql as $$
begin
  new.synced_at := clock_timestamp();
  return new;
end $$;

drop trigger if exists todos_touch on public.todos;
create trigger todos_touch before insert or update on public.todos
  for each row execute function public.touch_synced_at();
drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before insert or update on public.categories
  for each row execute function public.touch_synced_at();

-- 본인 데이터만 읽고 쓸 수 있게
alter table public.todos enable row level security;
alter table public.categories enable row level security;

drop policy if exists "own todos" on public.todos;
create policy "own todos" on public.todos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own categories" on public.categories;
create policy "own categories" on public.categories for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 다른 기기의 변경을 실시간으로 받기
do $$ begin
  alter publication supabase_realtime add table public.todos, public.categories;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- 뽀모도로 / 공개 범위
-- ============================================================
alter table public.categories add column if not exists private boolean not null default false;
alter table public.todos add column if not exists pomodoros integer not null default 0;
alter table public.todos add column if not exists focus_seconds integer not null default 0;
alter table public.todos add column if not exists time text check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- 공개 범위: followers(팔로워 공개) / private(나만 보기) / selected(일부 공개: allowed_ids 의 팔로워만)
alter table public.categories add column if not exists visibility text not null default 'followers'
  check (visibility in ('followers', 'private', 'selected'));
alter table public.categories add column if not exists allowed_ids uuid[] not null default '{}';
update public.categories set visibility = 'private' where private and visibility = 'followers';

-- ============================================================
-- 프로필 / 팔로우
-- ============================================================
create table if not exists public.profiles (
  id         uuid primary key default auth.uid() references auth.users on delete cascade,
  username   text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  name       text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null default auth.uid() references public.profiles on delete cascade,
  followee_id uuid not null references public.profiles on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);

-- 팔로우는 승인제: 요청은 accepted=false 로 들어가고, 상대가 수락해야 내용을 볼 수 있음
-- (이 줄이 처음 실행될 때 이미 있던 팔로우는 수락된 것으로 둠)
alter table public.follows add column if not exists accepted boolean not null default true;
alter table public.follows alter column accepted set default false;

alter table public.profiles enable row level security;
alter table public.follows enable row level security;

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 수락된 팔로우는 누구나, 대기 중인 요청은 당사자 둘만 볼 수 있음
drop policy if exists "follows readable" on public.follows;
create policy "follows readable" on public.follows for select to authenticated
  using (accepted or follower_id = auth.uid() or followee_id = auth.uid());
-- 요청은 내 이름으로, 수락되지 않은 상태로만 보낼 수 있음
drop policy if exists "follow" on public.follows;
create policy "follow" on public.follows for insert to authenticated
  with check (follower_id = auth.uid() and not accepted);
-- 수락은 요청받은 사람만, 바꿀 수 있는 칸은 accepted 하나뿐
drop policy if exists "accept follow" on public.follows;
create policy "accept follow" on public.follows for update to authenticated
  using (followee_id = auth.uid()) with check (followee_id = auth.uid());
revoke update on public.follows from authenticated, anon;
grant update (accepted) on public.follows to authenticated;
-- 언팔로우·요청 취소는 보낸 사람이, 거절·팔로워 삭제는 받은 사람이
drop policy if exists "unfollow" on public.follows;
create policy "unfollow" on public.follows for delete to authenticated
  using (follower_id = auth.uid() or followee_id = auth.uid());

create or replace function public.is_following(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from follows where follower_id = auth.uid() and followee_id = target and accepted)
$$;

-- 지금 로그인한 사람이 이 카테고리를 볼 수 있는지 (팔로우 여부는 정책에서 따로 확인)
create or replace function public.category_visible(owner uuid, cat text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from categories
    where user_id = owner and id = cat and not deleted
      and (visibility = 'followers' or (visibility = 'selected' and auth.uid() = any (allowed_ids)))
  )
$$;

-- 팔로워는 공개 범위가 허락하는 카테고리와 그 안의 할 일을 볼 수 있음
drop policy if exists "followers read categories" on public.categories;
create policy "followers read categories" on public.categories for select to authenticated
  using (
    not deleted and public.is_following(user_id)
    and (visibility = 'followers' or (visibility = 'selected' and auth.uid() = any (allowed_ids)))
  );
drop policy if exists "followers read todos" on public.todos;
create policy "followers read todos" on public.todos for select to authenticated
  using (not deleted and public.is_following(user_id) and public.category_visible(user_id, category_id));
drop function if exists public.category_public(uuid, text);

-- ============================================================
-- 감정표현 (완료한 일에 팔로워가 남김, 한 사람당 할 일 하나에 하나)
-- ============================================================
create table if not exists public.reactions (
  owner_id   uuid not null,
  todo_id    text not null,
  user_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  emoji      text not null check (emoji in ('❤️', '👍', '🎉', '👏', '🔥', '😂', '😢')),
  created_at timestamptz not null default now(),
  primary key (owner_id, todo_id, user_id),
  foreign key (owner_id, todo_id) references public.todos (user_id, id) on delete cascade
);

alter table public.reactions enable row level security;

drop policy if exists "reactions readable" on public.reactions;
create policy "reactions readable" on public.reactions for select to authenticated
  using (owner_id = auth.uid() or user_id = auth.uid() or public.is_following(owner_id));
drop policy if exists "react" on public.reactions;
create policy "react" on public.reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_following(owner_id)
    and exists (select 1 from public.todos t where t.user_id = owner_id and t.id = todo_id and t.done and not t.deleted)
  );
drop policy if exists "change reaction" on public.reactions;
create policy "change reaction" on public.reactions for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.is_following(owner_id)
    and exists (select 1 from public.todos t where t.user_id = owner_id and t.id = todo_id and t.done and not t.deleted)
  );
drop policy if exists "remove reaction" on public.reactions;
create policy "remove reaction" on public.reactions for delete to authenticated using (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.reactions;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- 반복 할 일 / 뽀모도로 기록
-- ============================================================
create table if not exists public.routines (
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  id          text not null,
  title       text not null,
  category_id text not null,
  time        text check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  days        smallint[] not null,          -- 반복하는 요일, 0 = 일요일
  start_date  date not null,
  deleted     boolean not null default false,
  updated_at  timestamptz not null,
  synced_at   timestamptz not null default now(),
  primary key (user_id, id)
);

-- 뽀모도로 집중 한 번이 끝날 때마다 한 줄 (요일·시간대별 집중 패턴용)
create table if not exists public.sessions (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  id         text not null,
  started_at timestamptz not null,
  seconds    integer not null check (seconds > 0),
  todo_id    text,
  deleted    boolean not null default false,
  updated_at timestamptz not null,
  synced_at  timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.todos add column if not exists routine_id text;

create index if not exists routines_synced_idx on public.routines (user_id, synced_at);
create index if not exists sessions_synced_idx on public.sessions (user_id, synced_at);

drop trigger if exists routines_touch on public.routines;
create trigger routines_touch before insert or update on public.routines
  for each row execute function public.touch_synced_at();
drop trigger if exists sessions_touch on public.sessions;
create trigger sessions_touch before insert or update on public.sessions
  for each row execute function public.touch_synced_at();

-- 본인만 읽고 쓸 수 있음 (팔로워에게는 보이지 않음)
alter table public.routines enable row level security;
alter table public.sessions enable row level security;
drop policy if exists "own routines" on public.routines;
create policy "own routines" on public.routines for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.routines;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.sessions;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- 템플릿 (루틴·할 일 묶음을 링크나 공개 목록으로 공유)
-- ============================================================
create table if not exists public.templates (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references public.profiles on delete cascade,
  title       text not null check (char_length(title) between 1 and 60),
  description text not null default '' check (char_length(description) <= 500),
  color       text not null default '#5e6ad2' check (color ~ '^#[0-9a-fA-F]{6}$'),
  -- [{ "title": "...", "time": "07:00" | null, "days": [1,2,3] }], days 가 비어 있으면 한 번만 하는 일
  items       jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  listed      boolean not null default true,  -- true: 템플릿 목록에 공개, false: 링크를 아는 사람만
  uses        integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists templates_listed_idx on public.templates (listed, uses desc);

alter table public.templates enable row level security;

-- 링크를 아는 사람은 로그인하지 않아도 볼 수 있음 (id 는 추측할 수 없는 uuid)
drop policy if exists "templates readable" on public.templates;
create policy "templates readable" on public.templates for select to anon, authenticated using (true);
drop policy if exists "own templates insert" on public.templates;
create policy "own templates insert" on public.templates for insert to authenticated
  with check (owner_id = auth.uid() and uses = 0);
drop policy if exists "own templates update" on public.templates;
create policy "own templates update" on public.templates for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "own templates delete" on public.templates;
create policy "own templates delete" on public.templates for delete to authenticated using (owner_id = auth.uid());
grant select on public.templates to anon, authenticated;
grant insert, delete on public.templates to authenticated;
revoke update on public.templates from authenticated, anon;
grant update (title, description, color, items, listed) on public.templates to authenticated;

-- 누가 템플릿을 가져가면 사용 횟수 +1 (본인 것은 세지 않음)
create or replace function public.use_template(tid uuid) returns void
language sql security definer set search_path = public as $$
  update templates set uses = uses + 1 where id = tid and owner_id <> auth.uid()
$$;
revoke execute on function public.use_template(uuid) from public, anon;
grant execute on function public.use_template(uuid) to authenticated;

-- ============================================================
-- 시간표 (대학생용): 수업 하나가 한 줄, 학기 기간 동안 매주 반복
-- ============================================================
create table if not exists public.courses (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  id         text not null,
  title      text not null,
  room       text not null default '',
  color      text not null,
  slots      jsonb not null default '[]',   -- [{ day: 0~6 (0 = 일요일), start: "09:00", end: "10:15" }]
  term_start date not null,
  term_end   date not null,
  deleted    boolean not null default false,
  updated_at timestamptz not null,
  synced_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists courses_synced_idx on public.courses (user_id, synced_at);

drop trigger if exists courses_touch on public.courses;
create trigger courses_touch before insert or update on public.courses
  for each row execute function public.touch_synced_at();

-- 본인만 읽고 쓸 수 있음 (팔로워에게는 보이지 않음)
alter table public.courses enable row level security;
drop policy if exists "own courses" on public.courses;
create policy "own courses" on public.courses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.courses;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- 도트 오피스: 지금 뽀모도로 중인지, 쉬는 중인지, 접속해 있는지 (맞팔 친구끼리만)
-- 할 일 제목은 여기 없고, 보는 사람이 todos 의 공개 범위 규칙대로 따로 읽음
-- ============================================================
create table if not exists public.office_status (
  user_id uuid primary key default auth.uid() references public.profiles on delete cascade,
  phase   text not null default 'idle' check (phase in ('idle', 'focus', 'short', 'long')),
  todo_id text,
  ends_at timestamptz,
  seen_at timestamptz not null default now()
);

alter table public.office_status enable row level security;

-- 서로 팔로우하는 사이인지
create or replace function public.is_mutual(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from follows where follower_id = auth.uid() and followee_id = target and accepted)
     and exists (select 1 from follows where follower_id = target and followee_id = auth.uid() and accepted)
$$;

drop policy if exists "office readable" on public.office_status;
create policy "office readable" on public.office_status for select to authenticated
  using (user_id = auth.uid() or public.is_mutual(user_id));
drop policy if exists "own office status" on public.office_status;
create policy "own office status" on public.office_status for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.office_status;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- 회원 탈퇴: 본인 계정을 지우면 위 표들이 on delete cascade 로 함께 지워짐
-- (할 일, 카테고리, 반복, 집중 기록, 시간표, 프로필, 팔로우, 감정표현, 템플릿, 오피스 상태)
-- ============================================================
create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end
$$;
revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- ============================================================
-- 관리자: admins 표에 있는 계정만 관리자 화면(내 정보 → 관리자)을 쓸 수 있음
-- 관리자 지정은 앱에서 할 수 없고, 맨 아래처럼 SQL Editor 에서만
-- ============================================================
create table if not exists public.admins (
  user_id    uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;
-- 로그인 안 한 사람도 공지를 읽을 때 이 함수를 거치므로 anon 도 실행 가능 (항상 false)
grant execute on function public.is_admin() to anon, authenticated;

-- 현황: 가입자, 활동한 사람, 할 일, 템플릿, 처리 안 한 신고, 최근 14일 가입자 수
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return jsonb_build_object(
    'users',        (select count(*) from auth.users),
    'new_today',    (select count(*) from auth.users where created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'),
    'new_7d',       (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'new_30d',      (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'active_1d',    (select count(distinct user_id) from todos where synced_at >= now() - interval '1 day'),
    'active_7d',    (select count(distinct user_id) from todos where synced_at >= now() - interval '7 days'),
    'active_30d',   (select count(distinct user_id) from todos where synced_at >= now() - interval '30 days'),
    'profiles',     (select count(*) from profiles),
    'todos',        (select count(*) from todos where not deleted),
    'todos_done',   (select count(*) from todos where not deleted and done),
    'focus_hours',  (select coalesce(round(sum(seconds) / 3600.0), 0) from sessions where not deleted),
    'templates',    (select count(*) from templates),
    'open_reports', (select count(*) from reports where status = 'open'),
    'signups', (
      select jsonb_agg(jsonb_build_object('day', d::date, 'count', (
        select count(*) from auth.users u where (u.created_at at time zone 'Asia/Seoul')::date = d::date
      )) order by d)
      from generate_series((now() at time zone 'Asia/Seoul')::date - 13, (now() at time zone 'Asia/Seoul')::date, interval '1 day') d
    )
  );
end
$$;

-- 사용자 목록 (이메일·아이디·이름으로 검색, 최근 가입 순)
-- 계정 이메일 칸이 비어 있으면 카카오가 준 이메일을 대신 보여줌 (email_unverified = true, 화면엔 '(카카오)')
drop function if exists public.admin_users(text, int, int);
create function public.admin_users(q text default '', lim int default 50, skip int default 0)
returns table (
  id uuid, email text, username text, name text, provider text,
  created_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz,
  todos bigint, admin boolean, email_unverified boolean
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query
    select u.id, coalesce(nullif(u.email, ''), u.raw_user_meta_data->>'email')::text, p.username, p.name, coalesce(u.raw_app_meta_data->>'provider', 'email'),
           u.created_at, u.last_sign_in_at, u.banned_until,
           (select count(*) from todos t where t.user_id = u.id and not t.deleted),
           exists (select 1 from admins a where a.user_id = u.id),
           nullif(u.email, '') is null and u.raw_user_meta_data->>'email' is not null
    from auth.users u
    left join profiles p on p.id = u.id
    where coalesce(q, '') = ''
       or u.email ilike '%' || q || '%' or u.raw_user_meta_data->>'email' ilike '%' || q || '%'
       or p.username ilike '%' || q || '%' or p.name ilike '%' || q || '%'
    order by u.created_at desc
    limit least(lim, 200) offset skip;
end
$$;

-- 이용 정지 (days 가 null 이면 정지 풀기, 0 이면 영구). 정지된 계정은 로그인과 토큰 갱신이 막혀 길어도 1시간 안에 로그아웃됨
create or replace function public.admin_set_ban(target uuid, days int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if target = auth.uid() or exists (select 1 from admins where user_id = target) then
    raise exception '관리자 계정은 정지할 수 없어요';
  end if;
  update auth.users set banned_until = case
    when days is null then null
    when days = 0 then now() + interval '100 years'
    else now() + make_interval(days => days)
  end where id = target;
end
$$;

-- 계정 삭제 (회원 탈퇴와 같이 그 사람의 데이터가 모두 지워짐)
create or replace function public.admin_delete_user(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if target = auth.uid() or exists (select 1 from admins where user_id = target) then
    raise exception '관리자 계정은 여기서 삭제할 수 없어요';
  end if;
  delete from auth.users where id = target;
end
$$;

revoke execute on function public.admin_stats() from public, anon;
revoke execute on function public.admin_users(text, int, int) from public, anon;
revoke execute on function public.admin_set_ban(uuid, int) from public, anon;
revoke execute on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_users(text, int, int) to authenticated;
grant execute on function public.admin_set_ban(uuid, int) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- 관리자는 누구의 템플릿이든 목록에서 내리거나 지울 수 있음
drop policy if exists "admin templates update" on public.templates;
create policy "admin templates update" on public.templates for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin templates delete" on public.templates;
create policy "admin templates delete" on public.templates for delete to authenticated using (public.is_admin());

-- 카카오 이메일 채우기: 처음 가입할 때 이메일 동의를 안 했다가 나중에 동의한 카카오 사용자는
-- 카카오 정보(identities)에만 이메일이 있고 계정 이메일 칸은 비어 있음. 카카오가 인증한 이메일이고
-- 다른 계정이 쓰지 않는 주소일 때만 계정 이메일로 채움 (로그인 방식은 그대로)
create or replace function public.fill_kakao_email(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare e text;
begin
  select lower(i.identity_data->>'email') into e
  from auth.identities i
  where i.user_id = uid and i.provider = 'kakao'
    and coalesce(i.identity_data->>'email', '') <> ''
    and coalesce(i.identity_data->>'email_verified', i.identity_data->>'is_email_verified') = 'true'
  limit 1;
  if e is null then return; end if;
  update auth.users u set email = e, email_confirmed_at = coalesce(u.email_confirmed_at, now())
  where u.id = uid and coalesce(u.email, '') = ''
    and not exists (select 1 from auth.users o where o.id <> uid and lower(o.email) = e);
exception when others then
  null; -- 로그인을 막지 않도록 실패해도 넘어감
end
$$;
revoke execute on function public.fill_kakao_email(uuid) from public, anon, authenticated;

create or replace function public.kakao_identity_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.provider = 'kakao' then perform public.fill_kakao_email(new.user_id); end if;
  return null;
end
$$;
drop trigger if exists kakao_email_fill on auth.identities;
create trigger kakao_email_fill after insert or update on auth.identities
  for each row execute function public.kakao_identity_email();

-- 이미 가입한 사람들도 한 번 채움
select public.fill_kakao_email(u.id) from auth.users u
where coalesce(u.email, '') = '' and exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'kakao');

-- 신고: 템플릿이나 사용자(프로필)를 신고하면 관리자가 확인
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references auth.users on delete set null,
  target_type text not null check (target_type in ('template', 'profile')),
  target_id   uuid not null,
  reason      text not null check (reason in ('spam', 'abuse', 'sexual', 'privacy', 'other')),
  detail      text not null default '' check (char_length(detail) <= 500),
  status      text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now(),
  handled_at  timestamptz
);
-- 같은 사람이 같은 대상을 처리 전에 여러 번 신고하지 못하게
create unique index if not exists reports_once_idx on public.reports (reporter_id, target_type, target_id) where status = 'open';
create index if not exists reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;
drop policy if exists "report" on public.reports;
create policy "report" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open' and handled_at is null);
drop policy if exists "reports readable" on public.reports;
create policy "reports readable" on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
drop policy if exists "admin reports update" on public.reports;
create policy "admin reports update" on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin reports delete" on public.reports;
create policy "admin reports delete" on public.reports for delete to authenticated using (public.is_admin());
grant select, insert, update, delete on public.reports to authenticated;

-- 공지: 켜 둔 공지는 할 일 화면 위에 보임 (로그인 안 해도)
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 60),
  body       text not null default '' check (char_length(body) <= 1000),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
drop policy if exists "announcements readable" on public.announcements;
create policy "announcements readable" on public.announcements for select to anon, authenticated
  using (active or public.is_admin());
drop policy if exists "admin announcements" on public.announcements;
create policy "admin announcements" on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

-- 관리자 잠금: 관리자는 딱 한 명, 아래 이메일로 가입하고 메일 인증까지 끝난 계정만 될 수 있음
-- (SQL 을 잘못 실행하거나 다른 이메일을 넣어도 DB 가 거부함. 바꾸려면 이 함수의 이메일을 직접 고쳐야 함)
create or replace function public.admin_allowed(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from auth.users
    where id = uid
      and email_confirmed_at is not null
      -- Gmail 은 점을 무시하니 w.todo.official / wtodo.official 둘 다 같은 메일함
      and split_part(lower(email), '@', 2) = 'gmail.com'
      and replace(split_part(lower(email), '@', 1), '.', '') = 'wtodoofficial'
  )
$$;
revoke execute on function public.admin_allowed(uuid) from public, anon, authenticated;

create or replace function public.guard_admins() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.user_id <> old.user_id then
    raise exception '관리자 계정은 바꿀 수 없어요. 지우고 다시 등록하세요.';
  end if;
  if not public.admin_allowed(new.user_id) then
    raise exception '이 계정은 관리자가 될 수 없어요 (정해진 이메일로 가입하고 인증한 계정만 가능).';
  end if;
  if tg_op = 'INSERT' and exists (select 1 from public.admins where user_id <> new.user_id) then
    raise exception '관리자는 한 명만 둘 수 있어요.';
  end if;
  return new;
end
$$;
drop trigger if exists admins_guard on public.admins;
create trigger admins_guard before insert or update on public.admins
  for each row execute function public.guard_admins();

-- 혹시 조건에 안 맞는 관리자가 이미 들어가 있으면 지움
delete from public.admins where not public.admin_allowed(user_id);

-- 관리자 지정: 조건에 맞는 계정 중 가장 먼저 가입한 하나를 관리자로 (이미 있으면 그대로)
do $$
begin
  if not exists (select 1 from public.admins) then
    insert into public.admins (user_id)
    select id from auth.users where public.admin_allowed(id) order by created_at limit 1;
  end if;
  if not exists (select 1 from public.admins) then
    raise notice 'w.todo.official@gmail.com 으로 가입하고 인증한 계정이 아직 없어요. 앱에서 가입한 뒤 다시 실행하세요.';
  end if;
end $$;

notify pgrst, 'reload schema';
