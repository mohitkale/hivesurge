import { describe, expect, it } from 'vitest';
import { awardChest, grantKeyed, openChest, startUnlock } from '../src/meta/economy';
import { bookSum } from '../src/platform/counter';
import { defaultSave, mergeSaves, reconcileSave, type SaveData } from '../src/platform/save';
import { createRng } from '../src/sim/rng';

const pollen = (s: SaveData) =>
  Object.values(s.meta.bees).reduce((n, b) => n + b.pollen + b.level, 0);

function withReadyChest(): { s: SaveData; id: string } {
  const s = defaultSave();
  s.coins = 500;
  reconcileSave(s, 'dev-a', 0);
  const id = awardChest(s, 'silver', 0, createRng(1))!;
  startUnlock(s, id, 0);
  s.meta.chests[0].unlockAt = 0;
  reconcileSave(s, 'dev-a', 0);
  return { s, id };
}

describe('M7 (d): offline-merge edge cases', () => {
  it('the same chest opened on two offline devices pays once after the merge', () => {
    const { s, id } = withReadyChest();
    const a = structuredClone(s);
    const b = structuredClone(s);
    const ra = openChest(a, id, 10)!;
    const rb = openChest(b, id, 20)!;
    expect(ra).toEqual(rb); // contents roll from the chest id
    reconcileSave(a, 'dev-a', 10);
    reconcileSave(b, 'dev-b', 20);
    const m = mergeSaves(a, b, 'dev-a');
    expect(m.coins).toBe(a.coins);
    expect(pollen(m)).toBe(pollen(a));
    expect(m.meta.chests.find((c) => c.id === id)).toBeUndefined();
    expect(m.meta.chestsOpened).toBe(1);
    // And merging again (or the other way round) changes nothing.
    expect(mergeSaves(m, b, 'dev-b').coins).toBe(m.coins);
  });

  it('two devices spending the same coins offline: the book holds the debt, shown as 0', () => {
    const s = defaultSave();
    s.coins = 100;
    reconcileSave(s, 'dev-a', 0);
    const a = structuredClone(s);
    const b = structuredClone(s);
    a.coins -= 100;
    b.coins -= 100;
    reconcileSave(a, 'dev-a', 1);
    reconcileSave(b, 'dev-b', 1);
    const m = mergeSaves(a, b, 'dev-a');
    expect(m.coins).toBe(0); // never negative on screen
    expect(bookSum(m.coinBook)).toBe(-100); // the second spend is a debt, not a refund
    // A later keyed grant pays off the debt first instead of minting coins.
    grantKeyed(m, 'purchase:cs_test_1', 150);
    expect(m.coins).toBe(50);
    reconcileSave(m, 'dev-a', 2);
    expect(m.coins).toBe(50);
    expect(bookSum(m.coinBook)).toBe(50);
  });
});
