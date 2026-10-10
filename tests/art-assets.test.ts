import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RUNTIME_MODELS } from '../src/art/glbLoader';
import { CUES } from '../src/audio/sfx';

const dirBytes = (d: string, ext: string) =>
  readdirSync(d)
    .filter((f) => f.endsWith(ext))
    .reduce((n, f) => n + statSync(join(d, f)).size, 0);

describe('asset load budgets (PLAN M3-2 / M3-3 / M3-4)', () => {
  it('model GLBs (shipped + art/models) total <= 1.5 MB', () => {
    const total = dirBytes('public/assets/models', '.glb') + dirBytes('art/models', '.glb');
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(1.5 * 1024 * 1024);
  });
  it('only GLBs the runtime loads ship in public/ (M3-5); the rest stay in art/models', () => {
    const shipped = readdirSync('public/assets/models').map((f) => f.replace(/\.glb$/, ''));
    expect(shipped.sort()).toEqual([...RUNTIME_MODELS].sort());
    expect(dirBytes('art/models', '.glb')).toBeGreaterThan(0);
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
