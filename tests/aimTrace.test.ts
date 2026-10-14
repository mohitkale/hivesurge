import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AIM_SAMPLE_MS, AimTrace, type AimTraceJson } from '../src/debug/aimTrace';
import { aimTraceEnabledFromUrl } from '../src/debug/aimTraceFlag';
import { getLevel } from '../src/levels';
import { World } from '../src/sim/world';

const VP = { w: 390, h: 844, dpr: 3 };

describe('M2-28d aim trace gating', () => {
  it.each([
    ['', false],
    ['?debug', false],
    ['?trace=perf', false],
    ['?traceaim', false],
    ['?trace=aim', true],
    ['?debug&trace=aim', true],
    ['?level=x&trace=perf&trace=aim', true],
  ])('%s -> %s', (q, on) => expect(aimTraceEnabledFromUrl(q)).toBe(on));

  it('works in production: the flag does not read import.meta.env and game.ts gates on it alone', () => {
    expect(readFileSync('src/debug/aimTraceFlag.ts', 'utf8')).not.toMatch(/import\.meta\.env/);
    const game = readFileSync('src/game.ts', 'utf8');
    expect(game).toMatch(/aimTraceOn = aimTraceEnabledFromUrl\(location\.search\)/);
    // Off = zero cost: the recorder is only reached through a dynamic import.
    expect(game).not.toMatch(/^import .*['"]\.\/debug\/aimTrace['"]/m);
    expect(game).toMatch(/import\('\.\/debug\/aimTrace'\)/);
  });
});

describe('M2-28d aim trace JSON', () => {
  it('has the documented shape, dedupes and samples at ~30 Hz', () => {
    const t = new AimTrace({ level: 'clover-run', seed: 7, viewport: VP, startedAt: 'T' });
    t.sample(0, 0);
    t.sample(10, 1); // too soon
    t.sample(40, 0); // unchanged
    t.sample(50, 1.234);
    t.launch(50, 'bee', 2);
    t.launch(60, 'bee', 0); // empty
    t.launch(70, 'queen');
    t.end(1000, 'won', 0, 42);
    const j = JSON.parse(JSON.stringify(t)) as AimTraceJson;
    expect(j).toEqual({
      format: 'hivesurge.aimTrace',
      version: 1,
      level: 'clover-run',
      seed: 7,
      viewport: VP,
      startedAt: 'T',
      aim: [
        [0, 0],
        [50, 1.23],
      ],
      launches: [
        [50, 'bee', 2],
        [70, 'queen', 1],
      ],
      results: [{ t: 1000, outcome: 'won', nestLeftPct: 0, hiveLeft: 42 }],
    });
    expect(AIM_SAMPLE_MS).toBe(33);
    expect(new AimTrace({ level: 'x', viewport: VP }).toJSON().seed).toBeNull();
  });

  it('records a sim-driven battle: aim wiggle, bee and queen launches, result', () => {
    const L = getLevel('dandelion-drift');
    const w = new World(L);
    const tr = new AimTrace({ level: L.id, seed: L.seed ?? null, viewport: VP }, w);
    let queenSent = false;
    for (let i = 0; i < 60 * 120 && w.outcome === 'playing'; i++) {
      const aimX = Math.sin(w.time * 2) * 2;
      const queen = !queenSent && w.queenReady;
      if (queen) queenSent = true;
      w.step({ aimX, firing: true, queen });
      tr.afterStep(w);
    }
    tr.end(w.time * 1000, w.outcome === 'won' ? 'won' : 'lost', 0, w.hiveHp);
    const j = tr.toJSON();
    expect(j.aim.length).toBeGreaterThan(50);
    for (let i = 1; i < j.aim.length; i++) {
      expect(j.aim[i][0] - j.aim[i - 1][0]).toBeGreaterThanOrEqual(AIM_SAMPLE_MS - 1);
      expect(j.aim[i][1]).not.toBe(j.aim[i - 1][1]);
    }
    expect(Math.max(...j.aim.map((a) => a[1]))).toBeGreaterThan(1);
    expect(Math.min(...j.aim.map((a) => a[1]))).toBeLessThan(-1);
    const bees = j.launches.filter((l) => l[1] === 'bee').reduce((s, l) => s + l[2], 0);
    expect(bees).toBe(w.stats.fired);
    expect(j.launches.filter((l) => l[1] === 'queen')).toHaveLength(w.stats.queens);
    expect(w.stats.queens).toBeGreaterThan(0);
    expect(j.results).toHaveLength(1);
    expect(j.results[0].t).toBe(Math.round(w.time * 1000));
  });
});
