import { describe, expect, it } from 'vitest';
import { campaignLevel } from '../src/levels/campaign';
import { bandCoverage, formatCoverage, levelFeatures } from '../src/levels/variety';
import type { LevelDef } from '../src/sim/types';

// `npm run lint:levels` runs this file: prints the coverage per 10-level band, fails a band below 3.
describe('M7-9 level-variety lint', () => {
  it('every 10-level band of the first 110 campaign levels uses >= 3 of the 5 features', () => {
    const levels = Array.from({ length: 110 }, (_, i) => campaignLevel(i));
    const rows = bandCoverage(levels);
    console.log(formatCoverage(rows));
    expect(rows).toHaveLength(11);
    for (const r of rows) expect(r.features.length, `band ${r.band}`).toBeGreaterThanOrEqual(3);
  });

  it('fails a band below 3 features', () => {
    const plain: LevelDef = {
      ...campaignLevel(2),
      gates: [{ kind: 'mul', value: 2, x: 0, y: 10, width: 3 }],
      waves: [{ at: 4, kind: 'wasp', count: 5, x: 0, spread: 2 }],
      bossPhases: undefined,
    };
    expect([...levelFeatures(plain)]).toEqual([]);
    const rows = bandCoverage(Array.from({ length: 10 }, () => plain));
    expect(rows[0].ok).toBe(false);
    expect(formatCoverage(rows)).toContain('FAIL');
  });
});
