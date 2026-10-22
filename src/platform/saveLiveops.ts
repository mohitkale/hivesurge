/**
 * M7-3 live-ops save state (docs/design/liveops-m7.md). Merge-safe across devices: counters
 * for the same day / week / event / season take the max, claimed lists are unions, and a newer
 * period replaces an older one. Rewards are keyed grants, so a claim on two devices pays once.
 */
export interface PeriodCounts {
  /** UTC day `YYYY-MM-DD` (daily) or the Monday of the UTC week (weekly). */
  key: string;
  counts: Record<string, number>;
  /** Claimed target indexes. */
  claimed: number[];
}

export interface DailyState extends PeriodCounts {
  /** Target ids shown today (3), after an optional reroll. */
  picks: string[];
  /** Index rerolled today, -1 = free reroll unused. */
  rerolled: number;
  bonusClaimed: boolean;
}

export interface LoginState {
  /** Last UTC day the login reward was claimed. */
  lastDay: string;
  /** Day in the 7-day cycle (1..7) of `lastDay`. */
  streakDay: number;
  /** Monday key of the week the freeze ("honey jar") was last used. */
  freezeWeek: string;
}

export interface SeasonState {
  id: string;
  xp: number;
  claimedFree: number[];
  claimedPremium: number[];
}

export interface EventState {
  id: string;
  points: number;
  /** Milestone indexes claimed. */
  claimed: number[];
  /** Event levels cleared (0..levels). */
  cleared: number;
}

export interface LiveOpsState {
  daily: DailyState;
  weekly: PeriodCounts;
  login: LoginState;
  /** Consecutive wins (in battle). */
  winStreak: number;
  season: SeasonState;
  event: EventState;
}

export function defaultLiveOps(): LiveOpsState {
  return {
    daily: { key: '', counts: {}, claimed: [], picks: [], rerolled: -1, bonusClaimed: false },
    weekly: { key: '', counts: {}, claimed: [] },
    login: { lastDay: '', streakDay: 0, freezeWeek: '' },
    winStreak: 0,
    season: { id: '', xp: 0, claimedFree: [], claimedPremium: [] },
    event: { id: '', points: 0, claimed: [], cleared: 0 },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Shape-driven parse: every field takes the default's type (string ≤ 64, non-negative int,
 * boolean, int list, string list ≤ 3, or a counter record). Keeps the initial bundle small.
 */
function clean<T>(d: T, v: unknown): T {
  if (!isObj(v) || !isObj(d)) return d;
  const out: Record<string, unknown> = {};
  for (const [k, dv] of Object.entries(d)) {
    const x = v[k];
    if (typeof dv === 'string') out[k] = typeof x === 'string' && x.length <= 64 ? x : dv;
    else if (typeof dv === 'number')
      out[k] = Number.isInteger(x) && (x as number) >= (dv < 0 ? -1 : 0) ? x : dv;
    else if (typeof dv === 'boolean') out[k] = x === true;
    else if (Array.isArray(dv))
      out[k] = Array.isArray(x)
        ? k === 'picks'
          ? x.filter((y) => typeof y === 'string' && y.length <= 32).slice(0, 3)
          : [...new Set(x.filter((y) => Number.isInteger(y) && y >= 0))].slice(0, 64)
        : [];
    else if (k === 'counts') {
      const c: Record<string, number> = {};
      if (isObj(x))
        for (const [ck, n] of Object.entries(x).slice(0, 32))
          if (Number.isInteger(n) && (n as number) >= 0) c[ck] = n as number;
      out[k] = c;
    } else out[k] = clean(dv, x);
  }
  return out as T;
}

export function parseLiveOps(v: unknown): LiveOpsState {
  const s = clean(defaultLiveOps(), v);
  s.login.streakDay = Math.min(7, s.login.streakDay);
  return s;
}

const union = (a: number[], b: number[]) => [...new Set([...a, ...b])].sort((x, y) => x - y);
function maxCounts(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
}
function mergePeriod<T extends PeriodCounts>(
  a: T,
  b: T,
  both: (x: T, y: T) => Partial<T> = () => ({}),
): T {
  if (a.key !== b.key) return structuredClone(a.key > b.key ? a : b);
  return {
    ...a,
    counts: maxCounts(a.counts, b.counts),
    claimed: union(a.claimed, b.claimed),
    ...both(a, b),
  };
}

/** Conflict-free merge; `newerIsA` decides order-only choices (win streak). */
export function mergeLiveOps(a: LiveOpsState, b: LiveOpsState, newerIsA: boolean): LiveOpsState {
  const sameSeason = a.season.id === b.season.id;
  const sameEvent = a.event.id === b.event.id;
  return {
    daily: mergePeriod(a.daily, b.daily, (x, y) => {
      // A reroll on either device wins (it is the only way picks differ on the same day).
      const r = x.rerolled >= 0 ? x : y.rerolled >= 0 ? y : x;
      return {
        picks: [...r.picks],
        rerolled: r.rerolled,
        bonusClaimed: x.bonusClaimed || y.bonusClaimed,
      };
    }),
    weekly: mergePeriod(a.weekly, b.weekly),
    login:
      a.login.lastDay === b.login.lastDay
        ? {
            ...a.login,
            streakDay: Math.max(a.login.streakDay, b.login.streakDay),
            freezeWeek:
              a.login.freezeWeek > b.login.freezeWeek ? a.login.freezeWeek : b.login.freezeWeek,
          }
        : { ...(a.login.lastDay > b.login.lastDay ? a.login : b.login) },
    winStreak: newerIsA ? a.winStreak : b.winStreak,
    season: sameSeason
      ? {
          id: a.season.id,
          xp: Math.max(a.season.xp, b.season.xp),
          claimedFree: union(a.season.claimedFree, b.season.claimedFree),
          claimedPremium: union(a.season.claimedPremium, b.season.claimedPremium),
        }
      : structuredClone(a.season.id > b.season.id ? a.season : b.season),
    event: sameEvent
      ? {
          id: a.event.id,
          points: Math.max(a.event.points, b.event.points),
          claimed: union(a.event.claimed, b.event.claimed),
          cleared: Math.max(a.event.cleared, b.event.cleared),
        }
      : structuredClone((newerIsA ? a : b).event),
  };
}
