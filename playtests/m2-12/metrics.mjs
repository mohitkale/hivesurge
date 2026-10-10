// M2-12 metrics (research/m2-12-local-playtest-protocol.md §3) from exported analytics events.
// Usage: node playtests/m2-12/metrics.mjs <events.json>... [--json]
// Each file is the value of localStorage['hivesurge.analytics.v1'] (an array of
// { name, ts, session, props }). Bot and QA files must be reported separately; this script
// labels each file by its name prefix (bot-*, qa-*, else "other").
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RETRY_WINDOW_MS = 60_000;

/** Metrics for one session file. Times in seconds / minutes as named. */
export function sessionMetrics(events) {
  const ev = [...events].filter((e) => e && typeof e.ts === 'number').sort((a, b) => a.ts - b.ts);
  const starts = ev.filter((e) => e.name === 'level_start');
  const wins = ev.filter((e) => e.name === 'level_win');
  const fails = ev.filter((e) => e.name === 'level_fail');
  let retried = 0;
  for (const f of fails) {
    if (starts.some((s) => s.ts > f.ts && s.ts - f.ts <= RETRY_WINDOW_MS)) retried++;
  }
  const lastStart = starts.at(-1);
  const lastStartEnd = lastStart
    ? ev.find((e) => e.ts >= lastStart.ts && (e.name === 'level_win' || e.name === 'level_fail'))
    : undefined;
  const ftue = ev.filter((e) => e.name === 'ftue_step');
  const queenStep = ftue.find((e) => e.props?.step === 4);
  return {
    battles: starts.length,
    wins: wins.length,
    fails: fails.length,
    completionRate: starts.length ? wins.length / starts.length : null,
    retryAfterLossRate: fails.length ? retried / fails.length : null,
    timeToFirstWinS: starts.length && wins.length ? (wins[0].ts - starts[0].ts) / 1000 : null,
    dropOffLevel: lastStart ? (lastStart.props?.level ?? null) : null,
    dropOffWasLoss: lastStartEnd ? lastStartEnd.name === 'level_fail' : null,
    sessionLengthMin: ev.length ? (ev.at(-1).ts - ev[0].ts) / 60000 : 0,
    levelsReached: [...new Set(starts.map((s) => s.props?.level).filter(Boolean))],
    ftueSteps: ftue.length,
    ftueQueenMs: queenStep ? queenStep.props.msSinceFirstInput : null,
  };
}

export function labelFor(file) {
  const b = basename(file);
  return b.startsWith('bot-') ? 'bot' : b.startsWith('qa-') ? 'qa' : 'other';
}

/** Aggregate per label (bot / qa / other) — never mixes bot and QA data. */
export function aggregate(rows) {
  const out = {};
  for (const r of rows) {
    const g = (out[r.label] ??= { sessions: 0, battles: 0, wins: 0, fails: 0, retried: 0 });
    g.sessions++;
    g.battles += r.metrics.battles;
    g.wins += r.metrics.wins;
    g.fails += r.metrics.fails;
    g.retried += Math.round((r.metrics.retryAfterLossRate ?? 0) * r.metrics.fails);
  }
  for (const g of Object.values(out)) {
    g.completionRate = g.battles ? g.wins / g.battles : null;
    g.retryAfterLossRate = g.fails ? g.retried / g.fails : null;
  }
  return out;
}

function fmt(v, digits = 2) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(digits);
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const files = args.filter((a) => a !== '--json');
  if (!files.length) {
    console.error('usage: node playtests/m2-12/metrics.mjs <events.json>... [--json]');
    process.exit(2);
  }
  const rows = files.map((f) => {
    const data = JSON.parse(readFileSync(f, 'utf8'));
    const events = Array.isArray(data) ? data : JSON.parse(data); // tolerate a double-encoded copy()
    return { file: basename(f), label: labelFor(f), metrics: sessionMetrics(events) };
  });
  const agg = aggregate(rows);
  if (asJson) {
    console.log(JSON.stringify({ rows, aggregate: agg }, null, 2));
  } else {
    console.log(
      '| file | label | battles | wins | completion | retry after loss | first win (s) | drop-off level | drop-off loss | session (min) | ftue queen (ms) |',
    );
    console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const r of rows) {
      const m = r.metrics;
      console.log(
        `| ${r.file} | ${r.label} | ${m.battles} | ${m.wins} | ${fmt(m.completionRate)} | ${fmt(m.retryAfterLossRate)} | ${fmt(m.timeToFirstWinS, 1)} | ${fmt(m.dropOffLevel)} | ${fmt(m.dropOffWasLoss)} | ${fmt(m.sessionLengthMin)} | ${fmt(m.ftueQueenMs)} |`,
      );
    }
    console.log('\nAggregate by label (bot data is never player data):');
    for (const [label, g] of Object.entries(agg))
      console.log(
        `- ${label}: ${g.sessions} sessions, ${g.battles} battles, completion ${fmt(g.completionRate)}, retry after loss ${fmt(g.retryAfterLossRate)}`,
      );
  }
}
