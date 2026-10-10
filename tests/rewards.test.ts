import { describe, expect, it } from 'vitest';
import { applyMultiplier, computeRewards } from '../src/sim/rewards';

const base = { nestMax: 100, hiveMax: 40, timeLeft: 20 };

describe('rewards', () => {
  it('a clean win earns 3 stars plus time bonus', () => {
    const r = computeRewards({ ...base, outcome: 'won', nestHp: 0, hiveHp: 40 });
    expect(r.stars).toBe(3);
    expect(r.coins).toBe(50 + 30 + 10);
  });

  it('a scrappy win earns 1 star', () => {
    expect(computeRewards({ ...base, outcome: 'won', nestHp: 0, hiveHp: 5 }).stars).toBe(1);
  });

  it('a loss pays by nest damage and reports the near miss', () => {
    const r = computeRewards({ ...base, outcome: 'lost', nestHp: 4, hiveHp: 0 });
    expect(r.stars).toBe(0);
    expect(r.nestDamage).toBeCloseTo(0.96);
    expect(r.coins).toBe(19);
  });

  it('2X multiplies coins only', () => {
    const r = applyMultiplier({ coins: 40, stars: 2, nestDamage: 1 }, 2);
    expect(r).toEqual({ coins: 80, stars: 2, nestDamage: 1 });
  });
});
