-- M4-3 / M5-8 RLS abuse tests. Run as the database owner (Supabase SQL editor / MCP execute_sql).
-- Everything runs in one transaction that is rolled back, so no test data is left behind.
-- Any failed check raises an exception; success returns one row: 'M4 RLS tests: all passed'.
begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111',
   'authenticated', 'authenticated', 'rls-a@example.invalid'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222',
   'authenticated', 'authenticated', 'rls-b@example.invalid');

-- The sign-up trigger created both profiles.
do $$ begin
  if (select count(*) from public.profiles where id in
      ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')) <> 2 then
    raise exception 'FAIL: profile trigger';
  end if;
end $$;

-- M5-8: purchases are written by the webhook (service role) only; seed one for A as owner.
insert into public.purchases_sandbox (user_id, sku, provider, session_id, status, grants)
values ('11111111-1111-4111-8111-111111111111', 'gems_small', 'stripe_test', 'cs_test_rls_a',
  'paid', '{"gems":120,"noAds":true}');

-- ---------- user A writes own data ----------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

do $$ begin
  if not public.push_save('{"version":1,"coins":5}'::jsonb, 1, null) then
    raise exception 'FAIL: A first push';
  end if;
  if public.push_save('{"version":1,"coins":6}'::jsonb, 2, null) then
    raise exception 'FAIL: A second insert with expected=null must conflict';
  end if;
  if public.push_save('{"version":1,"coins":6}'::jsonb, 9, 7) then
    raise exception 'FAIL: A stale expected revision must conflict';
  end if;
  if not public.push_save('{"version":1,"coins":7}'::jsonb, 2, 1) then
    raise exception 'FAIL: A push with matching expected revision';
  end if;
  perform public.sync_progress('[{"level_id":"l1","best_stars":3,"best_coins":40}]'::jsonb,
    '{"battles":2,"wins":1}'::jsonb);
  perform public.sync_progress('[{"level_id":"l1","best_stars":1,"best_coins":10}]'::jsonb,
    '{"battles":1,"wins":0}'::jsonb);
  if (select best_stars from public.level_progress where level_id = 'l1') <> 3 then
    raise exception 'FAIL: level_progress must be monotonic';
  end if;
  if (select battles from public.player_stats) <> 2 then
    raise exception 'FAIL: player_stats must be monotonic';
  end if;
  insert into public.events (session, name, props, client_ts)
    values ('s1', 'level_win', '{}', now());
end $$;

-- M5-8: A reads own purchase but cannot grant itself one, nor edit or refund it.
do $$
declare n integer;
begin
  if (select count(*) from public.purchases_sandbox) <> 1 then
    raise exception 'FAIL: A cannot read own purchase';
  end if;
  begin
    insert into public.purchases_sandbox (sku) values ('gems_small');
    raise exception 'FAIL: client purchase insert allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.purchases_sandbox set status = 'paid', sku = 'gems_large';
    raise exception 'FAIL: client purchase update allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A cannot read events back (insert-only), nor delete own rows.
do $$ begin
  if (select count(*) from public.events) <> 0 then raise exception 'FAIL: events readable'; end if;
  begin
    delete from public.saves;
    raise exception 'FAIL: delete allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.admin_users (user_id) values ('11111111-1111-4111-8111-111111111111');
    raise exception 'FAIL: self-promotion to admin allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------- user B attacks A ----------
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

do $$
declare n integer;
begin
  if (select count(*) from public.saves) <> 0 then raise exception 'FAIL: B reads A save'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL: B reads A profile'; end if;
  if (select count(*) from public.level_progress) <> 0 then raise exception 'FAIL: B reads A progress'; end if;
  if (select count(*) from public.player_stats) <> 0 then raise exception 'FAIL: B reads A stats'; end if;
  if (select count(*) from public.purchases_sandbox) <> 0 then raise exception 'FAIL: B reads A purchases'; end if;
  if (select count(*) from public.admin_users) <> 0 then raise exception 'FAIL: B reads admins'; end if;

  update public.saves set data = '{"hacked":true}'
    where user_id = '11111111-1111-4111-8111-111111111111';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B updated A save'; end if;
  update public.profiles set display_name = 'pwned'
    where id = '11111111-1111-4111-8111-111111111111';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B updated A profile'; end if;

  begin
    insert into public.saves (user_id, revision, data)
      values ('11111111-1111-4111-8111-111111111111', 99, '{}');
    raise exception 'FAIL: B inserted a save for A';
  exception when insufficient_privilege or unique_violation then null;
  end;
  begin
    insert into public.events (user_id, session, name, client_ts)
      values ('11111111-1111-4111-8111-111111111111', 's', 'x', now());
    raise exception 'FAIL: B inserted an event as A';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.level_progress (user_id, level_id, best_stars)
      values ('11111111-1111-4111-8111-111111111111', 'l9', 3);
    raise exception 'FAIL: B wrote A progress';
  exception when insufficient_privilege then null;
  end;
  -- B's own push creates B's row only; A's save is untouched.
  if not public.push_save('{"version":1}'::jsonb, 1, null) then raise exception 'FAIL: B push'; end if;
end $$;

-- ---------- sync_player (one batched round trip) as user A ----------
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
do $$
declare r jsonb;
begin
  -- Stale expected revision: conflict, the cloud save comes back, nothing is overwritten.
  r := public.sync_player('{"version":1,"coins":1}'::jsonb, 5, 1,
    '[]'::jsonb, '{}'::jsonb,
    '[{"session":"s2","name":"level_start","props":{},"client_ts":"2026-10-22T00:00:00Z"}]'::jsonb);
  if (r ->> 'ok')::boolean or (r ->> 'revision')::int <> 2 or r -> 'data' ->> 'coins' <> '7' then
    raise exception 'FAIL: sync_player conflict %', r;
  end if;
  -- Retrying the same events batch is idempotent.
  r := public.sync_player(null, 2, 2, '[]'::jsonb, '{}'::jsonb,
    '[{"session":"s2","name":"level_start","props":{},"client_ts":"2026-10-22T00:00:00Z"}]'::jsonb);
  if not (r ->> 'ok')::boolean or r -> 'data' <> 'null'::jsonb then
    raise exception 'FAIL: sync_player no-op %', r;
  end if;
  -- Merged push with the right expected revision succeeds.
  r := public.sync_player('{"version":1,"coins":7}'::jsonb, 3, 2,
    '[{"level_id":"l2","best_stars":2,"best_coins":5}]'::jsonb, '{"battles":3}'::jsonb, '[]'::jsonb);
  if not (r ->> 'ok')::boolean or (r ->> 'revision')::int <> 3 then
    raise exception 'FAIL: sync_player push %', r;
  end if;
  if (select battles from public.player_stats) <> 3 then raise exception 'FAIL: stats via sync_player'; end if;
  begin
    perform public.sync_player(null, 0, 0, '[]'::jsonb, '{}'::jsonb,
      '[{"session":"s","name":"x","client_ts":"2026-10-22T00:00:00Z","user_id":"22222222-2222-4222-8222-222222222222"}]'::jsonb);
  exception when others then raise exception 'FAIL: extra user_id key must be ignored, not error';
  end;
end $$;

reset role;
do $$ begin
  if (select count(*) from public.events where user_id = '11111111-1111-4111-8111-111111111111') <> 3 then
    raise exception 'FAIL: event count for A (expected 3)';
  end if;
  if exists (select 1 from public.events where user_id = '22222222-2222-4222-8222-222222222222') then
    raise exception 'FAIL: A wrote an event as B';
  end if;
end $$;
set local role authenticated;

-- ---------- logged-out API role ----------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  begin
    perform 1 from public.saves;
    raise exception 'FAIL: anon reads saves';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.push_save('{}'::jsonb, 1, null);
    raise exception 'FAIL: anon can call push_save';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.sync_player(null, 0, null);
    raise exception 'FAIL: anon can call sync_player';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------- admin via admin_users ----------
reset role;
insert into public.admin_users (user_id) values ('22222222-2222-4222-8222-222222222222');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
do $$
declare n integer;
begin
  -- Count only the test users: the sandbox also holds real e2e accounts.
  if (select count(*) from public.saves where user_id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')) <> 2 then
    raise exception 'FAIL: admin read all saves';
  end if;
  if (select count(*) from public.events where user_id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')) <> 3 then
    raise exception 'FAIL: admin read events';
  end if;
  if (select count(*) from public.purchases_sandbox where user_id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')) <> 1 then
    raise exception 'FAIL: admin read purchases';
  end if;
  update public.saves set data = '{"hacked":true}'
    where user_id = '11111111-1111-4111-8111-111111111111';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: admin is read-only on player saves'; end if;
end $$;

-- A save is intact.
reset role;
do $$ begin
  if (select data ->> 'coins' from public.saves
      where user_id = '11111111-1111-4111-8111-111111111111') <> '7'
     or (select revision from public.saves
      where user_id = '11111111-1111-4111-8111-111111111111') <> 3 then
    raise exception 'FAIL: A save changed';
  end if;
end $$;

-- ---------- M6 admin panel: roles, server-side checks, audit per write ----------
-- Make A's cloud save a v2 document with one paid grant (as owner).
update public.saves set data = '{"version":2,"revision":3,"coins":7,"coinBook":{"earn":{"d1":7},"spend":{},"grants":{"purchase:cs_test_rls_a":0}},"gems":120,"gemLedger":[{"id":"purchase:cs_test_rls_a","delta":120,"reason":"purchase:gems_small","at":1}],"noAds":true,"skins":[]}'
  where user_id = '11111111-1111-4111-8111-111111111111';
create temp table m6_cfg (c jsonb) on commit drop;
insert into m6_cfg values ('{"ads":{"interstitialPerSession":4,"interstitialPerDay":15,"rewardedPerSession":12,"rewardedPerDay":30,"placements":{"boost":{"session":6,"day":20}}},"chests":{"wood":{"odds":{"C":80,"R":18,"E":2,"L":0}},"silver":{"odds":{"C":70,"R":24,"E":5.5,"L":0.5}},"gold":{"odds":{"C":60,"R":28,"E":10,"L":2}},"royal":{"odds":{"C":50,"R":30,"E":15,"L":5}}},"difficulty":{"expectedP":[[0,0.5],[10,0.6]],"lossAssist":[[2,0.95],[3,0.9]],"scaleFloor":0.85}}');
grant select on m6_cfg to authenticated, anon;

-- Non-admin A: every admin RPC is refused server-side, admin tables are invisible/read-only.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
do $$
declare c jsonb := (select c from m6_cfg);
begin
  if public.admin_whoami() is not null then raise exception 'FAIL: A is not an admin'; end if;
  begin perform public.admin_find_players(''); raise exception 'FAIL: A find_players';
  exception when insufficient_privilege then null; end;
  begin perform public.admin_player_detail('11111111-1111-4111-8111-111111111111'); raise exception 'FAIL: A detail';
  exception when insufficient_privilege then null; end;
  begin perform public.admin_grant('11111111-1111-4111-8111-111111111111', 999, 999, 'self grant'); raise exception 'FAIL: A self-grant';
  exception when insufficient_privilege then null; end;
  begin perform public.admin_publish_config(c, 'x'); raise exception 'FAIL: A publish';
  exception when insufficient_privilege then null; end;
  begin perform public.admin_stats(now() - interval '1 day', now()); raise exception 'FAIL: A stats';
  exception when insufficient_privilege then null; end;
  begin perform private.admin_grant('11111111-1111-4111-8111-111111111111', 1, 1, 'direct call'); raise exception 'FAIL: A private grant';
  exception when insufficient_privilege then null; end;
  begin perform private.audit('x', null, null, null, null, 'forged'); raise exception 'FAIL: A forged audit';
  exception when insufficient_privilege then null; end;
  begin insert into public.admin_audit (action) values ('forged'); raise exception 'FAIL: A audit insert';
  exception when insufficient_privilege then null; end;
  begin insert into public.remote_config (config) values (c); raise exception 'FAIL: A config insert';
  exception when insufficient_privilege then null; end;
  begin insert into public.level_overrides (level_id, data) values ('x', '{}'); raise exception 'FAIL: A level insert';
  exception when insufficient_privilege then null; end;
  begin update public.admin_users set role = 'owner'; raise exception 'FAIL: A role edit';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.admin_audit) <> 0 then raise exception 'FAIL: A reads audit'; end if;
end $$;

-- Logged-out: no admin RPCs; the live remote config is public.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  begin perform public.admin_whoami(); raise exception 'FAIL: anon whoami';
  exception when insufficient_privilege then null; end;
  perform 1 from public.remote_config;
  begin perform 1 from public.admin_audit; raise exception 'FAIL: anon audit';
  exception when insufficient_privilege then null; end;
end $$;

-- B is a viewer (default role): read-only, email masked, writes refused.
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
do $$
declare r jsonb; c jsonb := (select c from m6_cfg);
begin
  if public.admin_whoami() <> 'viewer' then raise exception 'FAIL: B viewer'; end if;
  r := public.admin_find_players('rls-a@example.invalid');
  if jsonb_array_length(r) <> 1 or r -> 0 ->> 'email' <> 'r***@example.invalid' then
    raise exception 'FAIL: viewer lookup/mask %', r;
  end if;
  r := public.admin_player_detail('11111111-1111-4111-8111-111111111111');
  if (r -> 'save' -> 'data' ->> 'gems')::int <> 120 or jsonb_array_length(r -> 'purchases') <> 1 then
    raise exception 'FAIL: viewer detail %', r;
  end if;
  begin perform public.admin_grant('11111111-1111-4111-8111-111111111111', 10, 0, 'viewer grant'); raise exception 'FAIL: viewer grant';
  exception when insufficient_privilege then null; end;
  begin perform public.admin_reset_save('11111111-1111-4111-8111-111111111111', 'viewer reset', 'RESET'); raise exception 'FAIL: viewer reset';
  exception when insufficient_privilege then null; end;
  begin perform public.admin_publish_config(c, 'viewer'); raise exception 'FAIL: viewer publish';
  exception when insufficient_privilege then null; end;
  r := public.admin_stats(now() - interval '1 day', now() + interval '1 hour');
  if (r ->> 'players')::int < 1 then raise exception 'FAIL: viewer stats %', r; end if;
end $$;

-- B as support: capped grants with reason, reset with confirm; one audit row per write.
reset role;
update public.admin_users set role = 'support' where user_id = '22222222-2222-4222-8222-222222222222';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
do $$
declare r jsonb; c jsonb := (select c from m6_cfg);
begin
  begin perform public.admin_grant('11111111-1111-4111-8111-111111111111', 20000, 0, 'too much'); raise exception 'FAIL: support cap';
  exception when insufficient_privilege then null; end;
  begin perform public.admin_grant('11111111-1111-4111-8111-111111111111', 10, 0, 'no'); raise exception 'FAIL: short reason';
  exception when invalid_parameter_value then null; end;
  r := public.admin_grant('11111111-1111-4111-8111-111111111111', 100, 5, 'test grant for QA');
  if (r ->> 'coins')::int <> 107 or (r ->> 'gems')::int <> 125 then raise exception 'FAIL: grant %', r; end if;
  if (select count(*) from public.admin_audit where action = 'grant' and admin_id = '22222222-2222-4222-8222-222222222222') <> 1 then raise exception 'FAIL: grant audit'; end if;
  if (select (data -> 'coinBook' -> 'grants' ->> (r ->> 'key'))::int from public.saves
      where user_id = '11111111-1111-4111-8111-111111111111') <> 100 then raise exception 'FAIL: keyed grant'; end if;
  begin perform public.admin_publish_config(c, 'support'); raise exception 'FAIL: support publish';
  exception when insufficient_privilege then null; end;
  begin perform public.admin_reset_save('11111111-1111-4111-8111-111111111111', 'reset for QA', 'reset'); raise exception 'FAIL: reset confirm';
  exception when invalid_parameter_value then null; end;
  r := public.admin_reset_save('11111111-1111-4111-8111-111111111111', 'reset for QA', 'RESET');
  if (select count(*) from public.admin_audit where action = 'reset_save' and admin_id = '22222222-2222-4222-8222-222222222222') <> 1 then raise exception 'FAIL: reset audit'; end if;
end $$;

reset role;
do $$
declare d jsonb := (select data from public.saves where user_id = '11111111-1111-4111-8111-111111111111');
begin
  if (d ->> 'resetEpoch')::int <> 1 or (d ->> 'gems')::int <> 120 or (d ->> 'coins')::int <> 0
     or exists (select 1 from jsonb_object_keys(d -> 'coinBook' -> 'grants') as k where k like 'admin:%') or not (d ->> 'noAds')::boolean then
    raise exception 'FAIL: reset keeps paid items only %', d;
  end if;
  if exists (select 1 from public.level_progress where user_id = '11111111-1111-4111-8111-111111111111') then
    raise exception 'FAIL: reset clears progress';
  end if;
end $$;

-- liveops publishes (validated server-side), cannot change odds once live; owner rolls back.
update public.admin_users set role = 'liveops' where user_id = '22222222-2222-4222-8222-222222222222';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
do $$
declare c jsonb := (select c from m6_cfg); v1 integer; v2 integer;
begin
  begin perform public.admin_publish_config(jsonb_set(c, '{chests,gold,odds,L}', '3'), 'bad odds'); raise exception 'FAIL: odds publish check';
  exception when invalid_parameter_value then null; end;
  begin perform public.admin_publish_config(jsonb_set(c, '{ads,interstitialPerSession}', '6'), 'caps'); raise exception 'FAIL: cap publish check';
  exception when invalid_parameter_value then null; end;
  if array_length(public.admin_validate_config(jsonb_set(c, '{ads,interstitialPerDay}', '20')), 1) <> 1 then
    raise exception 'FAIL: validate reports cap';
  end if;
  v1 := public.admin_publish_config(c, 'first');
  v2 := public.admin_publish_config(jsonb_set(c, '{ads,interstitialPerSession}', '3'), 'fewer ads');
  begin perform public.admin_publish_config(jsonb_set(c, '{chests,gold,odds}', '{"C":59,"R":28,"E":10,"L":3}'), 'odds'); raise exception 'FAIL: liveops odds';
  exception when insufficient_privilege then null; end;
  begin perform public.admin_rollback_config(v1, 'roll it back'); raise exception 'FAIL: liveops rollback';
  exception when insufficient_privilege then null; end;
  perform public.admin_save_level('clover-run', '{"id":"clover-run","gates":[],"waves":[],"nestHp":100,"timeLimit":60}', 'tune nest');
  begin perform public.admin_save_level('clover-run', '{"id":"other"}', 'bad level'); raise exception 'FAIL: level shape';
  exception when invalid_parameter_value then null; end;
  if (select count(*) from public.admin_audit where action in ('config_publish', 'level_save') and admin_id = '22222222-2222-4222-8222-222222222222') <> 3 then
    raise exception 'FAIL: publish/level audit';
  end if;
end $$;

reset role;
update public.admin_users set role = 'owner' where user_id = '22222222-2222-4222-8222-222222222222';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
do $$
declare v integer;
begin
  v := public.admin_rollback_config((select min(version) from public.remote_config), 'back to first');
  if (select (config -> 'ads' ->> 'interstitialPerSession')::int from public.remote_config
      order by version desc limit 1) <> 4 then raise exception 'FAIL: rollback'; end if;
  if (select count(*) from public.admin_audit where admin_id = '22222222-2222-4222-8222-222222222222') <> 6 then raise exception 'FAIL: one audit row per write'; end if;
end $$;
reset role;

select 'M4/M5/M6 RLS tests: all passed' as result;
rollback;
