import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BIOMES } from '../src/art/biomes';
import {
  beeGeometry,
  hornetGeometry,
  queenGeometry,
  triangles,
  waspGeometry,
} from '../src/art/models';
import { ART } from '../src/art/palette';
import { SKINS, skinGeometry } from '../src/art/skins';
import { CUES } from '../src/audio/sfx';

const dirBytes = (d: string, ext: string) =>
  readdirSync(d)
    .filter((f) => f.endsWith(ext))
    .reduce((n, f) => n + statSync(join(d, f)).size, 0);
const lum = (hex: string) => {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; // linear relative luminance
};

describe('art budgets (PLAN M3-2 / M3-3 / M3-4 / M7-5)', () => {
  it('every unit and bee skin is <= 300 triangles', () => {
    const units = [beeGeometry(), queenGeometry(), waspGeometry(), hornetGeometry()];
    for (const g of [...units, ...SKINS.map((s) => skinGeometry(s))])
      expect(triangles(g)).toBeLessThanOrEqual(300);
  });
  it('model assets total <= 1.5 MB', () => {
    expect(dirBytes('public/assets/models', '.glb')).toBeLessThanOrEqual(1.5 * 1024 * 1024);
  });
  it('audio total <= 1 MB and every cue has an Opus file', () => {
    expect(dirBytes('public/assets/audio', '.ogg')).toBeLessThanOrEqual(1024 * 1024);
    for (const c of CUES) expect(existsSync(`public/assets/audio/${c}.ogg`)).toBe(true);
  });
  it('>= 2 biome kits and >= 30 SVG icons', () => {
    expect(Object.keys(BIOMES).length).toBeGreaterThanOrEqual(2);
    expect(
      readdirSync('public/assets/icons').filter((f) => f.endsWith('.svg')).length,
    ).toBeGreaterThanOrEqual(30);
  });
});

describe('readability contract (art/ART_DIRECTION.md)', () => {
  it('bee bodies are much lighter than wasp bodies (value contrast)', () => {
    expect(lum(ART.beeBody) / lum(ART.waspBody)).toBeGreaterThan(10);
    expect(lum(ART.queenBody) / lum(ART.hornetBody)).toBeGreaterThan(10);
  });
  it('every bee skin keeps a light body and dark stripes', () => {
    for (const s of SKINS) {
      expect(lum(s.body), s.id).toBeGreaterThan(0.35);
      expect(lum(s.stripe), s.id).toBeLessThan(0.06);
    }
  });
});
