import { describe, expect, it } from 'vitest';
import { parseLevel } from '../src/levels';
import cloverJson from '../src/levels/clover-run.json';
import { gateX } from '../src/sim/gates';
import { UnitKind } from '../src/sim/types';
import { SIM_DT, World } from '../src/sim/world';

const idle = { aimX: 0, firing: false, queen: false };

describe('moving gates integrate position per tick (review nit)', () => {
  const level = parseLevel({
    ...cloverJson,
    trickleInterval: 0,
    waves: [],
    nestHp: 100,
    gates: [{ kind: 'mul', value: 2, x: 0, y: 20, width: 2, motion: { amplitude: 3, speed: 1 } }],
    bossPhases: [{ nestBelow: 1 }, { nestBelow: 0.5, gateSpeedScale: 1.4 }],
  });

  it('does not jump when a boss phase changes gate speed', () => {
    const w = new World(level);
    for (let i = 0; i < 60 * 7; i++) w.step(idle);
    const before = w.currentGateX(0);
    w.nestHp = 40; // enter phase 2 (speed ×1.4)
    w.step(idle);
    const jump = Math.abs(w.currentGateX(0) - before);
    // One tick moves at most amplitude × speed × scale × dt.
    expect(jump).toBeLessThanOrEqual(3 * 1 * 1.4 * SIM_DT + 1e-9);
    // The old formula gateX(t × scale) would have jumped far further here.
    expect(Math.abs(gateX(level.gates[0], w.time * 1.4, 10) - before)).toBeGreaterThan(0.5);
  });

  it('matches the closed form when speed never changes', () => {
    const w = new World({ ...level, bossPhases: undefined });
    for (let i = 0; i < 600; i++) w.step(idle);
    expect(w.currentGateX(0)).toBeCloseTo(gateX(level.gates[0], w.time, 10), 6);
    expect(w.gateXAhead(0, 1)).toBeCloseTo(gateX(level.gates[0], w.time + 1, 10), 6);
  });
});

describe('revive spares bosses (review nit)', () => {
  it('clears wasps near the hive but not the Matriarch', () => {
    const level = parseLevel({ ...cloverJson, trickleInterval: 0, waves: [], hiveHp: 1 });
    const w = new World(level);
    w.wasps.spawn(UnitKind.Matriarch, 0, 5);
    w.wasps.spawn(UnitKind.Wasp, 1, 5);
    w.wasps.spawn(UnitKind.Wasp, -1, 0.3); // reaches the hive -> loss
    w.step(idle);
    expect(w.outcome).toBe('lost');
    expect(w.revive()).toBe(true);
    const kinds = Array.from({ length: w.wasps.count }, (_, i) => w.wasps.kind[i]);
    expect(kinds).toEqual([UnitKind.Matriarch]);
  });
});
