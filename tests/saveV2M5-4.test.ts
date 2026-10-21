import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../src/analytics/analytics';
import { CloudSync } from '../src/platform/cloud/cloudSync';
import { MockCloudBackend, MockCloudServer } from '../src/platform/cloud/mockCloud';
import { GameClock, MAX_OFFLINE_CREDIT_MS } from '../src/platform/clock';
import {
  addGrant,
  bookBalance,
  emptyBook,
  mergeBooks,
  parseBook,
  reconcileBook,
} from '../src/platform/counter';
import { recordGems } from '../src/platform/gemLedger';
import {
  defaultSave,
  LocalSaveBackend,
  mergeSaves,
  parseSave,
  reconcileSave,
  SaveStore,
} from '../src/platform/save';
import { emptyBee } from '../src/platform/saveMeta';

const V1 = JSON.stringify({
  version: 1,
  revision: 7,
  updatedAt: 1_700_000_000_000,
  coins: 420,
  gems: 30,
  bestStars: { L1: 3, L2: 2 },
  noAds: true,
  skins: ['starter'],
  equippedSkin: 'starter',
  battlesCompleted: 5,
  ftueDone: true,
  settings: { muted: true, colorBlind: false, haptics: true, shake: false },
});

describe('M5-4a save v1 -> v2 migration', () => {
  it('keeps every v1 field and moves coins into the coin book', () => {
    const s = parseSave(V1);
    expect(s.version).toBe(2);
    expect(s.coins).toBe(420);
    expect(s.gems).toBe(30);
    expect(s.bestStars).toEqual({ L1: 3, L2: 2 });
    expect(s.noAds).toBe(true);
    expect(s.skins).toEqual(['starter']);
    expect(s.settings.muted).toBe(true);
    expect(s.revision).toBe(7);
    expect(Object.values(s.coinBook.grants)).toEqual([420]);
    expect(s.skipTickets).toBe(0);
    expect(s.meta.bees.worker.level).toBe(1);
    expect(s.meta.loadout).toEqual(['', '', '', '']);
  });

  it('is idempotent: migrating twice (or on two devices) never doubles coins', () => {
    const a = parseSave(V1);
    const b = parseSave(V1);
    expect(a.coinBook).toEqual(b.coinBook);
    expect(mergeSaves(a, b, 'd:a').coins).toBe(420);
    const again = parseSave(JSON.stringify(a));
    expect(again).toEqual(a);
  });

  it('a v2 save round-trips through JSON unchanged', () => {
    const s = parseSave(V1);
    s.coins += 80;
    s.skipTickets = 3;
    s.meta.bees.bumble = { ...emptyBee(2), pollen: 6 };
    s.meta.loadout = ['bumble', '', '', ''];
    s.meta.chests.push({ id: 'c1', type: 'silver', earnedAt: 5, unlockAt: null });
    s.meta.hive.honey = { level: 2, building: { toLevel: 3, endsAt: 99 } };
    s.meta.xp = 120;
    reconcileSave(s, 'd:a', 1);
    expect(parseSave(JSON.stringify(s))).toEqual(s);
    expect(s.coins).toBe(500);
    expect(s.meta.bees.bumble.pollen).toBe(6);
  });

  it('rejects unknown versions and junk meta safely', () => {
    expect(parseSave(JSON.stringify({ version: 3, coins: 9 })).coins).toBe(0);
    const s = parseSave(
      JSON.stringify({
        version: 2,
        coinBook: { earn: { x: -5, y: 'a' }, spend: {}, grants: { g: 1e15 } },
        meta: {
          bees: { dragon: { level: 9 }, bumble: { level: 3, book: { earn: { x: 4 } } } },
          loadout: ['worker', 'bumble', 'bumble', 'dragon', 'extra'],
          chests: [
            { id: 'a', type: 'mythic' },
            { id: 'b', type: 'gold' },
            { id: 'b', type: 'gold' },
          ],
        },
      }),
    );
    expect(s.coins).toBe(0);
    expect(s.meta.bees.dragon).toBeUndefined();
    expect(s.meta.bees.bumble).toMatchObject({ level: 3, pollen: 4 });
    expect(s.meta.loadout).toEqual(['', 'bumble', '', '']);
    expect(s.meta.chests.map((c) => c.id)).toEqual(['b']);
  });
});

describe('M5-4a counter books (conflict-free currencies)', () => {
  it('earns on two devices add up; spends are never refunded by a merge', () => {
    const base = emptyBook();
    addGrant(base, 'legacy', 100);
    const a = parseBook(JSON.parse(JSON.stringify(base)));
    const b = parseBook(JSON.parse(JSON.stringify(base)));
    reconcileBook(a, 150, 'd:a'); // +50 on A
    reconcileBook(b, 30, 'd:b'); // spent 70 on B
    const m = mergeBooks(a, b);
    expect(bookBalance(m)).toBe(80);
    expect(mergeBooks(m, a)).toEqual(m); // idempotent
    expect(mergeBooks(b, a)).toEqual(m); // commutative
  });

  it('keyed grants apply once', () => {
    const b = emptyBook();
    expect(addGrant(b, 'purchase:cs_1', 500)).toBe(true);
    expect(addGrant(b, 'purchase:cs_1', 500)).toBe(false);
    expect(bookBalance(mergeBooks(b, b))).toBe(500);
  });
});

describe('M5-4a mergeSaves v2 fields', () => {
  it('merges coins, tickets, bees, chests, hive and xp without loss', () => {
    const base = parseSave(V1);
    base.meta.chests.push({ id: 'c1', type: 'wood', earnedAt: 1, unlockAt: null });
    reconcileSave(base, 'd:a', 1);
    const a = parseSave(JSON.stringify(base));
    const b = parseSave(JSON.stringify(base));
    a.revision = 9;
    b.revision = 8;
    // Device A: earns coins, opens c1, gets a bee, upgrades the honey room.
    a.coins += 100;
    a.meta.opened.push('c1');
    a.meta.chests = [];
    a.meta.bees.bumble = { ...emptyBee(1), pollen: 3 };
    a.meta.loadout = ['bumble', '', '', ''];
    a.meta.hive.honey = { level: 2, building: null };
    a.meta.xp += 30;
    // Device B: spends coins, earns a chest and starts unlocking it, more bumble pollen.
    b.coins -= 20;
    b.skipTickets = 2;
    b.meta.chests.push({ id: 'c2', type: 'gold', earnedAt: 2, unlockAt: 500 });
    b.meta.bees.bumble = { ...emptyBee(2), pollen: 5 };
    b.meta.hive.honey = { level: 1, building: { toLevel: 2, endsAt: 1000 } };
    b.meta.xp += 10;
    reconcileSave(a, 'd:a', 2);
    reconcileSave(b, 'd:b', 2);
    const m = mergeSaves(a, b, 'd:a');
    expect(m.coins).toBe(420 + 100 - 20);
    expect(m.skipTickets).toBe(2);
    expect(m.meta.chests.map((c) => c.id)).toEqual(['c2']); // c1 opened on A stays opened
    expect(m.meta.bees.bumble.level).toBe(2);
    expect(m.meta.bees.bumble.pollen).toBe(8);
    expect(m.meta.loadout).toEqual(['bumble', '', '', '']); // newer revision (A)
    expect(m.meta.hive.honey).toEqual({ level: 2, building: null }); // finished build wins
    expect(m.meta.xp).toBe(40);
    expect(mergeSaves(b, a, 'd:a').coins).toBe(m.coins);
  });

  it('folds an uncommitted cached change into the merge instead of dropping it', () => {
    const a = parseSave(V1);
    const b = parseSave(V1);
    a.coins += 25; // not committed yet
    expect(mergeSaves(a, b, 'd:a').coins).toBe(445);
    expect(a.coinBook.earn['d:a']).toBeUndefined(); // inputs are not mutated
  });

  it('chest unlock start merges to the earliest start', () => {
    const a = defaultSave();
    a.meta.chests.push({ id: 'x', type: 'silver', earnedAt: 1, unlockAt: 900 });
    const b = defaultSave();
    b.meta.chests.push({ id: 'x', type: 'silver', earnedAt: 1, unlockAt: 700 });
    expect(mergeSaves(a, b, 'd:a').meta.chests[0].unlockAt).toBe(700);
  });
});

describe('M5-4a cloud sync round trip (two devices, mock backend)', () => {
  async function device(server: MockCloudServer, id: string) {
    const kv = new MemoryStore();
    const store = new SaveStore(new LocalSaveBackend(kv), Date.now, id);
    await store.load();
    const backend = new MockCloudBackend(server, kv);
    const sync = new CloudSync(store, backend, kv);
    return { kv, store, backend, sync };
  }

  it('v2 fields survive the cloud and offline edits on both devices merge', async () => {
    const server = new MockCloudServer();
    const a = await device(server, 'd:a');
    await a.backend.sendMagicLink('p@example.com');
    a.store.data.coins = 200;
    a.store.data.meta.bees.bumble = { ...emptyBee(1), pollen: 2 };
    recordGems(a.store.data, 10, 'level', 1);
    await a.store.commit();
    await a.sync.syncNow();

    const b = await device(server, 'd:b');
    await b.backend.sendMagicLink('p@example.com');
    await b.sync.syncNow();
    expect(b.store.data.coins).toBe(200);
    expect(b.store.data.meta.bees.bumble.pollen).toBe(2);

    // Both edit before syncing again: A earns, B spends.
    a.store.data.coins += 50;
    await a.store.commit();
    b.store.data.coins -= 120;
    b.store.data.meta.bees.bumble.pollen += 4;
    await b.store.commit();
    await a.sync.syncNow();
    await b.sync.syncNow(); // conflict -> merge -> push
    await a.sync.syncNow();
    for (const d of [a, b]) {
      expect(d.store.data.coins).toBe(130);
      expect(d.store.data.meta.bees.bumble.pollen).toBe(6);
      expect(d.store.data.gems).toBe(10);
    }
  });
});

describe('M5-4c trusted game clock', () => {
  function rig(startWall: number) {
    const kv = new MemoryStore();
    const t = { perf: 0, wall: startWall };
    const make = () =>
      new GameClock(
        kv,
        () => t.perf,
        () => t.wall,
      );
    return { kv, t, make };
  }

  it('a device clock change does not speed timers within a session', () => {
    const { t, make } = rig(1_000_000);
    const c = make();
    const start = c.now();
    t.wall += 3 * 86_400_000; // player moves the device clock 3 days ahead
    t.perf += 60_000; // one real minute passes
    expect(c.now() - start).toBe(60_000);
  });

  it('between sessions offline credit is capped and never goes backwards', () => {
    const { t, make } = rig(1_000_000);
    const c1 = make();
    t.perf += 20_000;
    const last = c1.now();
    // Relaunch with the device clock 5 days ahead: credit capped.
    t.perf = 0;
    t.wall = 1_000_000 + 5 * 86_400_000;
    const c2 = make();
    expect(c2.now()).toBeLessThanOrEqual(last + MAX_OFFLINE_CREDIT_MS);
    const ahead = c2.now();
    // Relaunch with the clock set back a year: never earlier than the last trusted time.
    t.wall = 1;
    const c3 = make();
    expect(c3.now()).toBeGreaterThanOrEqual(ahead);
  });

  it('server time re-anchors the clock and the offset is reused offline', () => {
    const { t, make } = rig(1_000_000);
    const c = make();
    expect(c.serverSynced).toBe(false);
    c.setServerTime(5_000_000); // device clock was 4,000 s slow
    expect(c.serverSynced).toBe(true);
    expect(c.now()).toBe(5_000_000);
    t.wall += 1000;
    t.perf = 0;
    const next = make();
    expect(next.now()).toBe(5_001_000);
    c.setServerTime(Number.NaN); // junk ignored
    expect(c.serverSynced).toBe(true);
  });

  it('cloud sync forwards server time', async () => {
    const server = new MockCloudServer();
    server.clock = () => 42_000;
    const kv = new MemoryStore();
    const store = new SaveStore(new LocalSaveBackend(kv), Date.now, 'd:a');
    await store.load();
    const backend = new MockCloudBackend(server, kv);
    let seen = 0;
    const sync = new CloudSync(store, backend, kv, { onServerTime: (ms) => (seen = ms) });
    await backend.sendMagicLink('t@example.com');
    await sync.syncNow();
    expect(seen).toBe(42_000);
  });
});
