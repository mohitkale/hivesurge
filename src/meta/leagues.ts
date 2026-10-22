import type { Reward } from './eventRules';

/**
 * M7-13 weekly leagues (research LEAGUE-A, docs/research/m7-6-rivals-leagues.md): groups of
 * 30 to 50 seeded by an Elo-style league rating, never by hive power, so buying power never
 * gives harder (or easier) opponents. Top ~20% promote, bottom ~20% relegate. The top tier's
 * rewards are cosmetic only. Bots that fill a small group are always labelled.
 */
export const GROUP_MIN = 30;
export const GROUP_MAX = 50;
export const GROUP_TARGET = 40;
export const START_RATING = 1000;

export const TIERS = ['Bronze', 'Silver', 'Gold', 'Royal', 'Queen'] as const;
export type LeagueTier = (typeof TIERS)[number];

/** Tier from rating: Bronze < 1100 ≤ Silver < 1250 ≤ Gold < 1400 ≤ Royal < 1600 ≤ Queen. */
export function tierOf(rating: number): LeagueTier {
  return rating >= 1600
    ? 'Queen'
    : rating >= 1400
      ? 'Royal'
      : rating >= 1250
        ? 'Gold'
        : rating >= 1100
          ? 'Silver'
          : 'Bronze';
}

/**
 * Weekly rewards by tier for the top 3 / promoted / rest of the group (DES owns the numbers).
 * Queen tier (top) is cosmetic only: skins and frames, no currency, no cards, no chests.
 */
export const LEAGUE_REWARDS: Record<
  LeagueTier,
  { top3: Reward[]; promoted: Reward[]; rest: Reward[] }
> = {
  Bronze: { top3: ['coins:300', 'chest:silver'], promoted: ['coins:200'], rest: ['coins:50'] },
  Silver: { top3: ['coins:500', 'chest:silver'], promoted: ['coins:300'], rest: ['coins:80'] },
  Gold: { top3: ['gems:15', 'chest:gold'], promoted: ['coins:500'], rest: ['coins:120'] },
  Royal: { top3: ['gems:25', 'chest:gold'], promoted: ['gems:10'], rest: ['coins:200'] },
  Queen: { top3: ['skin:queen-crown'], promoted: ['skin:queen-frame'], rest: ['skin:queen-badge'] },
};

export const isCosmetic = (r: Reward) => r.startsWith('skin:');

export interface Seedable {
  id: string;
  rating: number;
}

/**
 * Seed one week's groups: sort by rating (then id, so it is deterministic), split into
 * round(n / 40) contiguous groups of nearly equal size (30..50 once n ≥ 30). Fewer than 30
 * players make one group, filled with labelled bots by the caller.
 */
export function seedGroups<T extends Seedable>(players: T[]): T[][] {
  const sorted = [...players].sort((a, b) => b.rating - a.rating || (a.id < b.id ? -1 : 1));
  const n = sorted.length;
  if (!n) return [];
  let g = Math.max(1, Math.round(n / GROUP_TARGET));
  while (g > 1 && n / g < GROUP_MIN) g--;
  while (n / g > GROUP_MAX) g++;
  const out: T[][] = [];
  for (let i = 0; i < g; i++)
    out.push(sorted.slice(Math.floor((i * n) / g), Math.floor(((i + 1) * n) / g)));
  return out;
}

/** Elo-style week close: promote top 20% (+40), relegate bottom 20% (-40), floor 0. */
export function closeWeek(rating: number, rank: number, size: number): number {
  const band = Math.max(1, Math.round(size * 0.2));
  const d = rank <= band ? 40 : rank > size - band ? -40 : 0;
  return Math.max(0, rating + d);
}

/** Rewards for a finishing rank (1-based) in a group of `size` at `tier`. */
export function weeklyRewards(tier: LeagueTier, rank: number, size: number): Reward[] {
  const t = LEAGUE_REWARDS[tier];
  if (rank <= 3) return t.top3;
  if (rank <= Math.max(1, Math.round(size * 0.2))) return t.promoted;
  return t.rest;
}

/** Weekly league score from the live-ops weekly counters: wins × 100 + event points. */
export const weeklyScore = (counts: Record<string, number>) =>
  (counts.win ?? 0) * 100 + (counts.eventPts ?? 0);

export interface LeagueRow {
  rank: number;
  name: string;
  score: number;
  you: boolean;
  bot: boolean;
}

const BOT_NAMES = [
  'BuzzQueen',
  'HoneyDrip',
  'Stingray77',
  'PollenPal',
  'WaxWing',
  'CombChamp',
  'NectarNinja',
  'DroneZone',
  'Waggle',
  'Propolis',
];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fill a group to GROUP_MIN with labelled bots whose scores follow the week (deterministic). */
export function fillWithBots(
  rows: Omit<LeagueRow, 'rank'>[],
  week: string,
  dayOfWeek: number,
): LeagueRow[] {
  let h = 2166136261;
  for (let i = 0; i < week.length; i++) h = Math.imul(h ^ week.charCodeAt(i), 16777619);
  const r = rng(h);
  const all = [...rows];
  for (let i = 0; all.length < GROUP_MIN; i++) {
    const pace = 0.3 + r() * 1.4; // bot strength
    all.push({
      name: `${BOT_NAMES[i % BOT_NAMES.length]}${i >= BOT_NAMES.length ? i : ''} (bot)`,
      score: Math.round(pace * 180 * (dayOfWeek + 1)),
      you: false,
      bot: true,
    });
  }
  all.sort((a, b) => b.score - a.score || (a.you ? -1 : b.you ? 1 : 0));
  return all.map((x, i) => ({ ...x, rank: i + 1 }));
}

/** Top `size` rows for the home card, always including the player. */
export function boardTop(rows: LeagueRow[], size = 5): LeagueRow[] {
  const top = rows.slice(0, size);
  const you = rows.find((x) => x.you);
  if (you && !top.includes(you)) top[size - 1] = you;
  return top;
}
