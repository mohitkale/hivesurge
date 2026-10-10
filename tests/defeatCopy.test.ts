import { describe, expect, it } from 'vitest';
import { defeatHeadline } from '../src/ui/defeatCopy';

describe('defeat headline (M2-22)', () => {
  it('says "So close!" only for near-misses (nest at 50% or less)', () => {
    expect(defeatHeadline(0.92)).toBe('So close!');
    expect(defeatHeadline(0.5)).toBe('So close!');
    expect(defeatHeadline(0.49)).not.toBe('So close!');
  });
  it('repro: no fire, wait -> nest untouched -> not a near-miss', () => {
    expect(defeatHeadline(0)).toBe('The wasps won this one');
  });
  it('some damage but not close', () => {
    expect(defeatHeadline(0.2)).toBe('The nest held on');
  });
});
