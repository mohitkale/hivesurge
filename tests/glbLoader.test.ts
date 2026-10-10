import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  glbEnabledFromUrl,
  loadModelLibrary,
  RUNTIME_MODELS,
  scaledModel,
  type FetchBytes,
} from '../src/art/glbLoader';
import {
  beeGeometry,
  cannonGeometry,
  hornetGeometry,
  queenGeometry,
  waspGeometry,
} from '../src/art/models';

const diskFetch: FetchBytes = async (url) => {
  const b = readFileSync(`public/${url}`);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

const PROCEDURAL: Record<string, () => THREE.BufferGeometry> = {
  'unit-bee': () => beeGeometry(),
  'unit-queen': () => queenGeometry(),
  'unit-wasp': () => waspGeometry(),
  'unit-hornet': () => hornetGeometry(),
  'prop-cannon': () => cannonGeometry(),
};

function bounds(g: THREE.BufferGeometry): THREE.Box3 {
  g.computeBoundingBox();
  return g.boundingBox!;
}

function wingShare(g: THREE.BufferGeometry): number {
  const w = g.getAttribute('aWing');
  let n = 0;
  for (let i = 0; i < w.count; i++) if (w.getX(i) !== 0) n++;
  return n / w.count;
}

describe('runtime GLB loading (M3-5)', () => {
  it('loads every runtime model from public/assets/models with the procedural attributes', async () => {
    const lib = await loadModelLibrary({
      fetchBytes: diskFetch,
      onError: (n, e) => {
        throw new Error(`${n}: ${e}`);
      },
    });
    expect(Object.keys(lib).sort()).toEqual([...RUNTIME_MODELS].sort());
    for (const name of RUNTIME_MODELS) {
      const g = lib[name]!;
      expect(g.index).toBeNull();
      for (const a of ['position', 'normal', 'color', 'aWing']) {
        expect(g.getAttribute(a).array).toBeInstanceOf(Float32Array);
      }
      expect(g.getAttribute('color').itemSize).toBe(3);
      // Same size and placement as the procedural model (quantization error only).
      const a = bounds(g);
      const b = bounds(PROCEDURAL[name]());
      for (const k of ['min', 'max'] as const)
        for (const ax of ['x', 'y', 'z'] as const)
          expect(Math.abs(a[k][ax] - b[k][ax])).toBeLessThan(0.02);
    }
  });

  it('rebuilds the wing tags (gltfpack drops _WING) to match the procedural share', async () => {
    const lib = await loadModelLibrary({ fetchBytes: diskFetch });
    for (const name of ['unit-bee', 'unit-queen', 'unit-wasp', 'unit-hornet'] as const) {
      const glb = wingShare(lib[name]!);
      const proc = wingShare(PROCEDURAL[name]());
      expect(proc).toBeGreaterThan(0);
      expect(Math.abs(glb - proc)).toBeLessThan(0.01);
      // Left wing negative, right wing positive.
      const g = lib[name]!;
      const w = g.getAttribute('aWing');
      const p = g.getAttribute('position');
      for (let i = 0; i < w.count; i++)
        if (w.getX(i) !== 0) expect(Math.sign(p.getX(i))).toBe(w.getX(i));
    }
    expect(wingShare(lib['prop-cannon']!)).toBe(0);
  });

  it('never rejects: network errors and timeouts give an empty library (procedural fallback)', async () => {
    const failing: FetchBytes = async () => {
      throw new Error('404');
    };
    const errors: string[] = [];
    expect(await loadModelLibrary({ fetchBytes: failing, onError: (n) => errors.push(n) })).toEqual(
      {},
    );
    expect(errors.sort()).toEqual([...RUNTIME_MODELS].sort());

    const hang: FetchBytes = () => new Promise(() => {});
    expect(await loadModelLibrary({ fetchBytes: hang, timeoutMs: 20 })).toEqual({});

    const garbage: FetchBytes = async () => new Uint8Array([1, 2, 3, 4]).buffer;
    expect(await loadModelLibrary({ fetchBytes: garbage })).toEqual({});
  });

  it('a partial failure keeps the models that loaded', async () => {
    const someFail: FetchBytes = (url) =>
      url.includes('wasp') ? Promise.reject(new Error('x')) : diskFetch(url);
    const lib = await loadModelLibrary({ fetchBytes: someFail });
    expect(lib['unit-bee']).toBeDefined();
    expect(lib['unit-wasp']).toBeUndefined();
    expect(scaledModel(lib, 'unit-wasp', 0.5)).toBeNull(); // scene falls back to waspGeometry(0.5)
  });

  it('scaledModel scales a copy like the procedural scale argument', async () => {
    const lib = await loadModelLibrary({ fetchBytes: diskFetch, names: ['unit-bee'] });
    const g = scaledModel(lib, 'unit-bee', 0.42)!;
    const ref = bounds(beeGeometry(0.42));
    expect(Math.abs(bounds(g).max.x - ref.max.x)).toBeLessThan(0.01);
    expect(bounds(lib['unit-bee']!).max.x).toBeGreaterThan(ref.max.x * 2); // original untouched
    expect(scaledModel(null, 'unit-bee', 1)).toBeNull();
  });

  it('?assets=off disables GLB loading', () => {
    expect(glbEnabledFromUrl('?assets=off')).toBe(false);
    expect(glbEnabledFromUrl('')).toBe(true);
  });
});
