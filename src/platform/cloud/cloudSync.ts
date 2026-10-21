import type { AnalyticsEvent, KeyValueStore } from '../../analytics/analytics';
import { mergeSaves, parseSave, type SaveData, type SaveStore } from '../save';
import type { CloudBackend, EventRow, LevelRow, StatsRow, SyncRequest } from './types';

/** M4-6: at most one sync round trip per 10 s while playing. */
export const MIN_SYNC_INTERVAL_MS = 10_000;
/** Events per round trip (the RPC accepts up to 200). */
export const EVENT_BATCH = 100;
const MAX_ATTEMPTS = 3;
const META_KEY = 'hivesurge.cloud.meta.v1';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'error';

interface Meta {
  userId: string;
  /** Cloud save revision this device last wrote or adopted. */
  rev: number | null;
  /** JSON of the last progress/stats snapshot sent. */
  progress: string;
  /** `ts` of the last analytics event drained. */
  eventsTs: number;
}

export interface SyncResult {
  status: SyncStatus;
  /** The running save changed (merged with or replaced by the cloud copy). */
  applied: boolean;
  conflicts: number;
  error?: string;
}

export interface CloudSyncOptions {
  /** Analytics ring buffer to drain into `events` (optional). */
  events?: () => AnalyticsEvent[];
  /** Called after the running save was changed by a sync (refresh the UI). */
  onApplied?: () => void;
  onStatus?: (s: SyncStatus) => void;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (t: unknown) => void;
}

/** Progress + stats snapshot of a save (M4-6), derived so it can never disagree with it. */
export function progressSnapshot(s: SaveData): { levels: LevelRow[]; stats: StatsRow } {
  const ids = new Set([...Object.keys(s.bestStars), ...Object.keys(s.stats.bestCoins)]);
  const levels = [...ids].sort().map((id) => ({
    level_id: id,
    best_stars: s.bestStars[id] ?? 0,
    best_coins: s.stats.bestCoins[id] ?? 0,
  }));
  let earned = 0;
  let spent = 0;
  for (const e of s.gemLedger)
    if (e.delta > 0) earned += e.delta;
    else spent -= e.delta;
  const stars = Object.values(s.bestStars);
  return {
    levels,
    stats: {
      battles: s.battlesCompleted,
      wins: s.stats.wins,
      losses: s.stats.losses,
      total_stars: stars.reduce((a, b) => a + b, 0),
      levels_cleared: stars.filter((n) => n > 0).length,
      coins_earned: s.stats.coinsEarned,
      gems_earned: earned,
      gems_spent: spent,
    },
  };
}

/**
 * M4-5 cloud save + M4-6 progress/stats/events sync. One `sync` round trip carries the save
 * (optimistic concurrency on `revision`), the progress snapshot and an events batch. On a
 * conflict the cloud copy comes back, is merged with `mergeSaves` (gem ledger union, M4-5a)
 * and pushed again. Any failure leaves local play untouched (local-first).
 */
export class CloudSync {
  status: SyncStatus = 'off';
  lastSyncAt = 0;
  lastError = '';
  private timer: unknown = null;
  private running: Promise<SyncResult> | null = null;
  private again = false;
  private readonly now: () => number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (t: unknown) => void;
  private unsub: (() => void) | null = null;

  constructor(
    private readonly store: SaveStore,
    private readonly backend: CloudBackend,
    private readonly kv: KeyValueStore,
    private readonly opts: CloudSyncOptions = {},
  ) {
    this.now = opts.now ?? Date.now;
    this.setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = opts.clearTimer ?? ((t) => clearTimeout(t as ReturnType<typeof setTimeout>));
  }

  /** Push after local commits (debounced to one round trip per MIN_SYNC_INTERVAL_MS). */
  start(): void {
    this.unsub ??= this.store.onCommit(() => this.schedule());
  }
  stop(): void {
    this.unsub?.();
    this.unsub = null;
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
    this.setStatus('off');
  }

  schedule(): void {
    if (this.timer !== null) return;
    const wait = Math.max(0, this.lastSyncAt + MIN_SYNC_INTERVAL_MS - this.now());
    this.timer = this.setTimer(() => {
      this.timer = null;
      void this.syncNow();
    }, wait);
  }

  /** Run one sync now (coalesces with one already running). */
  syncNow(): Promise<SyncResult> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = this.run().finally(() => {
      this.running = null;
      if (this.again) {
        this.again = false;
        this.schedule();
      }
    });
    return this.running;
  }

  private setStatus(s: SyncStatus): void {
    if (this.status === s) return;
    this.status = s;
    this.opts.onStatus?.(s);
  }

  private readMeta(userId: string): Meta {
    try {
      const m = JSON.parse(this.kv.getItem(META_KEY) ?? '') as Partial<Meta>;
      if (m.userId === userId)
        return {
          userId,
          rev: typeof m.rev === 'number' ? m.rev : null,
          progress: typeof m.progress === 'string' ? m.progress : '',
          eventsTs: typeof m.eventsTs === 'number' ? m.eventsTs : 0,
        };
    } catch {
      /* fresh */
    }
    return { userId, rev: null, progress: '', eventsTs: 0 };
  }
  private writeMeta(m: Meta): void {
    try {
      this.kv.setItem(META_KEY, JSON.stringify(m));
    } catch {
      /* ignore */
    }
  }

  private async run(): Promise<SyncResult> {
    const res: SyncResult = { status: 'idle', applied: false, conflicts: 0 };
    let user;
    try {
      user = await this.backend.currentUser();
    } catch {
      user = null;
    }
    if (!user) {
      this.setStatus('off');
      return { ...res, status: 'off' };
    }
    this.setStatus('syncing');
    const meta = this.readMeta(user.id);
    try {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const local = this.store.data;
        const dirty = meta.rev === null || local.revision > meta.rev;
        const snap = progressSnapshot(local);
        const progressJson = JSON.stringify(snap);
        const sendProgress = progressJson !== meta.progress;
        const events = this.pendingEvents(meta.eventsTs);
        const req: SyncRequest = {
          data: dirty ? JSON.parse(JSON.stringify(local)) : null,
          revision: local.revision,
          expected: meta.rev,
          levels: sendProgress ? snap.levels : [],
          stats: sendProgress ? snap.stats : null,
          events: events.map(toRow),
        };
        const r = await this.backend.sync(req);
        // Progress and events are idempotent server-side, so they count as sent either way.
        if (sendProgress) meta.progress = progressJson;
        if (events.length) meta.eventsTs = events[events.length - 1].ts;

        if (r.ok && dirty) {
          meta.rev = req.revision;
        } else if (r.ok && r.data != null && r.revision !== null) {
          // Nothing local to push and the cloud moved on: adopt it (it already contains ours).
          await this.store.replace(parseSave(JSON.stringify(r.data)));
          meta.rev = r.revision;
          res.applied = true;
        } else if (!r.ok) {
          res.conflicts++;
          if (r.data != null && r.revision !== null) {
            const cloud = parseSave(JSON.stringify(r.data));
            const merged = mergeSaves(this.store.data, cloud);
            merged.revision = Math.max(merged.revision, r.revision + 1);
            await this.store.replace(merged);
            meta.rev = r.revision;
            res.applied = true;
          } else meta.rev = null;
          this.writeMeta(meta);
          continue; // push the merged save
        }
        this.writeMeta(meta);
        // More events than one batch: drain them on the next scheduled round trip.
        if (this.pendingEvents(meta.eventsTs).length) this.again = true;
        this.lastSyncAt = this.now();
        this.lastError = '';
        this.setStatus('idle');
        if (res.applied) this.opts.onApplied?.();
        return res;
      }
      throw new Error('too many save conflicts');
    } catch (e) {
      this.writeMeta(meta);
      this.lastSyncAt = this.now();
      this.lastError = e instanceof Error ? e.message : String(e);
      const offline = /network|fetch|offline|Failed to fetch/i.test(this.lastError);
      this.setStatus(offline ? 'offline' : 'error');
      if (res.applied) this.opts.onApplied?.();
      return { ...res, status: this.status, error: this.lastError };
    }
  }

  private pendingEvents(afterTs: number): AnalyticsEvent[] {
    const all = this.opts.events?.() ?? [];
    return all.filter((e) => e.ts > afterTs).slice(0, EVENT_BATCH);
  }
}

function toRow(e: AnalyticsEvent): EventRow {
  return {
    session: String(e.session).slice(0, 64) || 'unknown',
    name: e.name,
    props: e.props ?? {},
    client_ts: new Date(e.ts).toISOString(),
  };
}
