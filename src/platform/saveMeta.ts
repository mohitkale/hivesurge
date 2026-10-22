import { defaultLiveOps, mergeLiveOps, parseLiveOps, type LiveOpsState } from './saveLiveops';
import { BEE_IDS, CHEST_TYPES, type ChestType, ROOM_IDS } from '../meta/defs';
import {
  bookBalance,
  type CounterBook,
  emptyBook,
  mergeBooks,
  parseBook,
  reconcileBook,
} from './counter';

/**
 * M5-4a: save v2 meta state (docs/design/meta-m5.md "Save additions"). Every field has a
 * conflict-free merge so local + cloud saves can be combined without loss:
 * levels max-merge, spendable amounts are CounterBooks, chests union by id.
 */
export interface BeeState {
  /** 0 = not owned yet. */
  level: number;
  /** Cached pollen (cards) balance; `book` is the source of truth. */
  pollen: number;
  book: CounterBook;
}

export interface Chest {
  id: string;
  type: ChestType;
  earnedAt: number;
  /** Unlock finishes at this trusted time; null = not started. */
  unlockAt: number | null;
}

export interface RoomState {
  /** Completed level (0 = not built). */
  level: number;
  building: { toLevel: number; endsAt: number } | null;
}

export interface MetaState {
  bees: Record<string, BeeState>;
  /** 4 slots; '' = empty. Worker is the base shooter and never takes a slot. */
  loadout: string[];
  chests: Chest[];
  /** Recently opened chest ids (so a merge never brings an opened chest back). */
  opened: string[];
  /** Chests opened since the last Legendary card (pity). */
  pityLegendary: number;
  /** Total chests opened (first-chest rules). */
  chestsOpened: number;
  hive: Record<string, RoomState>;
  /** Trusted time the Honey Store was last collected. */
  honeyAt: number;
  /** Trusted time the free daily Wood chest was last claimed. */
  freeChestAt: number;
  /** Cached account XP; `xpBook` is the source of truth. */
  xp: number;
  xpBook: CounterBook;
  /** Consecutive losses on the same level (loss-streak assist). */
  lossStreak: { level: string; count: number };
  /** Season pass premium track owned (purchase, sticky). */
  seasonPremium: boolean;
  /** M7-3 targets, streaks, season pass and event progress. */
  liveops: LiveOpsState;
}

export const OPENED_KEEP = 200;
export const LOADOUT_SLOTS = 4;

export const emptyBee = (level = 0): BeeState => ({ level, pollen: 0, book: emptyBook() });

export function defaultMeta(): MetaState {
  return {
    bees: { worker: emptyBee(1) },
    loadout: ['', '', '', ''],
    chests: [],
    opened: [],
    pityLegendary: 0,
    chestsOpened: 0,
    hive: {},
    honeyAt: 0,
    freeChestAt: 0,
    xp: 0,
    xpBook: emptyBook(),
    lossStreak: { level: '', count: 0 },
    seasonPremium: false,
    liveops: defaultLiveOps(),
  };
}

const n0 = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

export function parseMeta(v: unknown): MetaState {
  const d = defaultMeta();
  if (!isObj(v)) return d;
  const bees: Record<string, BeeState> = { worker: emptyBee(1) };
  if (isObj(v.bees))
    for (const [id, b] of Object.entries(v.bees)) {
      if (!BEE_IDS.includes(id as never) || !isObj(b)) continue;
      const book = parseBook(b.book);
      bees[id] = { level: Math.min(10, n0(b.level)), pollen: bookBalance(book), book };
    }
  bees.worker.level = Math.max(1, bees.worker.level);
  const loadout = Array.isArray(v.loadout)
    ? v.loadout.slice(0, LOADOUT_SLOTS).map((x) => (typeof x === 'string' ? x : ''))
    : [];
  while (loadout.length < LOADOUT_SLOTS) loadout.push('');
  const chests: Chest[] = [];
  if (Array.isArray(v.chests))
    for (const c of v.chests) {
      if (!isObj(c) || typeof c.id !== 'string' || !c.id || c.id.length > 64) continue;
      if (!CHEST_TYPES.includes(c.type as ChestType)) continue;
      if (chests.some((x) => x.id === c.id)) continue;
      chests.push({
        id: c.id,
        type: c.type as ChestType,
        earnedAt: n0(c.earnedAt),
        unlockAt: typeof c.unlockAt === 'number' && Number.isFinite(c.unlockAt) ? c.unlockAt : null,
      });
    }
  const hive: Record<string, RoomState> = {};
  if (isObj(v.hive))
    for (const [id, r] of Object.entries(v.hive)) {
      if (!ROOM_IDS.includes(id as never) || !isObj(r)) continue;
      const b = isObj(r.building) ? r.building : null;
      hive[id] = {
        level: n0(r.level),
        building:
          b && n0(b.toLevel) > n0(r.level)
            ? { toLevel: n0(b.toLevel), endsAt: n0(b.endsAt) }
            : null,
      };
    }
  const xpBook = parseBook(v.xpBook);
  const ls = isObj(v.lossStreak) ? v.lossStreak : {};
  return {
    bees,
    loadout: dedupeLoadout(loadout, bees),
    chests,
    opened: Array.isArray(v.opened)
      ? v.opened.filter((x): x is string => typeof x === 'string').slice(-OPENED_KEEP)
      : [],
    pityLegendary: n0(v.pityLegendary),
    chestsOpened: n0(v.chestsOpened),
    hive,
    honeyAt: n0(v.honeyAt),
    freeChestAt: n0(v.freeChestAt),
    xp: bookBalance(xpBook),
    xpBook,
    lossStreak: { level: typeof ls.level === 'string' ? ls.level : '', count: n0(ls.count) },
    seasonPremium: v.seasonPremium === true,
    liveops: parseLiveOps(v.liveops),
  };
}

/** Only owned, non-worker bees, each once. */
function dedupeLoadout(l: string[], bees: Record<string, BeeState>): string[] {
  const seen = new Set<string>();
  return l.map((id) => {
    if (!id || id === 'worker' || seen.has(id) || !(bees[id]?.level > 0)) return '';
    seen.add(id);
    return id;
  });
}

/** Turn cached balances (pollen, XP) into book entries for `device`. */
export function reconcileMeta(m: MetaState, device: string): void {
  for (const b of Object.values(m.bees)) b.pollen = reconcileBook(b.book, b.pollen, device);
  m.xp = reconcileBook(m.xpBook, m.xp, device);
}

/** Conflict-free meta merge. `newer` decides order-only choices (loadout). */
export function mergeMeta(a: MetaState, b: MetaState, newer: MetaState): MetaState {
  const bees: Record<string, BeeState> = {};
  for (const id of new Set([...Object.keys(a.bees), ...Object.keys(b.bees)])) {
    const x = a.bees[id] ?? emptyBee();
    const y = b.bees[id] ?? emptyBee();
    const book = mergeBooks(x.book, y.book);
    bees[id] = { level: Math.max(x.level, y.level), pollen: bookBalance(book), book };
  }
  const opened = [...new Set([...a.opened, ...b.opened])].slice(-OPENED_KEEP);
  const openedSet = new Set(opened);
  const chests: Chest[] = [];
  for (const c of [...a.chests, ...b.chests]) {
    if (openedSet.has(c.id)) continue;
    const prev = chests.find((x) => x.id === c.id);
    if (!prev) chests.push({ ...c });
    else if (c.unlockAt !== null)
      prev.unlockAt = prev.unlockAt === null ? c.unlockAt : Math.min(prev.unlockAt, c.unlockAt);
  }
  chests.sort((p, q) => p.earnedAt - q.earnedAt || (p.id < q.id ? -1 : 1));
  const hive: Record<string, RoomState> = {};
  for (const id of new Set([...Object.keys(a.hive), ...Object.keys(b.hive)])) {
    const x = a.hive[id] ?? { level: 0, building: null };
    const y = b.hive[id] ?? { level: 0, building: null };
    const level = Math.max(x.level, y.level);
    const builds = [x.building, y.building].filter(
      (q): q is NonNullable<RoomState['building']> => !!q && q.toLevel > level,
    );
    builds.sort((p, q) => q.toLevel - p.toLevel || p.endsAt - q.endsAt);
    hive[id] = { level, building: builds[0] ? { ...builds[0] } : null };
  }
  const xpBook = mergeBooks(a.xpBook, b.xpBook);
  return {
    bees,
    loadout: dedupeLoadout([...newer.loadout], bees),
    chests,
    opened,
    pityLegendary: newer.pityLegendary,
    chestsOpened: Math.max(a.chestsOpened, b.chestsOpened),
    hive,
    honeyAt: Math.max(a.honeyAt, b.honeyAt),
    freeChestAt: Math.max(a.freeChestAt, b.freeChestAt),
    xp: bookBalance(xpBook),
    xpBook,
    lossStreak: { ...newer.lossStreak },
    seasonPremium: a.seasonPremium || b.seasonPremium,
    liveops: mergeLiveOps(a.liveops, b.liveops, newer === a),
  };
}
