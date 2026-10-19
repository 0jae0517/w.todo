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

alter table public.profiles enable row level security;
alter table public.follows enable row level security;

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "follows readable" on public.follows;
create policy "follows readable" on public.follows for select to authenticated using (true);
drop policy if exists "follow" on public.follows;
create policy "follow" on public.follows for insert to authenticated with check (follower_id = auth.uid());
drop policy if exists "unfollow" on public.follows;
create policy "unfollow" on public.follows for delete to authenticated using (follower_id = auth.uid());

create or replace function public.is_following(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from follows where follower_id = auth.uid() and followee_id = target)
$$;

create or replace function public.category_public(owner uuid, cat text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from categories where user_id = owner and id = cat and not private and not deleted)
$$;

-- 팔로워는 "나만 보기"가 아닌 분류와 그 안의 할 일을 볼 수 있음
drop policy if exists "followers read categories" on public.categories;
create policy "followers read categories" on public.categories for select to authenticated
  using (not private and not deleted and public.is_following(user_id));
drop policy if exists "followers read todos" on public.todos;
create policy "followers read todos" on public.todos for select to authenticated
  using (not deleted and public.is_following(user_id) and public.category_public(user_id, category_id));

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
