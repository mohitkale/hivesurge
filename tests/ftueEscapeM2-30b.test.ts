import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  Ftue,
  FTUE_PROMPTS,
  FTUE_STEP2_DEMO_ATTEMPT,
  FTUE_STEP2_MAX_ATTEMPTS,
  FtueStep,
} from '../src/ftue/ftue';
import { getLevel } from '../src/levels';
import { defaultSave, mergeSaves, parseSave } from '../src/platform/save';
import { SIM_DT, World, type PlayerInput } from '../src/sim/world';

const level = getLevel('ftue-meadow');

/** QA FAIL on 086: a player who never makes an aimed x2 hit (holds the centre). */
function centreHold(f: Ftue, seconds: number) {
  const w = new World(level);
  const demo: number[] = [];
  const input: PlayerInput = { aimX: 0, firing: true, queen: false };
  for (let i = 0; i < seconds / SIM_DT && w.outcome === 'playing'; i++) {
    input.queen = w.queenReady;
    f.update(w, input, SIM_DT);
    w.step(input);
    const d = f.demoX(w);
    if (d !== null) demo.push(d);
  }
  return { w, demo };
}

describe('M2-30b FTUE step 2 escape', () => {
  it('constants: demo from attempt 2, escape from attempt 3', () => {
    expect(FTUE_STEP2_DEMO_ATTEMPT).toBe(2);
    expect(FTUE_STEP2_MAX_ATTEMPTS).toBe(3);
  });

  it('attempt 1 is unchanged: stuck in step 2, no demo', () => {
    const f = new Ftue(0, 1, 0, 1);
    const { demo } = centreHold(f, 40);
    expect(f.step).toBe(FtueStep.Gate);
    expect(f.prompt).toBe(FTUE_PROMPTS[FtueStep.Gate]);
    expect(demo).toEqual([]);
  });

  it('attempt 2: ghost slides from the centre onto the x2 gate; step 2 still gated', () => {
    const f = new Ftue(0, 1, 1, 2);
    const { w, demo } = centreHold(f, 20);
    expect(f.step).toBe(FtueStep.Gate);
    expect(Math.max(...demo)).toBeLessThanOrEqual(0.001);
    expect(Math.min(...demo)).toBeCloseTo(w.currentGateX(0), 3); // reaches x -2.8
    expect(demo).toContain(0); // loops back to the centre
  });

  it('attempt 3: step 2 completes at its 6 s timeout and the FTUE continues', () => {
    const f = new Ftue(0, 1, 1, 3);
    centreHold(f, 30);
    expect(f.step).toBeGreaterThan(FtueStep.Gate);
    const e = f.completed.find((c) => c.step === FtueStep.Gate)!;
    expect(e.timedOut).toBe(true); // recorded; game then saves ftueStep = 2 (learned)
  });

  it('save counts step 2 fails (parse, clamp, merge) and game wires it', () => {
    expect(defaultSave().ftueStep2Fails).toBe(0);
    expect(parseSave(JSON.stringify({ version: 1, ftueStep2Fails: 2 })).ftueStep2Fails).toBe(2);
    expect(
      mergeSaves({ ...defaultSave(), ftueStep2Fails: 1 }, { ...defaultSave(), ftueStep2Fails: 2 })
        .ftueStep2Fails,
    ).toBe(2);
    const g = readFileSync('src/game.ts', 'utf8');
    expect(g).toMatch(
      /ftueForLevel\(this\.world\.level\.id, this\.save\.ftueStep, this\.save\.ftueStep2Fails \+ 1\)/,
    );
    expect(g).toMatch(
      /this\.ftue\.step === FtueStep\.Gate && !this\.ftue\.stepKnown\) \{\s*this\.save\.ftueStep2Fails\+\+/,
    );
  });
});

describe('M2-30b escape timing (review: 6.0 s after the step 2 prompt)', () => {
  it('attempt 3: step 2 completes exactly 6.0 s after its prompt appears', () => {
    const w = new World(level);
    const f = new Ftue(0, 1, 1, FTUE_STEP2_MAX_ATTEMPTS);
    const input: PlayerInput = { aimX: 0, firing: true, queen: false };
    let promptAt = -1;
    let doneAt = -1;
    for (let i = 0; i < 60 * 30 && doneAt < 0; i++) {
      f.update(w, input, SIM_DT);
      if (promptAt < 0 && f.prompt === FTUE_PROMPTS[FtueStep.Gate]) promptAt = w.time;
      if (promptAt >= 0 && f.step > FtueStep.Gate) doneAt = w.time;
      w.step(input);
    }
    expect(doneAt - promptAt).toBeCloseTo(6.0, 1);
  });
});
