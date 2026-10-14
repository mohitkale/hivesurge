import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bake, beeCrowdGeometry, beeGeometry, crowdFarGeometry, type Part } from './models';
import { ART } from './palette';

/**
 * Bee variant / seasonal skins (M7-5). Skins may change the body tint and add
 * ONE accessory, but must keep the bee readability contract: light warm body,
 * dark stripes, round silhouette. Validated in tests/art.test.ts.
 */
export interface BeeSkin {
  id: string;
  name: string;
  season: 'core' | 'spring' | 'summer' | 'autumn' | 'winter' | 'event';
  body: string;
  stripe: string;
  accessory?: () => Part[];
}

const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);

export const SKINS: BeeSkin[] = [
  {
    id: 'classic',
    name: 'Classic Worker',
    season: 'core',
    body: ART.beeBody,
    stripe: ART.beeStripe,
  },
  {
    // Starter Pack skin (QA M2-19a; final art, PR 069 + QA round 2). It has to read as "not
    // Classic" at battle scale, lit and unlit (?quality=low), while staying a bee (light + warm,
    // never wasp-dark). Changes from Classic:
    // - a deeper amber-gold body (#f5a00f vs #ffcf3a, clearly darker and more orange);
    // - deep teal stripes instead of brown;
    // - a large bright teal "starter star" across the back, which the top-down camera sees, with a
    //   cream sheen, plus a honey-drop badge on the head.
    id: 'starter',
    name: 'Starter Gold',
    season: 'core',
    body: '#f5a00f',
    stripe: '#0a423e',
    accessory: () => [
      {
        geo: at(new THREE.OctahedronGeometry(0.3, 0).scale(1.25, 0.28, 1), 0, 0.44, -0.16),
        color: '#3fe0cf',
      },
      {
        geo: at(new THREE.OctahedronGeometry(0.11, 0).scale(1, 0.4, 1), 0, 0.53, -0.16),
        color: '#fff6d6',
      },
      { geo: at(new THREE.OctahedronGeometry(0.08, 0), 0, 0.4, 0.5), color: '#3fe0cf' },
    ],
  },
  {
    id: 'blossom',
    name: 'Blossom Crown',
    season: 'spring',
    body: '#ffd65c',
    stripe: '#5a2a3a',
    accessory: () =>
      [0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return {
          geo: at(
            new THREE.OctahedronGeometry(0.08),
            Math.sin(a) * 0.2,
            0.36,
            0.55 + Math.cos(a) * 0.2,
          ),
          color: i % 2 ? '#ff8fc0' : '#ffffff',
        };
      }),
  },
  {
    id: 'sunny',
    name: 'Sunny Shades',
    season: 'summer',
    body: '#ffe14d',
    stripe: '#2a1a0c',
    accessory: () => [
      { geo: at(new THREE.BoxGeometry(0.46, 0.08, 0.06), 0, 0.14, 0.82), color: '#1a1a2e' },
    ],
  },
  {
    id: 'maple',
    name: 'Maple Leaf',
    season: 'autumn',
    body: '#ffc23a',
    stripe: '#6a2a10',
    accessory: () => [
      {
        geo: at(new THREE.ConeGeometry(0.16, 0.08, 5).rotateZ(0.3), 0.05, 0.4, 0.5),
        color: '#e2552a',
      },
    ],
  },
  {
    id: 'frost',
    name: 'Frost Scarf',
    season: 'winter',
    body: '#fff0a0',
    stripe: '#2c3a5a',
    accessory: () => [
      {
        geo: at(new THREE.TorusGeometry(0.3, 0.07, 3, 8).rotateX(Math.PI / 2), 0, 0, 0.36),
        color: '#e2304a',
      },
    ],
  },
  {
    id: 'lantern',
    name: 'Lantern Festival',
    season: 'event',
    body: '#ffb84a',
    stripe: '#7a1f1f',
    accessory: () => [
      { geo: at(new THREE.OctahedronGeometry(0.1), 0, 0.5, 0.2), color: '#ff5a3a' },
    ],
  },
];

/** Default skin id (no skin equipped). */
export const DEFAULT_SKIN = 'classic';

export function skinById(id: string): BeeSkin | undefined {
  return SKINS.find((s) => s.id === id);
}

export function skinGeometry(skin: BeeSkin, scale = 1): THREE.BufferGeometry {
  const base = beeGeometry(1, skin.body, skin.stripe);
  if (!skin.accessory) return base.scale(scale, scale, scale);
  const g = mergeGeometries([base, bake(skin.accessory())])!;
  g.scale(scale, scale, scale);
  g.computeBoundingSphere();
  return g;
}

/**
 * Crowd-LOD variants of a skin (fix/crowd-lod-hysteresis): the 148-tri mid bee and the 20-tri
 * far stand-in in the skin's colours. The mid bee keeps the accessory so a skin still reads in
 * the middle of the lane; the far stand-in is colour only.
 */
export function skinCrowdGeometry(skin: BeeSkin, scale = 1): THREE.BufferGeometry {
  const base = beeCrowdGeometry(1, skin.body, skin.stripe);
  const g = skin.accessory ? mergeGeometries([base, bake(skin.accessory())])! : base;
  g.scale(scale, scale, scale);
  g.computeBoundingSphere();
  return g;
}

export function skinFarGeometry(skin: BeeSkin, scale = 1): THREE.BufferGeometry {
  return crowdFarGeometry(scale, skin.body, skin.stripe);
}
