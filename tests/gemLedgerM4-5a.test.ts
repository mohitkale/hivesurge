import { describe, expect, it } from 'vitest';
import { applyPurchase } from '../src/platform/entitlements';
import {
  type GemEntry,
  ledgerBalance,
  ledgerSum,
  mergeLedgers,
  newGemEntryId,
  parseLedger,
  recordGems,
  spendGems,
} from '../src/platform/gemLedger';
import { debitGems } from '../src/platform/reviveGems';
import {
  defaultSave,
  LocalSaveBackend,
  mergeSaves,
  parseSave,
  type SaveData,
  SaveStore,
} from '../src/platform/save';
import { MemoryStore } from '../src/analytics/analytics';

let n = 0;
const id = () => `t${++n}`;
const fresh = (): SaveData => defaultSave();
/** Simulate a device pulling the cloud copy: a deep clone. */
const clone = (s: SaveData): SaveData => parseSave(JSON.stringify(s));

describe('M4-5a gem ledger: basics', () => {
  it('grants and spends are entries; the balance is derived from them', () => {
    const s = fresh();
    recordGems(s, 20, 'stars:l1', 1, id());
    expect(spendGems(s, 5, 'revive')).toBe(true);
    expect(s.gems).toBe(15);
    expect(s.gemLedger.map((e) => e.delta)).toEqual([20, -5]);
    expect(ledgerBalance(s.gemLedger)).toBe(15);
  });

  it('a spend larger than the balance is refused and records nothing', () => {
    const s = fresh();
    recordGems(s, 4, 'stars:l1', 1, id());
    expect(spendGems(s, 5, 'revive')).toBe(false);
    expect(debitGems(s, 5)).toBe(false);
    expect(s.gemLedger).toHaveLength(1);
    expect(s.gems).toBe(4);
  });

  it('zero / NaN deltas are ignored', () => {
    const s = fresh();
    recordGems(s, 0, 'x');
    recordGems(s, Number.NaN, 'x');
    expect(s.gemLedger).toHaveLength(0);
  });

  it('debitGems (gem revive) writes a revive spend entry on a save', () => {
    const s = fresh();
    recordGems(s, 10, 'stars:l1', 1, id());
    expect(debitGems(s, 5)).toBe(true);
    expect(s.gemLedger.at(-1)).toMatchObject({ delta: -5, reason: 'revive' });
  });

  it('purchases write a purchase entry', () => {
    const s = fresh();
    applyPurchase(s, 'gems_small');
    expect(s.gems).toBe(120);
    expect(s.gemLedger).toEqual([
      expect.objectContaining({ delta: 120, reason: 'purchase:gems_small' }),
    ]);
  });

  it('entry ids are unique', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newGemEntryId()));
    expect(ids.size).toBe(500);
  });
});

describe('M4-5a gem ledger: cross-device merge', () => {
  it('purchase on device A + spend on device B: nothing lost, nothing refunded', () => {
    const cloud = fresh();
    recordGems(cloud, 30, 'stars:l1', 1, id());
    const a = clone(cloud);
    const b = clone(cloud);
    applyPurchase(a, 'gems_small'); // +120 on A
    expect(spendGems(b, 5, 'revive')).toBe(true); // -5 on B
    expect(mergeSaves(a, b).gems).toBe(145);
    expect(mergeSaves(b, a).gems).toBe(145);
  });

  it('purchased gems never decrease without a matching spend entry', () => {
    const a = fresh();
    applyPurchase(a, 'gems_small');
    const stale = fresh(); // a device that never saw the purchase, with a higher revision
    stale.revision = 99;
    const m = mergeSaves(stale, a);
    expect(m.gems).toBe(120);
    const spends = m.gemLedger.filter((e) => e.delta < 0);
    expect(ledgerSum(m.gemLedger)).toBe(120 + spends.reduce((t, e) => t + e.delta, 0));
  });

  it('offline grants on both devices are both kept', () => {
    const base = fresh();
    const a = clone(base);
    const b = clone(base);
    recordGems(a, 3, 'stars:l1', 10, id());
    recordGems(b, 2, 'stars:l2', 11, id());
    recordGems(b, 1, 'stars:l3', 12, id());
    expect(mergeSaves(a, b).gems).toBe(6);
  });

  it('a spend made before syncing stays spent after merging with the stale cloud copy', () => {
    const cloud = fresh();
    recordGems(cloud, 20, 'stars:l1', 1, id());
    const dev = clone(cloud);
    spendGems(dev, 10, 'revive');
    const staleNewer = { ...clone(cloud), revision: 50 };
    expect(mergeSaves(dev, staleNewer).gems).toBe(10);
    expect(mergeSaves(staleNewer, dev).gems).toBe(10);
  });

  it('replayed / duplicate entries are idempotent', () => {
    const a = fresh();
    recordGems(a, 7, 'stars:l1', 1, id());
    spendGems(a, 5, 'revive');
    const once = mergeSaves(a, a);
    expect(once.gems).toBe(2);
    const twice = mergeSaves(mergeSaves(once, a), clone(a));
    expect(twice.gems).toBe(2);
    expect(twice.gemLedger).toHaveLength(2);
    // A duplicated entry inside one ledger counts once too.
    const dup = parseSave(JSON.stringify({ ...a, gemLedger: [...a.gemLedger, ...a.gemLedger] }));
    expect(dup.gems).toBe(2);
  });

  it('merge is commutative and associative on the ledger', () => {
    const mk = (d: number, at: number): GemEntry => ({ id: id(), delta: d, reason: 'x', at });
    const x = [mk(5, 3), mk(-2, 4)];
    const y = [mk(9, 1), x[0]];
    const z = [mk(-1, 2)];
    const l = mergeLedgers(mergeLedgers(x, y), z);
    const r = mergeLedgers(x, mergeLedgers(z, y));
    expect(l).toEqual(r);
    expect(mergeLedgers(x, y)).toEqual(mergeLedgers(y, x));
    expect(ledgerSum(l)).toBe(11);
  });

  it('concurrent offline spends of the same gems carry a debt instead of a refund', () => {
    const cloud = fresh();
    recordGems(cloud, 5, 'stars:l1', 1, id());
    const a = clone(cloud);
    const b = clone(cloud);
    spendGems(a, 5, 'revive');
    spendGems(b, 5, 'revive');
    const m = mergeSaves(a, b);
    expect(m.gems).toBe(0);
    expect(ledgerSum(m.gemLedger)).toBe(-5);
    recordGems(m, 7, 'stars:l2', 9, id()); // the debt is paid first
    expect(m.gems).toBe(2);
  });
});

describe('M4-5a gem ledger: persistence and migration', () => {
  it('a pre-ledger save becomes one opening entry, stable across re-parses', () => {
    const raw = JSON.stringify({ version: 1, revision: 4, updatedAt: 77, gems: 12 });
    const p1 = parseSave(raw);
    const p2 = parseSave(raw);
    expect(p1.gems).toBe(12);
    expect(p1.gemLedger).toEqual(p2.gemLedger);
    expect(mergeSaves(p1, p2).gems).toBe(12);
  });

  it('two different legacy devices keep both balances when merged', () => {
    const a = parseSave(JSON.stringify({ version: 1, revision: 4, updatedAt: 77, gems: 12 }));
    const b = parseSave(JSON.stringify({ version: 1, revision: 9, updatedAt: 99, gems: 3 }));
    expect(mergeSaves(a, b).gems).toBe(15);
  });

  it('the balance comes from the ledger, not a tampered stored balance', () => {
    const s = fresh();
    recordGems(s, 6, 'stars:l1', 1, id());
    const tampered = parseSave(JSON.stringify({ ...s, gems: 9999 }));
    expect(tampered.gems).toBe(6);
  });

  it('malformed ledger entries are dropped', () => {
    expect(
      parseLedger([
        { id: 'ok', delta: 3, reason: 'r', at: 1 },
        { id: '', delta: 3 },
        { id: 'f', delta: 1.5 },
        { id: 'z', delta: 0 },
        null,
        'x',
      ]),
    ).toEqual([{ id: 'ok', delta: 3, reason: 'r', at: 1 }]);
  });

  it('commit reconciles a balance changed without an entry, so the change is never lost', async () => {
    const kv = new MemoryStore();
    const st = new SaveStore(new LocalSaveBackend(kv), () => 5);
    await st.load();
    st.data.gems += 4; // a code path that forgot recordGems
    await st.commit();
    expect(st.data.gemLedger).toEqual([expect.objectContaining({ delta: 4, reason: 'reconcile' })]);
    const back = await new SaveStore(new LocalSaveBackend(kv)).load();
    expect(back.gems).toBe(4);
  });
});
