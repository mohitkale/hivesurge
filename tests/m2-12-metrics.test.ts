import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { aggregate, labelFor, sessionMetrics } from '../playtests/m2-12/metrics.mjs';

const e = (name: string, ts: number, props: Record<string, string | number | boolean> = {}) => ({
  name,
  ts,
  session: 's',
  props,
});

const session = [
  e('ftue_step', 500, { step: 1, msSinceFirstInput: 900, timedOut: false }),
  e('ftue_step', 600, { step: 4, msSinceFirstInput: 4400, timedOut: false }),
  e('level_start', 0, { level: 'ftue-meadow' }),
  e('level_win', 20_000, { level: 'ftue-meadow' }),
  e('level_start', 25_000, { level: 'dandelion-drift' }),
  e('level_fail', 100_000, { level: 'dandelion-drift' }),
  e('level_start', 110_000, { level: 'dandelion-drift' }), // retry within 60 s
  e('level_fail', 190_000, { level: 'dandelion-drift' }), // quit after this loss
];

describe('M2-12 metrics.mjs', () => {
  it('computes the protocol §3 metrics', () => {
    const m = sessionMetrics(session);
    expect(m.battles).toBe(3);
    expect(m.wins).toBe(1);
    expect(m.completionRate).toBeCloseTo(1 / 3);
    expect(m.retryAfterLossRate).toBe(0.5);
    expect(m.timeToFirstWinS).toBe(20);
    expect(m.dropOffLevel).toBe('dandelion-drift');
    expect(m.dropOffWasLoss).toBe(true);
    expect(m.sessionLengthMin).toBeCloseTo(190 / 60);
    expect(m.levelsReached).toEqual(['ftue-meadow', 'dandelion-drift']);
    expect(m.ftueQueenMs).toBe(4400);
  });

  it('handles empty sessions', () => {
    const m = sessionMetrics([]);
    expect(m.battles).toBe(0);
    expect(m.completionRate).toBeNull();
    expect(m.dropOffLevel).toBeNull();
  });

  it('keeps bot and QA data in separate groups', () => {
    expect(labelFor('playtests/m2-12/bot-idle-1.json')).toBe('bot');
    expect(labelFor('qa-01-events.json')).toBe('qa');
    const m = sessionMetrics(session);
    const agg = aggregate([
      { label: 'bot', metrics: m },
      { label: 'qa', metrics: m },
    ]);
    expect(Object.keys(agg).sort()).toEqual(['bot', 'qa']);
    expect(agg.bot.battles).toBe(3);
  });

  it('CLI prints a table and accepts a double-encoded copy() export', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hs-m212-'));
    const f = join(dir, 'bot-sweeper-1.json');
    writeFileSync(f, JSON.stringify(JSON.stringify(session)));
    const script = fileURLToPath(new URL('../playtests/m2-12/metrics.mjs', import.meta.url));
    const r = spawnSync(process.execPath, [script, f], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('| bot-sweeper-1.json | bot | 3 | 1 |');
  });
});
