import { createRng } from '../sim/rng';
import { defaultRemoteConfig, type RemoteConfig } from '../platform/remoteConfig';
import { SERVER_SKUS } from '../../supabase/functions/_shared/skus.ts';
import {
  AdminError,
  type AdminBackend,
  type AuditRow,
  type ConfigVersion,
  type EventRow,
  type LevelOverride,
  type PlayerDetail,
  type PlayerRow,
  type PurchaseRow,
  type Stats,
} from './backend';
import { can, grantProblem, maskEmail, MIN_REASON, type Role } from './perms';
import { checkRemoteConfig } from './schemas';

const LEVEL_IDS = [
  'ftue-meadow',
  'dandelion-drift',
  'clover-run',
  'thistle-gauntlet',
  'wasp-queen-nest',
];
const NAMES = ['Ari', 'Bea', 'Cal', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo', 'Jun', 'Kai', 'Lia'];
const DAY = 86_400_000;

interface MockPlayer {
  row: Omit<PlayerRow, 'email' | 'coins' | 'gems' | 'purchases'> & { email: string | null };
  save: { revision: number; data: Record<string, unknown>; updated_at: string };
  events: (EventRow & { user_id: string })[];
  progress: PlayerDetail['progress'];
}

const iso = (ms: number) => new Date(ms).toISOString();
const uuid = (r: () => number) =>
  'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(r() * 16).toString(16));

type Json = Record<string, unknown>;
const num = (v: unknown) => (typeof v === 'number' ? v : 0);
function bookBalance(b: Json | undefined): number {
  let s = 0;
  for (const k of ['earn', 'grants'] as const)
    for (const v of Object.values((b?.[k] as Json) ?? {})) s += num(v);
  for (const v of Object.values((b?.spend as Json) ?? {})) s -= num(v);
  return Math.max(0, s);
}
const ledgerBalance = (l: unknown) =>
  Math.max(
    0,
    (Array.isArray(l) ? l : []).reduce((s: number, e: Json) => s + num(e?.delta), 0),
  );

/**
 * In-memory admin backend with a seeded dataset (M6 mock mode: no env vars). It applies the
 * same role, cap, reason and publish rules as the SQL functions so the UI and tests exercise
 * the real refusals.
 */
export class MockAdminBackend implements AdminBackend {
  readonly mode = 'mock' as const;
  private signedIn: string | null = null;
  private players: MockPlayer[] = [];
  private purchaseRows: PurchaseRow[] = [];
  private auditRows: AuditRow[] = [];
  private configs: ConfigVersion[] = [];
  private levels: LevelOverride[] = [];
  readonly adminId = '00000000-0000-4000-8000-00000000a0a0';

  constructor(
    private role: Role | null = 'owner',
    private readonly now: () => number = Date.now,
    seed = 7,
  ) {
    this.seed(seed);
  }

  setRole(r: Role | null): void {
    this.role = r;
  }

  private seed(seed: number): void {
    const r = createRng(seed);
    const t0 = this.now();
    for (let i = 0; i < 24; i++) {
      const id = uuid(r);
      const created = t0 - Math.floor(r() * 7 * DAY);
      const cleared = Math.min(5, Math.floor(r() * 6));
      const coins = Math.floor(r() * 3000);
      const gems = Math.floor(r() * 200);
      const guest = r() < 0.4;
      const p: MockPlayer = {
        row: {
          id,
          email: guest ? null : `${NAMES[i % NAMES.length].toLowerCase()}${i}@example.test`,
          display_name: guest ? null : `${NAMES[i % NAMES.length]}${i}`,
          created_at: iso(created),
          last_seen: iso(created + Math.floor(r() * (t0 - created))),
          levels_cleared: cleared,
          battles: cleared * 2 + Math.floor(r() * 5),
          guest,
          is_admin: false,
        },
        save: {
          revision: 3 + i,
          updated_at: iso(t0 - Math.floor(r() * DAY)),
          data: {
            version: 2,
            revision: 3 + i,
            coins,
            coinBook: { earn: { dev: coins }, spend: {}, grants: {} },
            gems,
            gemLedger: gems
              ? [{ id: `level:${cleared}`, delta: gems, reason: 'level_up', at: created }]
              : [],
            noAds: false,
            skins: [],
            resetEpoch: 0,
          },
        },
        events: [],
        progress: LEVEL_IDS.slice(0, cleared).map((l) => ({
          level_id: l,
          best_stars: 1 + Math.floor(r() * 3),
          best_coins: 20 + Math.floor(r() * 80),
        })),
      };
      const session = `s${i}`;
      let ts = created;
      const ev = (name: string, props: Json) => {
        ts += 30_000 + Math.floor(r() * 60_000);
        p.events.push({
          user_id: id,
          name,
          props,
          session,
          client_ts: iso(ts),
          created_at: iso(ts),
        });
      };
      const ftueSteps = 1 + Math.floor(r() * 6);
      for (let s = 1; s <= ftueSteps; s++)
        ev('ftue_step', { step: s, msSinceFirstInput: s * 4000 });
      for (let l = 0; l <= Math.min(cleared, LEVEL_IDS.length - 1); l++) {
        const tries = 1 + Math.floor(r() * (l + 1));
        for (let k = 0; k < tries; k++) {
          ev('level_start', { level: LEVEL_IDS[l] });
          const won = k === tries - 1 && l < cleared;
          ev(won ? 'level_win' : 'level_fail', { level: LEVEL_IDS[l], time: 60 });
          if (won && r() < 0.6)
            ev('ad_watched', { placement: 'win_double', completed: true, type: 'rewarded' });
          if (k > 0 && r() < 0.5)
            ev('ad_watched', { placement: 'level_transition', type: 'interstitial' });
        }
      }
      this.players.push(p);
    }
    const skus = Object.keys(SERVER_SKUS).filter(
      (k) => SERVER_SKUS[k as keyof typeof SERVER_SKUS].available,
    );
    for (let i = 0; i < 9; i++) {
      const p = this.players[Math.floor(r() * this.players.length)];
      const sku = skus[i % skus.length] as keyof typeof SERVER_SKUS;
      const d = SERVER_SKUS[sku];
      const at = t0 - Math.floor(r() * 6 * DAY);
      const refunded = i === 4;
      this.purchaseRows.push({
        session_id: `cs_test_mock_${i}`,
        user_id: p.row.id,
        sku,
        provider: i % 3 === 0 ? 'stripe_test' : 'mock',
        status: refunded ? 'refunded' : 'paid',
        amount: Math.round(d.usd * 100),
        currency: 'usd',
        grants: { ...d.grants },
        created_at: iso(at),
        refunded_at: refunded ? iso(at + 3_600_000) : null,
      });
    }
    this.configs.push({
      version: 1,
      config: defaultRemoteConfig(),
      note: 'seed: shipped defaults',
      published_by: this.adminId,
      rolled_back_from: null,
      published_at: iso(t0 - 2 * DAY),
    });
  }

  private need(a: Parameters<typeof can>[1]): Role {
    if (!this.signedIn) throw new AdminError('not signed in', 403);
    if (!can(this.role, a)) throw new AdminError('forbidden', 403);
    return this.role!;
  }

  private log(
    action: string,
    target_user: string | null,
    target: string | null,
    before: unknown,
    after: unknown,
    reason: string | null,
  ): AuditRow {
    const row: AuditRow = {
      id: this.auditRows.length + 1,
      admin_id: this.adminId,
      action,
      target_user,
      target,
      before,
      after,
      reason,
      at: iso(this.now()),
    };
    this.auditRows.push(row);
    return row;
  }

  async session() {
    return this.signedIn ? { email: this.signedIn } : null;
  }
  async signIn(email: string) {
    this.signedIn = email || 'mock-admin@example.test';
    return 'Signed in (mock mode, no email sent).';
  }
  async signOut() {
    this.signedIn = null;
  }
  async whoami() {
    return this.signedIn ? this.role : null;
  }

  private rowOf(p: MockPlayer): PlayerRow {
    const d = p.save.data;
    return {
      ...p.row,
      email: maskEmail(p.row.email, this.role),
      coins: num(d.coins),
      gems: num(d.gems),
      purchases: this.purchaseRows.filter((x) => x.user_id === p.row.id).length,
    };
  }

  async findPlayers(q0: string) {
    this.need('read');
    const q = q0.trim();
    if (q.length > 128) throw new AdminError('query too long');
    const hit = (p: MockPlayer) =>
      !q ||
      (/^[0-9a-f-]{36}$/i.test(q) && p.row.id === q.toLowerCase()) ||
      (q.includes('@') && p.row.email?.toLowerCase() === q.toLowerCase()) ||
      (!q.includes('@') && !!p.row.display_name?.toLowerCase().startsWith(q.toLowerCase()));
    return this.players
      .filter(hit)
      .sort((a, b) => (b.row.last_seen ?? '').localeCompare(a.row.last_seen ?? ''))
      .slice(0, 50)
      .map((p) => this.rowOf(p));
  }

  async playerDetail(id: string): Promise<PlayerDetail | null> {
    this.need('read');
    const p = this.players.find((x) => x.row.id === id);
    if (!p) return null;
    return structuredClone({
      profile: { id, display_name: p.row.display_name, created_at: p.row.created_at },
      email: maskEmail(p.row.email, this.role),
      save: p.save,
      stats: { battles: p.row.battles, levels_cleared: p.row.levels_cleared },
      progress: p.progress,
      purchases: this.purchaseRows.filter((x) => x.user_id === id),
      events: p.events.slice(-200).reverse(),
      audit: this.auditRows.filter((a) => a.target_user === id).reverse(),
    });
  }

  async grant(id: string, coins: number, gems: number, reason: string) {
    const role = this.need('grant');
    const prob = grantProblem(role, coins, gems, reason);
    if (prob)
      throw new AdminError(
        prob,
        prob.startsWith('forbidden') || prob.startsWith('over') ? 403 : 400,
      );
    const p = this.players.find((x) => x.row.id === id);
    if (!p) throw new AdminError('player has no v2 cloud save', 404);
    const d = p.save.data;
    const before = { coins: d.coins, gems: d.gems };
    const a = this.log('grant', id, null, before, null, reason.trim());
    const key = `admin:${a.id}`;
    if (coins) {
      const b = d.coinBook as Json;
      b.grants = { ...((b.grants as Json) ?? {}), [key]: coins };
      d.coins = bookBalance(b);
    }
    if (gems) {
      (d.gemLedger as Json[]).push({ id: key, delta: gems, reason: 'admin_grant', at: this.now() });
      d.gems = ledgerBalance(d.gemLedger);
    }
    p.save.revision++;
    d.revision = p.save.revision;
    a.target = key;
    a.after = { coins: d.coins, gems: d.gems, grant_coins: coins, grant_gems: gems };
    return { coins: num(d.coins), gems: num(d.gems) };
  }

  async resetSave(id: string, reason: string, confirm: string) {
    this.need('reset');
    if (confirm !== 'RESET') throw new AdminError('type RESET to confirm');
    if (reason.trim().length < MIN_REASON)
      throw new AdminError(`reason (min ${MIN_REASON} chars) required`);
    const p = this.players.find((x) => x.row.id === id);
    if (!p) throw new AdminError('player has no cloud save', 404);
    const old = p.save.data;
    const paid = ([k]: [string, unknown]) => k.startsWith('purchase:') || k.startsWith('refund:');
    const grants = Object.fromEntries(
      Object.entries(((old.coinBook as Json)?.grants as Json) ?? {}).filter(paid),
    );
    const ledger = ((old.gemLedger as Json[]) ?? []).filter((e) => paid([String(e.id), 0]));
    p.save.revision++;
    p.save.data = {
      version: 2,
      revision: p.save.revision,
      resetEpoch: num(old.resetEpoch) + 1,
      coinBook: { earn: {}, spend: {}, grants },
      coins: bookBalance({ grants }),
      gemLedger: ledger,
      gems: ledgerBalance(ledger),
      noAds: old.noAds === true,
      skins: old.skins ?? [],
      ftueDone: true,
    };
    p.progress = [];
    this.log('reset_save', id, null, old, p.save.data, reason.trim());
  }

  async stats(from: Date, to: Date): Promise<Stats> {
    this.need('read');
    const f = from.toISOString();
    const t = to.toISOString();
    const evs = this.players
      .flatMap((p) => p.events)
      .filter((e) => e.created_at >= f && e.created_at < t);
    const lv = new Map<string, Stats['levels'][number]>();
    const ft = new Map<number, Set<string>>();
    const ad = new Map<
      string,
      { placement: string; type: string; watched: number; s: Set<string> }
    >();
    for (const e of evs) {
      if (/^level_(start|win|fail)$/.test(e.name) && typeof e.props.level === 'string') {
        const x = lv.get(e.props.level) ?? { level: e.props.level, starts: 0, wins: 0, fails: 0 };
        if (e.name === 'level_start') x.starts++;
        else if (e.name === 'level_win') x.wins++;
        else x.fails++;
        lv.set(x.level, x);
      } else if (e.name === 'ftue_step' && typeof e.props.step === 'number') {
        const s = ft.get(e.props.step) ?? new Set();
        s.add(e.user_id);
        ft.set(e.props.step, s);
      } else if (e.name === 'ad_watched') {
        const placement = String(e.props.placement ?? '?');
        const type = String(e.props.type ?? 'rewarded');
        const k = `${placement}|${type}`;
        const x = ad.get(k) ?? { placement, type, watched: 0, s: new Set<string>() };
        x.watched++;
        x.s.add(e.session);
        ad.set(k, x);
      }
    }
    const pur = new Map<string, Stats['purchases'][number]>();
    for (const p of this.purchaseRows.filter((x) => x.created_at >= f && x.created_at < t)) {
      const k = `${p.sku}|${p.provider}|${p.status}`;
      const x = pur.get(k) ?? {
        sku: p.sku,
        provider: p.provider,
        status: p.status,
        n: 0,
        amount: 0,
        currency: p.currency,
      };
      x.n++;
      x.amount += p.amount ?? 0;
      pur.set(k, x);
    }
    return {
      levels: [...lv.values()].sort((a, b) => a.level.localeCompare(b.level)),
      ftue: [...ft].map(([step, s]) => ({ step, players: s.size })).sort((a, b) => a.step - b.step),
      ads: [...ad.values()].map(({ s, ...x }) => ({ ...x, sessions: s.size })),
      sessions: new Set(evs.map((e) => e.session)).size,
      players: new Set(evs.map((e) => e.user_id)).size,
      purchases: [...pur.values()],
    };
  }

  async purchases(f: { status?: string; sku?: string }) {
    this.need('read');
    return this.purchaseRows
      .filter((p) => (!f.status || p.status === f.status) && (!f.sku || p.sku === f.sku))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async audit(limit: number) {
    this.need('read');
    return [...this.auditRows].reverse().slice(0, limit);
  }

  async configVersions() {
    this.need('read');
    return structuredClone([...this.configs].reverse().slice(0, 20));
  }

  async validateConfig(c: unknown) {
    const r = checkRemoteConfig(c);
    return r.ok ? [] : r.errors;
  }

  async publishConfig(c: RemoteConfig, note: string) {
    const role = this.need('publish');
    const r = checkRemoteConfig(c);
    if (!r.ok) throw new AdminError(`invalid config: ${r.errors.join('; ')}`);
    const live = this.configs.at(-1)?.config;
    if (
      !can(role, 'publishOdds') &&
      live &&
      JSON.stringify(live.chests) !== JSON.stringify(c.chests)
    )
      throw new AdminError('changing chest odds needs the owner role', 403);
    const version = (this.configs.at(-1)?.version ?? 0) + 1;
    this.configs.push({
      version,
      config: structuredClone(c),
      note,
      published_by: this.adminId,
      rolled_back_from: null,
      published_at: iso(this.now()),
    });
    this.log('config_publish', null, `remote_config:${version}`, live ?? null, c, note);
    return version;
  }

  async rollbackConfig(v: number, reason: string) {
    this.need('rollback');
    if (reason.trim().length < MIN_REASON)
      throw new AdminError(`reason (min ${MIN_REASON} chars) required`);
    const old = this.configs.find((x) => x.version === v);
    if (!old) throw new AdminError('no such version', 404);
    const live = this.configs.at(-1)!.config;
    const version = this.configs.at(-1)!.version + 1;
    this.configs.push({
      ...structuredClone(old),
      version,
      note: `rollback to v${v}: ${reason}`,
      rolled_back_from: v,
      published_at: iso(this.now()),
    });
    this.log('config_rollback', null, `remote_config:${version}`, live, old.config, reason);
    return version;
  }

  async levelOverrides() {
    this.need('read');
    return structuredClone(this.levels);
  }

  async saveLevel(id: string, data: Record<string, unknown>, reason: string) {
    this.need('saveLevel');
    if (reason.trim().length < MIN_REASON)
      throw new AdminError(`reason (min ${MIN_REASON} chars) required`);
    if (data.id !== id || !Array.isArray(data.gates) || !Array.isArray(data.waves))
      throw new AdminError('invalid level data');
    const cur = this.levels.find((l) => l.level_id === id);
    const before = cur ? cur.data : null;
    if (cur) {
      cur.data = structuredClone(data);
      cur.version++;
      cur.updated_at = iso(this.now());
    } else
      this.levels.push({
        level_id: id,
        data: structuredClone(data),
        version: 1,
        updated_by: this.adminId,
        updated_at: iso(this.now()),
      });
    this.log('level_save', null, `level:${id}`, before, data, reason.trim());
    return this.levels.find((l) => l.level_id === id)!.version;
  }
}
