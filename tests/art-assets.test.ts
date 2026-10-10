import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CUES } from '../src/audio/sfx';

const dirBytes = (d: string, ext: string) =>
  readdirSync(d)
    .filter((f) => f.endsWith(ext))
    .reduce((n, f) => n + statSync(join(d, f)).size, 0);

describe('asset load budgets (PLAN M3-2 / M3-3 / M3-4)', () => {
  it('model GLBs (art/models, not shipped until M3-5) total <= 1.5 MB', () => {
    expect(dirBytes('art/models', '.glb')).toBeGreaterThan(0);
    expect(dirBytes('art/models', '.glb')).toBeLessThanOrEqual(1.5 * 1024 * 1024);
  });
  it('no unloaded model files ship in public/ before M3-5', () => {
    expect(existsSync('public/assets/models')).toBe(false);
  });
  it('audio total <= 1 MB and every cue has an Opus file', () => {
    expect(dirBytes('public/assets/audio', '.ogg')).toBeLessThanOrEqual(1024 * 1024);
    for (const c of CUES) expect(existsSync(`public/assets/audio/${c}.ogg`)).toBe(true);
  });
  it('>= 30 SVG icons', () => {
    expect(
      readdirSync('public/assets/icons').filter((f) => f.endsWith('.svg')).length,
    ).toBeGreaterThanOrEqual(30);
  });
});
