/**
 * Runtime GLB loading (PLAN M3-5). Loads the meshopt GLBs exported by art/tools/export-assets.ts
 * from /assets/models/ and turns each into a float, non-quantized BufferGeometry with the same
 * attributes the procedural models have (position, normal, color, aWing).
 *
 * The game never depends on this: every failure (network, decoder, timeout, missing file,
 * unexpected content) resolves to "no model", and the scene keeps the procedural geometry
 * from src/art/models.ts. three's GLTFLoader + meshopt decoder are imported lazily, so they
 * are not in the initial or game chunk.
 */
import * as THREE from 'three';
import { ART } from './palette';

/** Models the battle scene can take from GLB (others stay procedural). */
export const RUNTIME_MODELS = [
  'unit-bee',
  'unit-queen',
  'unit-wasp',
  'unit-hornet',
  'prop-cannon',
] as const;
export type RuntimeModel = (typeof RUNTIME_MODELS)[number];
export type ModelLibrary = Partial<Record<RuntimeModel, THREE.BufferGeometry>>;

export const MODEL_BASE_URL = 'assets/models/';
export const MODEL_LOAD_TIMEOUT_MS = 8000;

/** Wing colours (linear, as stored in COLOR_0). gltfpack drops the custom _WING attribute. */
const WING_COLORS = [ART.beeWing, ART.waspWing].map((c) => new THREE.Color(c));
/** COLOR_0 is 8-bit after gltfpack quantization. */
const WING_COLOR_TOLERANCE = 3 / 255;

export type FetchBytes = (url: string) => Promise<ArrayBuffer>;

const defaultFetch: FetchBytes = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.arrayBuffer();
};

/** GLTFLoader with the meshopt decoder, loaded on first use. */
async function makeParser(): Promise<(buf: ArrayBuffer) => Promise<THREE.Object3D>> {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
  ]);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return (buf) =>
    new Promise((resolve, reject) => loader.parse(buf, '', (g) => resolve(g.scene), reject));
}

function toFloat(
  a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
): THREE.BufferAttribute {
  const n = a.count;
  const s = a.itemSize;
  const out = new Float32Array(n * s);
  for (let i = 0; i < n; i++) for (let k = 0; k < s; k++) out[i * s + k] = a.getComponent(i, k);
  return new THREE.BufferAttribute(out, s);
}

/**
 * Flattens a parsed GLB into one non-indexed float geometry in model space (applies the
 * quantization node transform), RGB colours and a rebuilt aWing attribute.
 */
export function geometryFromGltfScene(root: THREE.Object3D): THREE.BufferGeometry | null {
  root.updateMatrixWorld(true);
  let mesh: THREE.Mesh | null = null;
  root.traverse((o) => {
    if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh;
  });
  if (!mesh) return null;
  const m = mesh as THREE.Mesh;
  const src = m.geometry as THREE.BufferGeometry;
  if (!src.getAttribute('position') || !src.getAttribute('color')) return null;
  let g = new THREE.BufferGeometry();
  if (src.index) g.setIndex(src.index.clone());
  g.setAttribute('position', toFloat(src.getAttribute('position')));
  const c = toFloat(src.getAttribute('color'));
  const rgb = new Float32Array(c.count * 3);
  for (let i = 0; i < c.count; i++) rgb.set([c.getX(i), c.getY(i), c.getZ(i)], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
  if (g.index) g = g.toNonIndexed();
  g.applyMatrix4(m.matrixWorld);
  g.computeVertexNormals();
  const pos = g.getAttribute('position');
  const col = g.getAttribute('color');
  const wing = new Float32Array(pos.count);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    tmp.setRGB(col.getX(i), col.getY(i), col.getZ(i));
    const isWing = WING_COLORS.some(
      (w) =>
        Math.abs(w.r - tmp.r) <= WING_COLOR_TOLERANCE &&
        Math.abs(w.g - tmp.g) <= WING_COLOR_TOLERANCE &&
        Math.abs(w.b - tmp.b) <= WING_COLOR_TOLERANCE,
    );
    if (isWing) wing[i] = Math.sign(pos.getX(i)) || 1;
  }
  g.setAttribute('aWing', new THREE.BufferAttribute(wing, 1));
  g.computeBoundingSphere();
  return g;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${ms} ms`)), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

export interface LoadOptions {
  baseUrl?: string;
  fetchBytes?: FetchBytes;
  timeoutMs?: number;
  names?: readonly RuntimeModel[];
  onError?: (name: string, err: unknown) => void;
}

/**
 * Loads the runtime models. Never rejects: models that fail are simply missing from the
 * result (the scene then uses procedural geometry for them).
 */
export async function loadModelLibrary(opts: LoadOptions = {}): Promise<ModelLibrary> {
  const {
    baseUrl = MODEL_BASE_URL,
    fetchBytes = defaultFetch,
    timeoutMs = MODEL_LOAD_TIMEOUT_MS,
    names = RUNTIME_MODELS,
    onError,
  } = opts;
  const lib: ModelLibrary = {};
  let parse: (buf: ArrayBuffer) => Promise<THREE.Object3D>;
  try {
    parse = await withTimeout(makeParser(), timeoutMs);
  } catch (e) {
    onError?.('loader', e);
    return lib;
  }
  await Promise.all(
    names.map(async (name) => {
      try {
        const buf = await withTimeout(fetchBytes(`${baseUrl}${name}.glb`), timeoutMs);
        const geo = geometryFromGltfScene(await withTimeout(parse(buf), timeoutMs));
        if (!geo) throw new Error('no mesh with position + color');
        lib[name] = geo;
      } catch (e) {
        onError?.(name, e);
      }
    }),
  );
  return lib;
}

/** A GLB geometry scaled like the procedural one (`scale` is the procedural model's argument). */
export function scaledModel(
  lib: ModelLibrary | null,
  name: RuntimeModel,
  scale: number,
): THREE.BufferGeometry | null {
  const g = lib?.[name];
  if (!g) return null;
  const out = g.clone();
  if (scale !== 1) out.scale(scale, scale, scale);
  return out;
}

/** `?assets=off` forces the procedural fallback (QA / M3-5 acceptance check). */
export function glbEnabledFromUrl(search: string): boolean {
  return new URLSearchParams(search).get('assets') !== 'off';
}
