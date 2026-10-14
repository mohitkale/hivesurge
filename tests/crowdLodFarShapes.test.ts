import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { crowdFarGeometry, waspFarGeometry } from '../src/art/models';

const tris = (g: THREE.BufferGeometry) =>
  (g.index ? g.index.count : g.getAttribute('position').count) / 3;
const size = (g: THREE.BufferGeometry) => {
  g.computeBoundingBox();
  return g.boundingBox!.getSize(new THREE.Vector3());
};

describe('far crowd stand-ins (PR 083 design condition)', () => {
  const bee = crowdFarGeometry(1);
  const wasp = waspFarGeometry(1);

  it('stay at or under 20 triangles', () => {
    expect(tris(bee)).toBeLessThanOrEqual(20);
    expect(tris(wasp)).toBeLessThanOrEqual(20);
  });

  it('far wasp has a different shape from the far bee: slimmer and more elongated', () => {
    expect(tris(wasp)).not.toBe(tris(bee));
    const b = size(bee);
    const w = size(wasp);
    expect(w.z / w.x).toBeGreaterThan((b.z / b.x) * 1.3);
    expect(w.x).toBeLessThan(b.x);
  });

  it('far wasp is much darker than the far bee (value contrast, not hue only)', () => {
    const lum = (g: THREE.BufferGeometry) => {
      const c = g.getAttribute('color');
      let l = 0;
      for (let i = 0; i < c.count; i++)
        l += 0.2126 * c.getX(i) + 0.7152 * c.getY(i) + 0.0722 * c.getZ(i);
      return l / c.count;
    };
    expect(lum(wasp)).toBeLessThan(lum(bee) * 0.5);
  });
});
