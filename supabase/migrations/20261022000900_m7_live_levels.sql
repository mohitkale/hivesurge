-- M7 carry-over (a): the game plays admin-edited level rows, with fallback to shipped files.
-- Players (anon or signed in) may read only the level payload columns; who edited a row
-- (updated_by) stays admin-only through private.admin_levels(). Writes stay admin RPC only.
-- Also M7-3: the server publish check learns the season and event-rule ranges.

revoke select on public.level_overrides from authenticated;
grant select (level_id, data, version, updated_at) on public.level_overrides to anon, authenticated;

drop policy level_overrides_select on public.level_overrides;
create policy level_overrides_read on public.level_overrides for select to anon, authenticated
  using (true);

-- Admin list including the editor (role-checked definer; public invoker wrapper).
create function private.admin_levels()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_role(array['viewer', 'support', 'liveops', 'owner']);
  return coalesce((select jsonb_agg(jsonb_build_object(
      'level_id', l.level_id, 'data', l.data, 'version', l.version,
      'updated_by', l.updated_by, 'updated_at', l.updated_at) order by l.level_id)
    from public.level_overrides l), '[]'::jsonb);
end;
$$;
revoke all on function private.admin_levels() from public, anon;
grant execute on function private.admin_levels() to authenticated;
create function public.admin_levels() returns jsonb language sql stable security invoker
  set search_path = '' as $$ select private.admin_levels(); $$;
revoke all on function public.admin_levels() from public, anon;
grant execute on function public.admin_levels() to authenticated;

-- Publish check: keep the M6 rules and add season + event-rule ranges (client runs the same).
alter function private.validate_remote_config(jsonb) rename to validate_remote_config_m6;
create function private.validate_remote_config(c jsonb)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  e text[] := private.validate_remote_config_m6(c);
  z jsonb := c -> 'season';
  ev jsonb;
  r jsonb;
begin
  if jsonb_typeof(c) <> 'object' then return e; end if;
  if z is not null and (
       jsonb_typeof(z) <> 'object'
       or jsonb_typeof(z -> 'id') <> 'string' or (z ->> 'id') !~ '^[a-z0-9-]{1,32}$'
       or jsonb_typeof(z -> 'start') <> 'number'
       or jsonb_typeof(z -> 'days') <> 'number' or (z ->> 'days')::numeric not between 1 and 60
       or jsonb_typeof(z -> 'xpPerTier') <> 'number'
       or (z ->> 'xpPerTier')::numeric not between 50 and 2000) then
    e := e || 'season needs an id, start, days 1..60 and xpPerTier 50..2000'::text;
  end if;
  if jsonb_typeof(c -> 'events') = 'array' then
    for ev in select * from jsonb_array_elements(c -> 'events') loop
      r := ev -> 'rules';
      if r is null then continue; end if;
      if jsonb_typeof(r) <> 'object'
         or (r ? 'gateAdd' and (jsonb_typeof(r -> 'gateAdd') <> 'number' or (r ->> 'gateAdd')::numeric not between 0 and 5))
         or (r ? 'waveMul' and (jsonb_typeof(r -> 'waveMul') <> 'number' or (r ->> 'waveMul')::numeric not between 0.5 and 2))
         or (r ? 'queenChargeMul' and (jsonb_typeof(r -> 'queenChargeMul') <> 'number' or (r ->> 'queenChargeMul')::numeric not between 0.25 and 2))
         or (r ? 'hornetShare' and (jsonb_typeof(r -> 'hornetShare') <> 'number' or (r ->> 'hornetShare')::numeric not between 0 and 0.6))
         or (r ? 'onlyX3' and jsonb_typeof(r -> 'onlyX3') <> 'boolean') then
        e := e || format('events.%s.rules out of range', ev ->> 'id');
      end if;
    end loop;
  end if;
  return e;
end;
$$;
revoke all on function private.validate_remote_config(jsonb), private.validate_remote_config_m6(jsonb)
  from public, anon;
grant execute on function private.validate_remote_config(jsonb), private.validate_remote_config_m6(jsonb)
  to authenticated;
