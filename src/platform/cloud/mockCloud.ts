import type { KeyValueStore } from '../../analytics/analytics';
import type {
  CloudBackend,
  CloudUser,
  EventRow,
  LevelRow,
  StatsRow,
  SyncRequest,
  SyncResponse,
} from './types';

interface MockUserRow {
  id: string;
  email: string | null;
  anonymous: boolean;
}
interface MockDb {
  users: MockUserRow[];
  saves: Record<string, { revision: number; data: unknown }>;
  levels: Record<string, Record<string, LevelRow>>;
  stats: Record<string, StatsRow>;
  events: Record<string, EventRow[]>;
}

const emptyDb = (): MockDb => ({ users: [], saves: {}, levels: {}, stats: {}, events: {} });

/**
 * In-memory stand-in for the Supabase project: the same rules as the SQL (own rows only,
 * optimistic concurrency on `revision`, monotonic progress/stats, idempotent events).
 * Several `MockCloudBackend` "devices" can share one server in tests. With a KeyValueStore it
 * persists (no-env builds keep their mock cloud in this browser's localStorage).
 */
export class MockCloudServer {
  db: MockDb;
  /** Set true to simulate the backend being down. */
  offline = false;
  constructor(
    private readonly kv?: KeyValueStore,
    private readonly key = 'hivesurge.mockcloud.db.v1',
  ) {
    this.db = emptyDb();
    try {
      const raw = kv?.getItem(key);
      if (raw) this.db = { ...emptyDb(), ...(JSON.parse(raw) as MockDb) };
    } catch {
      this.db = emptyDb();
    }
  }
  persist(): void {
    try {
      this.kv?.setItem(this.key, JSON.stringify(this.db));
    } catch {
      /* ignore */
    }
  }
  check(): void {
    if (this.offline) throw new Error('network: mock cloud offline');
  }
  newId(): string {
    return `mock-${this.db.users.length + 1}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /** The `sync_player` RPC, run as `uid`. */
  sync(uid: string, r: SyncRequest): SyncResponse {
    this.check();
    let ok = true;
    const cur = this.db.saves[uid];
    if (r.data !== null) {
      if (!(r.revision > (r.expected ?? -1))) throw new Error('revision must increase');
      if (r.expected === null) ok = !cur;
      else ok = !!cur && cur.revision === r.expected;
      if (ok) this.db.saves[uid] = { revision: r.revision, data: structuredClone(r.data) };
    }
    const lv = (this.db.levels[uid] ??= {});
    for (const l of r.levels) {
      const p = lv[l.level_id];
      lv[l.level_id] = {
        level_id: l.level_id,
        best_stars: Math.min(3, Math.max(p?.best_stars ?? 0, l.best_stars)),
        best_coins: Math.max(p?.best_coins ?? 0, l.best_coins),
      };
    }
    if (r.stats) {
      const p = this.db.stats[uid];
      const s = { ...r.stats };
      if (p) for (const k of Object.keys(s) as (keyof StatsRow)[]) s[k] = Math.max(s[k], p[k]);
      this.db.stats[uid] = s;
    }
    const evs = (this.db.events[uid] ??= []);
    for (const e of r.events)
      if (
        !evs.some(
          (x) => x.session === e.session && x.client_ts === e.client_ts && x.name === e.name,
        )
      )
        evs.push(e);
    this.persist();
    const now = this.db.saves[uid];
    const changed = r.data === null && (now?.revision ?? null) !== r.expected;
    return {
      ok,
      revision: now?.revision ?? null,
      data: now && (!ok || changed) ? structuredClone(now.data) : null,
    };
  }
}

/** One device / browser talking to a MockCloudServer. */
export class MockCloudBackend implements CloudBackend {
  readonly kind = 'mock' as const;
  private uid: string | null = null;
  private readonly subs = new Set<(u: CloudUser | null) => void>();
  /** Last "email" sent (tests inspect it; nothing is ever sent). */
  lastEmail: { to: string; kind: 'magic' | 'link' } | null = null;

  constructor(
    readonly server: MockCloudServer,
    private readonly kv?: KeyValueStore,
    private readonly sessionKey = 'hivesurge.mockcloud.session.v1',
  ) {
    this.uid = kv?.getItem(sessionKey) || null;
    if (this.uid && !server.db.users.some((u) => u.id === this.uid)) this.uid = null;
  }

  private setUid(uid: string | null): void {
    this.uid = uid;
    try {
      this.kv?.setItem(this.sessionKey, uid ?? '');
    } catch {
      /* ignore */
    }
    const u = this.user();
    for (const fn of this.subs) fn(u);
  }
  private user(): CloudUser | null {
    const row = this.server.db.users.find((u) => u.id === this.uid);
    return row ? { ...row } : null;
  }
  private need(): string {
    if (!this.uid) throw new Error('not signed in');
    return this.uid;
  }

  async currentUser() {
    return this.user();
  }
  async signInAnonymously() {
    this.server.check();
    const row = { id: this.server.newId(), email: null, anonymous: true };
    this.server.db.users.push(row);
    this.server.persist();
    this.setUid(row.id);
    return { ...row };
  }
  /** Mock: the link is "clicked" at once (signs in, creating the account if new). */
  async sendMagicLink(email: string) {
    this.server.check();
    const e = normEmail(email);
    let row = this.server.db.users.find((u) => u.email === e);
    if (!row) {
      row = { id: this.server.newId(), email: e, anonymous: false };
      this.server.db.users.push(row);
      this.server.persist();
    }
    this.lastEmail = { to: e, kind: 'magic' };
    this.setUid(row.id);
  }
  /** Mock: the confirmation is "clicked" at once; the guest keeps its user id. */
  async linkEmail(email: string) {
    this.server.check();
    const uid = this.need();
    const e = normEmail(email);
    if (this.server.db.users.some((u) => u.email === e && u.id !== uid))
      throw new Error('email already registered');
    const row = this.server.db.users.find((u) => u.id === uid)!;
    row.email = e;
    row.anonymous = false;
    this.server.persist();
    this.lastEmail = { to: e, kind: 'link' };
    this.setUid(uid);
  }
  async signOut() {
    this.setUid(null);
  }
  onAuthChange(cb: (u: CloudUser | null) => void) {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  async sync(req: SyncRequest) {
    return this.server.sync(this.need(), structuredClone(req));
  }
}

export function normEmail(email: string): string {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 254) throw new Error('invalid email');
  return e;
}
