import { addGrant } from '../platform/counter';
import { recordGems, spendGems } from '../platform/gemLedger';
import type { SaveData } from '../platform/save';
import { emptyBee } from '../platform/saveMeta';
import {
  BEES,
  beeDef,
  CHEST_SLOTS,
  CHESTS,
  type ChestType,
  COIN_COST,
  HONEY_CAP_MS,
  HONEY_PER_LEVEL_PER_H,
  LEVEL_MILESTONE_GEMS,
  MAX_LEVEL,
  OVERFLOW_COINS,
  PITY_LEGENDARY,
  POLLEN_COST,
  type Rarity,
  RARITY_WEIGHT,
  ROOMS,
  type RoomId,
  SLOT_UNLOCK_STAGES,
  xpForLevel,
} from './defs';

/**
 * M5-4 economy math (docs/design/meta-m5.md). Pure functions over the save: the caller passes
 * the trusted time (`gameClock().now()`) and an RNG, so every rule is unit-testable.
 * Spendable amounts change through the cached fields (coins, pollen, xp); the save reconciles
 * them into the counter books on commit (M5-4a).
 */
export type Rng = () => number;

const RARITIES: Rarity[] = ['C', 'R', 'E', 'L'];
const MIN = 60_000;

// ---------------------------------------------------------------- chests

/** Chest for a win: 70% Wood, 25% Silver, 5% Gold; boss wins always Gold. */
export function rollWinChest(rng: Rng, boss = false): ChestType {
  if (boss) return 'gold';
  const r = rng() * 100;
  return r < 70 ? 'wood' : r < 95 ? 'silver' : 'gold';
}

/** A loss with >= 60% nest damage grants a Wood chest at 25%. */
export function rollLossChest(rng: Rng, nestDamage: number): ChestType | null {
  return nestDamage >= 0.6 && rng() < 0.25 ? 'wood' : null;
}

export const chestSlotsFree = (s: SaveData) => CHEST_SLOTS - s.meta.chests.length;

/**
 * Put a chest in a free slot. Returns null when all slots are full (the caller pays coins x1.5
 * instead, flow 2). The first win chest after the FTUE is ready at once (M5-1 validation).
 */
export function awardChest(
  s: SaveData,
  type: ChestType,
  now: number,
  rng: Rng,
  opts: { firstWinInstant?: boolean } = {},
): string | null {
  if (chestSlotsFree(s) <= 0) return null;
  const id = `c${now.toString(36)}${Math.floor(rng() * 36 ** 4)
    .toString(36)
    .padStart(4, '0')}`;
  const instant =
    opts.firstWinInstant === true && s.meta.chestsOpened === 0 && s.meta.opened.length === 0;
  s.meta.chests.push({ id, type, earnedAt: now, unlockAt: instant ? now : null });
  return id;
}

export const isUnlocking = (s: SaveData, now: number) =>
  s.meta.chests.some((c) => c.unlockAt !== null && c.unlockAt > now);

/** Start unlocking (one chest at a time). */
export function startUnlock(s: SaveData, id: string, now: number): boolean {
  const c = s.meta.chests.find((x) => x.id === id);
  if (!c || c.unlockAt !== null || isUnlocking(s, now)) return false;
  c.unlockAt = now + CHESTS[c.type].unlockMs;
  return true;
}

/** Ms left; 0 = ready; null = not started. */
export function chestRemaining(s: SaveData, id: string, now: number): number | null {
  const c = s.meta.chests.find((x) => x.id === id);
  if (!c || c.unlockAt === null) return null;
  return Math.max(0, c.unlockAt - now);
}

/**
 * 1 gem per 5 min remaining, rounded up, never above the chest's listed full price (the spec
 * table caps Silver/Gold/Royal below the per-minute rate).
 */
export const gemSkipCost = (remainingMs: number, cap = Infinity) =>
  Math.min(cap, Math.ceil(Math.max(0, remainingMs) / (5 * MIN)));

/** Pay gems to finish a chest now (a locked chest costs its full unlock time). */
export function skipChestWithGems(s: SaveData, id: string, now: number): boolean {
  const c = s.meta.chests.find((x) => x.id === id);
  if (!c) return false;
  const rem = c.unlockAt === null ? CHESTS[c.type].unlockMs : Math.max(0, c.unlockAt - now);
  const cost = gemSkipCost(rem, CHESTS[c.type].gemSkip);
  if (cost > 0 && !spendGems(s, cost, `chest_skip:${c.type}`)) return false;
  c.unlockAt = now;
  return true;
}

/** Rewarded ad: halve the remaining unlock time of the chest being unlocked. */
export function halveChestTime(s: SaveData, id: string, now: number): boolean {
  const c = s.meta.chests.find((x) => x.id === id);
  if (!c || c.unlockAt === null || c.unlockAt <= now) return false;
  c.unlockAt = now + Math.ceil((c.unlockAt - now) / 2);
  return true;
}

export interface CardDrop {
  bee: string;
  rarity: Rarity;
  count: number;
  /** This chest unlocked the bee. */
  isNew: boolean;
  /** Cards converted to coins because the bee is at max level. */
  overflowCoins: number;
}
export interface ChestReward {
  type: ChestType;
  coins: number;
  cards: CardDrop[];
  /** True when the pity rule forced the Legendary. */
  pity: boolean;
}

function rollRarity(rng: Rng, odds: Record<Rarity, number>): Rarity {
  let r = rng() * 100;
  for (const k of RARITIES) {
    r -= odds[k];
    if (r < 0) return k;
  }
  return 'C';
}

const pick = <T>(rng: Rng, xs: T[]): T =>
  xs[Math.min(xs.length - 1, Math.floor(rng() * xs.length))];

/** Cards in a chest of `type` (Pollen Lab: +1 per 2 levels). */
export const chestCardCount = (s: SaveData, type: ChestType) =>
  CHESTS[type].cards + Math.floor((s.meta.hive.lab?.level ?? 0) / 2);

/** Roll a chest's contents without changing the save. */
export function rollChest(s: SaveData, type: ChestType, rng: Rng): ChestReward {
  const def = CHESTS[type];
  const n = chestCardCount(s, type);
  const rar: Rarity[] = [];
  for (let i = 0; i < n; i++) rar.push(rollRarity(rng, def.odds));
  if (def.guaranteedEpic && !rar.some((r) => r === 'E' || r === 'L')) rar[0] = 'E';
  let pity = false;
  if (!rar.includes('L') && s.meta.pityLegendary + 1 >= PITY_LEGENDARY) {
    rar[rar.findIndex((r) => r !== 'E') >= 0 ? rar.findIndex((r) => r !== 'E') : 0] = 'L';
    pity = true;
  }
  // New-bee protection: the first Epic and first Legendary card of each chest go to a bee the
  // player does not own yet, while one exists (so the first ones ever are always new).
  const owned = (id: string) => (s.meta.bees[id]?.level ?? 0) > 0;
  const counts = new Map<string, number>();
  const firstOf = new Set<Rarity>();
  for (const r of rar) {
    const pool = BEES.filter((b) => b.rarity === r).map((b) => b.id as string);
    let bee: string;
    const unowned = pool.filter((id) => !owned(id) && !counts.has(id));
    if ((r === 'E' || r === 'L') && !firstOf.has(r) && unowned.length) bee = pick(rng, unowned);
    else bee = pick(rng, pool);
    firstOf.add(r);
    counts.set(bee, (counts.get(bee) ?? 0) + 1);
  }
  const cards: CardDrop[] = [...counts].map(([bee, count]) => {
    const rarity = beeDef(bee)!.rarity;
    return { bee, rarity, count, isNew: !owned(bee), overflowCoins: 0 };
  });
  cards.sort(
    (a, b) => RARITY_WEIGHT[b.rarity] - RARITY_WEIGHT[a.rarity] || (a.bee < b.bee ? -1 : 1),
  );
  const [lo, hi] = def.coins;
  return { type, coins: lo + Math.floor(rng() * (hi - lo + 1)), cards, pity };
}

/** Apply a rolled reward: first card unlocks a bee at L1, maxed bees convert cards to coins. */
export function applyChestReward(s: SaveData, r: ChestReward): void {
  s.coins += r.coins;
  for (const c of r.cards) {
    const b = (s.meta.bees[c.bee] ??= emptyBee());
    let cards = c.count;
    if (b.level === 0) {
      b.level = 1;
      cards--;
    }
    if (b.level >= MAX_LEVEL[c.rarity]) {
      c.overflowCoins = cards * OVERFLOW_COINS[c.rarity];
      s.coins += c.overflowCoins;
    } else b.pollen += cards;
  }
  s.meta.pityLegendary = r.cards.some((c) => c.rarity === 'L') ? 0 : s.meta.pityLegendary + 1;
}

/** Open a ready chest. Returns null if it is missing or still locked. */
export function openChest(s: SaveData, id: string, now: number, rng: Rng): ChestReward | null {
  const i = s.meta.chests.findIndex((x) => x.id === id);
  if (i < 0) return null;
  const c = s.meta.chests[i];
  if (c.unlockAt === null || c.unlockAt > now) return null;
  const r = rollChest(s, c.type, rng);
  applyChestReward(s, r);
  s.meta.chests.splice(i, 1);
  s.meta.opened.push(id);
  if (s.meta.opened.length > 200) s.meta.opened.splice(0, s.meta.opened.length - 200);
  s.meta.chestsOpened++;
  return r;
}

export const DAY_MS = 24 * 60 * MIN;
export const freeChestReady = (s: SaveData, now: number) => now - s.meta.freeChestAt >= DAY_MS;

/** Free daily Wood chest at the hive (every 24 h; needs a free slot). */
export function claimFreeChest(s: SaveData, now: number, rng: Rng): string | null {
  if (!freeChestReady(s, now) || chestSlotsFree(s) <= 0) return null;
  const id = awardChest(s, 'wood', now, rng);
  if (id) s.meta.freeChestAt = now;
  return id;
}

// ---------------------------------------------------------------- bees + loadout

export interface UpgradeCost {
  pollen: number;
  coins: number;
}
/** Cost to raise a bee one level; null if not owned or maxed. */
export function upgradeCost(s: SaveData, id: string): UpgradeCost | null {
  const d = beeDef(id);
  const b = s.meta.bees[id];
  if (!d || !b || b.level < 1 || b.level >= MAX_LEVEL[d.rarity]) return null;
  return { pollen: POLLEN_COST[d.rarity][b.level - 1], coins: COIN_COST[b.level - 1] };
}
export function canUpgrade(s: SaveData, id: string): boolean {
  const c = upgradeCost(s, id);
  const b = s.meta.bees[id];
  return !!c && b.pollen >= c.pollen && s.coins >= c.coins;
}
export function upgradeBee(s: SaveData, id: string): boolean {
  if (!canUpgrade(s, id)) return false;
  const c = upgradeCost(s, id)!;
  const b = s.meta.bees[id];
  b.pollen -= c.pollen;
  s.coins -= c.coins;
  b.level++;
  return true;
}

/** Loadout slots open at stages 3, 5, 8, 12 (stage = campaign levels cleared). */
export const unlockedSlots = (stage: number) => SLOT_UNLOCK_STAGES.filter((n) => stage >= n).length;

/** Equip (or clear with '') a slot. One copy per bee; worker never takes a slot. */
export function equip(s: SaveData, slot: number, id: string, stage: number): boolean {
  if (slot < 0 || slot >= unlockedSlots(stage)) return false;
  if (id !== '') {
    if (id === 'worker' || !beeDef(id) || !((s.meta.bees[id]?.level ?? 0) > 0)) return false;
    const at = s.meta.loadout.indexOf(id);
    if (at >= 0) s.meta.loadout[at] = '';
  }
  s.meta.loadout[slot] = id;
  return true;
}

/** Bees equipped in unlocked slots, with levels. */
export function equippedBees(s: SaveData, stage: number): { id: string; level: number }[] {
  return s.meta.loadout
    .slice(0, unlockedSlots(stage))
    .filter((id) => id && (s.meta.bees[id]?.level ?? 0) > 0)
    .map((id) => ({ id, level: s.meta.bees[id].level }));
}

/** P = sum(level x rarity weight) over equipped bees (worker excluded). */
export function loadoutPower(s: SaveData, stage: number): number {
  let p = 0;
  for (const b of equippedBees(s, stage)) p += b.level * RARITY_WEIGHT[beeDef(b.id)!.rarity];
  return p;
}

/** Remote config `difficulty.expectedP` default (M5-1b refit). */
export const EXPECTED_P: [number, number][] = [
  [1, 0],
  [2, 0],
  [3, 5],
  [5, 7],
  [10, 18],
  [14, 24],
  [25, 34],
  [36, 42],
  [52, 46],
  [74, 54],
  [111, 61],
  [160, 71],
];
export function expectedP(n: number, pts: [number, number][] = EXPECTED_P): number {
  if (n <= pts[0][0]) return pts[0][1];
  const last = pts[pts.length - 1];
  if (n >= last[0]) return Math.min(112, last[1] + 0.17 * (n - last[0]));
  for (let i = 1; i < pts.length; i++) {
    const [n1, p1] = pts[i];
    if (n <= n1) {
      const [n0, p0] = pts[i - 1];
      return p0 + ((p1 - p0) * (n - n0)) / (n1 - n0);
    }
  }
  return last[1];
}

/** Catch-up easing (generator stages only, n >= 6): clamp(1 + 0.01(P - expectedP), 0.95, 1). */
export function catchUpScale(power: number, n: number): number {
  if (n < 6) return 1;
  return Math.min(1, Math.max(0.95, 1 + 0.01 * (power - expectedP(n))));
}

export const LOSS_ASSIST: [number, number][] = [
  [2, 0.95],
  [3, 0.9],
];
export const SCALE_FLOOR = 0.85;
export function lossAssistScale(streak: number, steps = LOSS_ASSIST): number {
  let k = 1;
  for (const [n, f] of steps) if (streak >= n) k = f;
  return k;
}
/** Enemy hp scale for the next battle: easier-only, floor 0.85. */
export function enemyScale(s: SaveData, levelId: string, stage: number): number {
  const streak = s.meta.lossStreak.level === levelId ? s.meta.lossStreak.count : 0;
  const k = catchUpScale(loadoutPower(s, stage), stage) * lossAssistScale(streak);
  return Math.max(SCALE_FLOOR, Math.min(1, k));
}
/** Track consecutive losses on the same level (resets on a win or a level change). */
export function recordResult(s: SaveData, levelId: string, won: boolean): void {
  const ls = s.meta.lossStreak;
  if (won) s.meta.lossStreak = { level: '', count: 0 };
  else if (ls.level === levelId) ls.count++;
  else s.meta.lossStreak = { level: levelId, count: 1 };
}

// ---------------------------------------------------------------- account XP

export function levelForXp(xp: number): number {
  let l = 1;
  while (xpForLevel(l + 1) <= xp) l++;
  return l;
}
export const playerLevel = (s: SaveData) => levelForXp(s.meta.xp);

/**
 * Add XP; every 10th level grants 25 gems once (ledger entry id `level:<L>` is idempotent across
 * devices). Returns the levels gained.
 */
export function addXp(s: SaveData, amount: number, now: number): number[] {
  const before = playerLevel(s);
  s.meta.xp += Math.max(0, Math.floor(amount));
  const after = playerLevel(s);
  const gained: number[] = [];
  for (let l = before + 1; l <= after; l++) {
    gained.push(l);
    if (l % 10 === 0 && !s.gemLedger.some((e) => e.id === `level:${l}`))
      recordGems(s, LEVEL_MILESTONE_GEMS, `level_${l}`, now, `level:${l}`);
  }
  return gained;
}

// ---------------------------------------------------------------- hive base

export const roomCap = (s: SaveData) => Math.floor(playerLevel(s) / 2);
export const roomLevel = (s: SaveData, id: RoomId) => s.meta.hive[id]?.level ?? 0;

/** Finish builds whose timer ran out. */
export function settleBuilds(s: SaveData, now: number): RoomId[] {
  const done: RoomId[] = [];
  for (const [id, r] of Object.entries(s.meta.hive))
    if (r.building && r.building.endsAt <= now) {
      if (id === 'honey') collectHoney(s, now); // bank idle coins at the old rate first
      r.level = Math.max(r.level, r.building.toLevel);
      r.building = null;
      done.push(id as RoomId);
    }
  return done;
}
export const building = (s: SaveData) =>
  (Object.keys(s.meta.hive) as RoomId[]).find((id) => s.meta.hive[id].building);

/** [coins, ms] for the next level of a room; null when maxed. */
export function roomUpgradeCost(s: SaveData, id: RoomId): [number, number] | null {
  const l = roomLevel(s, id);
  return l >= ROOMS[id].max ? null : ROOMS[id].costs[l];
}
export type BuildBlock = 'maxed' | 'cap' | 'busy' | 'coins' | null;
export function buildBlock(s: SaveData, id: RoomId, now: number): BuildBlock {
  settleBuilds(s, now);
  const c = roomUpgradeCost(s, id);
  if (!c) return 'maxed';
  if (roomLevel(s, id) + 1 > roomCap(s)) return 'cap';
  if (building(s)) return 'busy';
  if (s.coins < c[0]) return 'coins';
  return null;
}
/** Start a room upgrade (one build at a time). */
export function startBuild(s: SaveData, id: RoomId, now: number): boolean {
  if (buildBlock(s, id, now) !== null) return false;
  const [coins, ms] = roomUpgradeCost(s, id)!;
  s.coins -= coins;
  const r = (s.meta.hive[id] ??= { level: 0, building: null });
  r.building = { toLevel: r.level + 1, endsAt: now + ms };
  if (id === 'honey' && r.level === 0) s.meta.honeyAt = now;
  return true;
}
/** Finish the current build with gems (1 gem per 5 min, like chests). */
export function rushBuild(s: SaveData, now: number): boolean {
  const id = building(s);
  if (!id) return false;
  const b = s.meta.hive[id].building!;
  const cost = gemSkipCost(b.endsAt - now);
  if (cost > 0 && !spendGems(s, cost, `build_rush:${id}`)) return false;
  b.endsAt = now;
  settleBuilds(s, now);
  return true;
}

/** Idle coins waiting in the Honey Store (20/h per level, capped at 8 h). */
export function honeyPending(s: SaveData, now: number): number {
  const l = roomLevel(s, 'honey');
  if (l <= 0) return 0;
  const ms = Math.min(HONEY_CAP_MS, Math.max(0, now - s.meta.honeyAt));
  return Math.floor((l * HONEY_PER_LEVEL_PER_H * ms) / (60 * MIN));
}
export function collectHoney(s: SaveData, now: number): number {
  const c = honeyPending(s, now);
  s.coins += c;
  s.meta.honeyAt = now;
  return c;
}

// ---------------------------------------------------------------- server grants

/** Apply a server-confirmed coin/ticket grant once (key e.g. `purchase:<session id>`). */
export function grantKeyed(s: SaveData, key: string, coins: number, tickets = 0): boolean {
  const a = coins ? addGrant(s.coinBook, key, coins) : false;
  const b = tickets ? addGrant(s.ticketBook, key, tickets) : false;
  if (a) s.coins += coins;
  if (b) s.skipTickets += tickets;
  return a || b;
}

// ---- M5-5 rewarded placements (monetization/ad-placements.md #5, #7, #10) ----

/** Chest-time skips (ad or ticket) are never offered on the player's first chest. */
export const chestSkipAllowed = (s: SaveData) => s.meta.chestsOpened > 0;

/** G8: spend one ad-skip ticket to halve an unlocking chest (instead of watching an ad). */
export function useSkipTicket(s: SaveData, id: string, now: number): boolean {
  if (!chestSkipAllowed(s) || s.skipTickets < 1) return false;
  if (!halveChestTime(s, id, now)) return false;
  s.skipTickets--;
  return true;
}

/** Daily rewarded card pack: a Wood chest's worth of cards, opened at once (odds on screen). */
export function openDailyPack(s: SaveData, rng: Rng): ChestReward {
  const r = rollChest(s, 'wood', rng);
  applyChestReward(s, r);
  s.meta.chestsOpened++;
  return r;
}

/** Away doubler threshold: below this the session-start offer is not worth an ad. */
export const AWAY_DOUBLE_MIN = 20;
/** Collect idle honey coins, doubled when the away-doubler ad completed. */
export function collectHoneyAway(s: SaveData, now: number, doubled: boolean): number {
  const c = collectHoney(s, now);
  if (doubled) s.coins += c;
  return doubled ? c * 2 : c;
}
