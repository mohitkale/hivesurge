import { describe, expect, it } from 'vitest';
import { crossesGate, gateLabel, gateSpawnCount, gateX } from '../src/sim/gates';
import type { GateDef } from '../src/sim/types';

const g = (o: Partial<GateDef> = {}): GateDef => ({ kind: 'mul', value: 3, x: 0, y: 10, width: 2, ...o });

describe('gate math', () => {
  it('add +k spawns k, mul xk spawns k-1, sub spawns 0', () => {
    expect(gateSpawnCount(g({ kind: 'add', value: 5 }))).toBe(5);
    expect(gateSpawnCount(g({ kind: 'mul', value: 3 }))).toBe(2);
    expect(gateSpawnCount(g({ kind: 'mul', value: 1 }))).toBe(0);
    expect(gateSpawnCount(g({ kind: 'sub', value: 9 }))).toBe(0);
  });

  it('detects crossing only inside the span and across the line', () => {
    const gate = g();
    expect(crossesGate(gate, 0, 0.9, 9.9, 10.1)).toBe(true);
    expect(crossesGate(gate, 0, 1.1, 9.9, 10.1)).toBe(false);
    expect(crossesGate(gate, 0, 0, 10.1, 10.3)).toBe(false);
    expect(crossesGate(gate, 0, 0, 10.1, 9.9)).toBe(true); // downward crossing also counts
  });

  it('moving gates oscillate and stay inside the lane', () => {
    const mg = g({ width: 2, motion: { amplitude: 10, speed: 1 } });
    for (let t = 0; t < 10; t += 0.1) {
      expect(Math.abs(gateX(mg, t, 10))).toBeLessThanOrEqual(4 + 1e-9);
    }
    expect(gateX(mg, 0, 10)).toBe(0);
    expect(gateX(g(), 5, 10)).toBe(0);
  });

  it('labels gates', () => {
    expect(gateLabel(g({ kind: 'add', value: 4 }))).toBe('+4');
    expect(gateLabel(g({ kind: 'mul', value: 2 }))).toBe('×2');
    expect(gateLabel(g({ kind: 'sub', value: 7 }))).toBe('−7');
  });
});
