import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('M2-31c "Missed!" readability', () => {
  const css = readFileSync('src/style.css', 'utf8');
  const block = css.slice(
    css.indexOf('.floater.miss {'),
    css.indexOf('}', css.indexOf('.floater.miss {')),
  );
  it('is 1.5-2x the 18 px floater, bold, outlined, centred, above other HUD items', () => {
    const px = Number(/font-size:\s*(\d+)px/.exec(block)![1]);
    expect(px).toBeGreaterThanOrEqual(27);
    expect(px).toBeLessThanOrEqual(36);
    expect(block).toMatch(/font-weight:\s*900/);
    expect(block).toMatch(/-webkit-text-stroke:\s*\d+px/);
    expect(block).toMatch(/z-index:\s*3/);
    expect(block).toMatch(/translate\(-50%, -50%\)/);
  });
  it('game.ts draws the miss cue with the miss variant at the gate row', () => {
    const g = readFileSync('src/game.ts', 'utf8');
    expect(g).toMatch(
      /this\.float\(MISS_CUE\.text, w\.cannonX, w\.gateRowY\[missRow\], 'miss', 1\)/,
    );
  });
});
