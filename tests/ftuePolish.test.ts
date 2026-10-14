import { describe, expect, it } from 'vitest';
import { Ftue, FtueStep, LEAD_TIMEOUT_SPEED_MUL, MIN_PROMPT_DWELL_S } from '../src/ftue/ftue';
import { getLevel } from '../src/levels';
import { SIM_DT, World, type PlayerInput } from '../src/sim/world';

const level = getLevel('ftue-meadow');

/** An instant player: does the step's action on the first tick (aim at the gate, queen asap). */
function instantPlayer(maxT = 120, aimOff = false) {
  const w = new World(level);
  const f = new Ftue();
  const shown: { step: FtueStep; prompt: string; from: number; to: number }[] = [];
  let cur = { step: f.step, prompt: f.prompt, from: 0, to: 0 };
  while (w.outcome === 'playing' && w.time < maxT) {
    const lead = f.leadTargetX(w);
    const input: PlayerInput = {
      aimX:
        lead === null ? (f.step === FtueStep.Gate ? w.currentGateX(0) : 0) : aimOff ? 4.5 : lead,
      firing: f.step >= FtueStep.Aim,
      queen: true,
    };
    f.update(w, input, SIM_DT);
    if (f.prompt !== cur.prompt) {
      shown.push({ ...cur, to: w.time });
      cur = { step: f.step, prompt: f.prompt, from: w.time, to: 0 };
    }
    w.step(input);
  }
  f.update(w, { aimX: 0, firing: false, queen: false }, SIM_DT); // records Finish
  return { w, f, shown };
}

describe('FTUE polish (M2-27, validation-m2.md #1 and #3)', () => {
  it('every prompt (steps 1-4) stays up at least 1.5 s, even for an instant player', () => {
    const { shown, f } = instantPlayer();
    expect(f.completed.map((e) => e.step)).toEqual([
      FtueStep.Aim,
      FtueStep.Gate,
      FtueStep.Lead,
      FtueStep.Queen,
      FtueStep.Finish,
    ]);
    const prompts = shown.filter(
      (s) => s.prompt !== '' && s.step >= FtueStep.Aim && s.step <= FtueStep.Queen,
    );
    expect(prompts.map((p) => p.step)).toEqual([FtueStep.Aim, FtueStep.Gate, FtueStep.Lead]); // an instant player launches the queen before its prompt appears (no dwell needed)
    for (const p of prompts)
      expect(p.to - p.from).toBeGreaterThanOrEqual(MIN_PROMPT_DWELL_S - 1e-9);
  });

  it('the queen prompt, once shown, also stays up 1.5 s', () => {
    const w = new World(level);
    const f = new Ftue();
    let shownAt = -1;
    let gone = -1;
    while (w.outcome === 'playing' && w.time < 120 && gone < 0) {
      const lead = f.leadTargetX(w);
      const visible = f.prompt === 'Tap the queen!';
      if (visible && shownAt < 0) shownAt = w.time;
      if (!visible && shownAt >= 0) gone = w.time;
      // Waits for the prompt, then taps at once.
      const input: PlayerInput = {
        aimX: lead ?? (f.step === FtueStep.Gate ? w.currentGateX(0) : 0),
        firing: f.step >= FtueStep.Aim,
        queen: visible,
      };
      f.update(w, input, SIM_DT);
      w.step(input);
    }
    expect(shownAt).toBeGreaterThan(0);
    expect(gone - shownAt).toBeGreaterThanOrEqual(MIN_PROMPT_DWELL_S - 1e-9);
  });

  it('step 3 timeout halves the moving gate speed; it is restored when the step ends', () => {
    const w = new World(level);
    const f = new Ftue();
    const moving = level.gates.findIndex((g) => g.motion);
    const idle: PlayerInput = { aimX: 0, firing: false, queen: false };
    // Put the controller in step 3 (no bees in flight, so no accidental gate passes).
    f.step = FtueStep.Lead;
    let t = 0;
    for (; t < 5.9; t += SIM_DT) f.update(w, idle, SIM_DT);
    expect(w.gateSpeedMul[moving]).toBe(1);
    for (; t < 6.1; t += SIM_DT) f.update(w, idle, SIM_DT);
    expect(f.emphasis).toBe(true);
    expect(w.gateSpeedMul[moving]).toBe(LEAD_TIMEOUT_SPEED_MUL);
    // The player now gets 5 bees through the slowed gate: step done, speed restored.
    w.gatePasses[moving] += 5;
    f.update(w, idle, SIM_DT);
    expect(f.step).toBe(FtueStep.Queen);
    expect(f.completed.at(-1)).toMatchObject({ step: FtueStep.Lead, timedOut: true });
    expect(w.gateSpeedMul[moving]).toBe(1);
  });

  it('halved speed moves the gate half as far (and aim-ahead agrees)', () => {
    const a = new World(level);
    const b = new World(level);
    const i = level.gates.findIndex((g) => g.motion);
    b.gateSpeedMul[i] = 0.5;
    const idle: PlayerInput = { aimX: 0, firing: false, queen: false };
    for (let k = 0; k < 30; k++) {
      a.step(idle);
      b.step(idle);
    }
    // Angle advanced half as much: predicted 1 s ahead at half speed matches 0.5 s at full.
    const fresh = new World(level);
    fresh.gateSpeedMul[i] = 0.5;
    const full = new World(level);
    expect(fresh.gateXAhead(i, 1)).toBeCloseTo(full.gateXAhead(i, 0.5), 9);
    expect(b.gateXAhead(i, 0)).not.toBeCloseTo(a.gateXAhead(i, 0), 3);
  });
});
