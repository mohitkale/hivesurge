-- M6-2 / M6-2a / M6-3 / M6-4 / M6-5: sandbox admin panel backend.
-- Roles (docs/design/admin-m6.md): viewer < support / liveops < owner. Every admin write goes
-- through a SECURITY DEFINER function in the unexposed `private` schema that checks the caller's
-- role server-side and writes an `admin_audit` row in the same transaction. The public RPCs are
-- SECURITY INVOKER wrappers (same pattern as M4), so nothing in an exposed schema is a definer.

-- ---------- roles ----------
alter table public.admin_users drop constraint admin_users_role_check;
update public.admin_users set role = 'owner' where role = 'admin';
alter table public.admin_users
  add constraint admin_users_role_check check (role in ('viewer', 'support', 'liveops', 'owner')),
  alter column role set default 'viewer';

create function private.admin_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select a.role from public.admin_users a where a.user_id = (select auth.uid());
$$;

create function private.require_role(p_roles text[])
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare r text := private.admin_role();
begin
  if r is null or not (r = any (p_roles)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return r;
end;
$$;

-- ---------- audit ----------
create table public.admin_audit (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 1 and 64),
  target_user uuid references auth.users (id) on delete set null,
  target text check (char_length(target) <= 128),
  before jsonb,
  after jsonb,
  reason text check (char_length(reason) <= 500),
  at timestamptz not null default now()
);
create index admin_audit_admin_id_idx on public.admin_audit (admin_id);
create index admin_audit_target_user_idx on public.admin_audit (target_user);

-- ---------- remote config (append-only versions; latest = live) ----------
create table public.remote_config (
  version integer generated always as identity primary key,
  config jsonb not null check (jsonb_typeof(config) = 'object' and pg_column_size(config) <= 65536),
  note text check (char_length(note) <= 200),
  published_by uuid references auth.users (id) on delete set null,
  rolled_back_from integer,
  published_at timestamptz not null default now()
);
create index remote_config_published_by_idx on public.remote_config (published_by);

-- ---------- level data overrides (rows; the shipped levels stay in src/levels/*.json) ----------
create table public.level_overrides (
  level_id text primary key check (char_length(level_id) between 1 and 64),
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 65536),
  version integer not null default 1,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index level_overrides_updated_by_idx on public.level_overrides (updated_by);

alter table public.admin_audit enable row level security;
alter table public.remote_config enable row level security;
alter table public.level_overrides enable row level security;
revoke all on public.admin_audit, public.remote_config, public.level_overrides from anon, authenticated;
grant select on public.admin_audit, public.level_overrides to authenticated;
-- The game reads the live config with the public anon key (no secrets in it).
grant select on public.remote_config to anon, authenticated;

create policy admin_audit_select on public.admin_audit for select to authenticated
  using ((select private.admin_role()) is not null);
create policy level_overrides_select on public.level_overrides for select to authenticated
  using ((select private.admin_role()) is not null);
create policy remote_config_select on public.remote_config for select to anon, authenticated
  using (true);

-- ---------- helpers ----------
create function private.audit(
  p_action text, p_target_user uuid, p_target text, p_before jsonb, p_after jsonb, p_reason text
)
returns bigint
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit (admin_id, action, target_user, target, before, after, reason)
  values ((select auth.uid()), p_action, p_target_user, p_target, p_before, p_after, p_reason)
  returning id;
$$;

create function private.mask_email(p_email text, p_role text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_email is null then null
    when p_role = 'viewer' then left(p_email, 1) || '***@' || split_part(p_email, '@', 2)
    else p_email
  end;
$$;

-- Balance of a PN-counter book {earn, spend, grants} (src/platform/counter.ts).
create function private.book_balance(b jsonb)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select greatest(0,
    coalesce((select sum((v)::numeric) from jsonb_each_text(coalesce(b -> 'earn', '{}')) as e (k, v)), 0)
    - coalesce((select sum((v)::numeric) from jsonb_each_text(coalesce(b -> 'spend', '{}')) as e (k, v)), 0)
    + coalesce((select sum((v)::numeric) from jsonb_each_text(coalesce(b -> 'grants', '{}')) as e (k, v)), 0)
  )::bigint;
$$;

create function private.ledger_balance(l jsonb)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select greatest(0, coalesce(
    (select sum((e ->> 'delta')::numeric) from jsonb_array_elements(coalesce(l, '[]')) as e), 0))::bigint;
$$;

-- Server-side publish check, mirrors validateRemoteConfig (src/platform/remoteConfig.ts):
-- odds sum to 100 per chest, caps within the G5 guardrail limits, difficulty easier-only.
create function private.validate_remote_config(c jsonb)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  e text[] := '{}';
  lim record;
  t text;
  o jsonb;
  s numeric;
  r text;
  p record;
  prev numeric := null;
  x jsonb;
begin
  if jsonb_typeof(c) <> 'object' then return array['config must be an object']; end if;
  for lim in select * from (values ('interstitialPerSession', 4), ('interstitialPerDay', 15),
      ('rewardedPerSession', 12), ('rewardedPerDay', 30)) as v (k, m) loop
    if jsonb_typeof(c -> 'ads' -> lim.k) <> 'number'
       or (c -> 'ads' ->> lim.k)::numeric < 0 or (c -> 'ads' ->> lim.k)::numeric > lim.m then
      e := e || format('ads.%s must be 0..%s', lim.k, lim.m);
    end if;
  end loop;
  if jsonb_typeof(c -> 'ads' -> 'placements') = 'object' then
    for p in select * from jsonb_each(c -> 'ads' -> 'placements') loop
      if jsonb_typeof(p.value -> 'session') <> 'number' or jsonb_typeof(p.value -> 'day') <> 'number'
         or (p.value ->> 'session')::numeric < 0
         or (p.value ->> 'day')::numeric < (p.value ->> 'session')::numeric then
        e := e || format('ads.placements.%s needs 0 <= session <= day', p.key);
      end if;
    end loop;
  else
    e := e || 'ads.placements missing'::text;
  end if;
  foreach t in array array['wood', 'silver', 'gold', 'royal'] loop
    o := c -> 'chests' -> t -> 'odds';
    if jsonb_typeof(o) <> 'object' then
      e := e || format('chests.%s.odds missing', t);
      continue;
    end if;
    s := 0;
    foreach r in array array['C', 'R', 'E', 'L'] loop
      if jsonb_typeof(o -> r) <> 'number' or (o ->> r)::numeric < 0 then
        e := e || format('chests.%s.odds must be >= 0', t);
        s := null;
        exit;
      end if;
      s := s + (o ->> r)::numeric;
    end loop;
    if s is not null and abs(s - 100) > 1e-9 then
      e := e || format('chests.%s.odds must sum to 100', t);
    end if;
  end loop;
  if jsonb_typeof(c -> 'difficulty' -> 'scaleFloor') <> 'number'
     or (c -> 'difficulty' ->> 'scaleFloor')::numeric not between 0.85 and 1 then
    e := e || 'difficulty.scaleFloor must be 0.85..1'::text;
  end if;
  if jsonb_typeof(c -> 'difficulty' -> 'lossAssist') <> 'array'
     or exists (select 1 from jsonb_array_elements(c -> 'difficulty' -> 'lossAssist') as a
       where jsonb_typeof(a) <> 'array' or jsonb_typeof(a -> 0) <> 'number' or jsonb_typeof(a -> 1) <> 'number'
         or (a ->> 0)::numeric < 2 or (a ->> 1)::numeric not between 0.85 and 1) then
    e := e || 'difficulty.lossAssist factors must be 0.85..1 (easier-only)'::text;
  end if;
  if jsonb_typeof(c -> 'difficulty' -> 'expectedP') <> 'array'
     or jsonb_array_length(c -> 'difficulty' -> 'expectedP') = 0 then
    e := e || 'difficulty.expectedP must be increasing [n, P] points'::text;
  else
    for x in select * from jsonb_array_elements(c -> 'difficulty' -> 'expectedP') loop
      if jsonb_typeof(x) <> 'array' or jsonb_typeof(x -> 0) <> 'number' or jsonb_typeof(x -> 1) <> 'number'
         or (prev is not null and (x ->> 0)::numeric <= prev) then
        e := e || 'difficulty.expectedP must be increasing [n, P] points'::text;
        exit;
      end if;
      prev := (x ->> 0)::numeric;
    end loop;
  end if;
  if c ? 'events' then
    if jsonb_typeof(c -> 'events') <> 'array' or jsonb_array_length(c -> 'events') > 50
       or exists (select 1 from jsonb_array_elements(c -> 'events') as ev
         where jsonb_typeof(ev -> 'id') <> 'string' or jsonb_typeof(ev -> 'start') <> 'number'
           or jsonb_typeof(ev -> 'end') <> 'number' or (ev ->> 'end')::numeric <= (ev ->> 'start')::numeric) then
      e := e || 'events must be up to 50 {id, name, start, end} with end > start'::text;
    end if;
  end if;
  return e;
end;
$$;

-- ---------- admin RPC bodies (definer, role-checked) ----------
create function private.admin_find_players(p_q text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text := private.require_role(array['viewer', 'support', 'liveops', 'owner']);
  q text := btrim(coalesce(p_q, ''));
  res jsonb;
begin
  if char_length(q) > 128 then raise exception 'query too long' using errcode = '22023'; end if;
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.last_seen desc nulls last), '[]')
  into res
  from (
    select p.id, private.mask_email(u.email::text, v_role) as email, p.display_name, p.created_at,
      greatest(s.updated_at, u.last_sign_in_at) as last_seen,
      coalesce(st.levels_cleared, 0) as levels_cleared, coalesce(st.battles, 0) as battles,
      coalesce((s.data ->> 'coins')::numeric, 0) as coins,
      coalesce((s.data ->> 'gems')::numeric, 0) as gems,
      (select count(*) from public.purchases_sandbox ps where ps.user_id = p.id) as purchases,
      u.is_anonymous as guest,
      exists (select 1 from public.admin_users a where a.user_id = p.id) as is_admin
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.saves s on s.user_id = p.id
    left join public.player_stats st on st.user_id = p.id
    where q = ''
      or (q ~* '^[0-9a-f-]{36}$' and p.id = q::uuid)
      or (position('@' in q) > 0 and lower(u.email) = lower(q))
      or (position('@' in q) = 0 and q !~* '^[0-9a-f-]{36}$'
          and p.display_name ilike replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    order by greatest(s.updated_at, u.last_sign_in_at) desc nulls last
    limit 50
  ) t;
  return res;
end;
$$;

create function private.admin_player_detail(p_uid uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_role text := private.require_role(array['viewer', 'support', 'liveops', 'owner']);
begin
  if not exists (select 1 from public.profiles where id = p_uid) then return null; end if;
  return jsonb_build_object(
    'profile', (select row_to_json(p)::jsonb from public.profiles p where p.id = p_uid),
    'email', (select private.mask_email(u.email::text, v_role) from auth.users u where u.id = p_uid),
    'save', (select jsonb_build_object('revision', s.revision, 'data', s.data, 'updated_at', s.updated_at)
             from public.saves s where s.user_id = p_uid),
    'stats', (select row_to_json(x)::jsonb from public.player_stats x where x.user_id = p_uid),
    'progress', (select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.level_id), '[]')
                 from public.level_progress x where x.user_id = p_uid),
    'purchases', (select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc), '[]')
                  from public.purchases_sandbox x where x.user_id = p_uid),
    'events', (select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc), '[]')
               from (select name, props, session, client_ts, created_at from public.events
                     where user_id = p_uid order by created_at desc limit 200) x),
    'audit', (select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.at desc), '[]')
              from (select id, admin_id, action, reason, before, after, at from public.admin_audit
                    where target_user = p_uid order by at desc limit 50) x)
  );
end;
$$;

-- Grant test currency as keyed grants (`admin:<audit id>`), the same idempotent shape purchases
-- use, so every device merges it exactly once. support: cap 10,000 coins / 500 gems per grant.
create function private.admin_grant(p_uid uuid, p_coins integer, p_gems integer, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := private.require_role(array['support', 'owner']);
  s record;
  d jsonb;
  k text;
  aid bigint;
begin
  if char_length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'reason (min 5 chars) required' using errcode = '22023';
  end if;
  if coalesce(p_coins, 0) < 0 or coalesce(p_gems, 0) < 0 or coalesce(p_coins, 0) + coalesce(p_gems, 0) = 0 then
    raise exception 'grant must be positive' using errcode = '22023';
  end if;
  if (v_role = 'support' and (coalesce(p_coins, 0) > 10000 or coalesce(p_gems, 0) > 500))
     or coalesce(p_coins, 0) > 1000000 or coalesce(p_gems, 0) > 100000 then
    raise exception 'grant over cap for role %', v_role using errcode = '42501';
  end if;
  select * into s from public.saves where user_id = p_uid for update;
  if not found or (s.data ->> 'version') is distinct from '2' then
    raise exception 'player has no v2 cloud save' using errcode = 'P0002';
  end if;
  aid := private.audit('grant', p_uid, null, jsonb_build_object('coins', s.data -> 'coins', 'gems', s.data -> 'gems'),
    null, btrim(p_reason));
  k := 'admin:' || aid;
  d := s.data;
  if coalesce(p_coins, 0) > 0 then
    d := jsonb_set(d, '{coinBook}', coalesce(d -> 'coinBook', '{}') || jsonb_build_object(
      'earn', coalesce(d -> 'coinBook' -> 'earn', '{}'), 'spend', coalesce(d -> 'coinBook' -> 'spend', '{}'),
      'grants', coalesce(d -> 'coinBook' -> 'grants', '{}') || jsonb_build_object(k, p_coins)));
    d := jsonb_set(d, '{coins}', to_jsonb(private.book_balance(d -> 'coinBook')));
  end if;
  if coalesce(p_gems, 0) > 0 then
    d := jsonb_set(d, '{gemLedger}', coalesce(d -> 'gemLedger', '[]') || jsonb_build_array(jsonb_build_object(
      'id', k, 'delta', p_gems, 'reason', 'admin_grant',
      'at', (extract(epoch from now()) * 1000)::bigint)));
    d := jsonb_set(d, '{gems}', to_jsonb(private.ledger_balance(d -> 'gemLedger')));
  end if;
  d := jsonb_set(d, '{revision}', to_jsonb(s.revision + 1));
  update public.saves set data = d, revision = s.revision + 1, updated_at = now() where user_id = p_uid;
  update public.admin_audit set target = k,
    after = jsonb_build_object('coins', d -> 'coins', 'gems', d -> 'gems', 'grant_coins', p_coins, 'grant_gems', p_gems)
    where id = aid;
  return jsonb_build_object('audit_id', aid, 'key', k, 'coins', d -> 'coins', 'gems', d -> 'gems',
    'revision', s.revision + 1);
end;
$$;

-- Reset a save to defaults (keeps the id, paid items and their grants). `resetEpoch` + 1 tells
-- every device to drop its local copy instead of merging it back (src/platform/save.ts).
create function private.admin_reset_save(p_uid uuid, p_reason text, p_confirm text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := private.require_role(array['support', 'owner']);
  s record;
  d jsonb;
  aid bigint;
  paid jsonb;
begin
  if p_confirm is distinct from 'RESET' then
    raise exception 'type RESET to confirm' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'reason (min 5 chars) required' using errcode = '22023';
  end if;
  select * into s from public.saves where user_id = p_uid for update;
  if not found then raise exception 'player has no cloud save' using errcode = 'P0002'; end if;
  select coalesce(jsonb_object_agg(k, v), '{}') into paid
    from jsonb_each(coalesce(s.data -> 'coinBook' -> 'grants', '{}')) as g (k, v)
    where k like 'purchase:%' or k like 'refund:%';
  d := jsonb_build_object(
    'version', 2,
    'revision', s.revision + 1,
    'updatedAt', (extract(epoch from now()) * 1000)::bigint,
    'resetEpoch', coalesce((s.data ->> 'resetEpoch')::int, 0) + 1,
    'coinBook', jsonb_build_object('earn', '{}'::jsonb, 'spend', '{}'::jsonb, 'grants', paid),
    'gemLedger', coalesce((select jsonb_agg(e) from jsonb_array_elements(coalesce(s.data -> 'gemLedger', '[]')) as e
      where e ->> 'id' like 'purchase:%' or e ->> 'id' like 'refund:%'), '[]'),
    'noAds', coalesce(s.data -> 'noAds', 'false'),
    'skins', coalesce(s.data -> 'skins', '[]'),
    'equippedSkin', coalesce(s.data -> 'equippedSkin', '""'),
    'ftueDone', true);
  d := d || jsonb_build_object('coins', private.book_balance(d -> 'coinBook'),
    'gems', private.ledger_balance(d -> 'gemLedger'));
  update public.saves set data = d, revision = s.revision + 1, updated_at = now() where user_id = p_uid;
  delete from public.level_progress where user_id = p_uid;
  delete from public.player_stats where user_id = p_uid;
  aid := private.audit('reset_save', p_uid, null, s.data, d, btrim(p_reason));
  return jsonb_build_object('audit_id', aid, 'revision', s.revision + 1);
end;
$$;

create function private.admin_publish_config(p_config jsonb, p_note text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := private.require_role(array['liveops', 'owner']);
  errs text[] := private.validate_remote_config(p_config);
  live jsonb;
  v integer;
begin
  if array_length(errs, 1) > 0 then
    raise exception 'invalid config: %', array_to_string(errs, '; ') using errcode = '22023';
  end if;
  select config into live from public.remote_config order by version desc limit 1;
  -- Chest odds changes need the owner role (spec: liveops may not change paid-adjacent odds).
  if v_role <> 'owner' and (p_config -> 'chests') is distinct from coalesce(live -> 'chests', p_config -> 'chests') then
    raise exception 'changing chest odds needs the owner role' using errcode = '42501';
  end if;
  insert into public.remote_config (config, note, published_by)
    values (p_config, left(p_note, 200), (select auth.uid())) returning version into v;
  perform private.audit('config_publish', null, 'remote_config:' || v, live, p_config, p_note);
  return v;
end;
$$;

create function private.admin_rollback_config(p_version integer, p_reason text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := private.require_role(array['owner']);
  old jsonb;
  live jsonb;
  v integer;
begin
  if char_length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'reason (min 5 chars) required' using errcode = '22023';
  end if;
  select config into old from public.remote_config where version = p_version;
  if old is null then raise exception 'no such version' using errcode = 'P0002'; end if;
  select config into live from public.remote_config order by version desc limit 1;
  insert into public.remote_config (config, note, published_by, rolled_back_from)
    values (old, left('rollback to v' || p_version || ': ' || p_reason, 200), (select auth.uid()), p_version)
    returning version into v;
  perform private.audit('config_rollback', null, 'remote_config:' || v, live, old, p_reason);
  return v;
end;
$$;

-- Level rows: the client validates with parseLevel + a sim smoke run; the server checks shape.
create function private.admin_save_level(p_level_id text, p_data jsonb, p_reason text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := private.require_role(array['liveops', 'owner']);
  before jsonb;
  v integer;
begin
  if char_length(btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'reason (min 5 chars) required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_data) <> 'object' or p_data ->> 'id' is distinct from p_level_id
     or jsonb_typeof(p_data -> 'gates') <> 'array' or jsonb_typeof(p_data -> 'waves') <> 'array'
     or jsonb_typeof(p_data -> 'nestHp') <> 'number' or jsonb_typeof(p_data -> 'timeLimit') <> 'number' then
    raise exception 'invalid level data' using errcode = '22023';
  end if;
  select data into before from public.level_overrides where level_id = p_level_id for update;
  insert into public.level_overrides as lo (level_id, data, updated_by)
    values (p_level_id, p_data, (select auth.uid()))
    on conflict (level_id) do update
      set data = excluded.data, version = lo.version + 1, updated_by = excluded.updated_by, updated_at = now()
    returning version into v;
  perform private.audit('level_save', null, 'level:' || p_level_id, before, p_data, btrim(p_reason));
  return v;
end;
$$;

-- Funnel / pacing / revenue aggregates for the stats dashboard (M6-4).
create function private.admin_stats(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_role text := private.require_role(array['viewer', 'support', 'liveops', 'owner']);
begin
  if p_to <= p_from or p_to - p_from > interval '93 days' then
    raise exception 'range must be 1..93 days' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'levels', (select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.level), '[]') from (
      select props ->> 'level' as level,
        count(*) filter (where name = 'level_start') as starts,
        count(*) filter (where name = 'level_win') as wins,
        count(*) filter (where name = 'level_fail') as fails
      from public.events
      where created_at >= p_from and created_at < p_to
        and name in ('level_start', 'level_win', 'level_fail') and props ? 'level'
      group by 1) x),
    'ftue', (select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.step), '[]') from (
      select (props ->> 'step')::int as step, count(distinct user_id) as players
      from public.events
      where created_at >= p_from and created_at < p_to and name = 'ftue_step'
        and props ->> 'step' ~ '^[0-9]+$'
      group by 1) x),
    'ads', (select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.placement), '[]') from (
      select coalesce(props ->> 'placement', '?') as placement, coalesce(props ->> 'type', 'rewarded') as type,
        count(*) as watched, count(distinct session) as sessions
      from public.events
      where created_at >= p_from and created_at < p_to and name = 'ad_watched'
      group by 1, 2) x),
    'sessions', (select count(distinct session) from public.events
                 where created_at >= p_from and created_at < p_to),
    'players', (select count(distinct user_id) from public.events
                where created_at >= p_from and created_at < p_to),
    'purchases', (select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.sku), '[]') from (
      select sku, provider, status, count(*) as n, coalesce(sum(amount), 0) as amount, currency
      from public.purchases_sandbox
      where created_at >= p_from and created_at < p_to
      group by sku, provider, status, currency) x)
  );
end;
$$;

-- Lock down private functions, then expose invoker wrappers.
revoke all on function private.admin_role(), private.require_role(text[]),
  private.audit(text, uuid, text, jsonb, jsonb, text), private.mask_email(text, text),
  private.book_balance(jsonb), private.ledger_balance(jsonb), private.validate_remote_config(jsonb),
  private.admin_find_players(text), private.admin_player_detail(uuid),
  private.admin_grant(uuid, integer, integer, text), private.admin_reset_save(uuid, text, text),
  private.admin_publish_config(jsonb, text), private.admin_rollback_config(integer, text),
  private.admin_save_level(text, jsonb, text), private.admin_stats(timestamptz, timestamptz)
  from public, anon;
grant execute on function private.admin_role(), private.validate_remote_config(jsonb),
  private.admin_find_players(text), private.admin_player_detail(uuid),
  private.admin_grant(uuid, integer, integer, text), private.admin_reset_save(uuid, text, text),
  private.admin_publish_config(jsonb, text), private.admin_rollback_config(integer, text),
  private.admin_save_level(text, jsonb, text), private.admin_stats(timestamptz, timestamptz)
  to authenticated;
-- private.audit / require_role are only called from inside the definer functions above.
revoke all on function private.audit(text, uuid, text, jsonb, jsonb, text) from authenticated;

create function public.admin_whoami() returns text language sql stable security invoker
  set search_path = '' as $$ select private.admin_role(); $$;
create function public.admin_find_players(p_q text) returns jsonb language sql stable security invoker
  set search_path = '' as $$ select private.admin_find_players(p_q); $$;
create function public.admin_player_detail(p_uid uuid) returns jsonb language sql stable security invoker
  set search_path = '' as $$ select private.admin_player_detail(p_uid); $$;
create function public.admin_grant(p_uid uuid, p_coins integer, p_gems integer, p_reason text)
  returns jsonb language sql security invoker set search_path = ''
  as $$ select private.admin_grant(p_uid, p_coins, p_gems, p_reason); $$;
create function public.admin_reset_save(p_uid uuid, p_reason text, p_confirm text)
  returns jsonb language sql security invoker set search_path = ''
  as $$ select private.admin_reset_save(p_uid, p_reason, p_confirm); $$;
create function public.admin_validate_config(p_config jsonb) returns text[] language sql stable
  security invoker set search_path = '' as $$ select private.validate_remote_config(p_config); $$;
create function public.admin_publish_config(p_config jsonb, p_note text) returns integer language sql
  security invoker set search_path = '' as $$ select private.admin_publish_config(p_config, p_note); $$;
create function public.admin_rollback_config(p_version integer, p_reason text) returns integer
  language sql security invoker set search_path = ''
  as $$ select private.admin_rollback_config(p_version, p_reason); $$;
create function public.admin_save_level(p_level_id text, p_data jsonb, p_reason text) returns integer
  language sql security invoker set search_path = ''
  as $$ select private.admin_save_level(p_level_id, p_data, p_reason); $$;
create function public.admin_stats(p_from timestamptz, p_to timestamptz) returns jsonb language sql
  stable security invoker set search_path = '' as $$ select private.admin_stats(p_from, p_to); $$;

revoke all on function public.admin_whoami(), public.admin_find_players(text),
  public.admin_player_detail(uuid), public.admin_grant(uuid, integer, integer, text),
  public.admin_reset_save(uuid, text, text), public.admin_validate_config(jsonb),
  public.admin_publish_config(jsonb, text), public.admin_rollback_config(integer, text),
  public.admin_save_level(text, jsonb, text), public.admin_stats(timestamptz, timestamptz)
  from public, anon;
grant execute on function public.admin_whoami(), public.admin_find_players(text),
  public.admin_player_detail(uuid), public.admin_grant(uuid, integer, integer, text),
  public.admin_reset_save(uuid, text, text), public.admin_validate_config(jsonb),
  public.admin_publish_config(jsonb, text), public.admin_rollback_config(integer, text),
  public.admin_save_level(text, jsonb, text), public.admin_stats(timestamptz, timestamptz)
  to authenticated;
