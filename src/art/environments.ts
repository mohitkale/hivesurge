import * as THREE from 'three';
import { bake, type Part } from './models';
import {
  at,
  BIOMES,
  bush,
  fencePost,
  flower,
  hill,
  mushroom,
  pebble,
  type BiomeKit,
} from './biomes';

/**
 * Feedback round 4 #5 (Mohit, 2026-10-22: "the game environment and stuffs should change a bit
 * to make it exciting else it feels monotonous pretty fast"). Six environments that rotate by
 * world (5 levels each), with the Wasp Nest Fortress on every boss level. Each one sets the
 * ground, track and rail colours, sky and fog, light colour and strength, its own low-poly
 * props (one InstancedMesh per prop id, shared flat material, vertex colours, no textures)
 * and ambient particles. All geometry is procedural and original; nothing is loaded.
 */

const pine = (dark: string, light: string) => (): THREE.BufferGeometry => {
  const parts: Part[] = [
    { geo: at(new THREE.CylinderGeometry(0.1, 0.14, 0.7, 5), 0, 0.35, 0), color: '#5a3a22' },
  ];
  for (let k = 0; k < 3; k++)
    parts.push({
      geo: at(new THREE.ConeGeometry(0.75 - k * 0.18, 0.9, 7), 0, 0.9 + k * 0.5, 0),
      color: k % 2 ? light : dark,
    });
  return bake(parts);
};

const fern = (c: string) => (): THREE.BufferGeometry => {
  const parts: Part[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leaf = new THREE.ConeGeometry(0.08, 0.7, 3).rotateZ(0.9).rotateY(a);
    parts.push({ geo: at(leaf, Math.cos(a) * 0.18, 0.28, -Math.sin(a) * 0.18), color: c });
  }
  return bake(parts);
};

const mossRock = (): THREE.BufferGeometry =>
  bake([
    {
      geo: new THREE.DodecahedronGeometry(0.4, 0).scale(1.3, 0.75, 1).translate(0, 0.22, 0),
      color: (c) => (c.y > 0.3 ? '#5f9a4a' : '#7d8a8f'),
    },
  ]);

const cactus = (h: number) => (): THREE.BufferGeometry =>
  bake([
    { geo: at(new THREE.CylinderGeometry(0.16, 0.18, h, 6), 0, h / 2, 0), color: '#4f9a52' },
    {
      geo: at(new THREE.CylinderGeometry(0.1, 0.1, h * 0.4, 5), 0.3, h * 0.55, 0),
      color: '#5aa85c',
    },
    {
      geo: at(new THREE.CylinderGeometry(0.1, 0.1, h * 0.3, 5), -0.28, h * 0.45, 0),
      color: '#5aa85c',
    },
    { geo: at(new THREE.SphereGeometry(0.07, 4, 3), 0, h + 0.02, 0), color: '#ff6fa8' },
  ]);

const mesa = (): THREE.BufferGeometry =>
  bake([
    {
      geo: new THREE.CylinderGeometry(1.6, 2.1, 2.2, 7).translate(0, 1.1, 0),
      color: (c) => (c.y > 1.6 ? '#e8a060' : c.y > 0.8 ? '#c8683a' : '#b05a32'),
    },
  ]);

const boulder = (c: string) => (): THREE.BufferGeometry =>
  bake([
    {
      geo: new THREE.IcosahedronGeometry(0.42, 0).scale(1.2, 0.8, 1).translate(0, 0.3, 0),
      color: c,
    },
  ]);

const tumbleweed = (): THREE.BufferGeometry =>
  bake([{ geo: at(new THREE.IcosahedronGeometry(0.3, 1), 0, 0.3, 0), color: '#b98a52' }]);

const lantern = (): THREE.BufferGeometry =>
  bake([
    { geo: at(new THREE.CylinderGeometry(0.04, 0.05, 1.2, 4), 0, 0.6, 0), color: '#3a3550' },
    { geo: at(new THREE.BoxGeometry(0.26, 0.3, 0.26), 0, 1.3, 0), color: '#ffe27a' },
    {
      geo: at(new THREE.ConeGeometry(0.22, 0.16, 4).rotateY(Math.PI / 4), 0, 1.53, 0),
      color: '#3a3550',
    },
  ]);

const glowBloom = (petal: string) => (): THREE.BufferGeometry => {
  const parts: Part[] = [
    { geo: at(new THREE.CylinderGeometry(0.03, 0.04, 0.6, 3), 0, 0.3, 0), color: '#2f6a5a' },
    { geo: at(new THREE.OctahedronGeometry(0.16), 0, 0.68, 0), color: petal },
  ];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    parts.push({
      geo: at(
        new THREE.SphereGeometry(0.1, 4, 3).scale(1, 0.5, 1),
        Math.sin(a) * 0.16,
        0.64,
        Math.cos(a) * 0.16,
      ),
      color: '#ffffff',
    });
  }
  return bake(parts);
};

const thornSpike = (): THREE.BufferGeometry =>
  bake([
    { geo: at(new THREE.ConeGeometry(0.22, 1.1, 5), 0, 0.55, 0), color: '#3a1f2a' },
    { geo: at(new THREE.ConeGeometry(0.12, 0.6, 4).rotateZ(0.6), 0.22, 0.4, 0), color: '#4a2533' },
  ]);

const waxPillar = (): THREE.BufferGeometry =>
  bake([
    {
      geo: at(new THREE.CylinderGeometry(0.38, 0.42, 1.8, 6), 0, 0.9, 0),
      color: (c) => (c.y > 1.5 ? '#ff8a3d' : '#8a4a1a'),
    },
    { geo: at(new THREE.CylinderGeometry(0.46, 0.46, 0.18, 6), 0, 1.86, 0), color: '#5a2e20' },
  ]);

const combChunk = (): THREE.BufferGeometry => {
  const parts: Part[] = [];
  for (let i = 0; i < 3; i++)
    parts.push({
      geo: at(
        new THREE.CylinderGeometry(0.26, 0.26, 0.5, 6),
        (i - 1) * 0.45,
        0.25 + (i % 2) * 0.15,
        0,
      ),
      color: i % 2 ? '#c96a1a' : '#e08a2a',
    });
  return bake(parts);
};

/** World environments in rotation order (world 1, 2, ...), then the boss fortress. */
export const ENVIRONMENTS: Record<string, BiomeKit> = {
  meadow: {
    ...BIOMES.clover,
    id: 'meadow',
    name: 'Clover Meadow',
    icon: '🌼',
    ambient: 'pollen',
    sun: { color: '#fff6e0', intensity: 1.6 },
  },
  orchard: {
    ...BIOMES.orchard,
    id: 'orchard',
    name: 'Sunset Orchard',
    icon: '🍑',
    sky: '#ffa678',
    fog: '#ff9e7a',
    light: ['#ffd2a8', '#7a3a6a'],
    sun: { color: '#ffb070', intensity: 1.5 },
    ambient: 'petals',
  },
  rainforest: {
    id: 'rainforest',
    name: 'Rainy Forest',
    icon: '🌧️',
    sky: '#7f95a6',
    fog: '#8a9caa',
    lane: '#4f8a4b',
    laneAlt: '#5a9655',
    soil: '#5b4a3a',
    rail: '#3e5a3a',
    light: ['#c8d6e0', '#2e3a2e'],
    sun: { color: '#cfe0ff', intensity: 0.8 },
    hemi: 1.4,
    fogRange: [30, 62],
    ambient: 'rain',
    props: {
      pineDark: pine('#2f5a3a', '#3a6a45'),
      pineLight: pine('#3f7a4a', '#4f8a55'),
      fern: fern('#4f9a4a'),
      mossRock,
      mushroom: mushroom('#a86a3a'),
      pebble: pebble('#8a9098'),
      fencePost: fencePost('#5a6a4a'),
      shrub: bush('#2f6a3a', '#7ad0ff'),
      hill: hill('#3a6a40', '#4f7f4a'),
    },
    scatter: ['fern', 'pebble', 'mossRock', 'fern', 'mushroom', 'pebble', 'fern', 'mossRock'],
    railPost: 'fencePost',
    backdrop: [
      { id: 'pineDark', perSide: 6, scale: 2.4 },
      { id: 'pineLight', perSide: 4, scale: 2.0 },
      { id: 'shrub', perSide: 3, scale: 1.5 },
      { id: 'hill', perSide: 3, scale: 1.6, offset: 6 },
    ],
  },
  canyon: {
    id: 'canyon',
    name: 'Desert Canyon',
    icon: '🏜️',
    sky: '#f7c47c',
    fog: '#f2b474',
    lane: '#e0b36a',
    laneAlt: '#d5a65d',
    soil: '#c0703f',
    rail: '#8a4a2a',
    light: ['#fff0d0', '#a0502a'],
    sun: { color: '#fff2d0', intensity: 1.9 },
    hemi: 1.5,
    fogRange: [42, 80],
    ambient: 'dust',
    props: {
      cactusTall: cactus(1.3),
      cactusShort: cactus(0.8),
      mesa,
      boulder: boulder('#c8784a'),
      pebble: pebble('#d8a878'),
      tumbleweed,
      fencePost: fencePost('#8a5a3a'),
      hill: hill('#c86a3a', '#e0905a'),
    },
    scatter: ['pebble', 'cactusShort', 'boulder', 'pebble', 'tumbleweed', 'cactusShort', 'pebble'],
    railPost: 'fencePost',
    backdrop: [
      { id: 'mesa', perSide: 4, scale: 1.4, offset: 4 },
      { id: 'cactusTall', perSide: 5, scale: 1.8 },
      { id: 'hill', perSide: 3, scale: 1.6, offset: 7 },
    ],
  },
  night: {
    id: 'night',
    name: 'Night Garden',
    icon: '🌙',
    sky: '#1d2448',
    fog: '#252c56',
    lane: '#2f5a4a',
    laneAlt: '#356352',
    soil: '#1c2238',
    rail: '#c9b8ff',
    light: ['#8fa0ff', '#141830'],
    sun: { color: '#9fb4ff', intensity: 0.7 },
    hemi: 1.2,
    fogRange: [36, 70],
    ambient: 'fireflies',
    props: {
      bloomCyan: glowBloom('#5ff2ff'),
      bloomPink: glowBloom('#ff7ad9'),
      lantern,
      mushroom: mushroom('#7a5cff'),
      pebble: pebble('#5a6090'),
      fencePost: fencePost('#c9b8ff'),
      hedge: bush('#1f4a3a', '#ffe27a'),
      moonFlower: flower('#e8e4ff', '#ffe27a'),
      hill: hill('#1f3a3a', '#2a4a48'),
    },
    scatter: ['bloomCyan', 'pebble', 'moonFlower', 'bloomPink', 'mushroom', 'pebble', 'bloomCyan'],
    railPost: 'lantern',
    backdrop: [
      { id: 'hedge', perSide: 6, scale: 1.7 },
      { id: 'hill', perSide: 4, scale: 1.5, offset: 6 },
    ],
  },
  fortress: {
    id: 'fortress',
    name: 'Wasp Nest Fortress',
    icon: '🏰',
    sky: '#4a2a3a',
    fog: '#5a2f38',
    lane: '#6b5a4a',
    laneAlt: '#75624f',
    soil: '#3a2228',
    rail: '#ff8a3d',
    light: ['#ffb080', '#301020'],
    sun: { color: '#ffa060', intensity: 1.3 },
    hemi: 1.3,
    fogRange: [34, 68],
    ambient: 'embers',
    props: {
      thornSpike,
      waxPillar,
      combChunk,
      darkRock: boulder('#3a2a30'),
      pebble: pebble('#5a4048'),
      fencePost: fencePost('#3a1f2a'),
      hill: hill('#3a2030', '#4a2a3a'),
    },
    scatter: ['thornSpike', 'pebble', 'combChunk', 'darkRock', 'thornSpike', 'pebble'],
    railPost: 'fencePost',
    backdrop: [
      { id: 'waxPillar', perSide: 6, scale: 1.6 },
      { id: 'thornSpike', perSide: 5, scale: 2.2 },
      { id: 'hill', perSide: 4, scale: 1.6, offset: 6 },
    ],
  },
};

/** World rotation: world 1 (levels 1-5) meadow, then orchard, rainforest, canyon, night, ... */
export const WORLD_ENVS = ['meadow', 'orchard', 'rainforest', 'canyon', 'night'] as const;
export const BOSS_ENV = 'fortress';

/** Environment of a world band (0-based), ignoring boss levels. */
export const worldEnv = (band: number): BiomeKit =>
  ENVIRONMENTS[WORLD_ENVS[((band % WORLD_ENVS.length) + WORLD_ENVS.length) % WORLD_ENVS.length]];

/**
 * Environment for 1-based campaign level `levelNo`: the world's kit, the fortress on boss
 * levels. `?biome=<id>` (an environment or an M3 kit id) overrides it for art / QA shots.
 */
export function environmentFor(levelNo: number, boss: boolean, search = ''): BiomeKit {
  const forced = new URLSearchParams(search).get('biome');
  if (forced && ENVIRONMENTS[forced]) return ENVIRONMENTS[forced];
  if (forced && BIOMES[forced]) return BIOMES[forced];
  if (boss) return ENVIRONMENTS[BOSS_ENV];
  return worldEnv(Math.floor((Math.max(1, levelNo) - 1) / 5));
}

/** Display name of the world `levelNo` belongs to (home chip, map, name card). */
export const worldName = (levelNo: number): string =>
  worldEnv(Math.floor((Math.max(1, levelNo) - 1) / 5)).name;

/** Scene kit for a campaign level (kept name from the 2026-10-15 band themes). */
export const biomeForLevel = (levelNo: number, boss: boolean, search = ''): BiomeKit =>
  environmentFor(levelNo, boss, search);
