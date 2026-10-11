import { readdirSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { describe, expect, it } from 'vitest';
import { glbPath, modelCatalog } from '../src/art/catalog';
import { geometryFromGltfScene } from '../src/art/glbLoader';

/**
 * M3-1c re-export check that runs without gltfpack: every committed GLB must decode to the
 * geometry its procedural source produces today (same triangle count, same bounds and colours
 * within 8-bit/16-bit quantization). Byte-identical rebuilds: art/tools/rebuild-glbs.sh,
 * last run in art/models/REBUILD-LOG.md.
 */
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const parse = (buf: ArrayBuffer) =>
  new Promise<THREE.Object3D>((res, rej) => loader.parse(buf, '', (g) => res(g.scene), rej));
const tris = (g: THREE.BufferGeometry) =>
  (g.index ? g.index.count : g.getAttribute('position').count) / 3;
const box = (g: THREE.BufferGeometry) => (g.computeBoundingBox(), g.boundingBox!);

const catalog = modelCatalog();

describe('GLBs match their procedural source (M3-1c)', () => {
  for (const [name, make] of Object.entries(catalog))
    it(name, async () => {
      const b = readFileSync(glbPath(name));
      const scene = await parse(
        b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer,
      );
      const g = geometryFromGltfScene(scene)!;
      expect(g).not.toBeNull();
      const src = make();
      expect(tris(g)).toBe(tris(src));
      const a = box(g);
      const s = box(src);
      const tol = s.getSize(new THREE.Vector3()).length() * 0.01;
      expect(a.min.distanceTo(s.min)).toBeLessThan(tol);
      expect(a.max.distanceTo(s.max)).toBeLessThan(tol);
      // Mean colour within 8-bit quantization.
      const mean = (geo: THREE.BufferGeometry) => {
        const c = geo.getAttribute('color');
        const m = [0, 0, 0];
        for (let i = 0; i < c.count; i++) for (let k = 0; k < 3; k++) m[k] += c.getComponent(i, k);
        return m.map((v) => v / c.count);
      };
      const [ma, ms] = [mean(g), mean(src)];
      for (let k = 0; k < 3; k++) expect(Math.abs(ma[k] - ms[k])).toBeLessThan(0.02);
    });

  it('no orphan GLBs: every committed GLB has a procedural source', () => {
    const committed = [
      ...readdirSync('public/assets/models').map((f) => `public/assets/models/${f}`),
      ...readdirSync('art/models').map((f) => `art/models/${f}`),
    ].filter((f) => f.endsWith('.glb'));
    const expected = Object.keys(catalog).map(glbPath);
    expect(committed.sort()).toEqual(expected.sort());
  });
});
