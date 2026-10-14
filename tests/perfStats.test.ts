import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PerfStats, perfEnabledFromUrl, stressCountFromUrl } from '../src/ui/perfStats';

describe('perf overlay stats (M2-15)', () => {
  it('reports median fps, 1% low and peak draw calls / triangles', () => {
    const s = new PerfStats(100);
    for (let i = 0; i < 99; i++) s.sample(1000 / 60, 20 + (i % 3), 5000);
    s.sample(100, 40, 9000); // one hitch
    expect(s.medianFps).toBeCloseTo(60, 0);
    expect(s.lowFps).toBeCloseTo(10, 0);
    expect(s.peakCalls).toBe(40);
    expect(s.peakTriangles).toBe(9000);
    expect(s.lastCalls).toBe(40);
  });

  it('keeps a rolling window', () => {
    const s = new PerfStats(10);
    for (let i = 0; i < 10; i++) s.sample(100, 1, 1);
    for (let i = 0; i < 10; i++) s.sample(1000 / 30, 1, 1);
    expect(s.medianFps).toBeCloseTo(30, 0);
  });

  it('is opt-in via ?debug; ?stress is clamped', () => {
    expect(perfEnabledFromUrl('', true)).toBe(false);
    expect(perfEnabledFromUrl('?debug', true)).toBe(true);
    expect(stressCountFromUrl('?stress=500')).toBe(500);
    expect(stressCountFromUrl('?stress=99999')).toBe(1000);
    expect(stressCountFromUrl('?stress=abc')).toBe(0);
  });
});

describe('perf overlay is dev-only (PR 071 review nit)', () => {
  it('production ignores ?debug', () => {
    expect(perfEnabledFromUrl('?debug', false)).toBe(false);
    expect(perfEnabledFromUrl('?debug&quality=low&stress=320', false)).toBe(false);
  });
  it('game.ts only builds the overlay and the F3 toggle behind import.meta.env.DEV', () => {
    const src = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
    expect(src).toMatch(
      /perfOverlay: PerfOverlay \| null = import\.meta\.env\.DEV\s*\?\s*new PerfOverlay/,
    );
    expect(src).toMatch(/if \(import\.meta\.env\.DEV && this\.perfOverlay\) \{[\s\S]*?'F3'/);
    // Exactly one construction, and no unguarded F3 handler elsewhere.
    expect(src.match(/new PerfOverlay\(/g)).toHaveLength(1);
    expect(src.match(/'F3'/g)).toHaveLength(1);
  });
});
