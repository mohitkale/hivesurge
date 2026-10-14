import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/levels';
import { SIM_DT, World } from '../src/sim/world';
import { MISS_CUE, MissCue } from '../src/ui/missCue';

const L1 = getLevel('ftue-meadow');
const L2 = getLevel('dandelion-drift');

function fireAt(w: World, x: number, seconds: number, onStep?: () => void) {
  for (let i = 0; i < seconds / SIM_DT && w.outcome === 'playing'; i++) {
    w.step({ aimX: x, firing: true, queen: false });
    onStep?.();
  }
}

describe('M2-31 missed-gate feedback (QA S1-S3: volleys go straight up past the gates)', () => {
  it('the world counts bees that fly past a gate row without passing a gate', () => {
    const w = new World(L1);
    expect(w.gateRowY).toEqual([8, 15]); // x2 row, moving +3 row (traps excluded)
    fireAt(w, 0, 6); // centre: misses the x2 gate at x -2.8
    expect(w.rowMisses[0]).toBeGreaterThan(20);
    const aimed = new World(L1);
    fireAt(aimed, -2.8, 6);
    expect(aimed.rowMisses[0]).toBeLessThan(w.rowMisses[0] / 4);
  });

  it('traps and later-phase gates are never miss targets', () => {
    const w = new World(L2);
    expect(w.gateRowY).toEqual([9, 18]); // the sub 600 rows at y 5 are not targets
    const L5 = new World(getLevel('wasp-queen-nest'));
    const subYs = getLevel('wasp-queen-nest')
      .gates.filter((g) => g.kind === 'sub')
      .map((g) => g.y);
    for (const y of subYs)
      if (!getLevel('wasp-queen-nest').gates.some((g) => g.kind !== 'sub' && g.y === y))
        expect(L5.gateRowY).not.toContain(y);
  });

  it('cue: fires after MISS_CUE.minMisses on a row, then waits out the cooldown', () => {
    const c = new MissCue(2, { enabled: true, minMisses: 6, cooldownS: 3 });
    expect(c.update([5, 0], 0.1)).toBe(-1);
    expect(c.update([6, 0], 0.1)).toBe(0);
    expect(c.update([20, 0], 1)).toBe(-1); // cooldown
    expect(c.update([20, 0], 2.1)).toBe(-1); // misses during cooldown do not stack
    expect(c.update([26, 0], 0.1)).toBe(0);
    expect(new MissCue(1, { ...MISS_CUE, enabled: false }).update([99], 1)).toBe(-1);
  });

  it('a centre-firing L1 player sees the cue within 3 s; an aimed player not on the x2 row', () => {
    const run = (x: number) => {
      const w = new World(L1);
      const c = new MissCue(w.gateRowY.length);
      const cues: [number, number][] = [];
      fireAt(w, x, 3, () => {
        const r = c.update(w.rowMisses, SIM_DT);
        if (r >= 0) cues.push([r, w.time]);
      });
      return cues;
    };
    const centre = run(0);
    expect(centre[0]?.[0]).toBe(0);
    expect(centre[0][1]).toBeLessThan(3);
    expect(run(-2.8).filter(([r]) => r === 0)).toEqual([]);
  });

  it('straight-up volleys are intended: bees fly up their launch column (lane shooter)', () => {
    const w = new World(L1);
    let maxDrift = 0;
    fireAt(w, 0, 3, () => {
      const b = w.bees;
      for (let i = 0; i < b.count; i++)
        if (b.y[i] < 8) maxDrift = Math.max(maxDrift, Math.abs(b.x[i]));
    });
    expect(maxDrift).toBeLessThan(1.2); // the x2 gate span starts at |x| 1.6: centre always misses
  });
});

describe('M2-32 L2 trap values change mid-level (intended, documented for design)', () => {
  it('a trap label counts down the bees it absorbed, then breaks', () => {
    const w = new World(L2);
    const trap = L2.gates.findIndex((g) => g.kind === 'sub' && g.x < 0);
    expect(w.trapRemaining(trap)).toBe(600);
    fireAt(w, -3.8, 4);
    const left = w.trapRemaining(trap);
    expect(left).toBeLessThan(600);
    expect(left).toBeGreaterThan(540); // QA saw −550..−580
    expect(600 - left).toBe(w.gatePasses[trap]); // each absorbed bee is one count
  });
});
