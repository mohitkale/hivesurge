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
  props: Record<string, () => THREE.BufferGeometry>;
  /** Prop ids scattered along the lane edges, in order. */
  scatter: string[];
}

const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);

function flower(petal: string, centre = '#ffd23f'): () => THREE.BufferGeometry {
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

const mushroom = (cap: string) => (): THREE.BufferGeometry =>
  bake([
    { geo: at(new THREE.CylinderGeometry(0.1, 0.13, 0.3, 6), 0, 0.15, 0), color: '#fff1dc' },
    {
      geo: at(new THREE.SphereGeometry(0.28, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.28, 0),
      color: (c) => (Math.abs(c.x) < 0.08 && Math.abs(c.z) > 0.12 ? '#ffffff' : cap),
    },
  ]);

const pebble = (c: string) => (): THREE.BufferGeometry =>
  bake([
    {
      geo: new THREE.DodecahedronGeometry(0.22).scale(1.3, 0.6, 1).translate(0, 0.08, 0),
      color: c,
    },
  ]);

const fencePost = (c: string) => (): THREE.BufferGeometry =>
  bake([
    { geo: at(new THREE.BoxGeometry(0.22, 0.8, 0.22), 0, 0.4, 0), color: c },
    { geo: at(new THREE.ConeGeometry(0.16, 0.2, 4).rotateY(Math.PI / 4), 0, 0.9, 0), color: c },
  ]);

const tree = (leaf: string, fruit: string) => (): THREE.BufferGeometry => {
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
    laneAlt: '#6db35c',
    soil: '#e9a86b',
    rail: '#fff3d6',
    props: {
      flowerPink: flower('#ff6fa8'),
      flowerWhite: flower('#ffffff'),
      flowerLilac: flower('#b78cff'),
      clover: clover,
      mushroom: mushroom('#e2557a'),
      pebble: pebble('#cdbfa8'),
      fencePost: fencePost('#fff3d6'),
    },
    scatter: ['flowerPink', 'clover', 'flowerWhite', 'pebble', 'flowerLilac', 'mushroom', 'clover'],
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
    props: {
      appleTree: tree('#5f9e3c', '#e04a3a'),
      pearTree: tree('#79aa3f', '#ffd23f'),
      crate: crate,
      flowerOrange: flower('#ff8a3d', '#fff1b8'),
      mushroom: mushroom('#ff8a3d'),
      pebble: pebble('#b89a7a'),
      fencePost: fencePost('#8a5530'),
    },
    scatter: [
      'flowerOrange',
      'pebble',
      'appleTree',
      'crate',
      'flowerOrange',
      'pearTree',
      'mushroom',
    ],
  },
};
