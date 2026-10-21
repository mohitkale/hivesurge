/**
 * M5-1 meta data (docs/design/meta-m5.md): bees, chests, hive rooms, XP. Pure data, no DOM.
 * Numbers are provisional (MON M5-2); remote config may override odds (M5-4b).
 */
export type Rarity = 'C' | 'R' | 'E' | 'L';
export type BeeId =
  | 'worker'
  | 'bumble'
  | 'dart'
  | 'carpenter'
  | 'mason'
  | 'sweat'
  | 'orchid'
  | 'leafcutter'
  | 'honeyguard'
  | 'royal-jelly'
  | 'sunburst'
  | 'frost-wing';

export interface BeeDef {
  id: BeeId;
  name: string;
  rarity: Rarity;
  icon: string;
  /** Short effect line (level 1 / per level). */
  effect: string;
}

export const BEES: readonly BeeDef[] = [
  { id: 'worker', name: 'Worker Bee', rarity: 'C', icon: '🐝', effect: '+2% fire rate per level' },
  {
    id: 'bumble',
    name: 'Bumble Tank',
    rarity: 'C',
    icon: '🛡️',
    effect: 'Every 10th shot is a 3 hp bee',
  },
  { id: 'dart', name: 'Dart Bee', rarity: 'C', icon: '💨', effect: '+10% bee speed, +2%/lvl' },
  {
    id: 'carpenter',
    name: 'Carpenter Bee',
    rarity: 'R',
    icon: '🪚',
    effect: 'Traps absorb 20% fewer bees, +3%/lvl',
  },
  { id: 'mason', name: 'Mason Bee', rarity: 'R', icon: '🧱', effect: 'Hive +10 hp, +2/lvl' },
  {
    id: 'sweat',
    name: 'Sweat Bee',
    rarity: 'R',
    icon: '💧',
    effect: '× gates: 10% chance of +1 bee, +2%/lvl',
  },
  {
    id: 'orchid',
    name: 'Orchid Bee',
    rarity: 'E',
    icon: '🌸',
    effect: 'Queen charges 15% faster, +2%/lvl',
  },
  {
    id: 'leafcutter',
    name: 'Leafcutter',
    rarity: 'E',
    icon: '🍃',
    effect: '+ gates you pass give +1 for 5 s',
  },
  {
    id: 'honeyguard',
    name: 'Honey Guard',
    rarity: 'E',
    icon: '🍯',
    effect: 'Once per battle, blocks 15 wasps at the hive',
  },
  {
    id: 'royal-jelly',
    name: 'Royal Jelly Queen',
    rarity: 'L',
    icon: '👑',
    effect: 'Queen hp 25 → 40',
  },
  {
    id: 'sunburst',
    name: 'Sunburst Drone',
    rarity: 'L',
    icon: '☀️',
    effect: 'Every 20 s fires a 12-bee volley',
  },
  {
    id: 'frost-wing',
    name: 'Frost Wing',
    rarity: 'L',
    icon: '❄️',
    effect: 'Queen launch slows wasps 40% for 3 s',
  },
];
export const BEE_IDS = BEES.map((b) => b.id);
export const beeDef = (id: string): BeeDef | undefined => BEES.find((b) => b.id === id);

export const RARITY_WEIGHT: Record<Rarity, number> = { C: 1, R: 2, E: 3, L: 4 };
export const MAX_LEVEL: Record<Rarity, number> = { C: 10, R: 9, E: 8, L: 7 };
/** Pollen to go from level i+1 to i+2 (index 0 = 1→2), per rarity; extended geometrically. */
export const POLLEN_COST: Record<Rarity, number[]> = {
  C: [2, 4, 10, 20, 40, 80, 120, 160, 200],
  R: [2, 3, 6, 12, 25, 50, 75, 100],
  E: [1, 2, 4, 8, 15, 30, 45],
  L: [1, 1, 2, 4, 8, 15],
};
/** Coins to go from level i+1 to i+2 (same for all rarities). */
export const COIN_COST = [50, 150, 400, 1000, 2000, 4000, 6000, 8000, 10000];
/** Overflow pollen (bee at max level) converts to coins. */
export const OVERFLOW_COINS: Record<Rarity, number> = { C: 5, R: 15, E: 50, L: 200 };

export type ChestType = 'wood' | 'silver' | 'gold' | 'royal';
export interface ChestDef {
  type: ChestType;
  name: string;
  unlockMs: number;
  /** Full gem skip price (1 gem per 5 min remaining, rounded up). */
  gemSkip: number;
  cards: number;
  coins: [number, number];
  /** Per-card rarity odds in percent (must sum to 100). */
  odds: Record<Rarity, number>;
  guaranteedEpic?: boolean;
}
const MIN = 60_000;
export const CHESTS: Record<ChestType, ChestDef> = {
  wood: {
    type: 'wood',
    name: 'Wood',
    unlockMs: 15 * MIN,
    gemSkip: 3,
    cards: 3,
    coins: [30, 60],
    odds: { C: 80, R: 18, E: 2, L: 0 },
  },
  silver: {
    type: 'silver',
    name: 'Silver',
    unlockMs: 60 * MIN,
    gemSkip: 8,
    cards: 6,
    coins: [80, 150],
    odds: { C: 70, R: 24, E: 5.5, L: 0.5 },
  },
  gold: {
    type: 'gold',
    name: 'Gold',
    unlockMs: 240 * MIN,
    gemSkip: 20,
    cards: 12,
    coins: [200, 400],
    odds: { C: 60, R: 28, E: 10, L: 2 },
  },
  royal: {
    type: 'royal',
    name: 'Royal',
    unlockMs: 480 * MIN,
    gemSkip: 35,
    cards: 20,
    coins: [500, 500],
    odds: { C: 50, R: 30, E: 15, L: 5 },
    guaranteedEpic: true,
  },
};
export const CHEST_TYPES = Object.keys(CHESTS) as ChestType[];
export const CHEST_SLOTS = 4;
/** Legendary guaranteed by this many chests opened without one (counted per chest). */
export const PITY_LEGENDARY = 40;

export type RoomId = 'honey' | 'brood' | 'wax' | 'lab';
export interface RoomDef {
  id: RoomId;
  name: string;
  icon: string;
  max: number;
  /** [coins, build ms] to reach level i+1 (index 0 = L1). */
  costs: [number, number][];
  effect: string;
}
const H = 60 * MIN;
/** L1 and L5 from the spec; levels between and after are interpolated (geometric). */
function curve(l1: [number, number], l5: [number, number], max: number): [number, number][] {
  const out: [number, number][] = [];
  const rc = Math.pow(l5[0] / l1[0], 1 / 4);
  const rt = Math.pow(l5[1] / l1[1], 1 / 4);
  for (let i = 0; i < max; i++)
    out.push([
      Math.round((l1[0] * Math.pow(rc, i)) / 10) * 10,
      Math.round((l1[1] * Math.pow(rt, i)) / MIN) * MIN,
    ]);
  return out;
}
export const ROOMS: Record<RoomId, RoomDef> = {
  honey: {
    id: 'honey',
    name: 'Honey Store',
    icon: '🍯',
    max: 10,
    costs: curve([200, 5 * MIN], [4000, 6 * H], 10),
    effect: 'Idle coins 20/h per level (up to 8 h)',
  },
  brood: {
    id: 'brood',
    name: 'Brood Cell',
    icon: '🥚',
    max: 5,
    costs: curve([500, 30 * MIN], [8000, 12 * H], 5),
    effect: 'Queen charges 0.2 s faster per level',
  },
  wax: {
    id: 'wax',
    name: 'Wax Walls',
    icon: '🧱',
    max: 10,
    costs: curve([300, 10 * MIN], [5000, 8 * H], 10),
    effect: 'Hive +3 hp per level',
  },
  lab: {
    id: 'lab',
    name: 'Pollen Lab',
    icon: '🧪',
    max: 6,
    costs: curve([800, H], [12000, 24 * H], 6),
    effect: '+1 card per chest every 2 levels',
  },
};
export const ROOM_IDS = Object.keys(ROOMS) as RoomId[];
export const HONEY_PER_LEVEL_PER_H = 20;
export const HONEY_CAP_MS = 8 * H;

/** Loadout slot unlock stages (slot 1 at stage 3, 2 at 5, 3 at 8, 4 at 12). */
export const SLOT_UNLOCK_STAGES = [3, 5, 8, 12];

/** XP to go from level L to L+1 = 150 + 20 L. */
export const xpToNext = (level: number) => 150 + 20 * level;
/** Total XP to reach level L. */
export const xpForLevel = (level: number) => 170 * (level - 1) + 10 * (level - 1) * (level - 2);
export const XP = { win: 30, loss: 10 };
/** Every 10th account level grants this many gems. */
export const LEVEL_MILESTONE_GEMS = 25;
