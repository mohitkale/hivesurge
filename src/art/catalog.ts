import type * as THREE from 'three';
import { BIOMES } from './biomes';
import { RUNTIME_MODELS } from './glbLoader';
import {
  beeGeometry,
  cannonGeometry,
  hornetGeometry,
  nestGeometry,
  queenGeometry,
  waspGeometry,
} from './models';
import { SKINS, skinGeometry } from './skins';

/**
 * Every exported GLB and the procedural source that produces it (M3-1c). Used by
 * art/tools/export-assets.ts and by the re-export test (tests/glbReexport.test.ts).
 */
export function modelCatalog(): Record<string, () => THREE.BufferGeometry> {
  const m: Record<string, () => THREE.BufferGeometry> = {
    'unit-bee': () => beeGeometry(),
    'unit-queen': () => queenGeometry(),
    'unit-wasp': () => waspGeometry(),
    'unit-hornet': () => hornetGeometry(),
    'prop-cannon': () => cannonGeometry(),
    'prop-nest': () => nestGeometry(9),
  };
  for (const s of SKINS) m[`skin-bee-${s.id}`] = () => skinGeometry(s);
  for (const b of Object.values(BIOMES))
    for (const [id, f] of Object.entries(b.props)) m[`biome-${b.id}-${id}`] = f;
  return m;
}

/** Where each GLB lives: runtime models ship from public/, the rest stay in art/models. */
export const glbPath = (name: string): string =>
  (RUNTIME_MODELS as readonly string[]).includes(name)
    ? `public/assets/models/${name}.glb`
    : `art/models/${name}.glb`;

/** Exact gltfpack used for the committed GLBs (npm package `gltfpack`). */
export const GLTFPACK_VERSION = '1.3.0';
