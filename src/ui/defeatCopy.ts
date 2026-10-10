/** Near-miss threshold: "So close!" only when the nest has at most this much health left. */
export const NEAR_MISS_NEST_LEFT = 0.5;

/**
 * Defeat-screen headline from the nest damage dealt (0..1). PR 002 bug 2: it was always
 * "So close!", even when the nest was untouched.
 */
export function defeatHeadline(nestDamage: number): string {
  const left = 1 - Math.min(1, Math.max(0, nestDamage));
  if (left <= NEAR_MISS_NEST_LEFT) return 'So close!';
  if (nestDamage > 0) return 'The nest held on';
  return 'The wasps won this one';
}
