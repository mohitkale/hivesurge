import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels';
import { nextLevelIndex } from '../src/levels/progress';
import { BEE_CAP, WASP_CAP } from '../src/sim/world';
import { aimBot, centreBot, idleBot, run, winRate } from './bots';

/** M2-5: every campaign level must punish idling and reward aiming (levels-m2.md validator). */
describe.each(LEVELS.map((l) => [l.id, l] as const))('level %s balance', (_id, level) => {
  const aim = aimBot(level);

  it('idle bot loses', () => {
    expect(run(level, idleBot).outcome).toBe('lost');
  });

  it('aim bot wins (base seed) within unit caps', () => {
    const r = run(level, aim);
    expect(r.outcome).toBe('won');
    expect(r.peakBees).toBeLessThanOrEqual(BEE_CAP);
    expect(r.peakWasps).toBeLessThan(WASP_CAP);
  });

  it('aiming beats firing straight (win rate over 8 seeds)', () => {
    const a = winRate(level, aim, 8);
    const c = winRate(level, centreBot, 8);
    expect(a).toBeGreaterThanOrEqual(0.75);
    if (level.id !== 'ftue-meadow') expect(a).toBeGreaterThan(c);
  });
});

describe('campaign', () => {
  it('has 5 levels in levels-m2.md order', () => {
    expect(LEVELS.map((l) => l.id)).toEqual([
      'ftue-meadow',
      'dandelion-drift',
      'clover-run',
      'thistle-gauntlet',
      'wasp-queen-nest',
    ]);
  });

  it('advances to the first level without stars, then stays on the last', () => {
    expect(nextLevelIndex(LEVELS, {})).toBe(0);
    expect(nextLevelIndex(LEVELS, { 'ftue-meadow': 2 })).toBe(1);
    const all = Object.fromEntries(LEVELS.map((l) => [l.id, 1]));
    expect(nextLevelIndex(LEVELS, all)).toBe(4);
  });
});
