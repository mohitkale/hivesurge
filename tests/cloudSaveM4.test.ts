import { describe, expect, it, vi } from 'vitest';
import { Analytics, MemoryStore } from '../src/analytics/analytics';
import {
  CloudSync,
  EVENT_BATCH,
  MIN_SYNC_INTERVAL_MS,
  progressSnapshot,
} from '../src/platform/cloud/cloudSync';
import { MockCloudBackend, MockCloudServer } from '../src/platform/cloud/mockCloud';
import { applyPurchase } from '../src/platform/entitlements';
import { recordGems, spendGems } from '../src/platform/gemLedger';
import { assignSaveInPlace, defaultSave, LocalSaveBackend, SaveStore } from '../src/platform/save';

/** One device: its own localStorage, save store, analytics and cloud session. */
async function device(server: MockCloudServer) {
  const kv = new MemoryStore();
  const store = new SaveStore(new LocalSaveBackend(kv));
  await store.load();
  const analytics = new Analytics(kv);
  const backend = new MockCloudBackend(server, kv);
  const sync = new CloudSync(store, backend, kv, { events: () => analytics.events() });
  return { kv, store, analytics, backend, sync };
}

describe('M4-4 auth (mock backend, same rules as Supabase)', () => {
  it('anonymous guest -> linked email keeps the same user id and cloud save', async () => {
    const server = new MockCloudServer();
    const a = await device(server);
    const guest = await a.backend.signInAnonymously();
    expect(guest.anonymous).toBe(true);
    a.store.data.coins = 50;
    await a.store.commit();
    await a.sync.syncNow();
    const rev = server.db.saves[guest.id].revision;
    await a.backend.linkEmail('Me@Example.com');
    const u = await a.backend.currentUser();
    expect(u).toEqual({ id: guest.id, email: 'me@example.com', anonymous: false });
    expect(server.db.saves[guest.id].revision).toBe(rev);
    expect((server.db.saves[guest.id].data as { coins: number }).coins).toBe(50);
  });

  it('an email already used by another account cannot be linked', async () => {
    const server = new MockCloudServer();
    const a = await device(server);
    await a.backend.sendMagicLink('taken@example.com');
    const b = await device(server);
    await b.backend.signInAnonymously();
    await expect(b.backend.linkEmail('taken@example.com')).rejects.toThrow();
  });

  it('cloud calls need a signed-in user (own rows only)', async () => {
    const server = new MockCloudServer();
    const a = await device(server);
    const r = await a.sync.syncNow();
    expect(r.status).toBe('off');
    expect(Object.keys(server.db.saves)).toHaveLength(0);
  });
});

describe('M4-5 cloud save', () => {
  it('first sync uploads the local save; the server keeps one row per user', async () => {
    const server = new MockCloudServer();
    const a = await device(server);
    const u = await a.backend.signInAnonymously();
    a.store.data.bestStars = { l1: 2 };
    await a.store.commit();
    const r = await a.sync.syncNow();
    expect(r).toMatchObject({ status: 'idle', conflicts: 0 });
    expect(server.db.saves[u.id].revision).toBe(a.store.data.revision);
  });

  it('second device signing in merges its guest progress with the cloud (no gem loss)', async () => {
    const server = new MockCloudServer();
    const a = await device(server);
    await a.backend.sendMagicLink('p@example.com');
    recordGems(a.store.data, 30, 'stars:l1');
    a.store.data.bestStars = { l1: 3 };
    await a.store.commit();
    await a.sync.syncNow();

    const b = await device(server);
    applyPurchase(b.store.data, 'gems_small'); // bought on B before signing in
    b.store.data.bestStars = { l2: 1 };
    await b.store.commit();
    await b.backend.sendMagicLink('p@example.com');
    const r = await b.sync.syncNow();
    expect(r.conflicts).toBe(1);
    expect(r.applied).toBe(true);
    expect(b.store.data.gems).toBe(150);
    expect(b.store.data.bestStars).toEqual({ l1: 3, l2: 1 });

    const ra = await a.sync.syncNow(); // A adopts the merged cloud save
    expect(ra.applied).toBe(true);
    expect(a.store.data.gems).toBe(150);
    expect(a.store.data.noAds).toBe(true);
  });

  it('conflict: both devices change offline; spends stay spent, grants are kept', async () => {
    const server = new MockCloudServer();
    const a = await device(server);
    await a.backend.sendMagicLink('c@example.com');
    recordGems(a.store.data, 20, 'stars:l1');
    await a.store.commit();
    await a.sync.syncNow();
    const b = await device(server);
    await b.backend.sendMagicLink('c@example.com');
    await b.sync.syncNow();
    expect(b.store.data.gems).toBe(20);

    expect(spendGems(a.store.data, 5, 'revive')).toBe(true);
    await a.store.commit();
    recordGems(b.store.data, 2, 'stars:l2');
    b.store.data.coins = 999;
    await b.store.commit();
    await a.sync.syncNow();
    const rb = await b.sync.syncNow();
    expect(rb.conflicts).toBe(1);
    expect(b.store.data.gems).toBe(17);
    expect(b.store.data.coins).toBe(999);
    await a.sync.syncNow();
    expect(a.store.data.gems).toBe(17);
    // The cloud copy agrees and nothing is pending.
    expect(server.db.saves[(await a.backend.currentUser())!.id].revision).toBe(
      a.store.data.revision,
    );
  });

  it('offline play then sync: backend down keeps local play, the next sync merges', async () => {
    const server = new MockCloudServer();
    const a = await device(server);
    await a.backend.signInAnonymously();
    await a.sync.syncNow();
    server.offline = true;
    recordGems(a.store.data, 4, 'stars:l1');
    await a.store.commit();
    const down = await a.sync.syncNow();
    expect(down.status).toBe('offline');
    expect(a.store.data.gems).toBe(4); // local save untouched
    server.offline = false;
    const up = await a.sync.syncNow();
    expect(up.status).toBe('idle');
    const uid = (await a.backend.currentUser())!.id;
    expect((server.db.saves[uid].data as { gems: number }).gems).toBe(4);
  });

  it('commits are batched: at most one round trip per 10 s', async () => {
    vi.useFakeTimers();
    try {
      const server = new MockCloudServer();
      const a = await device(server);
      await a.backend.signInAnonymously();
      const spy = vi.spyOn(a.backend, 'sync');
      a.sync.start();
      for (let i = 0; i < 20; i++) await a.store.commit();
      await vi.advanceTimersByTimeAsync(1);
      expect(spy).toHaveBeenCalledTimes(1);
      for (let i = 0; i < 20; i++) await a.store.commit();
      await vi.advanceTimersByTimeAsync(MIN_SYNC_INTERVAL_MS - 100);
      expect(spy).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(200);
      expect(spy).toHaveBeenCalledTimes(2);
      a.sync.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a merge replaces the running save in place (game references stay valid)', () => {
    const s = defaultSave();
    const adDay = s.adDay;
    const settings = s.settings;
    const next = { ...defaultSave(), coins: 7, settings: { ...s.settings, muted: true } };
    next.adDay = { day: '2026-10-22', rewarded: 2, interstitial: 0, perPlacement: { boost: 1 } };
    assignSaveInPlace(s, next);
    expect(s.adDay).toBe(adDay);
    expect(s.settings).toBe(settings);
    expect(s.adDay.perPlacement).toEqual({ boost: 1 });
    expect(s.settings.muted).toBe(true);
    expect(s.coins).toBe(7);
  });
});

describe('M4-6 progress, stats and events', () => {
  it('rows appear for a test user after a battle; stats are monotonic', async () => {
    const server = new MockCloudServer();
    const a = await device(server);
    const u = await a.backend.signInAnonymously();
    a.store.data.bestStars = { l1: 2 };
    a.store.data.battlesCompleted = 3;
    a.store.data.stats = { wins: 2, losses: 1, coinsEarned: 90, bestCoins: { l1: 40 } };
    recordGems(a.store.data, 5, 'stars:l1');
    spendGems(a.store.data, 5, 'revive');
    a.analytics.track('level_win', { level: 'l1' });
    await a.store.commit();
    await a.sync.syncNow();
    expect(server.db.levels[u.id].l1).toEqual({ level_id: 'l1', best_stars: 2, best_coins: 40 });
    expect(server.db.stats[u.id]).toMatchObject({
      battles: 3,
      wins: 2,
      losses: 1,
      total_stars: 2,
      levels_cleared: 1,
      coins_earned: 90,
      gems_earned: 5,
      gems_spent: 5,
    });
    expect(server.db.events[u.id].map((e) => e.name)).toEqual(['level_win']);
  });

  it('progress is only re-sent when it changed', async () => {
    const server = new MockCloudServer();
    const a = await device(server);
    await a.backend.signInAnonymously();
    const spy = vi.spyOn(a.backend, 'sync');
    await a.sync.syncNow();
    await a.sync.syncNow();
    expect(spy.mock.calls[0][0].stats).not.toBeNull();
    expect(spy.mock.calls[1][0].stats).toBeNull();
    expect(spy.mock.calls[1][0].data).toBeNull(); // nothing new to push either
  });

  it('events drain in batches and are never sent twice', async () => {
    const server = new MockCloudServer();
    const a = await device(server);
    const u = await a.backend.signInAnonymously();
    let t = 1000;
    const an = new Analytics(a.kv, () => t++, 'sess');
    for (let i = 0; i < EVENT_BATCH + 20; i++) an.track('level_start', { i });
    await a.sync.syncNow();
    expect(server.db.events[u.id]).toHaveLength(EVENT_BATCH);
    await a.sync.syncNow();
    await a.sync.syncNow();
    expect(server.db.events[u.id]).toHaveLength(EVENT_BATCH + 20);
  });

  it('snapshot derives totals from the save', () => {
    const s = defaultSave();
    s.bestStars = { a: 3, b: 0 };
    expect(progressSnapshot(s).stats).toMatchObject({ total_stars: 3, levels_cleared: 1 });
  });
});
