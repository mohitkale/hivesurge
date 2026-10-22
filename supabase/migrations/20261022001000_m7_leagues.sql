-- M7-13 weekly leagues (carry-over e: real rankings in the sandbox, mock fallback in the game).
-- league_scores: one row per player per week (Monday, UTC), written only through league_submit
-- (monotonic, capped). league_ratings: Elo-style rating used for seeding (not hive power).
-- league_board returns the caller's group with pseudonymous names; no user ids leave the server.

create table public.league_ratings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  rating integer not null default 1000 check (rating between 0 and 10000),
  updated_at timestamptz not null default now()
);
create table public.league_scores (
  week date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  score integer not null default 0 check (score between 0 and 100000),
  updated_at timestamptz not null default now(),
  primary key (week, user_id)
);
create index league_scores_user_idx on public.league_scores (user_id);

alter table public.league_ratings enable row level security;
alter table public.league_scores enable row level security;
revoke all on public.league_ratings, public.league_scores from anon, authenticated;
grant select on public.league_ratings, public.league_scores to authenticated;
create policy league_ratings_own on public.league_ratings for select to authenticated
  using (user_id = (select auth.uid()));
create policy league_scores_own on public.league_scores for select to authenticated
  using (user_id = (select auth.uid()));

create function private.league_week() returns date language sql stable set search_path = ''
  as $$ select date_trunc('week', now() at time zone 'utc')::date; $$;

create function private.league_submit(p_score integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  s integer;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if p_score is null or p_score < 0 or p_score > 100000 then
    raise exception 'score out of range' using errcode = '22023';
  end if;
  insert into public.league_ratings (user_id) values (uid) on conflict do nothing;
  insert into public.league_scores as ls (week, user_id, score)
    values (private.league_week(), uid, p_score)
    on conflict (week, user_id) do update
      set score = greatest(ls.score, excluded.score), updated_at = now()
    returning score into s;
  return s;
end;
$$;

-- Caller's group this week: seeded by rating into round(n / 40) contiguous groups (30..50).
create function private.league_board()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  n integer;
  g integer;
  mine integer;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select count(*) into n from public.league_scores where week = private.league_week();
  if n = 0 then return jsonb_build_object('week', private.league_week(), 'rows', '[]'::jsonb); end if;
  g := greatest(1, round(n / 40.0)::integer);
  while g > 1 and n::numeric / g < 30 loop g := g - 1; end loop;
  while n::numeric / g > 50 loop g := g + 1; end loop;
  return (
    with seeded as (
      select s.user_id, s.score, coalesce(r.rating, 1000) as rating,
        row_number() over (order by coalesce(r.rating, 1000) desc, s.user_id) as rn
      from public.league_scores s
      left join public.league_ratings r on r.user_id = s.user_id
      where s.week = private.league_week()
    ), grouped as (
      select *, floor((rn - 1) * g::numeric / n)::integer as grp from seeded
    )
    select jsonb_build_object(
      'week', private.league_week(),
      'rating', (select rating from grouped where user_id = uid),
      'rows', coalesce(jsonb_agg(jsonb_build_object(
        'name', 'Bee-' || left(md5(x.user_id::text), 4),
        'score', x.score,
        'you', x.user_id = uid) order by x.score desc), '[]'::jsonb))
    from grouped x
    where x.grp = (select grp from grouped where user_id = uid)
  );
end;
$$;

revoke all on function private.league_week(), private.league_submit(integer), private.league_board()
  from public, anon;
grant execute on function private.league_week(), private.league_submit(integer), private.league_board()
  to authenticated;
create function public.league_submit(p_score integer) returns integer language sql
  security invoker set search_path = '' as $$ select private.league_submit(p_score); $$;
create function public.league_board() returns jsonb language sql stable
  security invoker set search_path = '' as $$ select private.league_board(); $$;
revoke all on function public.league_submit(integer), public.league_board() from public, anon;
grant execute on function public.league_submit(integer), public.league_board() to authenticated;
