import { readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BIOME_BUDGET, BIOMES, biomeFor, layoutBiome, LEVEL_BIOME } from '../src/art/biomes';
import { triangles } from '../src/art/models';
import { LEVELS } from '../src/levels';

const kits = Object.values(BIOMES);

describe('biome environment kits (PLAN M3-3)', () => {
  it('ships at least 2 complete kits', () => {
    expect(kits.length).toBeGreaterThanOrEqual(2);
    for (const k of kits) {
      for (const id of [...k.scatter, k.railPost, ...k.backdrop.map((b) => b.id)])
        expect(k.props[id], `${k.id}.${id}`).toBeTypeOf('function');
      expect(k.backdrop.length, k.id).toBeGreaterThan(0);
    }
  });

  for (const k of kits) {
    it(`${k.id}: every prop <= ${BIOME_BUDGET.maxPropTris} tris, <= ${BIOME_BUDGET.maxProps} props`, () => {
      const ids = Object.keys(k.props);
      expect(ids.length).toBeLessThanOrEqual(BIOME_BUDGET.maxProps);
      for (const id of ids)
        expect(triangles(k.props[id]()), `${k.id}.${id}`).toBeLessThanOrEqual(
          BIOME_BUDGET.maxPropTris,
        );
    });

    it(`${k.id}: scene environment <= ${BIOME_BUDGET.maxSceneTris} tris and <= ${BIOME_BUDGET.maxPropDrawCalls} draw calls on every level`, () => {
      const tris: Record<string, number> = {};
      for (const L of LEVELS) {
        const layout = layoutBiome(k, L.laneWidth, L.laneLength);
        let total = 0;
        for (const p of layout) total += tris[p.id] ??= triangles(k.props[p.id]());
        expect(total, `${k.id} on ${L.id}`).toBeLessThanOrEqual(BIOME_BUDGET.maxSceneTris);
        expect(new Set(layout.map((p) => p.id)).size).toBeLessThanOrEqual(
          BIOME_BUDGET.maxPropDrawCalls,
        );
        // Nothing may intrude on the playable lane.
        for (const p of layout)
          expect(Math.abs(p.x), `${k.id}.${p.id}`).toBeGreaterThanOrEqual(L.laneWidth / 2);
      }
    });
  }

  it('each kit exports a GLB per prop, <= 100 KB per kit (M3 model budget 1.5 MB total)', () => {
    const files = readdirSync('art/models');
    for (const k of kits) {
      let bytes = 0;
      for (const id of Object.keys(k.props)) {
        const f = `biome-${k.id}-${id}.glb`;
        expect(files, f).toContain(f);
        bytes += statSync(`art/models/${f}`).size;
      }
      expect(bytes, k.id).toBeLessThanOrEqual(100 * 1024);
    }
  });

  it('every campaign level maps to a kit, both kits are used, and ?biome= overrides', () => {
    for (const L of LEVELS) expect(BIOMES[LEVEL_BIOME[L.id]], L.id).toBeDefined();
    expect(new Set(LEVELS.map((L) => LEVEL_BIOME[L.id])).size).toBeGreaterThanOrEqual(2);
    expect(biomeFor('clover-run', '?biome=orchard').id).toBe('orchard');
    expect(biomeFor('clover-run', '?biome=nope').id).toBe('clover');
    expect(biomeFor('unknown-level').id).toBe('clover');
  });
});
