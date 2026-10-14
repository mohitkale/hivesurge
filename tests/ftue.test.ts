import { describe, expect, it } from 'vitest';
import { Ftue, FTUE_PROMPTS, FtueStep, shouldRunFtue } from '../src/ftue/ftue';
import { getLevel } from '../src/levels';
import { SIM_DT, World, type PlayerInput } from '../src/sim/world';

const level = getLevel('ftue-meadow');

/**
 * Headless FTUE playtest (M2-7 acceptance): a scripted new player who follows each prompt
 * after a short reaction delay. Returns ms from first input to first queen launch.
 */
function playFtue(reaction = 0.6) {
  const w = new World(level);
  const f = new Ftue();
  let promptSeenAt = -1;
  let lastPrompt = '';
  let queenAtMs = -1;
  let firstInput = -1;
  while (w.outcome === 'playing' && w.time < 200) {
    if (f.prompt !== lastPrompt) {
      lastPrompt = f.prompt;
      promptSeenAt = w.time;
    }
    const reacting = f.prompt !== '' && w.time - promptSeenAt >= reaction;
    const input: PlayerInput = { aimX: 0, firing: false, queen: false };
    if (f.step >= FtueStep.Aim && (reacting || f.step > FtueStep.Aim)) input.firing = true;
    if (f.step === FtueStep.Gate) input.aimX = w.currentGateX(0); // M2-29: x2 gate is off-centre
    const lead = f.leadTargetX(w);
    if (lead !== null) input.aimX = lead;
    if (f.step === FtueStep.Queen && reacting) input.queen = true;
    if (input.firing && firstInput < 0) firstInput = w.time;
    f.update(w, input, SIM_DT);
    w.step(input);
    if (queenAtMs < 0 && w.stats.queens > 0) queenAtMs = (w.time - firstInput) * 1000;
  }
  f.update(w, { aimX: 0, firing: false, queen: false }, SIM_DT);
  return { w, f, queenAtMs };
}

describe('FTUE (M2-7)', () => {
  it('headless new player reaches the first queen launch in under 30 s and wins', () => {
    const { w, f, queenAtMs } = playFtue();
    expect(queenAtMs).toBeGreaterThan(0);
    expect(queenAtMs).toBeLessThan(30_000);
    expect(w.outcome).toBe('won');
    expect(f.done).toBe(true);
    expect(f.completed.map((e) => e.step)).toEqual([
      FtueStep.Aim,
      FtueStep.Gate,
      FtueStep.Lead,
      FtueStep.Queen,
      FtueStep.Finish,
    ]);
  });

  it('steps are action-gated: an idle player never leaves the aim step', () => {
    const w = new World(level);
    const f = new Ftue();
    const idle = { aimX: 0, firing: false, queen: false };
    for (let i = 0; i < 60 * 30; i++) {
      f.update(w, idle, SIM_DT);
      w.step(idle);
    }
    expect(f.step).toBe(FtueStep.Aim);
    expect(f.emphasis).toBe(true); // timeout fallback: emphasise, never auto-advance
    expect(w.wasps.count).toBe(0); // trigger waves wait for the steps
  });

  it('the hive cannot be damaged before step 5', () => {
    const w = new World(level);
    const f = new Ftue();
    w.fireTrigger('step3'); // wasps arrive early, player does not shoot
    const idle = { aimX: 0, firing: false, queen: false };
    for (let i = 0; i < 60 * 20; i++) {
      f.update(w, idle, SIM_DT);
      w.step(idle);
    }
    expect(w.hiveHp).toBe(level.hiveHp);
  });

  it('lead line aims at gateX(t + travelTime) only in step 3', () => {
    const { f } = playFtue();
    expect(f.leadTargetX(new World(level))).toBeNull();
  });

  it('prompts are at most 8 words', () => {
    for (const p of Object.values(FTUE_PROMPTS))
      expect(p.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(8);
  });

  it('records ftue_step data with ms since first input', () => {
    const { f } = playFtue();
    const ms = f.completed.map((e) => e.msSinceFirstInput);
    expect(ms).toEqual([...ms].sort((a, b) => a - b));
    expect(f.completed.every((e) => typeof e.timedOut === 'boolean')).toBe(true);
  });

  it('runs only on the FTUE level for a player who has not finished it (skipped on replay)', () => {
    expect(shouldRunFtue(false, 'ftue-meadow')).toBe(true);
    expect(shouldRunFtue(true, 'ftue-meadow')).toBe(false);
    expect(shouldRunFtue(false, 'clover-run')).toBe(false);
  });
});
