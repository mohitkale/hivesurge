-- M4-2: Hive Surge sandbox schema. Every table has RLS (see 20261022000200_m4_rls.sql).
-- All user-owned rows reference auth.users and are deleted with the user.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Player profile (one row per auth user, created by trigger on sign-up).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cloud save: one versioned JSON document per user; `revision` gives optimistic concurrency.
create table public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  revision integer not null check (revision >= 0),
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 262144),
  updated_at timestamptz not null default now()
);

-- Best result per level (monotonic: stars and coins only ever go up).
create table public.level_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  level_id text not null check (char_length(level_id) between 1 and 64),
  best_stars smallint not null default 0 check (best_stars between 0 and 3),
  best_coins integer not null default 0 check (best_coins >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, level_id)
);

-- Lifetime totals (monotonic).
create table public.player_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  battles integer not null default 0 check (battles >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  total_stars integer not null default 0 check (total_stars >= 0),
  levels_cleared integer not null default 0 check (levels_cleared >= 0),
  coins_earned bigint not null default 0 check (coins_earned >= 0),
  gems_earned bigint not null default 0 check (gems_earned >= 0),
  gems_spent bigint not null default 0 check (gems_spent >= 0),
  updated_at timestamptz not null default now()
);

-- Analytics drain (insert-only for players). The unique key makes client retries idempotent.
create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session text not null check (char_length(session) between 1 and 64),
  name text not null check (char_length(name) between 1 and 64),
  props jsonb not null default '{}'::jsonb
    check (jsonb_typeof(props) = 'object' and pg_column_size(props) <= 4096),
  client_ts timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, session, client_ts, name)
);

-- Sandbox purchase log (Stripe test mode / mock only; never real money).
create table public.purchases_sandbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sku text not null check (char_length(sku) between 1 and 64),
  provider text not null default 'mock' check (provider in ('mock', 'stripe_test')),
  sandbox boolean not null default true check (sandbox),
  created_at timestamptz not null default now()
);
create index purchases_sandbox_user_id_idx on public.purchases_sandbox (user_id);

-- Admin roster (M6). Managed with SQL / the service role only, never from the client.
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

-- New auth user -> profile row.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
