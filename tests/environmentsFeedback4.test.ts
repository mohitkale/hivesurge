import { describe, expect, it } from 'vitest';
import { BIOME_BUDGET, layoutBiome } from '../src/art/biomes';
import {
  BOSS_ENV,
  ENVIRONMENTS,
  WORLD_ENVS,
  biomeForLevel,
  environmentFor,
  worldName,
} from '../src/art/environments';
import { triangles } from '../src/art/models';
import { Ambient, AMBIENT_LOOKS, ambientCount } from '../src/render/ambient';
import { TIER_SETTINGS } from '../src/render/quality';
import { LEVELS } from '../src/levels';
import { campaignLevel, levelBand } from '../src/levels/campaign';

/** Feedback round 4 #5: environments rotate by world, the fortress on boss levels. */
const kits = Object.values(ENVIRONMENTS);

describe('environment themes (feedback round 4 #5)', () => {
  it('ships 5 world environments + a boss fortress, each with its own look', () => {
    expect(WORLD_ENVS.length).toBeGreaterThanOrEqual(5);
    expect(ENVIRONMENTS[BOSS_ENV]).toBeDefined();
    for (const key of ['sky', 'fog', 'lane', 'soil'] as const)
      expect(new Set(kits.map((k) => k[key])).size, key).toBe(kits.length);
    expect(new Set(kits.map((k) => k.ambient)).size).toBe(kits.length);
    expect(new Set(kits.map((k) => k.name)).size).toBe(kits.length);
    for (const k of kits) {
      expect(k.icon, k.id).toBeTruthy();
      expect(k.sun, k.id).toBeDefined();
      for (const id of [...k.scatter, k.railPost, ...k.backdrop.map((b) => b.id)])
        expect(k.props[id], `${k.id}.${id}`).toBeTypeOf('function');
    }
  });

  it('worlds of 5 levels rotate the environments; boss levels use the fortress', () => {
    const seen: string[] = [];
    for (let n = 1; n <= 50; n++) {
      const boss = levelBand(n) === 'Boss';
      const k = biomeForLevel(n, boss);
      if (boss) expect(k.id, `L${n}`).toBe(BOSS_ENV);
      else expect(k.id, `L${n}`).toBe(WORLD_ENVS[Math.floor((n - 1) / 5) % WORLD_ENVS.length]);
      if (!boss && seen.at(-1) !== k.id) seen.push(k.id);
    }
    // Every world environment shows up within the first 25 levels, and consecutive worlds differ.
    expect(new Set(seen.slice(0, 5)).size).toBe(5);
    expect(worldName(1)).toBe('Clover Meadow');
    expect(worldName(6)).toBe('Sunset Orchard');
    expect(worldName(11)).toBe('Rainy Forest');
    expect(worldName(16)).toBe('Desert Canyon');
    expect(worldName(21)).toBe('Night Garden');
    expect(environmentFor(5, true).name).toBe('Wasp Nest Fortress');
  });

  it('?biome= overrides with an environment or an M3 kit id', () => {
    expect(environmentFor(1, false, '?biome=night').id).toBe('night');
    expect(environmentFor(1, false, '?biome=clover').id).toBe('clover');
    expect(environmentFor(12, false, '?biome=nope').id).toBe('rainforest');
  });

  for (const k of kits) {
    it(`${k.id}: props and scene stay inside the M3 environment budget`, () => {
      const ids = Object.keys(k.props);
      expect(ids.length).toBeLessThanOrEqual(BIOME_BUDGET.maxProps);
      const tris: Record<string, number> = {};
      for (const id of ids) {
        tris[id] = triangles(k.props[id]());
        expect(tris[id], `${k.id}.${id}`).toBeLessThanOrEqual(BIOME_BUDGET.maxPropTris);
      }
      const lanes = [...LEVELS, campaignLevel(29), campaignLevel(54)];
      for (const L of lanes) {
        const layout = layoutBiome(k, L.laneWidth, L.laneLength);
        const total = layout.reduce((s, p) => s + tris[p.id], 0);
        expect(total, `${k.id} on ${L.id}`).toBeLessThanOrEqual(BIOME_BUDGET.maxSceneTris);
        expect(new Set(layout.map((p) => p.id)).size).toBeLessThanOrEqual(
          BIOME_BUDGET.maxPropDrawCalls,
        );
        for (const p of layout)
          expect(Math.abs(p.x), `${k.id}.${p.id}`).toBeGreaterThanOrEqual(L.laneWidth / 2);
      }
    });
  }
});

describe('ambient particles', () => {
  it('scale with the quality tier and stay cheap', () => {
    expect(ambientCount(TIER_SETTINGS.high.particles)).toBe(160);
    expect(ambientCount(TIER_SETTINGS.med.particles)).toBe(60);
    expect(ambientCount(TIER_SETTINGS.low.particles)).toBe(24);
  });

  for (const kind of Object.keys(AMBIENT_LOOKS) as (keyof typeof AMBIENT_LOOKS)[])
    it(`${kind}: one draw object, particles stay inside their box over 20 s`, () => {
      const a = new Ambient(kind, 8, 40, 6);
      a.setCount(60);
      for (let i = 0; i < 600; i++) a.update(1 / 30);
      const pos = a.object.geometry.getAttribute('position');
      const n = a.liveCount * (kind === 'rain' ? 2 : 1);
      for (let i = 0; i < n; i++) {
        expect(Math.abs(pos.getX(i))).toBeLessThanOrEqual(9.5);
        expect(pos.getY(i)).toBeGreaterThanOrEqual(-0.5);
        expect(pos.getY(i)).toBeLessThanOrEqual(7);
        expect(pos.getZ(i)).toBeLessThanOrEqual(4.01);
        expect(pos.getZ(i)).toBeGreaterThanOrEqual(-52);
      }
      expect(a.object.geometry.drawRange.count).toBe(n);
      a.setCount(0);
      expect(a.object.visible).toBe(false);
      a.dispose();
    });
});
