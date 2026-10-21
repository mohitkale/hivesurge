import { describe, expect, it } from 'vitest';
import {
  addXp,
  awardChest,
  buildBlock,
  canUpgrade,
  catchUpScale,
  chestRemaining,
  claimFreeChest,
  collectHoney,
  DAY_MS,
  enemyScale,
  equip,
  equippedBees,
  expectedP,
  gemSkipCost,
  grantKeyed,
  halveChestTime,
  honeyPending,
  loadoutPower,
  levelForXp,
  openChest,
  playerLevel,
  recordResult,
  rollChest,
  rollLossChest,
  rollWinChest,
  rushBuild,
  settleBuilds,
  skipChestWithGems,
  startBuild,
  startUnlock,
  unlockedSlots,
  upgradeBee,
  upgradeCost,
} from '../src/meta/economy';
import { BEES, CHESTS, MAX_LEVEL, ROOMS, xpForLevel } from '../src/meta/defs';
import { recordGems } from '../src/platform/gemLedger';
import { defaultSave, mergeSaves, parseSave, reconcileSave } from '../src/platform/save';
import { emptyBee } from '../src/platform/saveMeta';
import { createRng } from '../src/sim/rng';

const MIN = 60_000;
const H = 60 * MIN;
const fresh = () => {
  const s = defaultSave();
  return s;
};

describe('M5-4 chest odds tables', () => {
  it('every chest odds table sums to 100', () => {
    for (const c of Object.values(CHESTS))
      expect(Object.values(c.odds).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
  });

  it('win chest mix is about 70/25/5 and boss wins give Gold', () => {
    const rng = createRng(1);
    const n = { wood: 0, silver: 0, gold: 0, royal: 0 };
    for (let i = 0; i < 20000; i++) n[rollWinChest(rng)]++;
    expect(n.wood / 20000).toBeCloseTo(0.7, 1);
    expect(n.silver / 20000).toBeCloseTo(0.25, 1);
    expect(n.gold / 20000).toBeCloseTo(0.05, 1);
    expect(rollWinChest(rng, true)).toBe('gold');
    expect(rollLossChest(() => 0, 0.5)).toBeNull();
    expect(rollLossChest(() => 0.1, 0.6)).toBe('wood');
  });

  it('rolled card rarities follow the published odds', () => {
    const s = fresh();
    const rng = createRng(7);
    const tally = { C: 0, R: 0, E: 0, L: 0 };
    let cards = 0;
    for (let i = 0; i < 3000; i++) {
      const r = rollChest(s, 'gold', rng);
      for (const c of r.cards) {
        tally[c.rarity] += c.count;
        cards += c.count;
      }
    }
    expect(tally.C / cards).toBeCloseTo(0.6, 1);
    expect(tally.R / cards).toBeCloseTo(0.28, 1);
    expect(tally.E / cards).toBeCloseTo(0.1, 1);
  });
});

describe('M5-4 chest slots and timers', () => {
  it('4 slots; full slots refuse a new chest', () => {
    const s = fresh();
    const rng = createRng(2);
    for (let i = 0; i < 4; i++) expect(awardChest(s, 'wood', i, rng)).not.toBeNull();
    expect(awardChest(s, 'wood', 9, rng)).toBeNull();
  });

  it('first win chest after the FTUE is ready at once, later ones are not', () => {
    const s = fresh();
    const rng = createRng(3);
    const a = awardChest(s, 'silver', 100, rng, { firstWinInstant: true })!;
    expect(chestRemaining(s, a, 100)).toBe(0);
    expect(openChest(s, a, 100, rng)).not.toBeNull();
    const b = awardChest(s, 'silver', 200, rng, { firstWinInstant: true })!;
    expect(chestRemaining(s, b, 200)).toBeNull();
  });

  it('one unlock at a time; gem skip is 1 gem per 5 min; ad halves the time', () => {
    const s = fresh();
    const rng = createRng(4);
    const a = awardChest(s, 'silver', 0, rng)!;
    const b = awardChest(s, 'wood', 0, rng)!;
    expect(startUnlock(s, a, 0)).toBe(true);
    expect(startUnlock(s, b, 0)).toBe(false);
    expect(openChest(s, a, 30 * MIN, rng)).toBeNull(); // still locked
    expect(halveChestTime(s, a, 0)).toBe(true);
    expect(chestRemaining(s, a, 0)).toBe(30 * MIN);
    expect(gemSkipCost(30 * MIN)).toBe(6);
    expect(gemSkipCost(30 * MIN + 1)).toBe(7);
    expect(gemSkipCost(CHESTS.gold.unlockMs, CHESTS.gold.gemSkip)).toBe(20);
    expect(gemSkipCost(10 * MIN, CHESTS.gold.gemSkip)).toBe(2);
    expect(skipChestWithGems(s, a, 0)).toBe(false); // no gems
    recordGems(s, 10, 'test', 0);
    expect(skipChestWithGems(s, a, 0)).toBe(true);
    expect(s.gems).toBe(4);
    expect(openChest(s, a, 0, rng)).not.toBeNull();
    expect(startUnlock(s, b, 0)).toBe(true);
  });

  it('free daily Wood chest every 24 h', () => {
    const s = fresh();
    const rng = createRng(5);
    const now = 10 * DAY_MS;
    expect(claimFreeChest(s, now, rng)).not.toBeNull();
    expect(claimFreeChest(s, now + DAY_MS - 1, rng)).toBeNull();
    expect(claimFreeChest(s, now + DAY_MS, rng)).not.toBeNull();
  });
});

describe('M5-4 chest contents', () => {
  it('first card of a bee unlocks it at L1; pollen and coins credited', () => {
    const s = fresh();
    const r = rollChest(s, 'wood', createRng(11));
    const coins0 = s.coins;
    const id = awardChest(s, 'wood', 0, createRng(12))!;
    s.meta.chests[0].unlockAt = 0;
    const got = openChest(s, id, 0, createRng(11))!;
    expect(got).toEqual(r);
    expect(s.coins).toBe(coins0 + got.coins);
    for (const c of got.cards) {
      expect(s.meta.bees[c.bee].level).toBeGreaterThanOrEqual(1);
      if (c.isNew && c.bee !== 'worker') expect(s.meta.bees[c.bee].pollen).toBe(c.count - 1);
    }
    expect(s.meta.chestsOpened).toBe(1);
    expect(s.meta.chests).toHaveLength(0);
    expect(s.meta.opened).toEqual([id]);
  });

  it('Royal always has an Epic or better', () => {
    const rng = createRng(13);
    for (let i = 0; i < 200; i++)
      expect(
        rollChest(fresh(), 'royal', rng).cards.some((c) => c.rarity === 'E' || c.rarity === 'L'),
      ).toBe(true);
  });

  it('pity: a Legendary by the 40th chest without one, then the counter resets', () => {
    const s = fresh();
    const rng = () => 0.001; // always Common, never a Legendary by odds
    for (let i = 1; i <= 39; i++) {
      const id = awardChest(s, 'wood', i, createRng(i))!;
      s.meta.chests.find((c) => c.id === id)!.unlockAt = 0;
      const r = openChest(s, id, i, rng)!;
      expect(r.cards.some((c) => c.rarity === 'L')).toBe(false);
    }
    expect(s.meta.pityLegendary).toBe(39);
    const id = awardChest(s, 'wood', 40, createRng(40))!;
    s.meta.chests[0].unlockAt = 0;
    const r = openChest(s, id, 40, rng)!;
    expect(r.pity).toBe(true);
    expect(r.cards.some((c) => c.rarity === 'L')).toBe(true);
    expect(s.meta.pityLegendary).toBe(0);
  });

  it('new-bee protection: the first Epic and Legendary are bees the player does not own', () => {
    const s = fresh();
    const epics = BEES.filter((b) => b.rarity === 'E').map((b) => b.id);
    s.meta.bees[epics[0]] = emptyBee(3);
    s.meta.bees[epics[1]] = emptyBee(1);
    for (let seed = 0; seed < 50; seed++) {
      const r = rollChest(s, 'royal', createRng(seed));
      if (r.cards.some((c) => c.rarity === 'E'))
        expect(r.cards.find((c) => c.rarity === 'E' && c.isNew)?.bee).toBe(epics[2]);
    }
  });

  it('maxed bees convert cards to coins', () => {
    const s = fresh();
    for (const b of BEES) s.meta.bees[b.id] = emptyBee(MAX_LEVEL[b.rarity]);
    const id = awardChest(s, 'gold', 0, createRng(1))!;
    s.meta.chests[0].unlockAt = 0;
    const before = s.coins;
    const r = openChest(s, id, 0, createRng(9))!;
    const overflow = r.cards.reduce((a, c) => a + c.overflowCoins, 0);
    expect(overflow).toBeGreaterThan(0);
    expect(s.coins).toBe(before + r.coins + overflow);
  });

  it('Pollen Lab adds a card every 2 levels', () => {
    const s = fresh();
    s.meta.hive.lab = { level: 4, building: null };
    const r = rollChest(s, 'wood', createRng(1));
    expect(r.cards.reduce((a, c) => a + c.count, 0)).toBe(CHESTS.wood.cards + 2);
  });
});

describe('M5-4 bee upgrades and loadout', () => {
  it('upgrade costs pollen + coins from the table; max level stops it', () => {
    const s = fresh();
    s.meta.bees.bumble = { ...emptyBee(1), pollen: 2 };
    s.coins = 49;
    expect(upgradeCost(s, 'bumble')).toEqual({ pollen: 2, coins: 50 });
    expect(canUpgrade(s, 'bumble')).toBe(false);
    s.coins = 60;
    expect(upgradeBee(s, 'bumble')).toBe(true);
    expect(s.meta.bees.bumble).toMatchObject({ level: 2, pollen: 0 });
    expect(s.coins).toBe(10);
    s.meta.bees['frost-wing'] = emptyBee(7);
    expect(upgradeCost(s, 'frost-wing')).toBeNull();
    expect(upgradeCost(s, 'dart')).toBeNull(); // not owned
  });

  it('slots unlock at stages 3/5/8/12; one copy per bee; worker never slotted', () => {
    expect([0, 3, 5, 8, 12, 99].map(unlockedSlots)).toEqual([0, 1, 2, 3, 4, 4]);
    const s = fresh();
    s.meta.bees.bumble = emptyBee(2);
    s.meta.bees.orchid = emptyBee(1);
    expect(equip(s, 0, 'bumble', 2)).toBe(false);
    expect(equip(s, 0, 'bumble', 5)).toBe(true);
    expect(equip(s, 1, 'bumble', 5)).toBe(true);
    expect(s.meta.loadout).toEqual(['', 'bumble', '', '']);
    expect(equip(s, 0, 'worker', 5)).toBe(false);
    expect(equip(s, 0, 'dart', 5)).toBe(false); // not owned
    expect(equip(s, 0, 'orchid', 5)).toBe(true);
    expect(loadoutPower(s, 5)).toBe(1 * 3 + 2 * 1);
    expect(equippedBees(s, 3)).toEqual([{ id: 'orchid', level: 1 }]);
  });
});

describe('M5-4 difficulty helpers (easier-only)', () => {
  it('expectedP interpolates the refit table and extends past 160 (cap 112)', () => {
    expect(expectedP(1)).toBe(0);
    expect(expectedP(4)).toBe(6);
    expect(expectedP(160)).toBe(71);
    expect(expectedP(170)).toBeCloseTo(72.7);
    expect(expectedP(10_000)).toBe(112);
  });

  it('catch-up eases at most 5% and only on generated stages', () => {
    expect(catchUpScale(0, 5)).toBe(1);
    expect(catchUpScale(0, 50)).toBe(0.95);
    expect(catchUpScale(200, 50)).toBe(1);
    expect(catchUpScale(expectedP(30) - 2, 30)).toBeCloseTo(0.98);
  });

  it('loss streak assist 0.95 / 0.90 with a 0.85 floor, resets on win or level change', () => {
    const s = fresh();
    recordResult(s, 'gen-50', false);
    recordResult(s, 'gen-50', false);
    expect(enemyScale(s, 'gen-50', 50)).toBeCloseTo(0.95 * 0.95);
    recordResult(s, 'gen-50', false);
    expect(enemyScale(s, 'gen-50', 50)).toBeCloseTo(0.855); // 0.95 x 0.90, above the 0.85 floor
    expect(enemyScale(s, 'gen-51', 50)).toBe(0.95);
    recordResult(s, 'gen-51', false);
    expect(s.meta.lossStreak).toEqual({ level: 'gen-51', count: 1 });
    recordResult(s, 'gen-51', true);
    expect(s.meta.lossStreak.count).toBe(0);
  });
});

describe('M5-4 account XP', () => {
  it('curve matches the spec table', () => {
    expect([1, 2, 3, 5, 10, 25, 30].map(xpForLevel)).toEqual([0, 170, 360, 800, 2250, 9600, 13050]);
    expect(levelForXp(2249)).toBe(9);
    expect(levelForXp(2250)).toBe(10);
  });

  it('every 10th level grants 25 gems once, also across a merge', () => {
    const s = fresh();
    expect(addXp(s, xpForLevel(10), 1)).toHaveLength(9);
    expect(playerLevel(s)).toBe(10);
    expect(s.gems).toBe(25);
    reconcileSave(s, 'd:a', 1);
    const other = parseSave(JSON.stringify(s));
    other.meta.xp = 0; // stale copy re-earns level 10 on another device
    expect(mergeSaves(s, other, 'd:a').gems).toBe(25);
  });
});

describe('M5-4 hive base', () => {
  it('room cap = floor(level / 2); one build at a time; finishes on time', () => {
    const s = fresh();
    s.coins = 100_000;
    expect(buildBlock(s, 'honey', 0)).toBe('cap');
    addXp(s, xpForLevel(4), 0);
    expect(startBuild(s, 'honey', 0)).toBe(true);
    expect(s.coins).toBe(100_000 - ROOMS.honey.costs[0][0]);
    expect(buildBlock(s, 'wax', 0)).toBe('busy');
    expect(settleBuilds(s, ROOMS.honey.costs[0][1] - 1)).toEqual([]);
    expect(settleBuilds(s, ROOMS.honey.costs[0][1])).toEqual(['honey']);
    expect(s.meta.hive.honey.level).toBe(1);
    expect(startBuild(s, 'wax', 10 * MIN)).toBe(true);
    expect(rushBuild(s, 10 * MIN)).toBe(false); // no gems
    recordGems(s, 2, 'test', 0);
    expect(rushBuild(s, 10 * MIN)).toBe(true);
    expect(s.meta.hive.wax.level).toBe(1);
  });

  it('honey store pays 20/h per level, capped at 8 h', () => {
    const s = fresh();
    s.meta.hive.honey = { level: 2, building: null };
    s.meta.honeyAt = 0;
    expect(honeyPending(s, 3 * H)).toBe(120);
    expect(honeyPending(s, 30 * H)).toBe(320);
    expect(collectHoney(s, 30 * H)).toBe(320);
    expect(honeyPending(s, 30 * H)).toBe(0);
  });
});

describe('M5-4 keyed server grants', () => {
  it('a purchase grant applies once, even after a merge with a copy', () => {
    const s = fresh();
    expect(grantKeyed(s, 'purchase:cs_test_1', 500, 10)).toBe(true);
    expect(grantKeyed(s, 'purchase:cs_test_1', 500, 10)).toBe(false);
    expect(s.coins).toBe(500);
    expect(s.skipTickets).toBe(10);
    reconcileSave(s, 'd:a', 1);
    const copy = parseSave(JSON.stringify(s));
    grantKeyed(copy, 'purchase:cs_test_1', 500, 10);
    const m = mergeSaves(s, copy, 'd:a');
    expect(m.coins).toBe(500);
    expect(m.skipTickets).toBe(10);
  });
});
