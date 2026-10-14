import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FTUE_PROMPTS,
  FtueStep,
  ftueDoneOnWin,
  ftueForLevel,
  shouldRunFtue,
  type Ftue,
} from '../src/ftue/ftue';
import { getLevel } from '../src/levels';
import { SIM_DT, World, type PlayerInput } from '../src/sim/world';
import { casualWinRate } from './bots';

/** Plays a battle like game.ts: ftue.update before world.step, plus the end-of-battle update. */
function play(f: Ftue, levelId: string, bot: (w: World, f: Ftue) => PlayerInput) {
  const w = new World(getLevel(levelId));
  const prompts: string[] = [];
  let maxStep = 0;
  while (w.outcome === 'playing' && w.time < 300) {
    const input = bot(w, f);
    f.update(w, input, SIM_DT);
    w.step(input);
    if (f.prompt && prompts.at(-1) !== f.prompt) prompts.push(f.prompt);
    maxStep = Math.max(maxStep, ...f.completed.map((c) => c.step));
  }
  f.update(w, { aimX: 0, firing: false, queen: false }, 0);
  maxStep = Math.max(maxStep, ...f.completed.map((c) => c.step));
  return { w, prompts, maxStep };
}

const centreHold = (w: World): PlayerInput => ({ aimX: 0, firing: true, queen: w.queenReady });

/** Follows the prompts on any FTUE level (aims at the step's gate). */
function follower(w: World, f: Ftue): PlayerInput {
  const i: PlayerInput = { aimX: 0, firing: true, queen: w.queenReady };
  if (f.step === FtueStep.Gate) i.aimX = Math.sign(w.currentGateX(0)) * 2.0;
  const lead = f.leadTargetX(w);
  if (lead !== null) i.aimX = lead;
  return i;
}

describe('Decision 40: FTUE carries into L2 after an early win', () => {
  it('L1 centre-hold win before step 5 leaves the FTUE not done, furthest step saved', () => {
    const f = ftueForLevel('ftue-meadow', 0, 1);
    const { w, maxStep } = play(f, 'ftue-meadow', centreHold);
    expect(w.outcome).toBe('won');
    expect(f.done).toBe(false);
    expect(ftueDoneOnWin(f, 'ftue-meadow')).toBe(false);
    expect(maxStep).toBe(FtueStep.Aim); // saved as save.ftueStep
  });

  it('L2 then runs the FTUE and resumes at step 2 with its prompt', () => {
    expect(shouldRunFtue(false, 'dandelion-drift')).toBe(true);
    expect(shouldRunFtue(false, 'clover-run')).toBe(false);
    const f = ftueForLevel('dandelion-drift', FtueStep.Aim, 1);
    const { prompts } = play(f, 'dandelion-drift', follower);
    expect(prompts[0]).toBe(FTUE_PROMPTS[FtueStep.Gate]); // learned step 1 is not re-prompted
    expect(prompts).toContain(FTUE_PROMPTS[FtueStep.Lead]);
    expect(f.completed.map((c) => c.step)).toContain(FtueStep.Gate);
  });

  it('L2 carry: the hive is not shielded and the moving gate keeps its speed', () => {
    const f = ftueForLevel('dandelion-drift', FtueStep.Aim, 1);
    const w = new World(getLevel('dandelion-drift'));
    const idle = { aimX: 0, firing: false, queen: false };
    for (let i = 0; i < 60 * 30; i++) {
      f.update(w, idle, SIM_DT);
      w.step(idle);
    }
    expect(w.hiveShield).toBe(false);
    expect(w.gateSpeedMul).toEqual(w.gateSpeedMul.map(() => 1));
    expect(f.movingGateIndex).toBe(2);
  });

  it('091 escape and attempt counting still hold on L2', () => {
    const f = ftueForLevel('dandelion-drift', FtueStep.Aim, 3);
    const { w } = play(f, 'dandelion-drift', centreHold);
    expect(f.completed.find((c) => c.step === FtueStep.Gate)?.timedOut).toBe(true);
    expect(w.outcome).not.toBe('playing');
  });

  it('086 learned-step rule: known steps on L2 show no prompt', () => {
    const f = ftueForLevel('dandelion-drift', FtueStep.Queen, 1);
    const { prompts } = play(f, 'dandelion-drift', follower);
    for (const s of [FtueStep.Aim, FtueStep.Gate, FtueStep.Lead, FtueStep.Queen])
      expect(prompts).not.toContain(FTUE_PROMPTS[s]);
  });

  it('a full FTUE completion still marks done; an L2 carry win ends the FTUE', () => {
    const f = ftueForLevel('ftue-meadow', 0, 1);
    play(f, 'ftue-meadow', follower);
    expect(f.done).toBe(true);
    expect(ftueDoneOnWin(f, 'ftue-meadow')).toBe(true);
    const g = ftueForLevel('dandelion-drift', FtueStep.Aim, 1);
    expect(ftueDoneOnWin(g, 'dandelion-drift')).toBe(true);
  });

  it('game wiring: claim uses ftueDoneOnWin; relaunch keeps saved FTUE progress', () => {
    const g = readFileSync('src/game.ts', 'utf8');
    expect(g).toMatch(/won' && ftueDoneOnWin\(this\.ftue, id\)\)\s*this\.save\.ftueDone = true/);
    expect(g).toMatch(/battlesCompleted > 0 && this\.save\.ftueStep === 0\)/);
    expect(g).toMatch(/ftueForLevel\(this\.world\.level\.id, this\.save\.ftueStep/);
  });

  it('report: L2 casual win rate (sim without FTUE) for the doc', () => {
    expect(casualWinRate(getLevel('dandelion-drift'), 50)).toBeGreaterThan(0.5);
  }, 120_000);
});
