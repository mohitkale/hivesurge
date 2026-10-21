-- M4-3 RLS abuse tests. Run as the database owner (Supabase SQL editor / MCP execute_sql).
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
  insert into public.purchases_sandbox (sku) values ('gems_small');
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
    insert into public.purchases_sandbox (sku, sandbox) values ('x', false);
    raise exception 'FAIL: non-sandbox purchase allowed';
  exception when check_violation or insufficient_privilege then null;
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
  if (select count(*) from public.saves) <> 2 then raise exception 'FAIL: admin read all saves'; end if;
  if (select count(*) from public.events) <> 3 then raise exception 'FAIL: admin read events'; end if;
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

select 'M4 RLS tests: all passed' as result;
rollback;
