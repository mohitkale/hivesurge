-- M4-5 / M4-6: RPCs. SECURITY INVOKER, so RLS still applies; they only add atomicity.

-- Optimistic-concurrency save write. p_expected = the server revision the client last saw
-- (null = no cloud save yet). Returns true on success, false on a revision conflict.
create function public.push_save(p_data jsonb, p_revision integer, p_expected integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  n integer;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if p_revision is null or p_revision <= coalesce(p_expected, -1) then
    raise exception 'revision must increase' using errcode = '22023';
  end if;
  if p_expected is null then
    insert into public.saves (user_id, revision, data)
      values (uid, p_revision, p_data)
      on conflict (user_id) do nothing;
  else
    update public.saves
      set revision = p_revision, data = p_data, updated_at = now()
      where user_id = uid and revision = p_expected;
  end if;
  get diagnostics n = row_count;
  return n = 1;
end;
$$;

-- Progress + stats in one request. Values only ever go up (max-merge), so retries and
-- multiple devices are safe. p_levels: [{"level_id": text, "best_stars": int, "best_coins": int}]
create function public.sync_progress(p_levels jsonb, p_stats jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if jsonb_typeof(p_levels) <> 'array' or jsonb_array_length(p_levels) > 500 then
    raise exception 'bad levels' using errcode = '22023';
  end if;

  insert into public.level_progress as lp (user_id, level_id, best_stars, best_coins)
  select uid, l.level_id, least(greatest(l.best_stars, 0), 3), greatest(l.best_coins, 0)
  from jsonb_to_recordset(p_levels) as l (level_id text, best_stars integer, best_coins integer)
  where l.level_id is not null
  on conflict (user_id, level_id) do update
    set best_stars = greatest(lp.best_stars, excluded.best_stars),
        best_coins = greatest(lp.best_coins, excluded.best_coins),
        updated_at = now();

  insert into public.player_stats as ps (
    user_id, battles, wins, losses, total_stars, levels_cleared, coins_earned, gems_earned,
    gems_spent)
  values (
    uid,
    greatest(coalesce((p_stats ->> 'battles')::integer, 0), 0),
    greatest(coalesce((p_stats ->> 'wins')::integer, 0), 0),
    greatest(coalesce((p_stats ->> 'losses')::integer, 0), 0),
    greatest(coalesce((p_stats ->> 'total_stars')::integer, 0), 0),
    greatest(coalesce((p_stats ->> 'levels_cleared')::integer, 0), 0),
    greatest(coalesce((p_stats ->> 'coins_earned')::bigint, 0), 0),
    greatest(coalesce((p_stats ->> 'gems_earned')::bigint, 0), 0),
    greatest(coalesce((p_stats ->> 'gems_spent')::bigint, 0), 0))
  on conflict (user_id) do update
    set battles = greatest(ps.battles, excluded.battles),
        wins = greatest(ps.wins, excluded.wins),
        losses = greatest(ps.losses, excluded.losses),
        total_stars = greatest(ps.total_stars, excluded.total_stars),
        levels_cleared = greatest(ps.levels_cleared, excluded.levels_cleared),
        coins_earned = greatest(ps.coins_earned, excluded.coins_earned),
        gems_earned = greatest(ps.gems_earned, excluded.gems_earned),
        gems_spent = greatest(ps.gems_spent, excluded.gems_spent),
        updated_at = now();
end;
$$;

revoke all on function public.push_save(jsonb, integer, integer) from public, anon;
revoke all on function public.sync_progress(jsonb, jsonb) from public, anon;
grant execute on function public.push_save(jsonb, integer, integer) to authenticated;
grant execute on function public.sync_progress(jsonb, jsonb) to authenticated;
