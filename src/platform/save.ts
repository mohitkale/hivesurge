import type { KeyValueStore } from '../analytics/analytics';
import {
  type GemEntry,
  ledgerBalance,
  legacyOpeningEntry,
  mergeLedgers,
  parseLedger,
  reconcileGems,
} from './gemLedger';
import {
  addGrant,
  bookBalance,
  type CounterBook,
  emptyBook,
  mergeBooks,
  parseBook,
  reconcileBook,
} from './counter';
import { deviceId } from './device';
import { defaultMeta, type MetaState, mergeMeta, parseMeta, reconcileMeta } from './saveMeta';

/**
 * Save data is a single versioned document. `revision` increases on every
 * local write and `updatedAt` records when, so a future cloud backend
 * (Supabase `saves` table with optimistic concurrency) can reconcile.
 */
/* Kept here (not in reviveGems.ts) so the entry chunk does not pull in the gem revive code. */
/** Persisted daily gem-revive counter (C2: the daily counter is saved, the session one is not). */
export interface GemReviveDay {
  day: string;
  count: number;
}

export const emptyGemReviveDay = (): GemReviveDay => ({ day: '', count: 0 });

export interface SaveData {
  /** M5-4a: v2 adds coin/ticket books and `meta`; v1 saves migrate on parse. */
  version: 2;
  revision: number;
  updatedAt: number;
  /** Cached coin balance; `coinBook` is the source of truth (M5-4a). */
  coins: number;
  coinBook: CounterBook;
  /** G8 ad-skip tickets (cached) and their book. */
  skipTickets: number;
  ticketBook: CounterBook;
  /** M5-4 collection, chests, loadout, hive base, XP. */
  meta: MetaState;
  /** Cached spendable balance, always `ledgerBalance(gemLedger)` (M4-5a). */
  gems: number;
  /** M4-5a: append-only gem grant/spend ledger; the source of truth for `gems`. */
  gemLedger: GemEntry[];
  bestStars: Record<string, number>;
  noAds: boolean;
  /** Owned bee skins (e.g. 'starter' from the Starter Pack). */
  skins: string[];
  /** Equipped bee skin id ('' = classic). Must be in `skins`; see skinSelect.ts. */
  equippedSkin: string;
  /** M2-32: the L2 trap tip was shown once on this device. */
  trapTipShown: boolean;
  battlesCompleted: number;
  lastInterstitialAt: number;
  /** FTUE finished (first win, or a later launch). Gates ads/offers (G1, G2). */
  ftueDone: boolean;
  /** M2-30: highest FTUE step completed in any attempt (FtueStep value, 0 = none). */
  ftueStep: number;
  /** M2-33: the player has fired (held) at least once; the hold hint is not shown again. */
  holdUsed: boolean;
  /** M2-30b: FTUE battles that ended with step 2 (aimed x2 hits) not learned. */
  ftueStep2Fails: number;
  /** Daily ad counters for caps (G5); reset when `day` changes. */
  adDay: AdDayCounters;
  /** M2-21c (C2): gem revives today; the per-session count is not saved. */
  reviveGemDay: GemReviveDay;
  /** M4-6: lifetime stats for the cloud `player_stats` / `level_progress` sync (max-merged). */
  stats: PlayerStats;
  /** `shake`: camera screen shake (round 3, default off). */
  settings: { muted: boolean; colorBlind: boolean; haptics: boolean; shake: boolean };
}

export interface PlayerStats {
  wins: number;
  losses: number;
  coinsEarned: number;
  /** Best coin reward per level id ("best score"). */
  bestCoins: Record<string, number>;
}

export const emptyStats = (): PlayerStats => ({
  wins: 0,
  losses: 0,
  coinsEarned: 0,
  bestCoins: {},
});

export interface AdDayCounters {
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
  rewarded: number;
  interstitial: number;
  perPlacement: Record<string, number>;
}

export const emptyAdDay = (): AdDayCounters => ({
  day: '',
  rewarded: 0,
  interstitial: 0,
  perPlacement: {},
});

export const defaultSave = (): SaveData => ({
  version: 2,
  revision: 0,
  updatedAt: 0,
  coins: 0,
  coinBook: emptyBook(),
  skipTickets: 0,
  ticketBook: emptyBook(),
  meta: defaultMeta(),
  gems: 0,
  gemLedger: [],
  bestStars: {},
  noAds: false,
  skins: [],
  equippedSkin: '',
  trapTipShown: false,
  battlesCompleted: 0,
  lastInterstitialAt: 0,
  ftueDone: false,
  ftueStep: 0,
  holdUsed: false,
  ftueStep2Fails: 0,
  adDay: emptyAdDay(),
  reviveGemDay: emptyGemReviveDay(),
  stats: emptyStats(),
  settings: { muted: false, colorBlind: false, haptics: true, shake: false },
});

/** Parse a stored save defensively; unknown or corrupt data falls back to defaults. */
export function parseSave(raw: string | null): SaveData {
  const def = defaultSave();
  if (!raw) return def;
  try {
    const d = JSON.parse(raw) as Omit<Partial<SaveData>, 'version'> & { version?: number };
    if (d.version !== 1 && d.version !== 2) return def;
    const stars: Record<string, number> = {};
    if (d.bestStars && typeof d.bestStars === 'object')
      for (const [k, v] of Object.entries(d.bestStars)) stars[k] = Math.min(3, num(v));
    const revision = num(d.revision);
    const updatedAt = num(d.updatedAt);
    // M4-5a: saves with a ledger derive the balance from it; older saves get one opening entry.
    const gemLedger = Array.isArray(d.gemLedger)
      ? parseLedger(d.gemLedger)
      : num(d.gems) > 0
        ? [legacyOpeningEntry(num(d.gems), revision, updatedAt)]
        : [];
    // M5-4a: v2 derives coins from the book; v1 balances become one stable opening grant.
    const coinBook = parseBook(d.version === 2 ? d.coinBook : undefined);
    if (d.version === 1 && num(d.coins) > 0)
      addGrant(coinBook, `legacy:${revision}:${updatedAt}`, num(d.coins));
    const ticketBook = parseBook(d.version === 2 ? d.ticketBook : undefined);
    return {
      version: 2,
      revision,
      updatedAt,
      coins: bookBalance(coinBook),
      coinBook,
      skipTickets: bookBalance(ticketBook),
      ticketBook,
      meta: parseMeta(d.version === 2 ? d.meta : undefined),
      gems: ledgerBalance(gemLedger),
      gemLedger,
      bestStars: stars,
      noAds: d.noAds === true,
      skins: Array.isArray(d.skins)
        ? [...new Set(d.skins.filter((x): x is string => typeof x === 'string'))]
        : [],
      equippedSkin: typeof d.equippedSkin === 'string' ? d.equippedSkin : '',
      trapTipShown: d.trapTipShown === true,
      battlesCompleted: num(d.battlesCompleted),
      lastInterstitialAt: num(d.lastInterstitialAt),
      ftueDone: d.ftueDone === true,
      ftueStep: Math.min(6, Math.floor(num(d.ftueStep))),
      holdUsed: d.holdUsed === true,
      ftueStep2Fails: Math.min(99, Math.floor(num(d.ftueStep2Fails))),
      adDay: parseAdDay(d.adDay),
      reviveGemDay: {
        day: typeof d.reviveGemDay?.day === 'string' ? d.reviveGemDay.day : '',
        count: num(d.reviveGemDay?.count),
      },
      stats: parseStats(d.stats),
      settings: {
        muted: d.settings?.muted === true,
        colorBlind: d.settings?.colorBlind === true,
        haptics: d.settings?.haptics !== false,
        shake: d.settings?.shake === true,
      },
    };
  } catch {
    return def;
  }
}

/**
 * Merge a local and remote save when both changed (cloud sync conflict).
 * Higher revision wins for settings; progress takes the max so nothing earned
 * is lost; purchases (noAds) are sticky; gems merge by ledger (M4-5a).
 */
export function mergeSaves(a0: SaveData, b0: SaveData, device: string = deviceId()): SaveData {
  // Fold any unreconciled cached balance into this device's book first (pure: on copies).
  const a = reconciledCopy(a0, device);
  const b = reconciledCopy(b0, device);
  const newer = a.revision >= b.revision ? a : b;
  const coinBook = mergeBooks(a.coinBook, b.coinBook);
  const ticketBook = mergeBooks(a.ticketBook, b.ticketBook);
  const gemLedger = mergeLedgers(a.gemLedger, b.gemLedger);
  const stars: Record<string, number> = { ...a.bestStars };
  for (const [k, v] of Object.entries(b.bestStars)) stars[k] = Math.max(stars[k] ?? 0, v);
  return {
    ...newer,
    revision: Math.max(a.revision, b.revision) + 1,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
    // M5-4a: coins/tickets merge by PN-counter book, so a spend is never refunded and coins
    // earned on another device are kept.
    coins: bookBalance(coinBook),
    coinBook,
    skipTickets: bookBalance(ticketBook),
    ticketBook,
    meta: mergeMeta(a.meta, b.meta, newer.meta),
    // M4-5a: union of both ledgers by entry id. A grant or purchase on either side is kept, a
    // spend on either side stays spent, and an entry seen on both sides counts once.
    gems: ledgerBalance(gemLedger),
    gemLedger,
    reviveGemDay: mergeGemDay(a.reviveGemDay, b.reviveGemDay),
    bestStars: stars,
    noAds: a.noAds || b.noAds,
    skins: [...new Set([...a.skins, ...b.skins])], // purchases are sticky
    trapTipShown: a.trapTipShown || b.trapTipShown,
    battlesCompleted: Math.max(a.battlesCompleted, b.battlesCompleted),
    ftueDone: a.ftueDone || b.ftueDone,
    ftueStep: Math.max(a.ftueStep, b.ftueStep),
    holdUsed: a.holdUsed || b.holdUsed,
    ftueStep2Fails: Math.max(a.ftueStep2Fails, b.ftueStep2Fails),
    stats: mergeStats(a.stats, b.stats),
  };
}

function reconciledCopy(s: SaveData, device: string): SaveData {
  const c = structuredClone(s);
  reconcileSave(c, device);
  return c;
}

/**
 * M5-4a: write cached balances (coins, tickets, pollen, XP) into this device's books and
 * gems into the ledger. Called on every commit and before every merge.
 */
export function reconcileSave(s: SaveData, device: string = deviceId(), now = Date.now()): void {
  s.coins = reconcileBook(s.coinBook, s.coins, device);
  s.skipTickets = reconcileBook(s.ticketBook, s.skipTickets, device);
  reconcileMeta(s.meta, device);
  reconcileGems(s, now);
}

function maxRecord(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
}

/** Stats only grow, so a merge takes the max of each counter (never double counts). */
export function mergeStats(a: PlayerStats, b: PlayerStats): PlayerStats {
  return {
    wins: Math.max(a.wins, b.wins),
    losses: Math.max(a.losses, b.losses),
    coinsEarned: Math.max(a.coinsEarned, b.coinsEarned),
    bestCoins: maxRecord(a.bestCoins, b.bestCoins),
  };
}

function parseStats(v: unknown): PlayerStats {
  if (!v || typeof v !== 'object') return emptyStats();
  const o = v as Partial<PlayerStats>;
  const best: Record<string, number> = {};
  if (o.bestCoins && typeof o.bestCoins === 'object')
    for (const [k, n] of Object.entries(o.bestCoins)) best[k] = num(n);
  return {
    wins: num(o.wins),
    losses: num(o.losses),
    coinsEarned: num(o.coinsEarned),
    bestCoins: best,
  };
}

/**
 * Copy `src` into `target` in place, keeping nested object identity (the game, ad pacer and
 * gem caps hold references to `adDay`, `reviveGemDay`, `settings`). Used when a cloud merge
 * replaces the running save.
 */
export function assignSaveInPlace(target: SaveData, src: SaveData): void {
  const t = target as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(src)) {
    const cur = t[k];
    if (isPlainObject(v) && isPlainObject(cur)) {
      for (const key of Object.keys(cur)) if (!(key in v)) delete cur[key];
      for (const [kk, vv] of Object.entries(v))
        cur[kk] = isPlainObject(vv) ? { ...vv } : Array.isArray(vv) ? [...vv] : vv;
    } else t[k] = Array.isArray(v) ? [...v] : isPlainObject(v) ? { ...v } : v;
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function parseAdDay(v: unknown): AdDayCounters {
  if (!v || typeof v !== 'object') return emptyAdDay();
  const o = v as Partial<AdDayCounters>;
  const per: Record<string, number> = {};
  if (o.perPlacement && typeof o.perPlacement === 'object')
    for (const [k, n] of Object.entries(o.perPlacement)) per[k] = num(n);
  return {
    day: typeof o.day === 'string' ? o.day : '',
    rewarded: num(o.rewarded),
    interstitial: num(o.interstitial),
    perPlacement: per,
  };
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

/** Backend seam: local now, cloud (Supabase) later behind the same interface. */
export interface SaveBackend {
  load(): Promise<string | null>;
  store(raw: string): Promise<void>;
}

export class LocalSaveBackend implements SaveBackend {
  constructor(
    private readonly kv: KeyValueStore,
    private readonly key = 'hivesurge.save.v1',
  ) {}
  async load() {
    return this.kv.getItem(this.key);
  }
  async store(raw: string) {
    this.kv.setItem(this.key, raw);
  }
}

export class SaveStore {
  data: SaveData = defaultSave();
  private readonly listeners = new Set<() => void>();
  constructor(
    private readonly backend: SaveBackend,
    private readonly now: () => number = Date.now,
    /** M5-4a: this device's id for the PN-counter books (tests pass one per fake device). */
    readonly device: string = deviceId(),
  ) {}
  /** M4-5: called after every local commit (the cloud sync schedules a push). */
  onCommit(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  /**
   * M4-5: replace the running save with a merged/cloud copy, in place, and persist it locally.
   * The revision is taken from `next` (a merge already advanced it); listeners are not called.
   */
  async replace(next: SaveData): Promise<void> {
    assignSaveInPlace(this.data, next);
    try {
      await this.backend.store(JSON.stringify(this.data));
    } catch {
      /* keep playing with in-memory state */
    }
  }
  async load(): Promise<SaveData> {
    this.data = parseSave(await this.backend.load());
    return this.data;
  }
  async commit(): Promise<void> {
    this.data.revision++;
    this.data.updatedAt = this.now();
    reconcileSave(this.data, this.device, this.data.updatedAt); // M4-5a / M5-4a books
    try {
      await this.backend.store(JSON.stringify(this.data));
    } catch {
      /* private mode / quota: keep playing with in-memory state */
    }
    for (const fn of this.listeners)
      try {
        fn();
      } catch {
        /* a sync hook must never break saving */
      }
  }
}

/**
 * Daily gem-revive counter merge (C2): the same day keeps the higher count (never resets the cap
 * by merging); different days keep the later day's counter.
 */
export function mergeGemDay(a: GemReviveDay, b: GemReviveDay): GemReviveDay {
  if (a.day === b.day) return { day: a.day, count: Math.max(a.count, b.count) };
  return a.day > b.day ? { ...a } : { ...b };
}
