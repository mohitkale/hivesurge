-- M4-3: RLS on every table. Players read/write only their own rows; admins (admin_users) can
-- read everything; events are insert-only for players. No player DELETE anywhere.

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()));
$$;
revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.level_progress enable row level security;
alter table public.player_stats enable row level security;
alter table public.events enable row level security;
alter table public.purchases_sandbox enable row level security;
alter table public.admin_users enable row level security;

-- Anonymous (logged-out) API role gets nothing.
revoke all on public.profiles, public.saves, public.level_progress, public.player_stats,
  public.events, public.purchases_sandbox, public.admin_users from anon;
-- Players never delete or truncate; admin tables are read-only from the API.
revoke delete, truncate on public.profiles, public.saves, public.level_progress,
  public.player_stats, public.events, public.purchases_sandbox from authenticated;
revoke insert, update, delete, truncate on public.admin_users from authenticated;
revoke update on public.events, public.purchases_sandbox from authenticated;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- saves
create policy saves_select on public.saves for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy saves_insert on public.saves for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy saves_update on public.saves for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- level_progress
create policy level_progress_select on public.level_progress for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy level_progress_insert on public.level_progress for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy level_progress_update on public.level_progress for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- player_stats
create policy player_stats_select on public.player_stats for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy player_stats_insert on public.player_stats for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy player_stats_update on public.player_stats for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- events: players insert their own; only admins read.
create policy events_insert on public.events for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy events_select_admin on public.events for select to authenticated
  using ((select private.is_admin()));

-- purchases_sandbox: players insert/read their own sandbox purchases; admins read all.
create policy purchases_select on public.purchases_sandbox for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy purchases_insert on public.purchases_sandbox for insert to authenticated
  with check (user_id = (select auth.uid()) and sandbox);

-- admin_users: a user may see their own row (to know if they are an admin); admins see all.
create policy admin_users_select on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
