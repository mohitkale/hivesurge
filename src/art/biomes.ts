import * as THREE from 'three';
import { bake, type Part } from './models';

/** Environment kits. Each biome = sky/ground palette + a set of low-poly props. */
export interface BiomeKit {
  id: string;
  name: string;
  sky: string;
  fog: string;
  lane: string;
  laneAlt: string;
  soil: string;
  rail: string;
  /** Hemisphere light (sky, ground) tint. */
  light: [string, string];
  props: Record<string, () => THREE.BufferGeometry>;
  /** Prop ids scattered along the lane edges, in order. */
  scatter: string[];
  /** Prop id placed as posts along both lane rails. */
  railPost: string;
  /** Large set pieces outside the lane (hills, trees, bushes): prop id + count per side. */
  backdrop: { id: string; perSide: number; scale: number; offset?: number }[];
  /** Feedback round 4 environments (src/art/environments.ts); defaults keep the M3 look. */
  sun?: { color: string; intensity: number };
  /** Hemisphere light intensity (default 1.6). */
  hemi?: number;
  /** Fog near / far (default 45 / 75). */
  fogRange?: [number, number];
  /** Ambient particles drawn over the scene (render/ambient.ts). */
  ambient?: AmbientKind;
  /** Icon on the world name card. */
  icon?: string;
}

export type AmbientKind = 'pollen' | 'petals' | 'rain' | 'dust' | 'fireflies' | 'embers';

/** Budgets for one kit (PLAN M3-3, within the M3 model budget). Enforced in tests/biomes.test.ts. */
export const BIOME_BUDGET = {
  maxPropTris: 300,
  maxProps: 12,
  /** All environment triangles in one battle scene (scatter + rail posts + backdrop). */
  maxSceneTris: 30000,
  /** Draw calls for environment props (one InstancedMesh per prop id). */
  maxPropDrawCalls: 12,
} as const;

export const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) =>
  g.translate(x, y, z);

export function flower(petal: string, centre = '#ffd23f'): () => THREE.BufferGeometry {
  return () => {
    const parts: Part[] = [
      { geo: at(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 4), 0, 0.3, 0), color: '#3f8f3a' },
      { geo: at(new THREE.OctahedronGeometry(0.12), 0, 0.64, 0), color: centre },
    ];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const p = new THREE.SphereGeometry(0.14, 5, 3).scale(1, 0.4, 1);
      parts.push({ geo: at(p, Math.sin(a) * 0.17, 0.62, Math.cos(a) * 0.17), color: petal });
    }
    return bake(parts);
  };
}

const clover = (): THREE.BufferGeometry => {
  const parts: Part[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leaf = new THREE.SphereGeometry(0.18, 5, 3).scale(1, 0.3, 1);
    parts.push({ geo: at(leaf, Math.sin(a) * 0.16, 0.18, Math.cos(a) * 0.16), color: '#4fae47' });
  }
  parts.push({
    geo: at(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 3), 0, 0.09, 0),
    color: '#2f7a2c',
  });
  return bake(parts);
};

export const mushroom = (cap: string) => (): THREE.BufferGeometry =>
  bake([
    { geo: at(new THREE.CylinderGeometry(0.1, 0.13, 0.3, 6), 0, 0.15, 0), color: '#fff1dc' },
    {
      geo: at(new THREE.SphereGeometry(0.28, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.28, 0),
      color: (c) => (Math.abs(c.x) < 0.08 && Math.abs(c.z) > 0.12 ? '#ffffff' : cap),
    },
  ]);

export const pebble = (c: string) => (): THREE.BufferGeometry =>
  bake([
    {
      geo: new THREE.DodecahedronGeometry(0.22).scale(1.3, 0.6, 1).translate(0, 0.08, 0),
      color: c,
    },
  ]);

export const fencePost = (c: string) => (): THREE.BufferGeometry =>
  bake([
    { geo: at(new THREE.BoxGeometry(0.22, 0.8, 0.22), 0, 0.4, 0), color: c },
    { geo: at(new THREE.ConeGeometry(0.16, 0.2, 4).rotateY(Math.PI / 4), 0, 0.9, 0), color: c },
  ]);

export const tree = (leaf: string, fruit: string) => (): THREE.BufferGeometry => {
  const parts: Part[] = [
    { geo: at(new THREE.CylinderGeometry(0.12, 0.18, 1.0, 5), 0, 0.5, 0), color: '#8a5530' },
    { geo: at(new THREE.IcosahedronGeometry(0.75, 0), 0, 1.45, 0), color: leaf },
  ];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    parts.push({
      geo: at(
        new THREE.OctahedronGeometry(0.11),
        Math.sin(a) * 0.62,
        1.3 + (i % 2) * 0.3,
        Math.cos(a) * 0.62,
      ),
      color: fruit,
    });
  }
  return bake(parts);
};

export const bush = (leaf: string, berry: string) => (): THREE.BufferGeometry => {
  const parts: Part[] = [];
  const blobs: [number, number, number, number][] = [
    [0, 0.45, 0, 0.55],
    [0.45, 0.32, 0.1, 0.4],
    [-0.42, 0.3, -0.05, 0.42],
  ];
  for (const [x, y, z, r] of blobs)
    parts.push({ geo: at(new THREE.IcosahedronGeometry(r, 0), x, y, z), color: leaf });
  for (let i = 0; i < 3; i++)
    parts.push({
      geo: at(new THREE.OctahedronGeometry(0.08), -0.3 + i * 0.3, 0.62 - (i % 2) * 0.2, 0.4),
      color: berry,
    });
  return bake(parts);
};

/** Low rolling hill for the backdrop: one flattened dodecahedron with a lighter crown. */
export const hill = (base: string, crown: string) => (): THREE.BufferGeometry =>
  bake([
    {
      geo: new THREE.DodecahedronGeometry(1, 0).scale(2.6, 0.9, 1.8),
      color: (c) => (c.y > 0.45 ? crown : base),
    },
  ]);

const dandelion = (): THREE.BufferGeometry =>
  bake([
    { geo: at(new THREE.CylinderGeometry(0.03, 0.04, 0.8, 3), 0, 0.4, 0), color: '#3f8f3a' },
    { geo: at(new THREE.IcosahedronGeometry(0.2, 0), 0, 0.88, 0), color: '#fff8ec' },
    { geo: at(new THREE.OctahedronGeometry(0.06), 0, 0.88, 0.18), color: '#ffd23f' },
  ]);

const hayBale = (): THREE.BufferGeometry =>
  bake([
    {
      geo: at(new THREE.CylinderGeometry(0.35, 0.35, 0.5, 8).rotateZ(Math.PI / 2), 0, 0.35, 0),
      color: (c) => (Math.abs(c.x) > 0.24 ? '#d9a441' : '#e8c060'),
    },
  ]);

const crate = (): THREE.BufferGeometry =>
  bake([
    {
      geo: at(new THREE.BoxGeometry(0.6, 0.4, 0.45), 0, 0.2, 0),
      color: (c) => (c.y > 0.3 ? '#e04a3a' : '#b97a45'),
    },
  ]);

export const BIOMES: Record<string, BiomeKit> = {
  clover: {
    id: 'clover',
    name: 'Clover Meadow',
    sky: '#ffd9a8',
    fog: '#ffd9a8',
    lane: '#7cc46a',
    laneAlt: '#86cd73',
    soil: '#e9a86b',
    rail: '#fff3d6',
    light: ['#fff6e0', '#7a5aa0'],
    props: {
      flowerPink: flower('#ff6fa8'),
      flowerWhite: flower('#ffffff'),
      flowerLilac: flower('#b78cff'),
      clover: clover,
      mushroom: mushroom('#e2557a'),
      pebble: pebble('#cdbfa8'),
      fencePost: fencePost('#fff3d6'),
      dandelion: dandelion,
      bush: bush('#4fae47', '#ff6fa8'),
      hill: hill('#6fbf5e', '#9ad67f'),
    },
    scatter: [
      'flowerPink',
      'clover',
      'flowerWhite',
      'dandelion',
      'flowerLilac',
      'mushroom',
      'clover',
      'pebble',
    ],
    railPost: 'fencePost',
    backdrop: [
      { id: 'bush', perSide: 6, scale: 1.6 },
      { id: 'hill', perSide: 4, scale: 1.5, offset: 6 },
    ],
  },
  orchard: {
    id: 'orchard',
    name: 'Sunset Orchard',
    sky: '#ffc09a',
    fog: '#ffb48a',
    lane: '#a7c45a',
    laneAlt: '#97b54d',
    soil: '#c98a5a',
    rail: '#8a5530',
    light: ['#ffe2c0', '#8a4a6a'],
    props: {
      appleTree: tree('#5f9e3c', '#e04a3a'),
      pearTree: tree('#79aa3f', '#ffd23f'),
      crate: crate,
      flowerOrange: flower('#ff8a3d', '#fff1b8'),
      mushroom: mushroom('#ff8a3d'),
      pebble: pebble('#b89a7a'),
      fencePost: fencePost('#8a5530'),
      hayBale: hayBale,
      hedge: bush('#5f9e3c', '#e04a3a'),
      hill: hill('#b3a04a', '#d6bf5a'),
    },
    scatter: [
      'flowerOrange',
      'pebble',
      'appleTree',
      'crate',
      'flowerOrange',
      'pearTree',
      'mushroom',
      'hayBale',
    ],
    railPost: 'fencePost',
    backdrop: [
      { id: 'appleTree', perSide: 5, scale: 2.2 },
      { id: 'pearTree', perSide: 4, scale: 2.0 },
      { id: 'hedge', perSide: 3, scale: 1.5 },
      { id: 'hill', perSide: 3, scale: 1.6, offset: 6 },
    ],
  },
};

/** Campaign biome per level (art/ART_DIRECTION.md §Biomes). Unknown levels use Clover Meadow. */
export const LEVEL_BIOME: Record<string, string> = {
  'ftue-meadow': 'clover',
  'dandelion-drift': 'clover',
  'clover-run': 'clover',
  'thistle-gauntlet': 'orchard',
  'wasp-queen-nest': 'orchard',
};

/** Biome for a level; `?biome=<id>` in the URL overrides it (art/QA screenshots). */
export function biomeFor(levelId: string, search = ''): BiomeKit {
  const forced = new URLSearchParams(search).get('biome');
  if (forced && BIOMES[forced]) return BIOMES[forced];
  return BIOMES[LEVEL_BIOME[levelId] ?? 'clover'];
}

export interface PropPlacement {
  id: string;
  x: number;
  z: number;
  rotY: number;
  scale: number;
}

/**
 * Deterministic environment layout for a lane (shared by the renderer and the budget
 * tests): edge scatter, rail posts and backdrop set pieces outside the lane.
 */
export function layoutBiome(kit: BiomeKit, laneWidth: number, laneLength: number): PropPlacement[] {
  const out: PropPlacement[] = [];
  const half = laneWidth / 2;
  const rows = Math.ceil((laneLength + 8) / 1.8);
  for (let i = 0; i < rows; i++)
    for (const side of [-1, 1])
      out.push({
        id: kit.scatter[(i * 3 + (side + 1)) % kit.scatter.length],
        x: side * (half + 1.1 + ((i * 7) % 3) * 0.6),
        z: -i * 1.8 + 3,
        rotY: i * 1.3,
        scale: 1.4,
      });
  for (let z = 4; z > -laneLength - 2; z -= 2.5)
    for (const side of [-1, 1])
      out.push({ id: kit.railPost, x: side * (half + 0.15), z, rotY: 0, scale: 0.8 });
  for (const b of kit.backdrop)
    for (let k = 0; k < b.perSide; k++)
      for (const side of [-1, 1]) {
        const t = (k + 0.5 + (b.id.length % 3) * 0.17) / b.perSide;
        out.push({
          id: b.id,
          x: side * (half + 4 + (b.offset ?? 0) + ((k * 5 + b.id.length) % 4) * 1.3),
          z: 2 - t * (laneLength + 6),
          rotY: k * 2.1 + side,
          scale: b.scale * (0.85 + ((k * 3) % 4) * 0.08),
        });
      }
  return out;
}
