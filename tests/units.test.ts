import { describe, expect, it } from 'vitest';
import { UnitPool } from '../src/sim/units';
import { SpatialGrid } from '../src/sim/grid';
import { UnitKind } from '../src/sim/types';

describe('UnitPool', () => {
  it('spawns up to capacity and swap-removes', () => {
    const p = new UnitPool(3);
    expect(p.spawn(UnitKind.Worker, 1, 1)).toBe(0);
    p.spawn(UnitKind.Queen, 2, 2);
    p.spawn(UnitKind.Worker, 3, 3);
    expect(p.spawn(UnitKind.Worker, 4, 4)).toBe(-1);
    p.remove(0);
    expect(p.count).toBe(2);
    expect(p.x[0]).toBe(3);
  });

  it('sweeps dead units and sums hp', () => {
    const p = new UnitPool(10);
    for (let i = 0; i < 5; i++) p.spawn(UnitKind.Worker, i, 0);
    p.hp[1] = 0;
    p.hp[3] = -2;
    p.sweepDead();
    expect(p.count).toBe(3);
    expect(p.totalHp()).toBe(3);
  });
});

describe('SpatialGrid', () => {
  it('finds neighbours and ignores far units', () => {
    const xs = new Float32Array([0, 0.5, 4, -4.5]);
    const ys = new Float32Array([5, 5.4, 30, 0]);
    const grid = new SpatialGrid(10, 40, 1, 4);
    grid.build(xs, ys, 4);
    const found: number[] = [];
    grid.query(0.2, 5.2, (i) => {
      found.push(i);
    });
    expect(found.sort()).toEqual([0, 1]);
  });
});
