import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  beeGeometry,
  hornetGeometry,
  queenGeometry,
  setBakeCompaction,
  waspGeometry,
} from '../src/art/models';

const tris = (g: THREE.BufferGeometry) =>
  (g.index ? g.index.count : g.getAttribute('position').count) / 3;
const corners = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);

describe('PERF-AUDIT #1: compacted unit geometry', () => {
  for (const [name, fn] of [
    ['bee', beeGeometry],
    ['queen', queenGeometry],
    ['wasp', waspGeometry],
    ['hornet', hornetGeometry],
  ] as const) {
    it(`${name}: same triangles + per-corner data, far fewer vertices, no normals`, () => {
      setBakeCompaction(false);
      const raw = fn(0.5);
      setBakeCompaction(true);
      const g = fn(0.5);
      expect(g.index).not.toBeNull();
      expect(g.getAttribute('normal')).toBeUndefined();
      expect(tris(g)).toBe(tris(raw));
      expect(g.getAttribute('position').count).toBeLessThan(
        raw.getAttribute('position').count * 0.6,
      );
      const a = corners(g);
      // Identical up to float noise around zero (mergeVertices keeps the first of near-equal values).
      for (const k of ['position', 'color', 'aWing']) {
        const x = a.getAttribute(k).array;
        const y = raw.getAttribute(k).array;
        expect(x.length).toBe(y.length);
        let d = 0;
        for (let i = 0; i < x.length; i++) d = Math.max(d, Math.abs(x[i] - y[i]));
        expect(d).toBeLessThan(1e-6);
      }
    });
  }
});
