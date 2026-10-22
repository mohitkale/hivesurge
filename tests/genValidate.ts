import { describe, expect, it } from 'vitest';
import { AUTHORED, generateLevel, levelBand } from '../src/levels/campaign';
import { parseLevel } from '../src/levels/parse';
import { validateLevel } from '../src/levels/validate';

/** M7-1: validates generated levels [from, to] (1-based level numbers) with the M2-5 rules. */
export function validateRange(part: number, count = 25): void {
  const from = AUTHORED + 1 + (part - 1) * count;
  const to = from + count - 1;
  describe(`M7-1 generated levels ${from}-${to} pass the validator`, () => {
    it('idle loses, centre loses (or squeaks by in A/B), aim wins with 10-40 s left, caps hold', () => {
      const failures: string[] = [];
      for (let n = from; n <= to; n++) {
        const L = generateLevel(n);
        expect(() => parseLevel(JSON.parse(JSON.stringify(L))), L.id).not.toThrow();
        const v = validateLevel(L, levelBand(n));
        if (!v.ok) failures.push(`${L.id} (${levelBand(n)}): ${v.problems.join('; ')}`);
      }
      expect(failures).toEqual([]);
    }, 600_000);
  });
}
