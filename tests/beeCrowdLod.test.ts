import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ART } from '../src/art/palette';
import { beeCrowdGeometry, beeGeometry } from '../src/art/models';

// PROPOSED crowd LOD (needs DES sign-off; eng owns the switch).
describe('worker bee crowd LOD', () => {
  it('is <=150 tris, keeps flapping wings and the bee palette', () => {
    const g = beeCrowdGeometry(0.42);
    expect(g.index!.count / 3).toBeLessThanOrEqual(150);
    const w = g.getAttribute('aWing');
    let wing = 0;
    for (let i = 0; i < w.count; i++) if (w.getX(i) !== 0) wing++;
    expect(wing).toBeGreaterThan(0);
    const key = (c: ArrayLike<number>, i: number) =>
      `${c[i * 3].toFixed(3)},${c[i * 3 + 1].toFixed(3)},${c[i * 3 + 2].toFixed(3)}`;
    const colours = (geo: typeof g) => {
      const c = geo.getAttribute('color').array;
      return new Set(Array.from({ length: c.length / 3 }, (_, i) => key(c, i)));
    };
    const full = colours(beeGeometry(0.42));
    for (const k of colours(g)) expect(full.has(k), k).toBe(true);
    // Same footprint as the full bee, so swapping it in does not change hit reads.
    const r = (geo: typeof g) => geo.boundingSphere!.radius;
    expect(Math.abs(r(g) - r(beeGeometry(0.42)))).toBeLessThan(0.05);
  });
  it('antenna tips sit on stalks (no floating teal bits)', () => {
    const g = beeCrowdGeometry(1);
    const pos = g.getAttribute('position');
    const col = g.getAttribute('color');
    const teal = new THREE.Color(ART.beeTeam);
    const stalk = new THREE.Color(ART.beeStripe);
    const near = (c: THREE.Color, i: number) =>
      Math.abs(col.getX(i) - c.r) + Math.abs(col.getY(i) - c.g) + Math.abs(col.getZ(i) - c.b) <
      1e-3;
    const tips: THREE.Vector3[] = [];
    const stalks: THREE.Vector3[] = [];
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      if (near(teal, i)) tips.push(v);
      else if (near(stalk, i) && v.y > 0.25) stalks.push(v);
    }
    expect(tips.length).toBeGreaterThan(0);
    for (const t of tips)
      expect(Math.min(...stalks.map((s) => s.distanceTo(t)))).toBeLessThan(0.15);
  });
});
