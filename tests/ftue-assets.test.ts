import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = 'public/assets/ftue';
const NEEDED = ['finger', 'tap-ring', 'aim-line', 'gate-arrow', 'gate-glow', 'prompt-plate'];

describe('FTUE visual assets (art/ART_DIRECTION.md §6, PLAN M2-7)', () => {
  it('every FTUE element has an SVG and the set stays tiny (<= 8 KB)', () => {
    const files = readdirSync(DIR);
    for (const n of NEEDED) expect(files, n).toContain(`${n}.svg`);
    const bytes = files.reduce((t, f) => t + statSync(join(DIR, f)).size, 0);
    expect(bytes).toBeLessThanOrEqual(8 * 1024);
  });
});
