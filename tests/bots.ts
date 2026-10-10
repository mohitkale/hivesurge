import { gateX } from '../src/sim/gates';
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
  const speedScale = L.bossPhases?.[w.bossPhase - 1]?.gateSpeedScale ?? 1;
  return gateX(g, (w.time + travel) * speedScale, L.laneWidth);
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
