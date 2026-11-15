-- Just enough of Supabase (auth schema, roles, realtime publication) to run schema.sql on plain Postgres in CI.
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz, created_at timestamptz default now(), last_sign_in_at timestamptz, banned_until timestamptz, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
create table auth.identities (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade, provider text, identity_data jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create publication supabase_realtime;
create extension if not exists pgcrypto;
