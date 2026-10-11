// M2-12 headless bot sessions on the real sim (src/sim) — BOT DATA, NEVER PLAYER DATA.
// Plays N sessions per level per bot persona with the deterministic World (same code the game runs),
// emits analytics-format events (level_start / level_win / level_fail) and scores them with metrics.mjs.
// Build + run (see playtests/m2-12/README.md):
//   npx rolldown playtests/m2-12/sim-sessions.ts --platform node --format esm --file /tmp/sim-sessions.mjs
//   node /tmp/sim-sessions.mjs [--n 200] [--out playtests/m2-12/results]
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { LEVELS } from '../../src/levels';
import { autoTriggers } from '../../src/sim/triggers';
import type { LevelDef } from '../../src/sim/types';
import { World } from '../../src/sim/world';
import { aimBot, casualBot, centreBot, idleBot, type Bot } from '../../tests/bots';
import { sessionMetrics } from './metrics.mjs';

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
}
const N = Number(arg('n', '200'));
const OUT = resolve(arg('out', 'playtests/m2-12/results'));
mkdirSync(OUT, { recursive: true });

// ---- ASSUMPTIONS (model parameters, not measurements; see report §Method) ----
/** Seconds of UI between battles (result screen + tap). Cross-checked against browser bot runs. */
const UI_GAP_S = 3;
/** Max retries after a loss before the bot always quits the session. */
const MAX_RETRIES = 3;
/** Retry probability after a loss: higher after a near miss (nest ≤ 30 % left). */
const P_RETRY_NEAR = 0.85;
const P_RETRY_FAR = 0.6;

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Battle {
  won: boolean;
  timeS: number;
  nestLeft: number;
}
function battle(level: LevelDef, bot: Bot, seed: number): Battle {
  const w = new World({ ...level, seed });
  while (w.outcome === 'playing') {
    autoTriggers(w);
    w.step(bot(w));
  }
  return {
    won: w.outcome === 'won',
    timeS: w.time,
    nestLeft: Math.round((Math.max(0, w.nestHp) / level.nestHp) * 100),
  };
}

type Persona = 'casual' | 'aim' | 'centre' | 'idle' | 'sweeper' | 'gate-seeker';
const PERSONAS: Persona[] = ['casual', 'aim', 'centre', 'idle', 'sweeper', 'gate-seeker'];
/** Same aim curves as the browser runner (bot-sessions.mjs aimFor), mapped from screen fraction to lane x. */
const sweepBot =
  (amp: number, f: number): Bot =>
  (w) => ({ aimX: amp * Math.sin(w.time * f) * w.level.laneWidth, firing: true, queen: true });
const aimCache = new Map<string, Bot>();
function botFor(p: Persona, level: LevelDef, seed: number): Bot {
  if (p === 'casual') return casualBot(seed);
  if (p === 'centre') return centreBot;
  if (p === 'idle') return idleBot;
  if (p === 'sweeper') return sweepBot(0.35, 1.3);
  if (p === 'gate-seeker') return sweepBot(0.2, 0.9);
  if (!aimCache.has(level.id)) aimCache.set(level.id, aimBot(level));
  return aimCache.get(level.id)!;
}

interface Ev {
  name: string;
  ts: number;
  session: string;
  props: Record<string, string | number | boolean>;
}

/** One session on a list of levels: play in order, retry per the model, quit or run out of levels. */
function session(p: Persona, levels: LevelDef[], sid: string, seed: number): Ev[] {
  const r = mulberry(seed);
  const ev: Ev[] = [];
  let t = 0;
  let attempt = 0;
  for (let li = 0; li < levels.length;) {
    const L = levels[li];
    const s = L.seed + seed * 7919 + attempt * 104729;
    ev.push({ name: 'level_start', ts: t, session: sid, props: { level: L.id } });
    const b = battle(L, botFor(p, L, s), s);
    t += b.timeS * 1000;
    ev.push({
      name: b.won ? 'level_win' : 'level_fail',
      ts: t,
      session: sid,
      props: { level: L.id, time: Math.round(b.timeS), nestLeft: b.nestLeft },
    });
    t += UI_GAP_S * 1000;
    if (b.won) {
      li++;
      attempt = 0;
      continue;
    }
    attempt++;
    const pRetry = b.nestLeft <= 30 ? P_RETRY_NEAR : P_RETRY_FAR;
    if (attempt > MAX_RETRIES || r() >= pRetry) break;
  }
  return ev;
}

const pct = (x: number | null) => (x === null ? null : Math.round(x * 1000) / 10);
function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

const t0 = Date.now();
/** Incremental save: each finished level × bot block is appended here, so an interrupted run keeps its data. */
const PARTIAL = join(OUT, 'sim-sessions.partial.jsonl');
writeFileSync(PARTIAL, '');
const save = (row: unknown) => appendFileSync(PARTIAL, JSON.stringify(row) + '\n');
const perLevel: Record<string, unknown>[] = [];
for (const L of LEVELS) {
  for (const p of PERSONAS) {
    const sessions = Array.from({ length: N }, (_, i) =>
      session(p, [L], `${p}-${L.id}-${i}`, i + 1),
    );
    const ms = sessions.map((e) => sessionMetrics(e));
    const battles = ms.reduce((a, m) => a + m.battles, 0);
    const wins = ms.reduce((a, m) => a + m.wins, 0);
    const fails = ms.reduce((a, m) => a + m.fails, 0);
    const retried = ms.reduce((a, m) => a + Math.round((m.retryAfterLossRate ?? 0) * m.fails), 0);
    const firstTry = sessions.filter((e) => e[1]?.name === 'level_win').length;
    const cleared = ms.filter((m) => m.wins > 0).length;
    const nearMiss = sessions
      .flat()
      .filter((e) => e.name === 'level_fail' && Number(e.props.nestLeft) <= 30).length;
    perLevel.push({
      level: L.id,
      persona: p,
      sessions: N,
      battles,
      completionRatePct: pct(battles ? wins / battles : null),
      firstTryWinPct: pct(firstTry / N),
      clearedWithin4Pct: pct(cleared / N),
      retryAfterLossPct: pct(fails ? retried / fails : null),
      nearMissLossPct: pct(fails ? nearMiss / fails : null),
      medianTimeToFirstWinS: median(
        ms.map((m) => m.timeToFirstWinS).filter((x): x is number => x !== null),
      ),
      quitWithoutClearPct: pct((N - cleared) / N),
    });
    save({ kind: 'perLevel', ...perLevel.at(-1)! });
  }
}

// Campaign: start at L1 and play on; drop-off = level of the last start before quitting.
const campaign: Record<string, unknown>[] = [];
for (const p of ['casual', 'aim', 'sweeper'] as Persona[]) {
  const ms = Array.from({ length: N }, (_, i) =>
    sessionMetrics(session(p, LEVELS, `camp-${p}-${i}`, 1000 + i)),
  );
  const drop: Record<string, number> = {};
  for (const m of ms) {
    const k =
      m.wins === LEVELS.length * 1 && !m.dropOffWasLoss ? 'finished all 5' : String(m.dropOffLevel);
    drop[k] = (drop[k] ?? 0) + 1;
  }
  campaign.push({
    persona: p,
    sessions: N,
    dropOff: drop,
    medianFtueFirstWinS: median(
      ms.map((m) => m.timeToFirstWinS).filter((x): x is number => x !== null),
    ),
    medianSessionMin: median(ms.map((m) => m.sessionLengthMin)),
    medianBattles: median(ms.map((m) => m.battles)),
  });
  save({ kind: 'campaign', ...campaign.at(-1)! });
}

const result = {
  generated: new Date().toISOString(),
  label: 'BOT DATA (headless sim) — not player data',
  n: N,
  assumptions: { UI_GAP_S, MAX_RETRIES, P_RETRY_NEAR, P_RETRY_FAR },
  perLevel,
  campaign,
  runtimeS: (Date.now() - t0) / 1000,
};
writeFileSync(join(OUT, 'sim-sessions.json'), JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
