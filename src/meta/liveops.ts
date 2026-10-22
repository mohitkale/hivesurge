import { CHESTS, type ChestType } from './defs';
import { awardChest, creditKeyed, type Rng } from './economy';
import { recordGems } from '../platform/gemLedger';
import type { LiveEvent, RemoteConfig } from '../platform/remoteConfig';
import type { SaveData } from '../platform/save';
import { emptyBee } from '../platform/saveMeta';
import type { LiveOpsState } from '../platform/saveLiveops';
import type { LevelDef } from '../sim/types';

/**
 * M7-3 live-ops engine (docs/design/liveops-m7.md): daily / weekly targets, login and win
 * streaks, season pass, and the remote-config events calendar. Pure functions over the save
 * and a trusted time (`gameClock().now()`), so tests drive it with a mock clock. All resets
 * are UTC 00:00; weeks start Monday. Every reward is a keyed grant, so claiming the same
 * reward on two offline devices pays once after a merge.
 */

export const DAY = 86_400_000;

/** UTC day key `YYYY-MM-DD`. */
export const dayKey = (t: number) => new Date(Math.floor(t / DAY) * DAY).toISOString().slice(0, 10);

/** Monday (UTC) of the week containing `t`, as a day key. */
export function weekKey(t: number): string {
  const d = Math.floor(t / DAY);
  const dow = (new Date(d * DAY).getUTCDay() + 6) % 7; // 0 = Monday
  return dayKey((d - dow) * DAY);
}

const dayNo = (key: string) => Math.floor(Date.parse(`${key}T00:00:00Z`) / DAY);

// ----------------------------------------------------------------- rewards

/** Reward string: `coins:200`, `gems:5`, `chest:silver`, `cards:orchid:2`, `skin:season-s1`, `xp:50`. */
export type Reward = string;

export function rewardValid(r: unknown): boolean {
  if (typeof r !== 'string') return false;
  const [k, a, b] = r.split(':');
  const pos = (v: string | undefined) =>
    !!v && /^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 100000;
  if (k === 'coins' || k === 'gems' || k === 'xp') return pos(a);
  if (k === 'chest') return !!a && a in CHESTS;
  if (k === 'cards') return !!a && /^[a-z-]{2,24}$/.test(a) && pos(b);
  if (k === 'skin') return !!a && /^[a-z0-9-]{2,32}$/.test(a);
  return false;
}

/** Short label for UI. */
export function rewardLabel(r: Reward): string {
  const [k, a, b] = r.split(':');
  if (k === 'coins') return `🪙 ${a}`;
  if (k === 'gems') return `💎 ${a}`;
  if (k === 'xp') return `✨ ${a} XP`;
  if (k === 'chest') return `🎁 ${CHESTS[a as ChestType]?.name ?? a}`;
  if (k === 'cards') return `🃏 ${b} ${a}`;
  if (k === 'skin') return `🎨 ${a}`;
  return r;
}

/**
 * Grant `r` once under `key`. Returns false if it could not be granted (e.g. no free chest
 * slot) so the caller leaves the claim open.
 */
export function grantReward(s: SaveData, r: Reward, key: string, now: number, rng: Rng): boolean {
  const [k, a, b] = r.split(':');
  if (k === 'coins') s.coins = creditKeyed(s.coinBook, s.coins, key, Number(a));
  else if (k === 'gems') {
    if (s.gemLedger.some((e) => e.id === key)) return true;
    recordGems(s, Number(a), key, now, key);
  } else if (k === 'xp') s.meta.xp = creditKeyed(s.meta.xpBook, s.meta.xp, key, Number(a));
  else if (k === 'chest') return awardChest(s, a as ChestType, now, rng) !== null;
  else if (k === 'cards') {
    const bee = (s.meta.bees[a] ??= emptyBee());
    let n = Number(b);
    if (bee.level === 0) {
      bee.level = 1;
      n--;
    }
    if (n > 0) bee.pollen = creditKeyed(bee.book, bee.pollen, key, n);
  } else if (k === 'skin') {
    if (!s.skins.includes(a)) s.skins.push(a);
  } else return false;
  return true;
}

// ----------------------------------------------------------------- daily / weekly targets

export type Metric =
  | 'win'
  | 'queen'
  | 'x3'
  | 'hornet'
  | 'stars2'
  | 'chest'
  | 'boss'
  | 'upgrade'
  | 'dailyBonus'
  | 'eventPts';

export interface TargetDef {
  id: string;
  title: string;
  icon: string;
  metric: Metric;
  goal: number;
  reward: Reward;
  /** Drawn only once the player has cleared this many campaign levels. */
  minStage?: number;
}

export const DAILY_POOL: readonly TargetDef[] = [
  { id: 'd-win', title: 'Win battles', icon: '🏆', metric: 'win', goal: 3, reward: 'coins:100' },
  {
    id: 'd-queen',
    title: 'Launch queens',
    icon: '👑',
    metric: 'queen',
    goal: 15,
    reward: 'coins:80',
  },
  {
    id: 'd-x3',
    title: 'Pass ×3 gates in battles',
    icon: '✖️',
    metric: 'x3',
    goal: 3,
    reward: 'coins:80',
    minStage: 3,
  },
  {
    id: 'd-hornet',
    title: 'Defeat hornets',
    icon: '🐝',
    metric: 'hornet',
    goal: 30,
    reward: 'coins:100',
    minStage: 3,
  },
  {
    id: 'd-stars',
    title: 'Earn 2+ stars on a level',
    icon: '⭐',
    metric: 'stars2',
    goal: 2,
    reward: 'gems:5',
  },
  { id: 'd-chest', title: 'Open chests', icon: '🎁', metric: 'chest', goal: 2, reward: 'coins:60' },
];
export const DAILY_BONUS: Reward[] = ['chest:wood', 'xp:0'];
export const DAILY_BONUS_PASS_XP = 50;
export const TARGET_PASS_XP = 20;

export const WEEKLY_TARGETS: readonly TargetDef[] = [
  {
    id: 'w-win',
    title: 'Win battles',
    icon: '🏆',
    metric: 'win',
    goal: 25,
    reward: 'chest:silver',
  },
  {
    id: 'w-boss',
    title: 'Beat a boss level',
    icon: '👹',
    metric: 'boss',
    goal: 2,
    reward: 'gems:20',
  },
  {
    id: 'w-bonus',
    title: 'Complete the daily bonus',
    icon: '📅',
    metric: 'dailyBonus',
    goal: 5,
    reward: 'chest:gold',
  },
  {
    id: 'w-upgrade',
    title: 'Upgrade bees',
    icon: '⬆️',
    metric: 'upgrade',
    goal: 5,
    reward: 'coins:500',
  },
  {
    id: 'w-event',
    title: 'Event points',
    icon: '🎪',
    metric: 'eventPts',
    goal: 1500,
    reward: 'gems:15',
  },
];
export const WEEKLY_PASS_XP = 100;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Deterministic 3 targets for a UTC day from the eligible pool. */
export function drawDaily(day: string, stage: number, exclude: string[] = []): string[] {
  const pool = DAILY_POOL.filter((t) => stage >= (t.minStage ?? 0) && !exclude.includes(t.id));
  const order = [...pool].sort((a, b) => hash(day + a.id) - hash(day + b.id));
  return order.slice(0, 3).map((t) => t.id);
}

/** Roll the daily / weekly periods (and login is left to `claimLogin`). */
export function rollPeriods(L: LiveOpsState, now: number, stage: number): void {
  const d = dayKey(now);
  if (L.daily.key !== d)
    L.daily = {
      key: d,
      counts: {},
      claimed: [],
      picks: drawDaily(d, stage),
      rerolled: -1,
      bonusClaimed: false,
    };
  else if (L.daily.picks.length < 3) L.daily.picks = drawDaily(d, stage);
  const w = weekKey(now);
  if (L.weekly.key !== w) L.weekly = { key: w, counts: {}, claimed: [] };
}

export const dailyTargets = (L: LiveOpsState): TargetDef[] =>
  L.daily.picks.map((id) => DAILY_POOL.find((t) => t.id === id)).filter((t): t is TargetDef => !!t);

/** One free reroll per day: swaps target `i` for another eligible one not shown today. */
export function rerollDaily(L: LiveOpsState, i: number, stage: number): boolean {
  if (L.daily.rerolled >= 0 || i < 0 || i >= L.daily.picks.length || L.daily.claimed.includes(i))
    return false;
  const next = drawDaily(L.daily.key, stage, L.daily.picks)[0];
  if (!next) return false;
  L.daily.picks[i] = next;
  L.daily.counts[next] = 0;
  L.daily.rerolled = i;
  return true;
}

export interface BattleFacts {
  won: boolean;
  queens: number;
  x3Passes: number;
  hornetKills: number;
  stars: number;
  boss: boolean;
  /** Event points earned (event levels only). */
  eventPts?: number;
}

/** Feed one finished battle into today's and this week's counters. */
export function recordBattle(L: LiveOpsState, f: BattleFacts): void {
  const add = (m: Metric, n: number) => {
    if (n <= 0) return;
    L.daily.counts[m] = (L.daily.counts[m] ?? 0) + n;
    L.weekly.counts[m] = (L.weekly.counts[m] ?? 0) + n;
  };
  add('win', f.won ? 1 : 0);
  add('queen', f.queens);
  add('x3', f.x3Passes);
  add('hornet', f.hornetKills);
  add('stars2', f.won && f.stars >= 2 ? 1 : 0);
  add('boss', f.won && f.boss ? 1 : 0);
  add('eventPts', f.eventPts ?? 0);
  L.winStreak = f.won ? L.winStreak + 1 : 0;
}

/** Count a non-battle action (chest opened, bee upgraded). */
export function recordAction(L: LiveOpsState, m: 'chest' | 'upgrade', n = 1): void {
  L.daily.counts[m] = (L.daily.counts[m] ?? 0) + n;
  L.weekly.counts[m] = (L.weekly.counts[m] ?? 0) + n;
}

export const progressOf = (counts: Record<string, number>, t: TargetDef) =>
  Math.min(t.goal, counts[t.metric] ?? 0);

/** Claim daily target `i`: reward + 20 pass XP. */
export function claimDaily(
  s: SaveData,
  i: number,
  now: number,
  rng: Rng,
  season?: SeasonDef,
): boolean {
  const L = s.meta.liveops;
  const t = dailyTargets(L)[i];
  if (!t || L.daily.claimed.includes(i) || progressOf(L.daily.counts, t) < t.goal) return false;
  if (!grantReward(s, t.reward, `daily:${L.daily.key}:${t.id}`, now, rng)) return false;
  L.daily.claimed.push(i);
  addPassXp(s, TARGET_PASS_XP, now, season);
  return true;
}

/** All 3 daily targets claimed: Wood chest + 50 pass XP, and a weekly "daily bonus" count. */
export function claimDailyBonus(s: SaveData, now: number, rng: Rng, season?: SeasonDef): boolean {
  const L = s.meta.liveops;
  if (L.daily.bonusClaimed || L.daily.claimed.length < 3) return false;
  if (!grantReward(s, 'chest:wood', `dailybonus:${L.daily.key}`, now, rng)) return false;
  L.daily.bonusClaimed = true;
  L.weekly.counts.dailyBonus = (L.weekly.counts.dailyBonus ?? 0) + 1;
  addPassXp(s, DAILY_BONUS_PASS_XP, now, season);
  return true;
}

export function claimWeekly(
  s: SaveData,
  i: number,
  now: number,
  rng: Rng,
  season?: SeasonDef,
): boolean {
  const L = s.meta.liveops;
  const t = WEEKLY_TARGETS[i];
  if (!t || L.weekly.claimed.includes(i) || progressOf(L.weekly.counts, t) < t.goal) return false;
  if (!grantReward(s, t.reward, `weekly:${L.weekly.key}:${t.id}`, now, rng)) return false;
  L.weekly.claimed.push(i);
  addPassXp(s, WEEKLY_PASS_XP, now, season);
  return true;
}

// ----------------------------------------------------------------- streaks

export const LOGIN_REWARDS: Reward[] = [
  'coins:100',
  'chest:wood',
  'gems:5',
  'coins:300',
  'chest:silver',
  'gems:10',
  'chest:royal',
];

/**
 * Login streak (7-day cycle). Next consecutive day advances; one missed day is frozen by the
 * weekly honey jar (1 per week); a longer gap restarts at day 1. No paid repair.
 * Returns the day claimed (1..7), or 0 when today is already claimed or the chest has no slot.
 */
export function claimLogin(s: SaveData, now: number, rng: Rng): number {
  const L = s.meta.liveops.login;
  const today = dayKey(now);
  if (L.lastDay === today) return 0;
  const gap = L.lastDay ? dayNo(today) - dayNo(L.lastDay) : Infinity;
  if (gap < 0) return 0; // trusted clock went back: never re-claim
  let next = 1;
  let freeze = L.freezeWeek;
  if (gap === 1) next = (L.streakDay % 7) + 1;
  else if (gap === 2 && L.freezeWeek !== weekKey(now)) {
    next = (L.streakDay % 7) + 1;
    freeze = weekKey(now);
  }
  if (!grantReward(s, LOGIN_REWARDS[next - 1], `login:${today}`, now, rng)) return 0;
  s.meta.liveops.login = { lastDay: today, streakDay: next, freezeWeek: freeze };
  return next;
}

/** Win-streak coin bonus for the next win: 3 straight wins +20%, 5+ wins +40% (capped). */
export const winStreakBonus = (streakBeforeWin: number) =>
  streakBeforeWin >= 5 ? 1.4 : streakBeforeWin >= 3 ? 1.2 : 1;

// ----------------------------------------------------------------- season pass

export interface SeasonDef {
  id: string;
  /** Start time (ms, UTC). */
  start: number;
  days: number;
  xpPerTier: number;
}

export const TIERS = 30;
export const PASS_XP = { win: 30, loss: 10 } as const;

/** Tier rewards (liveops-m7.md table); unlisted tiers: free 150 coins, premium 300 coins. */
const FREE: Record<number, Reward> = {
  1: 'coins:200',
  3: 'chest:wood',
  5: 'gems:5',
  8: 'chest:silver',
  10: 'coins:500',
  12: 'cards:carpenter:5',
  15: 'gems:10',
  18: 'chest:silver',
  20: 'coins:800',
  23: 'chest:gold',
  25: 'gems:15',
  28: 'chest:gold',
  30: 'chest:royal',
};
/** Premium is paid, so every reward is fixed and named (M5-11: no chests, no random cards). */
const PREMIUM: Record<number, Reward[]> = {
  1: ['cards:orchid:2', 'skin:season-frame'],
  3: ['gems:20'],
  5: ['cards:bumble:4', 'cards:mason:2', 'coins:120'],
  8: ['coins:1000'],
  10: ['skin:season-bee'],
  12: ['cards:dart:6', 'cards:sweat:4', 'cards:leafcutter:2', 'coins:300'],
  15: ['gems:40'],
  18: ['cards:leafcutter:5'],
  20: ['cards:bumble:10', 'cards:carpenter:6', 'cards:honeyguard:4', 'coins:500'],
  23: ['gems:50'],
  25: ['cards:frost-wing:3'],
  28: ['skin:season-hive'],
  30: ['skin:season-cannon', 'gems:100'],
};
export const freeReward = (tier: number): Reward[] => [FREE[tier] ?? 'coins:150'];
export const premiumRewards = (tier: number): Reward[] => PREMIUM[tier] ?? ['coins:300'];

export function activeSeason(cfg: Pick<RemoteConfig, 'season'>, now: number): SeasonDef | null {
  const s = cfg.season;
  if (!s) return null;
  return now >= s.start && now < s.start + s.days * DAY ? s : null;
}

/** Sync the save's season state to the active season (a new season starts at 0 XP). */
export function syncSeason(L: LiveOpsState, season: SeasonDef | null): void {
  if (season && L.season.id !== season.id)
    L.season = { id: season.id, xp: 0, claimedFree: [], claimedPremium: [] };
}

export function addPassXp(s: SaveData, xp: number, now: number, season?: SeasonDef | null): void {
  void now;
  if (!season) return;
  syncSeason(s.meta.liveops, season);
  s.meta.liveops.season.xp += Math.max(0, Math.floor(xp));
}

export const passTier = (xp: number, xpPerTier: number) =>
  Math.min(TIERS, Math.floor(xp / xpPerTier));

/** Claim tier `t` on a track. Premium needs the season pass; retroactive for earned tiers. */
export function claimTier(
  s: SaveData,
  season: SeasonDef | null,
  t: number,
  track: 'free' | 'premium',
  now: number,
  rng: Rng,
): boolean {
  if (!season) return false;
  const L = s.meta.liveops;
  syncSeason(L, season);
  if (t < 1 || t > passTier(L.season.xp, season.xpPerTier)) return false;
  if (track === 'premium' && !s.meta.seasonPremium) return false;
  const claimed = track === 'free' ? L.season.claimedFree : L.season.claimedPremium;
  if (claimed.includes(t)) return false;
  const rewards = track === 'free' ? freeReward(t) : premiumRewards(t);
  for (const [i, r] of rewards.entries())
    if (!grantReward(s, r, `pass:${season.id}:${t}:${track[0]}${i}`, now, rng)) return false;
  claimed.push(t);
  return true;
}

// ----------------------------------------------------------------- events calendar

/** Rule twists an event (or the weekly rule-tweak event, M7-10) can apply to its levels. */
export interface EventRules {
  /** All + / × gates gain this value (Pollen Rush). */
  gateAdd?: number;
  /** Wave sizes ×, 0.5..2 (Pollen Rush 1.3). */
  waveMul?: number;
  /** Queen charge time ×, 0.25..2 (Queen's Ball 0.5). */
  queenChargeMul?: number;
  /** Share of wasps that come as hornets, 0..0.6 (Hornet Hunt 0.5). */
  hornetShare?: number;
  /** M7-10 rule tweak: only ×3 gates count (other + / × gates are removed; traps stay). */
  onlyX3?: boolean;
  /** Event levels in the event (default 3); the last one is the event final level. */
  levels?: number;
  /** 1-based campaign level the event levels are built from (default 6, validated range). */
  baseLevel?: number;
  /** Points: per win, per queen, per hornet; multiplier (finale 1.5). */
  points?: { win?: number; queen?: number; hornet?: number; mul?: number };
  /** [points, reward] milestones, ascending. */
  milestones?: [number, Reward][];
}

const inRange = (v: unknown, lo: number, hi: number) =>
  v === undefined || (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi);

/** Publish check for `events[].rules` (remote config M6-5). */
export function validateEventRules(r: unknown, path = 'rules'): string[] {
  const e: string[] = [];
  if (r === undefined) return e;
  if (!r || typeof r !== 'object' || Array.isArray(r)) return [`${path} must be an object`];
  const x = r as EventRules;
  if (!inRange(x.gateAdd, 0, 5)) e.push(`${path}.gateAdd must be 0..5`);
  if (!inRange(x.waveMul, 0.5, 2)) e.push(`${path}.waveMul must be 0.5..2`);
  if (!inRange(x.queenChargeMul, 0.25, 2)) e.push(`${path}.queenChargeMul must be 0.25..2`);
  if (!inRange(x.hornetShare, 0, 0.6)) e.push(`${path}.hornetShare must be 0..0.6`);
  if (x.onlyX3 !== undefined && typeof x.onlyX3 !== 'boolean')
    e.push(`${path}.onlyX3 must be true/false`);
  if (!inRange(x.levels, 1, 10) || (x.levels !== undefined && !Number.isInteger(x.levels)))
    e.push(`${path}.levels must be 1..10`);
  if (!inRange(x.baseLevel, 6, 105)) e.push(`${path}.baseLevel must be 6..105`);
  if (x.points !== undefined) {
    const p = x.points;
    if (!p || typeof p !== 'object') e.push(`${path}.points must be an object`);
    else if (
      !inRange(p.win, 0, 1000) ||
      !inRange(p.queen, 0, 100) ||
      !inRange(p.hornet, 0, 100) ||
      !inRange(p.mul, 0.5, 3)
    )
      e.push(`${path}.points out of range`);
  }
  if (x.milestones !== undefined) {
    const m = x.milestones;
    if (!Array.isArray(m) || m.length > 10) e.push(`${path}.milestones must be up to 10 entries`);
    else if (
      !m.every(
        (v, i) =>
          Array.isArray(v) &&
          Number.isInteger(v[0]) &&
          v[0] > 0 &&
          (i === 0 || v[0] > m[i - 1][0]) &&
          rewardValid(v[1]),
      )
    )
      e.push(`${path}.milestones must be ascending [points, reward] with valid rewards`);
  }
  return e;
}

/** The event running at `now` (first match; the calendar should not overlap). */
export function activeEvent(events: LiveEvent[] | undefined, now: number): LiveEvent | null {
  return events?.find((e) => now >= e.start && now < e.end) ?? null;
}

/** Next event starting after `now` (for the "next event in" teaser). */
export function nextEvent(events: LiveEvent[] | undefined, now: number): LiveEvent | null {
  return (
    [...(events ?? [])].filter((e) => e.start > now).sort((a, b) => a.start - b.start)[0] ?? null
  );
}

export const eventRules = (e: LiveEvent): EventRules => (e.rules ?? {}) as EventRules;

/** Apply an event's rule twists to a level (pure; returns a new level). */
export function applyEventRules(level: LevelDef, r: EventRules): LevelDef {
  let gates = level.gates.map((g) => ({ ...g }));
  if (r.gateAdd) for (const g of gates) if (g.kind !== 'sub') g.value += r.gateAdd;
  if (r.onlyX3) {
    const x3 = gates.filter((g) => g.kind === 'mul' && g.value === 3);
    if (!x3.length) {
      // Keep the level winnable: the best multiplier becomes the ×3.
      const best = gates.filter((g) => g.kind === 'mul').sort((a, b) => b.value - a.value)[0];
      if (best) best.value = 3;
    }
    gates = gates.filter((g) => g.kind === 'sub' || (g.kind === 'mul' && g.value === 3));
  }
  const wm = r.waveMul ?? 1;
  const hs = r.hornetShare ?? 0;
  const waves = level.waves.flatMap((w) => {
    const count = Math.max(1, Math.round(w.count * wm));
    if (!hs || w.kind !== 'wasp') return [{ ...w, count }];
    // A hornet has 8 hp; swap a share of wasps for hornets at a quarter of their number.
    const hornets = Math.round((count * hs) / 4);
    const wasps = Math.max(1, count - Math.round(count * hs));
    return hornets > 0
      ? [
          { ...w, count: wasps },
          { ...w, kind: 'hornet' as const, count: hornets },
        ]
      : [{ ...w, count }];
  });
  return {
    ...level,
    gates,
    waves,
    queenCharge: level.queenCharge * (r.queenChargeMul ?? 1),
  };
}

/** Number of levels in an event. */
export const eventLevelCount = (e: LiveEvent) => Math.round(eventRules(e).levels ?? 3);

/**
 * Event level `k` (0-based) for event `e`, built from a validated generated campaign level with
 * the event's rules. The last one carries `isEventFinalLevel` (M2-21c C6: no gem revive).
 */
export function eventLevel(e: LiveEvent, k: number, base: (levelNo: number) => LevelDef): LevelDef {
  const n = eventLevelCount(e);
  const r = eventRules(e);
  const src = base((r.baseLevel ?? 6) + k);
  const L = applyEventRules(src, r);
  return {
    ...L,
    id: `event:${e.id}:${k + 1}`,
    name: `${e.name ?? e.id} ${k + 1}/${n}`,
    isEventFinalLevel: k === n - 1,
  };
}

/** Parse `event:<id>:<k>` level ids. */
export function parseEventLevelId(id: string): { event: string; k: number } | null {
  const m = /^event:([^:]+):(\d+)$/.exec(id);
  return m ? { event: m[1], k: Number(m[2]) - 1 } : null;
}

/** Event points for a battle (default 100 per win). */
export function eventPoints(r: EventRules, f: Omit<BattleFacts, 'eventPts'>): number {
  const p = r.points ?? {};
  const pts =
    (f.won ? (p.win ?? 100) : 0) + (p.queen ?? 0) * f.queens + (p.hornet ?? 0) * f.hornetKills;
  return Math.round(pts * (p.mul ?? 1));
}

/** Sync event state to the running event (a new event starts at 0 points). */
export function syncEvent(L: LiveOpsState, e: LiveEvent | null): void {
  if (e && L.event.id !== e.id) L.event = { id: e.id, points: 0, claimed: [], cleared: 0 };
}

/** Record an event battle: points, and the level cleared on a win. */
export function recordEventBattle(
  L: LiveOpsState,
  e: LiveEvent,
  k: number,
  pts: number,
  won: boolean,
): void {
  syncEvent(L, e);
  L.event.points += Math.max(0, pts);
  if (won && k === L.event.cleared) L.event.cleared = Math.min(eventLevelCount(e), k + 1);
}

/** Claim event milestone `i` (event rewards are their own track, not campaign rewards). */
export function claimMilestone(
  s: SaveData,
  e: LiveEvent,
  i: number,
  now: number,
  rng: Rng,
): boolean {
  const L = s.meta.liveops;
  syncEvent(L, e);
  const m = eventRules(e).milestones?.[i];
  if (!m || L.event.claimed.includes(i) || L.event.points < m[0]) return false;
  if (!grantReward(s, m[1], `event:${e.id}:${i}`, now, rng)) return false;
  L.event.claimed.push(i);
  return true;
}
