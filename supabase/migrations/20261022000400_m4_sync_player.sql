-- M4-5/M4-6: one batched round trip per sync (client sends at most one every 10 s).
-- Writes the save (optimistic concurrency via push_save), progress/stats (monotonic via
-- sync_progress) and an events batch (idempotent), then reports the cloud save state.
-- SECURITY INVOKER: RLS applies to the save and progress writes; events go through the narrow
-- private.insert_events helper below.
--
-- Returns {"ok": bool, "revision": int|null, "data": jsonb|null}. `ok` is false on a revision
-- conflict; `data` is the cloud save when the client must merge it (conflict) or adopt it (the
-- client sent no save and the cloud revision differs from p_expected).
-- Events are insert-only for players (no SELECT policy), but INSERT ... ON CONFLICT needs to see
-- existing rows to skip duplicates. This SECURITY DEFINER helper does only that, always for
-- auth.uid() (it takes no user id), so it cannot read or write anyone else's events.
create function private.insert_events(p_events jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  insert into public.events (user_id, session, name, props, client_ts)
  select uid, e.session, e.name, coalesce(e.props, '{}'::jsonb), e.client_ts
  from jsonb_to_recordset(coalesce(p_events, '[]'::jsonb))
    as e (session text, name text, props jsonb, client_ts timestamptz)
  on conflict (user_id, session, client_ts, name) do nothing;
end;
$$;
revoke all on function private.insert_events(jsonb) from public, anon;
grant execute on function private.insert_events(jsonb) to authenticated;

create function public.sync_player(
  p_data jsonb,
  p_revision integer,
  p_expected integer,
  p_levels jsonb default '[]'::jsonb,
  p_stats jsonb default '{}'::jsonb,
  p_events jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ok boolean := true;
  cur_rev integer;
  cur_data jsonb;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if jsonb_typeof(coalesce(p_events, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_events, '[]'::jsonb)) > 200 then
    raise exception 'bad events batch' using errcode = '22023';
  end if;

  if p_data is not null then
    ok := public.push_save(p_data, p_revision, p_expected);
  end if;

  if jsonb_array_length(coalesce(p_levels, '[]'::jsonb)) > 0
     or coalesce(p_stats, '{}'::jsonb) <> '{}'::jsonb then
    perform public.sync_progress(coalesce(p_levels, '[]'::jsonb), coalesce(p_stats, '{}'::jsonb));
  end if;

  if jsonb_array_length(coalesce(p_events, '[]'::jsonb)) > 0 then
    perform private.insert_events(p_events);
  end if;

  select s.revision, s.data into cur_rev, cur_data from public.saves s where s.user_id = uid;

  return jsonb_build_object(
    'ok', ok,
    'revision', cur_rev,
    'data', case
      when cur_rev is not null
        and (not ok or (p_data is null and cur_rev is distinct from p_expected)) then cur_data
      else null
    end);
end;
$$;

revoke all on function public.sync_player(jsonb, integer, integer, jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function public.sync_player(jsonb, integer, integer, jsonb, jsonb, jsonb)
  to authenticated;
