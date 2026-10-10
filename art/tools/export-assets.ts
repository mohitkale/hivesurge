/**
 * Exports the procedural models to GLB (raw), then gltfpack compresses them with
 * meshopt (EXT_meshopt_compression + quantization) into public/assets/models/.
 * Run: npx tsx art/tools/export-assets.ts   (needs `gltfpack` on PATH or GLTFPACK env)
 * Vertex colours only, no textures: KTX2 is not needed (see ART_DIRECTION.md §Load budget).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import type * as THREE from 'three';
import { BIOMES } from '../../src/art/biomes';
import {
  beeGeometry,
  cannonGeometry,
  hornetGeometry,
  nestGeometry,
  queenGeometry,
  waspGeometry,
} from '../../src/art/models';
import { SKINS, skinGeometry } from '../../src/art/skins';

const OUT = 'public/assets/models';
const RAW = '/tmp/hivesurge-raw-glb';

function glb(geo: THREE.BufferGeometry, name: string): Buffer {
  const attrs: [string, string, number][] = [
    ['position', 'POSITION', 3],
    ['normal', 'NORMAL', 3],
    ['color', 'COLOR_0', 3],
    ['aWing', '_WING', 1],
  ];
  const chunks: Buffer[] = [];
  const accessors: object[] = [];
  const views: object[] = [];
  const attributes: Record<string, number> = {};
  let offset = 0;
  for (const [key, gl, size] of attrs) {
    const a = geo.getAttribute(key);
    const arr = Float32Array.from(a.array as ArrayLike<number>);
    const buf = Buffer.from(arr.buffer);
    views.push({ buffer: 0, byteOffset: offset, byteLength: buf.length, target: 34962 });
    const acc: Record<string, unknown> = {
      bufferView: views.length - 1,
      componentType: 5126,
      count: a.count,
      type: size === 3 ? 'VEC3' : 'SCALAR',
    };
    if (key === 'position') {
      geo.computeBoundingBox();
      acc.min = geo.boundingBox!.min.toArray();
      acc.max = geo.boundingBox!.max.toArray();
    }
    accessors.push(acc);
    attributes[gl] = accessors.length - 1;
    chunks.push(buf);
    offset += buf.length;
  }
  const bin = Buffer.concat(chunks);
  const json = {
    asset: { version: '2.0', generator: 'hivesurge-art export-assets' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [{ name, primitives: [{ attributes, material: 0 }] }],
    materials: [{ name: 'flat', pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: 1 } }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: views,
    accessors,
  };
  let js = Buffer.from(JSON.stringify(json));
  js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const jh = Buffer.alloc(8);
  jh.writeUInt32LE(js.length, 0);
  jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(bin.length, 0);
  bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jh, js, bh, bin]);
}

const models: Record<string, THREE.BufferGeometry> = {
  'unit-bee': beeGeometry(),
  'unit-queen': queenGeometry(),
  'unit-wasp': waspGeometry(),
  'unit-hornet': hornetGeometry(),
  'prop-cannon': cannonGeometry(),
  'prop-nest': nestGeometry(9),
};
for (const s of SKINS) models[`skin-bee-${s.id}`] = skinGeometry(s);
for (const b of Object.values(BIOMES))
  for (const [id, f] of Object.entries(b.props)) models[`biome-${b.id}-${id}`] = f();

rmSync(RAW, { recursive: true, force: true });
mkdirSync(RAW, { recursive: true });
mkdirSync(OUT, { recursive: true });
const gltfpack = process.env.GLTFPACK ?? 'gltfpack';
for (const [name, geo] of Object.entries(models)) {
  const raw = `${RAW}/${name}.glb`;
  writeFileSync(raw, glb(geo, name));
  // -cc: meshopt compression; -kv: keep the custom _WING attribute; -noq off => quantized.
  execFileSync(gltfpack, ['-i', raw, '-o', `${OUT}/${name}.glb`, '-cc', '-kv', '-km'], {
    stdio: 'pipe',
  });
  console.log(name, (geo.getAttribute('position').count / 3) | 0, 'tris');
}
