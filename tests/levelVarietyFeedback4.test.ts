import { describe, expect, it } from 'vitest';
import {
  AUTHORED,
  campaignLevel,
  generateLevel,
  levelBand,
  levelStrength,
  levelTuning,
  openingForLevel,
  worldBand,
} from '../src/levels/campaign';
import {
  buildLayout,
  classifyOpening,
  FIRE_RATE,
  FLOW_CAP,
  MODULES,
  OPENINGS,
  pickOpening,
} from '../src/levels/layout';
import { quickAim } from '../src/levels/validate';

/**
 * Feedback round 4 #4 (Mohit, 2026-10-22): "Every level starts with the same structure of -600
 * at the beginning ... almost all the levels are giving me the same feel".
 */
const N = 110;
const levels = Array.from({ length: N }, (_, i) => campaignLevel(i));

describe('feedback round 4: level openings vary', () => {
  it('no two consecutive levels share an opening (levels 1-110)', () => {
    const o = levels.map((l) => classifyOpening(l));
    for (let i = 1; i < N; i++) expect(o[i], `L${i} -> L${i + 1}`).not.toBe(o[i - 1]);
  });

  it('the generator places the opening it picked (classifier agrees)', () => {
    for (let n = AUTHORED + 1; n <= N; n++)
      expect(classifyOpening(campaignLevel(n - 1)), `L${n}`).toBe(openingForLevel(n));
  });

  it('levels 1-10 use at least 4 archetypes and every archetype shows up in 1-20', () => {
    expect(new Set(levels.slice(0, 10).map(classifyOpening)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(levels.slice(0, 20).map(classifyOpening))).toEqual(new Set(OPENINGS));
  });

  it('no level has the fixed -600 blocker any more', () => {
    for (const l of levels) for (const g of l.gates) expect(g.value, l.id).toBeLessThan(600);
  });

  it('is deterministic per seed', () => {
    for (const n of [6, 17, 42, 99]) {
      expect(generateLevel(n)).toEqual(generateLevel(n));
      expect(pickOpening(n, 'gentle')).toBe(pickOpening(n, 'gentle'));
    }
  });
});

describe('feedback round 4: the middle of each level varies', () => {
  const layouts = Array.from({ length: N - AUTHORED }, (_, k) => {
    const n = AUTHORED + 1 + k;
    const band = levelBand(n);
    return {
      n,
      band,
      layout: buildLayout({
        n,
        laneLength: generateLevel(n).laneLength,
        s: levelStrength(n),
        tier: worldBand(n),
        opening: openingForLevel(n),
        tower: band === 'C' || band === 'Boss',
        variant: levelTuning(n)[2],
      }),
    };
  });

  it('mid rows never repeat a module back to back, and all 6 modules appear by level 25', () => {
    for (const { n, layout } of layouts)
      for (let i = 1; i < layout.modules.length; i++)
        expect(layout.modules[i], `L${n}`).not.toBe(layout.modules[i - 1]);
    const seen = new Set(layouts.filter((x) => x.n <= 25).flatMap((x) => x.layout.modules));
    expect(seen).toEqual(new Set(MODULES));
  });

  it('band C and boss levels end in a mini-boss tower; A and B levels do not', () => {
    for (const { n, band } of layouts) {
      const towers = generateLevel(n).gates.filter((g) => g.tower);
      expect(towers.length, `L${n}`).toBe(band === 'C' || band === 'Boss' ? 1 : 0);
    }
  });

  it('blocker values scale with the expected army (bigger later, never above the cap)', () => {
    const mean = (from: number, to: number) => {
      const v = levels
        .slice(from - 1, to)
        .flatMap((l) =>
          l.gates.filter((g) => g.kind === 'sub' && !g.fromPhase).map((g) => g.value),
        );
      return v.reduce((a, b) => a + b, 0) / v.length;
    };
    expect(mean(46, 55)).toBeGreaterThan(mean(6, 15));
    for (let n = AUTHORED + 1; n <= N; n++)
      for (const g of generateLevel(n).gates.filter((x) => x.kind === 'sub'))
        // At most 2.5 s of full fire at the capped best-path army and strength.
        expect(g.value, `L${n}`).toBeLessThanOrEqual(
          Math.round(FIRE_RATE * FLOW_CAP * 2.5 * levelStrength(n)),
        );
  });
});

describe('feedback round 4: every level is winnable within the expected resources', () => {
  it('the aim bot wins levels 1-20 on the level seed, using only the bees it fires', () => {
    for (let n = 1; n <= 20; n++) {
      const L = campaignLevel(n - 1);
      const r = quickAim(L).result;
      expect(r.outcome, L.id).toBe('won');
      expect(r.timeLeft, L.id).toBeGreaterThan(0);
    }
  }, 600_000);
});
