import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/levels';
import { casualWinRate, centreBot, idleBot, winRate } from './bots';

/** validation-m2.md (PR 035) tuning; casual win rates measured at 65% and 59.5% over 200 seeds. */
describe('M2-26 tuning from validation-m2.md', () => {
  const T = getLevel('thistle-gauntlet');
  const W = getLevel('wasp-queen-nest');

  it('ships the spec values', () => {
    expect([T.nestHp, T.hiveHp]).toEqual([2650, 50]);
    expect([W.nestHp, W.hiveHp]).toEqual([3200, 50]);
    expect(W.gates[1]).toMatchObject({ kind: 'add', value: 5 });
    expect(W.gates[2]).toMatchObject({ kind: 'mul', value: 3, width: 3.4, motion: { speed: 0.6 } });
    expect(W.gates[3]).toMatchObject({ kind: 'sub', x: 0, y: 14, width: 2.6, fromPhase: 2 });
  });

  it.each([
    ['thistle-gauntlet', 0.6, 0.75],
    // Design target 55% +/- 5 (validation-m2.md, boss row). Measured 59.5%: inside, 0.5 pp from the top.
    ['wasp-queen-nest', 0.5, 0.6],
  ] as const)(
    '%s: casual in band, idle loses, centre below casual',
    (id, lo, hi) => {
      const L = getLevel(id);
      const casual = casualWinRate(L, 200);
      expect(casual).toBeGreaterThanOrEqual(lo);
      expect(casual).toBeLessThanOrEqual(hi);
      expect(winRate(L, idleBot, 20)).toBe(0);
      expect(winRate(L, centreBot, 200)).toBeLessThan(casual);
    },
    300_000,
  );
});
