import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels';
import { frameCamera, GLYPH_SHARE, labelPlatePx, MIN_GLYPH_PX } from '../src/render/gateLabel';

/**
 * DES M3-1 follow-up: farthest-row gate label glyphs >= 18 CSS px on a 360 px
 * wide screen. Uses the renderer's own camera framing + label placement
 * (projection math, no WebGL). Cross-checked in a real browser by
 * art/tools/label-measure.mjs (18.5 px at 360x780).
 */
const VIEWPORTS = [
  [360, 640],
  [360, 740],
  [360, 780],
  [360, 800],
] as const;

describe('gate label legibility at 360 px', () => {
  for (const [w, h] of VIEWPORTS) {
    it(`${w}x${h}: farthest gate glyphs >= ${MIN_GLYPH_PX}px in every level`, () => {
      const levels = LEVELS;
      expect(levels.length).toBeGreaterThan(0);
      for (const L of levels) {
        if (!L.gates.length) continue;
        const cam = new THREE.PerspectiveCamera(48, w / h, 0.1, 200);
        frameCamera(cam, L.laneLength);
        const far = L.gates.reduce((a, g) => (g.y > a.y ? g : a));
        for (const x of [far.x, -L.laneWidth / 2, L.laneWidth / 2]) {
          const glyph = labelPlatePx(cam, h, x, far.y, L.laneLength) * GLYPH_SHARE;
          expect(glyph, `${L.id ?? '?'} y=${far.y} x=${x}`).toBeGreaterThanOrEqual(MIN_GLYPH_PX);
        }
      }
    });
  }
  // Feedback 2026-10-15 tighter camera: was 18.5 px in the browser, now ~20.6 px (bigger).
  it('matches the in-browser measurement (clover-run, 360x780)', () => {
    const L = LEVELS.find((l) => l.laneLength === 40 && l.gates.some((g) => g.y === 25))!;
    const cam = new THREE.PerspectiveCamera(48, 360 / 780, 0.1, 200);
    frameCamera(cam, L.laneLength);
    expect(labelPlatePx(cam, 780, 2.7, 25, L.laneLength) * GLYPH_SHARE).toBeCloseTo(20.6, 0);
  });
});
