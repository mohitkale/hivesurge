import { autoTriggers } from '../sim/triggers';
import type { LevelDef } from '../sim/types';
import { BEE_CAP, CANNON_Y, WASP_CAP, World, type PlayerInput } from '../sim/world';

/**
 * M7-1 level validator (levels-m2.md "Validator"). Pure and deterministic, so the generator
 * calibration script, the tests and the admin panel all run the same checks. Not imported
 * by the player bundle's start-up path.
 */

const WORKER_SPEED = 7;

export type Bot = (w: World) => PlayerInput;

export const idleBot: Bot = () => ({ aimX: 0, firing: false, queen: false });
export const centreBot: Bot = () => ({ aimX: 0, firing: true, queen: true });

export function leadAimX(w: World, i: number): number {
  const g = w.level.gates[i];
  return w.gateXAhead(i, (g.y - CANNON_Y) / WORKER_SPEED);
}

/** Aims (with lead) at gate `a`, or alternates a/b every `period/2` s; queen when ready. */
export function gatePlan(a: number, b = a, period = 6): Bot {
  return (w) => {
    const i = w.time % period < period / 2 ? a : b;
    if (!w.gateActive(i)) return { aimX: 0, firing: true, queen: true };
    return { aimX: leadAimX(w, i), firing: true, queen: true };
  };
}

export interface RunResult {
  outcome: World['outcome'];
  timeLeft: number;
  peakBees: number;
  peakWasps: number;
}

export function runBot(level: LevelDef, bot: Bot, seed = level.seed): RunResult {
  const w = new World({ ...level, seed });
  let peakWasps = 0;
  while (w.outcome === 'playing') {
    autoTriggers(w);
    w.step(bot(w));
    peakWasps = Math.max(peakWasps, w.wasps.count);
  }
  return { outcome: w.outcome, timeLeft: w.timeLeft, peakBees: w.stats.peakBees, peakWasps };
}

const score = (r: RunResult) => (r.outcome === 'won' ? 1000 + r.timeLeft : -r.timeLeft);

/**
 * Quick aim bot: every single non-trap gate, then alternating pairs of the two best singles.
 * Cheaper than tests/bots.ts `aimBot` (all ordered pairs) so 100 levels validate in CI time.
 */
export function quickAim(level: LevelDef): { plan: Bot; result: RunResult } {
  const ids = level.gates.map((g, i) => (g.kind === 'sub' ? -1 : i)).filter((i) => i >= 0);
  const singles = ids.map((i) => ({ i, plan: gatePlan(i), result: runBot(level, gatePlan(i)) }));
  singles.sort((a, b) => score(b.result) - score(a.result));
  let best = singles[0] ?? { plan: centreBot, result: runBot(level, centreBot) };
  if (singles.length >= 2) {
    const [a, b] = singles;
    for (const p of [gatePlan(a.i, b.i), gatePlan(b.i, a.i)]) {
      const r = runBot(level, p);
      if (score(r) > score(best.result)) best = { i: a.i, plan: p, result: r };
    }
  }
  return { plan: best.plan, result: best.result };
}

export type Band = 'A' | 'B' | 'C' | 'Boss';

export interface Validation {
  ok: boolean;
  problems: string[];
  idle: RunResult;
  centre: RunResult;
  aim: RunResult;
}

/** Aim-bot time-left window (seconds) for a validated level. */
export const AIM_WINDOW = { min: 10, max: 40 } as const;

/** Runs the 4 validator rules (difficulty score #5 is reported by the calibration script). */
export function validateLevel(level: LevelDef, band: Band): Validation {
  const problems: string[] = [];
  const idle = runBot(level, idleBot);
  if (idle.outcome !== 'lost') problems.push('idle bot does not lose');
  const centre = runBot(level, centreBot);
  if (centre.outcome === 'won') {
    if (band === 'C' || band === 'Boss') problems.push('centre bot wins a C/Boss level');
    else if (centre.timeLeft >= 10)
      problems.push(`centre bot wins with ${centre.timeLeft.toFixed(1)} s left`);
  }
  const aim = quickAim(level).result;
  if (aim.outcome !== 'won') problems.push('aim bot does not win');
  else if (aim.timeLeft < AIM_WINDOW.min)
    problems.push(`aim bot wins with only ${aim.timeLeft.toFixed(1)} s left`);
  else if (aim.timeLeft > AIM_WINDOW.max)
    problems.push(`aim bot wins with ${aim.timeLeft.toFixed(1)} s left (too easy)`);
  for (const r of [idle, centre, aim]) {
    if (r.peakBees > BEE_CAP) problems.push('bee cap exceeded');
    if (r.peakWasps > WASP_CAP) problems.push('wasp cap exceeded');
  }
  return { ok: problems.length === 0, problems, idle, centre, aim };
}
