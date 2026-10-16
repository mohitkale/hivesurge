import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/levels';
import { World } from '../src/sim/world';
import { DamagePops, enemyMeter, fmtInt, hiveMeter, meterView } from '../src/ui/meters';
import * as THREE from 'three';
import { frameCamera, NEST_SCALE } from '../src/render/gateLabel';

describe('feedback 2026-10-15: energy meters', () => {
  it('meterView rounds up, clamps and fills', () => {
    expect(meterView(2.2, 10)).toEqual({ value: 3, max: 10, frac: 0.3 });
    expect(meterView(-5, 10).value).toBe(0);
    expect(meterView(5, 0).frac).toBe(0);
  });

  it('fmtInt groups thousands', () => {
    expect(fmtInt(3050)).toBe('3,050');
    expect(fmtInt(999)).toBe('999');
    expect(fmtInt(1234567)).toBe('1,234,567');
  });

  it('every bee reaching the nest lowers the enemy number by its hp', () => {
    const w = new World(getLevel('ftue-meadow'));
    const start = enemyMeter(w).value;
    let dealt = 0;
    for (let i = 0; i < 60 * 20 && w.outcome === 'playing'; i++) {
      w.step({ aimX: 0, firing: true, queen: false });
      for (const e of w.drainEvents()) if (e.type === 'nestHit') dealt += e.damage;
    }
    expect(dealt).toBeGreaterThan(0);
    expect(enemyMeter(w).value).toBe(Math.max(0, Math.ceil(start - dealt)));
  });

  it('defenders = wasps alive + timed wave wasps still to come', () => {
    const w = new World(getLevel('clover-run'));
    const total = w.level.waves.filter((x) => x.at !== undefined).reduce((n, x) => n + x.count, 0);
    expect(enemyMeter(w).defenders).toBe(total);
    for (let i = 0; i < 60 * 10; i++) w.step({ aimX: 0, firing: false, queen: false });
    expect(w.enemyDefenders).toBe(w.wasps.count + w.pendingWaveWasps);
    expect(w.pendingWaveWasps).toBeLessThanOrEqual(total);
  });

  it('hive meter tracks hive hp', () => {
    const w = new World(getLevel('clover-run'));
    w.hiveHp = 12.4;
    expect(hiveMeter(w)).toMatchObject({ value: 13, max: w.level.hiveHp });
  });

  it('DamagePops batches hits into one pop per gap', () => {
    const p = new DamagePops(100);
    p.add(1);
    p.add(2);
    expect(p.take(0)).toBe(3);
    p.add(4);
    expect(p.take(50)).toBe(0);
    expect(p.take(120)).toBe(4);
    expect(p.take(300)).toBe(0);
  });
});

describe('feedback 2026-10-15: tighter camera', () => {
  /** On-screen height (fraction of viewport) of a 3-unit post at the nest. */
  function nestShare(cam: THREE.PerspectiveCamera, L: number): number {
    const a = new THREE.Vector3(0, 0, -L - 1.4).project(cam).y;
    const b = new THREE.Vector3(0, 3 * NEST_SCALE, -L - 1.4).project(cam).y;
    return Math.abs(b - a) / 2;
  }
  function oldCam(aspect: number, L: number): THREE.PerspectiveCamera {
    const portrait = aspect < 1;
    const c = new THREE.PerspectiveCamera(portrait ? 62 : 48, aspect, 0.1, 200);
    c.position.set(0, portrait ? 21 : 17, portrait ? 12 : 10);
    c.lookAt(0, 0, portrait ? -L * 0.47 : -L * 0.5);
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
    return c;
  }
  for (const [name, aspect] of [
    ['portrait phone', 390 / 844],
    ['desktop column', 9 / 16],
    ['tablet', 3 / 4],
  ] as const)
    it(`${name} (landscape shows a portrait column, decision 13): the nest is drawn at least 1.5x bigger than before`, () => {
      const L = 40;
      const cam = new THREE.PerspectiveCamera(50, aspect, 0.1, 200);
      frameCamera(cam, L);
      const before = nestShare(oldCam(aspect, L), L) / NEST_SCALE;
      expect(nestShare(cam, L)).toBeGreaterThan(before * 1.5);
      // the cannon (z = 0) stays on screen
      const c = new THREE.Vector3(0, 0.5, 0).project(cam);
      expect(c.y).toBeGreaterThan(-1);
    });
});
