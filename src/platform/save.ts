import type { KeyValueStore } from '../analytics/analytics';

/**
 * Save data is a single versioned document. `revision` increases on every
 * local write and `updatedAt` records when, so a future cloud backend
 * (Supabase `saves` table with optimistic concurrency) can reconcile.
 */
export interface SaveData {
  version: 1;
  revision: number;
  updatedAt: number;
  coins: number;
  gems: number;
  bestStars: Record<string, number>;
  noAds: boolean;
  /** Owned bee skins (e.g. 'starter' from the Starter Pack). */
  skins: string[];
  battlesCompleted: number;
  lastInterstitialAt: number;
  /** FTUE finished (first win, or a later launch). Gates ads/offers (G1, G2). */
  ftueDone: boolean;
  /** Daily ad counters for caps (G5); reset when `day` changes. */
  adDay: AdDayCounters;
  settings: { muted: boolean; colorBlind: boolean; haptics: boolean };
}

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
  version: 1,
  revision: 0,
  updatedAt: 0,
  coins: 0,
  gems: 0,
  bestStars: {},
  noAds: false,
  skins: [],
  battlesCompleted: 0,
  lastInterstitialAt: 0,
  ftueDone: false,
  adDay: emptyAdDay(),
  settings: { muted: false, colorBlind: false, haptics: true },
});

/** Parse a stored save defensively; unknown or corrupt data falls back to defaults. */
export function parseSave(raw: string | null): SaveData {
  const def = defaultSave();
  if (!raw) return def;
  try {
    const d = JSON.parse(raw) as Partial<SaveData>;
    if (d.version !== 1) return def;
    const stars: Record<string, number> = {};
    if (d.bestStars && typeof d.bestStars === 'object')
      for (const [k, v] of Object.entries(d.bestStars)) stars[k] = Math.min(3, num(v));
    return {
      version: 1,
      revision: num(d.revision),
      updatedAt: num(d.updatedAt),
      coins: num(d.coins),
      gems: num(d.gems),
      bestStars: stars,
      noAds: d.noAds === true,
      skins: Array.isArray(d.skins)
        ? [...new Set(d.skins.filter((x): x is string => typeof x === 'string'))]
        : [],
      battlesCompleted: num(d.battlesCompleted),
      lastInterstitialAt: num(d.lastInterstitialAt),
      ftueDone: d.ftueDone === true,
      adDay: parseAdDay(d.adDay),
      settings: {
        muted: d.settings?.muted === true,
        colorBlind: d.settings?.colorBlind === true,
        haptics: d.settings?.haptics !== false,
      },
    };
  } catch {
    return def;
  }
}

/**
 * Merge a local and remote save when both changed (cloud sync conflict).
 * Higher revision wins for settings; progress takes the max so nothing earned
 * is lost; purchases (noAds) are sticky.
 */
export function mergeSaves(a: SaveData, b: SaveData): SaveData {
  const newer = a.revision >= b.revision ? a : b;
  const stars: Record<string, number> = { ...a.bestStars };
  for (const [k, v] of Object.entries(b.bestStars)) stars[k] = Math.max(stars[k] ?? 0, v);
  return {
    ...newer,
    revision: Math.max(a.revision, b.revision) + 1,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
    coins: Math.max(a.coins, b.coins),
    gems: Math.max(a.gems, b.gems),
    bestStars: stars,
    noAds: a.noAds || b.noAds,
    skins: [...new Set([...a.skins, ...b.skins])], // purchases are sticky
    battlesCompleted: Math.max(a.battlesCompleted, b.battlesCompleted),
    ftueDone: a.ftueDone || b.ftueDone,
  };
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
  constructor(
    private readonly backend: SaveBackend,
    private readonly now: () => number = Date.now,
  ) {}
  async load(): Promise<SaveData> {
    this.data = parseSave(await this.backend.load());
    return this.data;
  }
  async commit(): Promise<void> {
    this.data.revision++;
    this.data.updatedAt = this.now();
    try {
      await this.backend.store(JSON.stringify(this.data));
    } catch {
      /* private mode / quota: keep playing with in-memory state */
    }
  }
}
