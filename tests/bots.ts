import { autoTriggers } from '../src/sim/triggers';
import type { LevelDef } from '../src/sim/types';
import { CANNON_Y, World, type PlayerInput } from '../src/sim/world';

/** Worker speed (UNIT_STATS) for aim-lead. */
const WORKER_SPEED = 7;

export type Bot = (w: World) => PlayerInput;

/** Never fires. */
export const idleBot: Bot = () => ({ aimX: 0, firing: false, queen: false });

/** Fires straight up the middle, launches the queen when ready. */
export const centreBot: Bot = () => ({ aimX: 0, firing: true, queen: true });

/** Aim at gate i's future x (lead = bee travel time to the gate row). */
export function leadAimX(w: World, i: number): number {
  const L = w.level;
  const g = L.gates[i];
  const travel = (g.y - CANNON_Y) / WORKER_SPEED;
  return w.gateXAhead(i, travel);
}

/** Aims (with lead) at gate `a`, or alternates a/b every `period/2` s; queen when ready. */
export function gatePlan(a: number, b = a, period = 6): Bot {
  return (w) => {
    const i = w.time % period < period / 2 ? a : b;
    if (!w.gateActive(i)) return { aimX: 0, firing: true, queen: true };
    return { aimX: leadAimX(w, i), firing: true, queen: true };
  };
}

/**
 * Aim bot (levels-m2.md validator #3, "targets best gate with lead"): stands in for a player
 * who has learned the level. It tries every non-trap gate and every ordered pair of them
 * (alternating every 3 s) on the level's base seed, keeps the plan that wins with the most
 * time left, and then plays that plan. Win rates are measured on other seeds.
 */
export function aimBot(level: LevelDef): Bot {
  const ids = level.gates.map((g, i) => (g.kind === 'sub' ? -1 : i)).filter((i) => i >= 0);
  const plans: Bot[] = [];
  for (const a of ids) for (const b of ids) plans.push(gatePlan(a, b));
  let best = plans[0];
  let bestScore = -Infinity;
  for (const p of plans) {
    const r = run(level, p);
    const score = r.outcome === 'won' ? 1000 + r.timeLeft : -r.timeLeft;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

export interface RunResult {
  outcome: World['outcome'];
  timeLeft: number;
  peakBees: number;
  peakWasps: number;
}

/**
 * Plays one battle. `triggers` fires named trigger waves (FTUE levels have no FTUE driver
 * in tests): `autoTriggers`, the same default driver the game uses.
 */
export function run(level: LevelDef, bot: Bot, seed = level.seed): RunResult {
  const w = new World({ ...level, seed });
  let peakWasps = 0;
  while (w.outcome === 'playing') {
    autoTriggers(w);
    w.step(bot(w));
    peakWasps = Math.max(peakWasps, w.wasps.count);
  }
  return { outcome: w.outcome, timeLeft: w.timeLeft, peakBees: w.stats.peakBees, peakWasps };
}

/** Win rate over `n` seeds (seed variation stands in for player variance). */
export function winRate(level: LevelDef, bot: Bot, n = 20): number {
  let wins = 0;
  for (let s = 0; s < n; s++) if (run(level, bot, level.seed + s * 7919).outcome === 'won') wins++;
  return wins / n;
}

/** Small seeded RNG (mulberry32) so the casual bot is independent of the world RNG. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Casual bot (levels-m2.md, M2-17 tuning note): every 1.5 s picks the best visible non-trap
 * gate (mul scores 3x its value), but 35% of the time a random non-trap gate; aims at the
 * gate's x at the moment it picks, with no lead and no tracking until the next pick, plus
 * noise (sum of 3 uniforms, sd about 1.2 lane units);
 * lifts its finger 15% of the time; launches the queen 1 s after it is ready. Own RNG from
 * the run seed, so build one bot per run (see `casualWinRate`).
 */
export function casualBot(seed: number): Bot {
  const r = rng(seed ^ 0x9e3779b9);
  let nextPick = 0;
  let target = -1;
  let noise = 0;
  let firing = true;
  let readyAt = -1;
  let pickX = 0;
  return (w) => {
    const L = w.level;
    if (w.time >= nextPick) {
      nextPick = w.time + 1.5;
      const ids = L.gates
        .map((g, i) => (g.kind !== 'sub' && w.gateActive(i) ? i : -1))
        .filter((i) => i >= 0);
      const score = (i: number) => (L.gates[i].kind === 'mul' ? 3 : 1) * L.gates[i].value;
      if (ids.length === 0) target = -1;
      else if (r() < 0.35) target = ids[Math.floor(r() * ids.length)];
      else target = ids.reduce((a, b) => (score(b) > score(a) ? b : a));
      noise = (r() + r() + r() - 1.5) * 2.4;
      firing = r() >= 0.15;
      pickX = target >= 0 ? w.gateXAhead(target, 0) : 0;
    }
    const base = pickX;
    const half = L.laneWidth / 2;
    const aimX = Math.max(-half, Math.min(half, base + noise));
    if (w.queenReady) {
      if (readyAt < 0) readyAt = w.time;
    } else readyAt = -1;
    const queen = readyAt >= 0 && w.time - readyAt >= 1;
    return { aimX, firing, queen };
  };
}

/** Casual-bot win rate over `n` seeds; a fresh bot (own RNG) per run. */
export function casualWinRate(level: LevelDef, n = 200): number {
  let wins = 0;
  for (let s = 0; s < n; s++) {
    const seed = level.seed + s * 7919;
    if (run(level, casualBot(seed), seed).outcome === 'won') wins++;
  }
  return wins / n;
}
