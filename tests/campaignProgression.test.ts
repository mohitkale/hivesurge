import { describe, expect, it } from 'vitest';
import {
  AUTHORED,
  campaignIndexOf,
  campaignLevel,
  campaignNextIndex,
  generateLevel,
  levelStrength,
  worldBand,
} from '../src/levels/campaign';
import { LEVELS } from '../src/levels';
import { parseLevel } from '../src/levels/parse';
import { biomeForLevel, ENVIRONMENTS } from '../src/art/environments';
import { aimBot, idleBot, run } from './bots';

describe('feedback 2026-10-15: progressive campaign', () => {
  it('authored levels come first, then generated ones that pass the schema', () => {
    for (let i = 0; i < AUTHORED; i++) expect(campaignLevel(i)).toBe(LEVELS[i]);
    for (let n = AUTHORED + 1; n <= AUTHORED + 12; n++) {
      const L = generateLevel(n);
      expect(() => parseLevel(JSON.parse(JSON.stringify(L)))).not.toThrow();
      expect(L.id).toBe(`gen-${n}`);
      expect(campaignIndexOf(L.id)).toBe(n - 1);
    }
    expect(campaignIndexOf('clover-run')).toBe(2);
    expect(campaignIndexOf('nope')).toBe(-1);
  });

  it('is deterministic', () => {
    expect(generateLevel(9)).toEqual(generateLevel(9));
  });

  it('enemy strength rises with level and is capped', () => {
    expect(levelStrength(3)).toBe(1);
    expect(levelStrength(7)).toBeGreaterThan(1);
    expect(levelStrength(20)).toBeGreaterThan(levelStrength(7));
    expect(levelStrength(500)).toBeLessThanOrEqual(1.48);
    // Same template three levels later: bigger nest and more defenders.
    const a = generateLevel(6);
    const b = generateLevel(9);
    expect(b.nestHp).toBeGreaterThan(a.nestHp);
    const sum = (l: typeof a) => l.waves.reduce((n, w) => n + w.count, 0);
    expect(sum(b)).toBeGreaterThan(sum(a));
  });

  it('consecutive levels have visibly different gate layouts', () => {
    const sig = (n: number) =>
      JSON.stringify(campaignLevel(n - 1).gates.map((g) => [g.kind, g.value, g.x, g.y]));
    const sigs = new Set<string>();
    for (let n = 1; n <= AUTHORED + 9; n++) sigs.add(sig(n));
    expect(sigs.size).toBe(AUTHORED + 9);
    // Every generated level adds a thorn-wall obstacle.
    expect(generateLevel(6).gates.length).toBe(LEVELS[1].gates.length + 1);
  });

  it('generated levels: an aiming player wins, an idle player loses', () => {
    for (let n = AUTHORED + 1; n <= AUTHORED + 6; n++) {
      const L = generateLevel(n);
      expect(run(L, aimBot(L)).outcome, L.id).toBe('won');
      expect(run(L, idleBot).outcome, L.id).toBe('lost');
    }
  }, 120000);

  it('the map points at the first level without a star', () => {
    expect(campaignNextIndex({})).toBe(0);
    const stars: Record<string, number> = {};
    for (let i = 0; i < 7; i++) stars[campaignLevel(i).id] = 1;
    expect(campaignNextIndex(stars)).toBe(7);
  });
});

describe('feedback 2026-10-15: world band themes', () => {
  it('bands are 5 levels long and each band has its own palette', () => {
    expect(worldBand(1)).toBe(0);
    expect(worldBand(5)).toBe(0);
    expect(worldBand(6)).toBe(1);
    const skies = new Set<string>();
    for (const n of [1, 6, 11, 16]) skies.add(biomeForLevel(n, false).sky);
    expect(skies.size).toBe(4);
  });

  it('every level maps to an environment kit (round 4: procedural env kits)', () => {
    for (let n = 1; n <= 30; n++) {
      const k = biomeForLevel(n, n % 5 === 0);
      expect(ENVIRONMENTS[k.id], `${n}`).toBeDefined();
    }
  });
});
