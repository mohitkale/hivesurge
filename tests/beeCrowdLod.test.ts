import { describe, expect, it } from 'vitest';
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
});
