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
