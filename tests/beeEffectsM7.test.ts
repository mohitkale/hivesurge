import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels';
import { emptyBee } from '../src/platform/saveMeta';
import { metaMods, PENDING_EFFECTS } from '../src/meta/mods';
import { defaultSave } from '../src/platform/save';
import type { LevelDef } from '../src/sim/types';
import { UnitKind } from '../src/sim/types';
import { NO_MODS, World, type MetaMods } from '../src/sim/world';

/** A quiet lane: no waves, no trickle, a huge nest; gates as given. */
function lane(gates: LevelDef['gates'] = [], waves: LevelDef['waves'] = []): LevelDef {
  return {
    ...LEVELS[2],
    nestHp: 1e6,
    trickleInterval: 0,
    gates,
    waves,
    bossPhases: undefined,
  };
}
const fire = { aimX: 0, firing: true, queen: false };
function play(l: LevelDef, mods: Partial<MetaMods>, seconds: number, input = fire): World {
  const w = new World(l, {}, { ...NO_MODS, ...mods });
  for (let t = 0; t < seconds * 60 && w.outcome === 'playing'; t++) w.step(input);
  return w;
}
const eqMods = (id: string, level = 1) => {
  const s = defaultSave();
  s.meta.bees[id] = { ...emptyBee(level), level };
  s.meta.loadout = [id];
  return metaMods(s, 5, LEVELS[2].id);
};

describe('M7: the 8 "coming soon" bee effects work in battle', () => {
  it('no effect is pending any more, and each bee sets its sim knob', () => {
    expect(PENDING_EFFECTS).toEqual([]);
    expect(eqMods('bumble')).toMatchObject({ bumbleEvery: 10, bumbleHp: 3 });
    expect(eqMods('bumble', 4).bumbleHp).toBe(4);
    expect(eqMods('carpenter').trapAbsorb).toBeCloseTo(0.8);
    expect(eqMods('carpenter', 3).trapAbsorb).toBeCloseTo(0.74);
    expect(eqMods('sweat').sweatChance).toBeCloseTo(0.1);
    expect(eqMods('leafcutter').leafSeconds).toBe(5);
    expect(eqMods('honeyguard').honeyBlocks).toBe(15);
    expect(eqMods('royal-jelly').queenHp).toBe(40);
    expect(eqMods('sunburst')).toMatchObject({ volleyEvery: 20, volleyCount: 12 });
    expect(eqMods('frost-wing')).toMatchObject({ frostSlow: 0.4, frostSeconds: 3 });
  });

  it('no bee equipped = the sim is unchanged (same outcome and stats)', () => {
    const a = play(LEVELS[2], {}, 200);
    const b = new World(LEVELS[2]);
    for (let t = 0; t < 200 * 60 && b.outcome === 'playing'; t++) b.step(fire);
    expect(a.stats).toEqual(b.stats);
    expect(a.outcome).toBe(b.outcome);
  });

  it('Bumble Tank: every 10th worker shot has 3 hp', () => {
    const w = new World(lane(), {}, { ...NO_MODS, bumbleEvery: 10, bumbleHp: 3 });
    for (let t = 0; t < 60; t++) w.step(fire);
    let tanks = 0;
    for (let i = 0; i < w.bees.count; i++) if (w.bees.hp[i] === 3) tanks++;
    expect(w.stats.fired).toBeGreaterThanOrEqual(9);
    expect(tanks).toBe(Math.floor(w.stats.fired / 10));
    expect(tanks).toBeGreaterThan(0);
  });

  it('Carpenter Bee: a trap absorbs 20% fewer of the bees crossing it', () => {
    const trap = lane([{ kind: 'sub', value: 10000, x: 0, y: 6, width: 6 }]);
    const base = play(trap, {}, 10);
    const carp = play(trap, { trapAbsorb: 0.8 }, 10);
    const absorbed = (w: World) => 10000 - w.trapRemaining(0);
    expect(absorbed(carp) / absorbed(base)).toBeGreaterThan(0.75);
    expect(absorbed(carp) / absorbed(base)).toBeLessThan(0.85);
  });

  it('Sweat Bee: × gates sometimes spawn one extra bee', () => {
    const g = lane([{ kind: 'mul', value: 2, x: 0, y: 6, width: 6 }]);
    const base = play(g, {}, 10).stats.gateSpawns;
    const sweat = play(g, { sweatChance: 0.1 }, 10).stats.gateSpawns;
    expect(sweat).toBeGreaterThan(base * 1.05);
    expect(sweat).toBeLessThan(base * 1.2);
  });

  it('Leafcutter: a passed + gate gives +1 for 5 s', () => {
    const g = lane([{ kind: 'add', value: 2, x: 0, y: 6, width: 6 }]);
    const base = play(g, {}, 4).stats.gateSpawns;
    const leaf = play(g, { leafSeconds: 5 }, 4).stats.gateSpawns;
    // Roughly every bee after the first gets 3 instead of 2.
    expect(leaf / base).toBeGreaterThan(1.4);
  });

  it('Honey Guard: blocks the first 15 wasps that reach the hive, once per battle', () => {
    const l = lane([], [{ at: 0.1, kind: 'wasp', count: 20, x: 0, spread: 2 }]);
    l.hiveHp = 1000;
    const idle = { aimX: 0, firing: false, queen: false };
    const base = play(l, {}, 30, idle);
    const guard = play(l, { honeyBlocks: 15 }, 30, idle);
    expect(1000 - base.hiveHp).toBe(20);
    expect(1000 - guard.hiveHp).toBe(5);
    expect(guard.honeyLeft).toBe(0);
  });

  it('Royal Jelly Queen: the queen launches with 40 hp', () => {
    const w = new World({ ...lane(), queenCharge: 1 }, {}, { ...NO_MODS, queenHp: 40 });
    for (let t = 0; t < 61; t++) w.step(fire);
    w.step({ ...fire, queen: true });
    const q = [...Array(w.bees.count).keys()].find((i) => w.bees.kind[i] === UnitKind.Queen);
    expect(q).toBeDefined();
    expect(w.bees.hp[q as number]).toBe(40);
  });

  it('Sunburst Drone: every 20 s a 12-bee volley fires even while not firing', () => {
    const idle = { aimX: 0, firing: false, queen: false };
    const w = play(lane(), { volleyEvery: 20, volleyCount: 12 }, 41, idle);
    expect(w.stats.fired).toBe(24);
    expect(play(lane(), {}, 41, idle).stats.fired).toBe(0);
  });

  it('Frost Wing: launching the queen slows wasps 40% for 3 s', () => {
    const l = {
      ...lane([], [{ at: 0.05, kind: 'wasp' as const, count: 1, x: 4, spread: 0 }]),
      queenCharge: 0.5,
    };
    const run = (mods: Partial<MetaMods>) => {
      const w = new World(l, {}, { ...NO_MODS, ...mods });
      for (let t = 0; t < 60; t++) w.step({ aimX: -4, firing: true, queen: true });
      const y0 = w.wasps.y[0];
      for (let t = 0; t < 60; t++) w.step({ aimX: -4, firing: false, queen: false });
      return y0 - w.wasps.y[0];
    };
    const plain = run({});
    const frost = run({ frostSlow: 0.4, frostSeconds: 3 });
    expect(frost / plain).toBeCloseTo(0.6, 1);
  });
});
