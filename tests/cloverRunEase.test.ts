import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/levels';
import { casualWinRate, centreBot, idleBot, winRate } from './bots';

const CLOVER = getLevel('clover-run');

describe('M2-18 Clover Run ease (levels-m2.md M2-17 note)', () => {
  it('ships the tuned knobs', () => {
    expect(CLOVER.nestHp).toBe(2350);
    expect(CLOVER.hiveHp).toBe(50);
  });

  it('casual bot wins 65-75%, idle loses, centre below casual', () => {
    const casual = casualWinRate(CLOVER, 200);
    expect(casual).toBeGreaterThanOrEqual(0.65);
    expect(casual).toBeLessThanOrEqual(0.75);
    expect(winRate(CLOVER, idleBot, 20)).toBe(0);
    expect(winRate(CLOVER, centreBot, 200)).toBeLessThan(casual);
  }, 120_000);
});
