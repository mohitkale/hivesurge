-- M5-4c: sync_player also returns the server time ("now", ms since epoch) so the client can
-- anchor its trusted game clock (chest/build timers must not speed up with the device clock).
-- Same body as 20261022000400 otherwise.
create or replace function public.sync_player(
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
    end,
    'now', floor(extract(epoch from clock_timestamp()) * 1000)::bigint);
end;
$$;

revoke all on function public.sync_player(jsonb, integer, integer, jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function public.sync_player(jsonb, integer, integer, jsonb, jsonb, jsonb)
  to authenticated;
