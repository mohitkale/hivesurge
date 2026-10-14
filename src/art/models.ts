import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ART } from './palette';

/**
 * Low-poly, vertex-coloured, flat-shaded models built from primitives.
 * Pure geometry (no DOM), so the same code renders in-game and is exported to
 * GLB by art/tools/export-assets.ts. Front of every unit is +Z, up is +Y.
 * Attribute `aWing`: 0 = body, -1/+1 = left/right wing (flapped in shader).
 */
export type ColorFn = (c: THREE.Vector3) => string;

export interface Part {
  geo: THREE.BufferGeometry;
  color: string | ColorFn;
  wing?: number;
}

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const col = new THREE.Color();

export function bake(parts: Part[], scale = 1): THREE.BufferGeometry {
  const out: THREE.BufferGeometry[] = [];
  for (const p of parts) {
    const g = (p.geo.index ? p.geo.toNonIndexed() : p.geo).clone();
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    const pos = g.getAttribute('position');
    const n = pos.count;
    const colors = new Float32Array(n * 3);
    const wing = new Float32Array(n).fill(p.wing ?? 0);
    for (let t = 0; t < n; t += 3) {
      tmpA.fromBufferAttribute(pos, t);
      tmpB.fromBufferAttribute(pos, t + 1);
      tmpC.fromBufferAttribute(pos, t + 2);
      const centroid = tmpA
        .add(tmpB)
        .add(tmpC)
        .multiplyScalar(1 / 3);
      col.set(typeof p.color === 'string' ? p.color : p.color(centroid));
      // Stored linear so GLB + three agree (glTF COLOR_0 is linear).
      for (let k = 0; k < 3; k++) colors.set([col.r, col.g, col.b], (t + k) * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('aWing', new THREE.BufferAttribute(wing, 1));
    out.push(g);
  }
  const merged = mergeGeometries(out)!;
  merged.scale(scale, scale, scale);
  if (!compactBakes) {
    merged.computeVertexNormals(); // non-indexed => faceted normals
    merged.computeBoundingSphere();
    return merged;
  }
  return gpuCompact(merged);
}

let compactBakes = true;
/**
 * art/tools/export-assets.ts turns compaction off so GLBs are exported from the exact same
 * non-indexed, normal-carrying geometry as before (byte-identical rebuilds, M3-1c).
 */
export function setBakeCompaction(on: boolean): void {
  compactBakes = on;
}

/**
 * PERF-AUDIT #1: share identical vertices (same position + colour + wing tag) through an index
 * and drop the normal attribute. Every material that draws these models is `flatShading: true`,
 * which derives face normals in the fragment shader, so the picture is unchanged while the GPU
 * runs the (wing-flap) vertex shader ~2-3x fewer times per unit. Triangles stay the same.
 */
export function gpuCompact(g: THREE.BufferGeometry): THREE.BufferGeometry {
  if (g.getAttribute('normal')) g.deleteAttribute('normal');
  // Tiny tolerance: only exact duplicates merge, so no vertex moves.
  const out = mergeVertices(g, 1e-9);
  out.computeBoundingSphere();
  return out;
}

const sphere = (r: number, w: number, h: number) => new THREE.SphereGeometry(r, w, h);
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);

/** Stripes along the body (Z) axis. */
/** Stripes along the body (Z) axis; `dark` = share of each period that is stripe. */
const stripes =
  (
    base: string,
    stripe: string,
    period: number,
    offset = 0,
    from = -99,
    to = 99,
    dark = 0.38,
  ): ColorFn =>
  (c) => {
    if (c.z <= from || c.z >= to) return base;
    const f = ((((c.z + offset) / period) % 1) + 1) % 1;
    return f < dark ? stripe : base;
  };

function wingPair(
  len: number,
  wid: number,
  y: number,
  sweep: number,
  color: string,
  pointy: boolean,
): Part[] {
  return [-1, 1].map((side) => {
    const g = sphere(1, 6, 3);
    g.scale(len / 2, 0.08, wid);
    if (pointy) g.rotateY(side * -0.1);
    g.rotateY(side * sweep);
    at(g, (side * len) / 2, y, -0.05);
    return { geo: g, color, wing: side };
  });
}

/** Worker bee: round, fuzzy, bright. ~1 unit long before scale. */
export function beeGeometry(
  scale = 1,
  body: string = ART.beeBody,
  stripe: string = ART.beeStripe,
): THREE.BufferGeometry {
  const abdomen = sphere(0.5, 8, 6);
  abdomen.scale(1, 0.92, 1.2);
  at(abdomen, 0, 0, -0.12);
  const head = at(sphere(0.3, 6, 4), 0, 0.06, 0.55);
  const parts: Part[] = [
    { geo: abdomen, color: stripes(body, stripe, 0.3, 0.1, -0.62, 0.3, 0.34) },
    { geo: head, color: ART.beeHead },
    ...wingPair(0.8, 0.32, 0.42, -0.35, ART.beeWing, false),
  ];
  for (const side of [-1, 1]) {
    const ant = new THREE.CylinderGeometry(0.03, 0.03, 0.34, 3);
    ant.rotateX(-0.5);
    ant.rotateZ(side * 0.4);
    parts.push({ geo: at(ant, side * 0.1, 0.36, 0.7), color: ART.beeStripe });
    parts.push({
      geo: at(new THREE.OctahedronGeometry(0.07), side * 0.17, 0.5, 0.8),
      color: ART.beeTeam,
    });
    // Cheek fuzz: light dabs keep the face friendly from above.
    parts.push({
      geo: at(new THREE.OctahedronGeometry(0.1), side * 0.2, 0.05, 0.72),
      color: ART.beeFuzz,
    });
  }
  return bake(parts, scale);
}

/**
 * PROPOSED (needs DES sign-off): crowd LOD for the worker bee, <=150 tris. Same silhouette and
 * palette as `beeGeometry` (striped amber abdomen, dark head, pale wings, team-teal antenna tips)
 * with fewer segments, single-segment antenna stalks and no cheek dabs, so it still reads as a bee at 16-24 px. Eng
 * owns the switch (when to use it); nothing references it yet.
 */
export function beeCrowdGeometry(scale = 1): THREE.BufferGeometry {
  const abdomen = sphere(0.5, 6, 5);
  abdomen.scale(1, 0.92, 1.2);
  at(abdomen, 0, 0, -0.12);
  const parts: Part[] = [
    { geo: abdomen, color: stripes(ART.beeBody, ART.beeStripe, 0.3, 0.1, -0.62, 0.3, 0.34) },
    { geo: at(sphere(0.3, 5, 3), 0, 0.06, 0.55), color: ART.beeHead },
    ...wingPair(0.8, 0.32, 0.42, -0.35, ART.beeWing, false),
  ];
  for (const side of [-1, 1]) {
    // One stalk per side (same placement as the full bee) so the teal tips sit on the head.
    const ant = new THREE.CylinderGeometry(0.03, 0.03, 0.34, 3);
    ant.rotateX(-0.5);
    ant.rotateZ(side * -0.4); // splay outwards so the tips sit wide, like the full bee
    parts.push({ geo: at(ant, side * 0.1, 0.36, 0.7), color: ART.beeStripe });
    // Tip exactly on the stalk's upper end (same rotations as the stalk).
    const top = new THREE.Vector3(0, 0.17, 0)
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.5)
      .applyAxisAngle(new THREE.Vector3(0, 0, 1), side * -0.4)
      .add(new THREE.Vector3(side * 0.1, 0.36, 0.7));
    parts.push({
      geo: at(new THREE.TetrahedronGeometry(0.08), top.x, top.y, top.z),
      color: ART.beeTeam,
    });
  }
  return bake(parts, scale);
}

/** Queen: bigger bee, gold crown with teal gems, cape of warm amber. */
export function queenGeometry(scale = 1): THREE.BufferGeometry {
  const base = beeGeometry(1, ART.queenBody, ART.queenStripe);
  const ring = new THREE.CylinderGeometry(0.2, 0.24, 0.12, 6, 1, true);
  at(ring, 0, 0.36, 0.52);
  const parts: Part[] = [{ geo: ring, color: ART.crown }];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spike = new THREE.ConeGeometry(0.06, 0.2, 3);
    parts.push({
      geo: at(spike, Math.sin(a) * 0.2, 0.5, 0.52 + Math.cos(a) * 0.2),
      color: ART.crown,
    });
  }
  parts.push({ geo: at(new THREE.OctahedronGeometry(0.07), 0, 0.4, 0.75), color: ART.crownGem });
  const crown = bake(parts);
  const g = mergeGeometries([base, crown])!;
  g.scale(scale, scale, scale);
  g.computeBoundingSphere();
  return g;
}

/** Wasp: dark, segmented, pinched waist, pointed abdomen, swept narrow wings. */
export function waspGeometry(
  scale = 1,
  body: string = ART.waspBody,
  band: string = ART.waspBand,
  head: string = ART.waspHead,
  horns = false,
): THREE.BufferGeometry {
  const abdomen = new THREE.ConeGeometry(0.3, 0.85, 6, 2);
  abdomen.rotateX(-Math.PI / 2); // tip points backwards (-Z)
  at(abdomen, 0, 0, -0.42);
  const thorax = new THREE.OctahedronGeometry(0.24);
  thorax.scale(1, 0.85, 1.1);
  at(thorax, 0, 0.03, 0.12);
  const waist = at(
    new THREE.CylinderGeometry(0.06, 0.06, 0.2, 4).rotateX(Math.PI / 2),
    0,
    0,
    -0.05,
  );
  const headG = new THREE.OctahedronGeometry(0.21);
  headG.scale(1.15, 0.85, 1);
  at(headG, 0, 0.06, 0.45);
  const sting = at(new THREE.ConeGeometry(0.05, 0.22, 3).rotateX(-Math.PI / 2), 0, 0, -0.95);
  const parts: Part[] = [
    { geo: abdomen, color: stripes(body, band, 0.2, 0.0, -0.8, -0.15) },
    { geo: thorax, color: body },
    { geo: waist, color: body },
    { geo: headG, color: head },
    { geo: sting, color: ART.stinger },
    ...wingPair(0.8, 0.13, 0.3, 0.6, ART.waspWing, true),
  ];
  for (const side of [-1, 1]) {
    // Angry slanted eye + brow: reads as "enemy" even from the top-down camera.
    const eye = new THREE.TetrahedronGeometry(0.09);
    eye.rotateZ(side * 0.6);
    parts.push({ geo: at(eye, side * 0.13, 0.14, 0.58), color: ART.waspEye });
    const mand = at(
      new THREE.ConeGeometry(0.04, 0.16, 3).rotateX(Math.PI / 2),
      side * 0.08,
      -0.02,
      0.66,
    );
    parts.push({ geo: mand, color: ART.stinger });
    if (horns) {
      const h = new THREE.ConeGeometry(0.05, 0.26, 3);
      h.rotateZ(-side * 0.5);
      parts.push({ geo: at(h, side * 0.14, 0.3, 0.42), color: band });
    }
  }
  return bake(parts, scale);
}

export function hornetGeometry(scale = 1): THREE.BufferGeometry {
  return waspGeometry(scale, ART.hornetBody, ART.hornetBand, ART.hornetHead, true);
}

/** Honey cannon: teal hex turret + honeycomb barrel. Barrel points to -Z. */
export function cannonGeometry(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({
    geo: at(new THREE.CylinderGeometry(0.8, 0.95, 0.45, 6), 0, 0.22, 0),
    color: ART.tealDeep,
  });
  parts.push({
    geo: at(new THREE.CylinderGeometry(0.66, 0.78, 0.12, 6), 0, 0.5, 0),
    color: ART.honey,
  });
  const dome = sphere(0.6, 8, 5);
  dome.scale(1, 0.85, 1);
  parts.push({ geo: at(dome, 0, 0.82, 0), color: (c) => (c.y > 1.15 ? ART.beeFuzz : ART.teal) });
  const barrel = new THREE.CylinderGeometry(0.3, 0.38, 1.2, 6);
  barrel.rotateX(-Math.PI / 2.6);
  at(barrel, 0, 1.05, -0.5);
  parts.push({ geo: barrel, color: ART.honey });
  const muzzle = new THREE.TorusGeometry(0.3, 0.08, 4, 6);
  muzzle.rotateX(-Math.PI / 2.6 + Math.PI / 2);
  at(muzzle, 0, 1.3, -1.05);
  parts.push({ geo: muzzle, color: ART.beeStripe });
  for (const side of [-1, 1]) {
    const w = new THREE.CylinderGeometry(0.32, 0.32, 0.16, 8).rotateZ(Math.PI / 2);
    parts.push({ geo: at(w, side * 0.9, 0.3, 0.1), color: ART.wood });
    parts.push({
      geo: at(new THREE.OctahedronGeometry(0.12), side * 0.99, 0.3, 0.1),
      color: ART.honeyDeep,
    });
  }
  return bake(parts);
}

/** Wasp nest: papery layered shell, dark entry, orange warning bands. Faces +Z. */
export function nestGeometry(laneWidth: number): THREE.BufferGeometry {
  const parts: Part[] = [];
  const tiers = 6;
  for (let i = 0; i < tiers; i++) {
    const r = 2.7 - Math.abs(i - 2) * 0.42;
    const ring = new THREE.CylinderGeometry(r * 0.86, r, 0.78, 9);
    ring.rotateY(i * 0.35);
    parts.push({
      geo: at(ring, 0, 0.4 + i * 0.72, 0),
      color: i === 2 || i === 4 ? ART.waspBand : i % 2 ? ART.paperLight : ART.paper,
    });
  }
  parts.push({
    geo: at(new THREE.ConeGeometry(1.4, 1.4, 9), 0, 0.4 + tiers * 0.72 + 0.2, 0),
    color: ART.paperDark,
  });
  const entry = new THREE.CircleGeometry(0.75, 8);
  parts.push({ geo: at(entry, 0, 1.6, 2.42), color: ART.nestEntry });
  const lip = new THREE.TorusGeometry(0.8, 0.14, 4, 8);
  parts.push({ geo: at(lip, 0, 1.6, 2.38), color: ART.paperDark });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const spike = new THREE.ConeGeometry(0.14, 0.6, 4);
    spike.rotateX(Math.PI / 2);
    spike.rotateY(a);
    parts.push({
      geo: at(spike, Math.sin(a) * 2.5, 2.2 + (i % 2) * 0.9, Math.cos(a) * 2.5),
      color: ART.stinger,
    });
  }
  const wall = new THREE.BoxGeometry(laneWidth, 0.8, 0.6);
  parts.push({
    geo: at(wall, 0, 0.4, 0.6),
    color: (c) => (Math.floor(c.x * 0.8) % 2 ? ART.paperDark : ART.waspBand),
  });
  return bake(parts);
}

export const triangles = (g: THREE.BufferGeometry): number =>
  (g.index ? g.index.count : g.getAttribute('position').count) / 3;
