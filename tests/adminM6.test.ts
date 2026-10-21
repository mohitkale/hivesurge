import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sandboxGuard } from '../src/admin/sandbox';
import { checkRemoteConfig, RemoteConfigSchema } from '../src/admin/schemas';
import { MockAdminBackend } from '../src/admin/mockBackend';
import { AdminError } from '../src/admin/backend';
import { can, grantProblem, maskEmail } from '../src/admin/perms';
import { checkLevel } from '../src/admin/levelCheck';
import { jsonDiff, playersHtml } from '../src/admin/views';
import { defaultRemoteConfig } from '../src/platform/remoteConfig';
import { LEVELS } from '../src/levels';
import { splitProblems } from '../scripts/admin-split-check.mjs';

const T = Date.parse('2026-10-22T12:00:00Z');
const mock = async (role: ConstructorParameters<typeof MockAdminBackend>[0] = 'owner') => {
  const b = new MockAdminBackend(role, () => T);
  await b.signIn('qa@example.test');
  return b;
};
const refused = async (p: Promise<unknown>, status = 403) => {
  await expect(p).rejects.toBeInstanceOf(AdminError);
  await p.catch((e: AdminError) => expect(e.status).toBe(status));
};

describe('M6-2a sandbox guard', () => {
  it('allows only the sandbox project, local Supabase or mock', () => {
    expect(sandboxGuard('')).toEqual({ ok: true, target: 'mock' });
    expect(sandboxGuard('https://yaizrnbfspmzshdzjcjz.supabase.co')).toEqual({
      ok: true,
      target: 'sandbox',
    });
    expect(sandboxGuard('http://127.0.0.1:54321')).toEqual({ ok: true, target: 'local' });
    expect(sandboxGuard('https://abcdefghijklmnopqrst.supabase.co').ok).toBe(false);
    expect(sandboxGuard('https://yaizrnbfspmzshdzjcjz.evil.example').ok).toBe(false);
    expect(sandboxGuard('not a url').ok).toBe(false);
  });
});

describe('M6-2a zod schemas', () => {
  it('accepts the shipped defaults and rejects invalid configs', () => {
    expect(RemoteConfigSchema.safeParse(defaultRemoteConfig()).success).toBe(true);
    expect(checkRemoteConfig(defaultRemoteConfig()).ok).toBe(true);
    const c = defaultRemoteConfig();
    c.chests.gold.odds.L = 3;
    c.ads.interstitialPerDay = 20;
    const r = checkRemoteConfig(c);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.join('\n')).toMatch(/sum to 100/);
      expect(r.errors.join('\n')).toMatch(/interstitialPerDay/);
    }
    expect(checkRemoteConfig({ ...defaultRemoteConfig(), extra: 1 }).ok).toBe(false);
    expect(
      checkRemoteConfig({ ...defaultRemoteConfig(), events: [{ id: 'e', start: 5, end: 1 }] }).ok,
    ).toBe(false);
    expect(
      checkRemoteConfig({ ...defaultRemoteConfig(), events: [{ id: 'spring', start: 1, end: 5 }] })
        .ok,
    ).toBe(true);
    expect(checkRemoteConfig('nope').ok).toBe(false);
  });
});

describe('M6-3 permissions and audit (mock backend mirrors the SQL rules)', () => {
  it('role table', () => {
    expect(can('viewer', 'read')).toBe(true);
    expect(can('viewer', 'grant')).toBe(false);
    expect(can('support', 'publish')).toBe(false);
    expect(can('liveops', 'publishOdds')).toBe(false);
    expect(can('owner', 'rollback')).toBe(true);
    expect(can(null, 'read')).toBe(false);
    expect(grantProblem('support', 20_000, 0, 'valid reason')).toMatch(/cap/);
    expect(grantProblem('support', 10, 0, 'no')).toMatch(/reason/);
    expect(grantProblem('support', 10, 0, 'valid reason')).toBeNull();
    expect(maskEmail('ari@example.test', 'viewer')).toBe('a***@example.test');
  });

  it('every admin write creates exactly one audit row', async () => {
    const b = await mock('owner');
    const [p] = await b.findPlayers('');
    await b.grant(p.id, 100, 5, 'QA grant one');
    await b.resetSave(p.id, 'QA reset one', 'RESET');
    const v = await b.publishConfig(
      { ...defaultRemoteConfig(), events: [{ id: 'e1', start: 1, end: 2 }] },
      'add event',
    );
    await b.rollbackConfig(1, 'undo event');
    await b.saveLevel('clover-run', { ...LEVELS[2] } as never, 'tune level');
    const a = await b.audit(50);
    expect(a.map((x) => x.action).reverse()).toEqual([
      'grant',
      'reset_save',
      'config_publish',
      'config_rollback',
      'level_save',
    ]);
    expect(v).toBe(2);
    // refusals write nothing
    await refused(b.grant(p.id, 0, 0, 'zero grant'), 400);
    await refused(b.resetSave(p.id, 'QA reset two', 'reset'), 400);
    expect(await b.audit(50)).toHaveLength(5);
  });

  it('grants are keyed, capped per role and refused for viewers; non-admins get 403', async () => {
    const s = await mock('support');
    const [p] = await s.findPlayers('');
    const before = (await s.playerDetail(p.id))!.save!.data;
    const r = await s.grant(p.id, 10_000, 500, 'max support grant');
    expect(r.coins).toBe((before.coins as number) + 10_000);
    const d = (await s.playerDetail(p.id))!;
    expect((d.save!.data.coinBook as { grants: Record<string, number> }).grants['admin:1']).toBe(
      10_000,
    );
    expect(d.audit[0].action).toBe('grant');
    await refused(s.grant(p.id, 10_001, 0, 'over the cap'));
    await refused(s.publishConfig(defaultRemoteConfig(), 'support publish'));
    const v = await mock('viewer');
    await refused(v.grant(p.id, 1, 0, 'viewer grant'));
    await refused(v.resetSave(p.id, 'viewer reset', 'RESET'));
    const vr = await v.findPlayers('');
    expect(vr.filter((x) => x.email).every((x) => /^\w\*\*\*@/.test(x.email!))).toBe(true);
    const n = await mock(null);
    expect(await n.whoami()).toBeNull();
    await refused(n.findPlayers(''));
    const out = new MockAdminBackend('owner', () => T);
    await refused(out.findPlayers(''));
  });

  it('reset keeps paid items, bumps the epoch and clears progress', async () => {
    const b = await mock('owner');
    const [p] = await b.findPlayers('');
    await b.resetSave(p.id, 'QA reset run', 'RESET');
    const d = (await b.playerDetail(p.id))!;
    expect(d.save!.data.resetEpoch).toBe(1);
    expect(d.progress).toEqual([]);
    expect(d.save!.data.coins).toBe(0);
  });

  it('liveops can publish but not change chest odds; publish check runs server-side too', async () => {
    const l = await mock('liveops');
    const c = defaultRemoteConfig();
    c.ads.interstitialPerSession = 3;
    expect(await l.publishConfig(c, 'fewer interstitials')).toBe(2);
    const odds = defaultRemoteConfig();
    odds.chests.gold.odds = { C: 59, R: 28, E: 10, L: 3 };
    await refused(l.publishConfig(odds, 'odds'));
    const bad = defaultRemoteConfig();
    bad.chests.wood.odds.C = 81;
    await refused(l.publishConfig(bad, 'bad'), 400);
    await refused(l.rollbackConfig(1, 'no rights'));
    const o = await mock('owner');
    expect(await o.publishConfig(odds, 'owner odds')).toBe(2);
  });
});

describe('M6-4 stats from seeded events/purchases', () => {
  it('funnel counts are consistent and purchases are TEST rows', async () => {
    const b = await mock('viewer');
    const s = await b.stats(new Date(T - 30 * 86_400_000), new Date(T + 60_000));
    expect(s.players).toBeGreaterThan(10);
    for (const l of s.levels) expect(l.wins + l.fails).toBe(l.starts);
    expect(s.levels.map((l) => l.level)).toContain('ftue-meadow');
    expect(s.ftue[0].step).toBe(1);
    for (let i = 1; i < s.ftue.length; i++)
      expect(s.ftue[i].players).toBeLessThanOrEqual(s.ftue[i - 1].players);
    expect(s.ads.some((a) => a.type === 'interstitial')).toBe(true);
    expect(s.purchases.reduce((n, p) => n + p.n, 0)).toBe((await b.purchases({})).length);
    expect((await b.purchases({ status: 'refunded' })).length).toBe(1);
  });
});

describe('M6 level editor + views', () => {
  it('validates shipped levels and rejects broken ones', () => {
    for (const l of LEVELS)
      expect(checkLevel(JSON.parse(JSON.stringify(l)), l.id).errors).toEqual([]);
    expect(checkLevel({ ...LEVELS[0], nestHp: -1 }).errors[0]).toMatch(/nestHp/);
    expect(checkLevel({ ...LEVELS[0] }, 'other').errors[0]).toMatch(/id must stay/);
    expect(checkLevel(LEVELS[0]).notes.join(' ')).toMatch(/Bot check/);
  });

  it('diffs configs by path and escapes player data', () => {
    const a = defaultRemoteConfig();
    const b = structuredClone(a);
    b.ads.interstitialPerSession = 3;
    expect(jsonDiff(a, b)).toEqual(['ads.interstitialPerSession: 4 → 3']);
    const html = playersHtml('', [
      {
        id: 'x'.repeat(36),
        email: null,
        display_name: '<img src=x onerror=alert(1)>',
        created_at: '',
        last_seen: null,
        levels_cleared: 0,
        battles: 0,
        coins: 0,
        gems: 0,
        purchases: 0,
        guest: false,
        is_admin: false,
      },
    ]);
    expect(html).not.toContain('<img');
  });
});

describe('M6-2 admin bundle split', () => {
  it('fails when admin code reaches the player build', () => {
    const root = mkdtempSync(join(tmpdir(), 'split-'));
    const dist = join(root, 'dist');
    const adm = join(root, 'dist-admin');
    mkdirSync(join(dist, 'assets'), { recursive: true });
    mkdirSync(join(adm, 'assets'), { recursive: true });
    writeFileSync(join(dist, 'index.html'), '<script src="assets/a.js"></script>');
    writeFileSync(join(dist, 'assets/a.js'), 'game()');
    writeFileSync(join(adm, 'admin.html'), '');
    writeFileSync(join(adm, 'assets/admin.js'), 'x="HIVESURGE_ADMIN_PANEL"');
    expect(splitProblems(dist, adm)).toEqual([]);
    writeFileSync(join(dist, 'assets/b.js'), 'x="HIVESURGE_ADMIN_PANEL"');
    expect(splitProblems(dist, adm).join()).toMatch(/admin code in player file/);
  });
});
