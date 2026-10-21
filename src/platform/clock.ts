import type { KeyValueStore } from '../analytics/analytics';

/**
 * M5-4c: trusted game clock for chests, hive builds, dailies and events. Timers never read
 * the device clock directly:
 *
 * - Within a session time advances with `performance.now()` (monotonic), so changing the
 *   device clock while playing does not speed anything up.
 * - The server time (from each cloud sync) re-anchors the clock and records the offset.
 * - A new session starts from the last trusted time plus the device time that passed since,
 *   corrected by the last known server offset, but credits at most MAX_OFFLINE_CREDIT_MS
 *   while offline, and never goes back before the last trusted time.
 */
export const MAX_OFFLINE_CREDIT_MS = 12 * 60 * 60 * 1000;
const KEY = 'hivesurge.clock.v1';

interface Persisted {
  lastTrusted: number;
  offset: number | null;
}

export class GameClock {
  private base: number;
  private perfBase: number;
  private offset: number | null;
  private lastSaved = 0;

  constructor(
    private readonly kv: KeyValueStore,
    private readonly perfNow: () => number = () => performance.now(),
    private readonly wallNow: () => number = Date.now,
    maxCredit = MAX_OFFLINE_CREDIT_MS,
  ) {
    const p = this.read();
    this.offset = p.offset;
    const wall = this.wallNow() + (p.offset ?? 0);
    this.base =
      p.lastTrusted > 0 ? Math.min(Math.max(wall, p.lastTrusted), p.lastTrusted + maxCredit) : wall;
    this.perfBase = this.perfNow();
    this.persist(true);
  }

  private read(): Persisted {
    try {
      const o = JSON.parse(this.kv.getItem(KEY) ?? '') as Partial<Persisted>;
      return {
        lastTrusted:
          typeof o.lastTrusted === 'number' && Number.isFinite(o.lastTrusted) ? o.lastTrusted : 0,
        offset: typeof o.offset === 'number' && Number.isFinite(o.offset) ? o.offset : null,
      };
    } catch {
      return { lastTrusted: 0, offset: null };
    }
  }

  private persist(force = false): void {
    const t = this.base + (this.perfNow() - this.perfBase);
    if (!force && t - this.lastSaved < 15_000) return;
    this.lastSaved = t;
    try {
      this.kv.setItem(KEY, JSON.stringify({ lastTrusted: t, offset: this.offset }));
    } catch {
      /* ignore */
    }
  }

  /** Trusted now (ms since epoch). */
  now(): number {
    this.persist();
    return this.base + (this.perfNow() - this.perfBase);
  }

  /** True once a server time has been seen on this device. */
  get serverSynced(): boolean {
    return this.offset !== null;
  }

  /** Re-anchor on a server timestamp (e.g. from the sync response). */
  setServerTime(serverMs: number): void {
    if (!Number.isFinite(serverMs) || serverMs <= 0) return;
    this.base = serverMs;
    this.perfBase = this.perfNow();
    this.offset = serverMs - this.wallNow();
    this.persist(true);
  }
}

let shared: GameClock | null = null;
/** App-wide clock (lazily created on first use). */
export function gameClock(): GameClock {
  shared ??= new GameClock(globalThis.localStorage ?? memoryKv());
  return shared;
}
export function setGameClockForTests(c: GameClock | null): void {
  shared = c;
}
function memoryKv(): KeyValueStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}
