import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/levels';
import { aimBot, sweepBot, winRate } from './bots';

/**
 * M2-28 aiming pillar (design PR 060, levels-m2.md): aiming must beat the M2-12 sweeper
 * (`sweepBot(0.35, 1.3)`) by at least 15 points on L2-L5, 200 seeds each. L1 (FTUE) is exempt:
 * M2-29 teaches aiming in the FTUE instead.
 */
const MIN_GAP = 0.15;
const TIMEOUT_MS = 600_000;

describe('M2-28: aim beats sweep by >= 15 points (L2-L5)', () => {
  it.each(['dandelion-drift', 'clover-run', 'thistle-gauntlet', 'wasp-queen-nest'])(
    '%s',
    (id) => {
      const L = getLevel(id);
      const aim = winRate(L, aimBot(L), 200);
      const sweep = winRate(L, sweepBot(0.35, 1.3), 200);
      expect(aim - sweep).toBeGreaterThanOrEqual(MIN_GAP);
    },
    TIMEOUT_MS,
  );
});
