import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { beeGeometry, queenGeometry } from '../src/art/models';
import { SKINS, skinGeometry } from '../src/art/skins';
import { maxTipGap } from './helpers/antenna';

const tris = (g: THREE.BufferGeometry) =>
  (g.index ? g.index.count : g.getAttribute('position').count) / 3;

describe('bee antenna tips sit on their stalks (DES-approved fix)', () => {
  it('classic worker: tips attached, still 220 tris', () => {
    const g = beeGeometry(1);
    expect(maxTipGap(g)).toBeLessThan(0.08);
    expect(tris(g)).toBe(220);
  });
  it('queen (shares the bee body)', () => {
    expect(maxTipGap(queenGeometry(1))).toBeLessThan(0.08);
  });
  for (const skin of SKINS)
    it(`skin ${skin.id} (shares the bee body)`, () => {
      const g = skinGeometry(skin, 1);
      expect(maxTipGap(g)).toBeLessThan(0.08);
      expect(tris(g)).toBeLessThanOrEqual(300);
    });
});
