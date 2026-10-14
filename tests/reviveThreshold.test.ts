import { describe, expect, it } from 'vitest';
import { REVIVE_NEST_DAMAGE, reviveMinNestDamage, shouldOfferRevive } from '../src/platform/revive';

const base = { rewardedAllowed: true, capsOk: true, revives: 0 };

describe('revive.minNestDamage (PR 049)', () => {
  it('defaults to 0.25', () => {
    expect(REVIVE_NEST_DAMAGE).toBe(0.25);
    expect(reviveMinNestDamage()).toBe(0.25);
  });

  it('offers at >= 25% nest damage with the default, not below', () => {
    expect(shouldOfferRevive({ ...base, nestDamage: 0.25 })).toBe(true);
    expect(shouldOfferRevive({ ...base, nestDamage: 0.3 })).toBe(true); // Dandelion hive break (30-41%)
    expect(shouldOfferRevive({ ...base, nestDamage: 0.2499 })).toBe(false);
    expect(shouldOfferRevive({ ...base, nestDamage: 0 })).toBe(false);
  });

  it('applies to every loss type: the rule only reads nest damage', () => {
    // Hive break at 30% and time-out at 30% are treated the same.
    for (const nestDamage of [0.3, 0.41])
      expect(shouldOfferRevive({ ...base, nestDamage })).toBe(true);
  });

  it('remote config override is used; invalid values fall back to the default', () => {
    expect(reviveMinNestDamage({ minNestDamage: 0.5 })).toBe(0.5);
    expect(reviveMinNestDamage({ minNestDamage: 0 })).toBe(0);
    for (const bad of [-0.1, 1.5, NaN, '0.4', null, undefined])
      expect(reviveMinNestDamage({ minNestDamage: bad })).toBe(0.25);
    const min = reviveMinNestDamage({ minNestDamage: 0.5 });
    expect(shouldOfferRevive({ ...base, nestDamage: 0.4, minNestDamage: min })).toBe(false);
    expect(shouldOfferRevive({ ...base, nestDamage: 0.5, minNestDamage: min })).toBe(true);
  });

  it('other eligibility rules still apply at any damage', () => {
    expect(shouldOfferRevive({ ...base, revives: 1, nestDamage: 0.9 })).toBe(false);
    expect(shouldOfferRevive({ ...base, rewardedAllowed: false, nestDamage: 0.9 })).toBe(false);
    expect(shouldOfferRevive({ ...base, capsOk: false, nestDamage: 0.9 })).toBe(false);
  });
});
