import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Ftue, FTUE_PROMPTS, FtueStep } from '../src/ftue/ftue';
import { getLevel } from '../src/levels';
import { defaultSave, mergeSaves, parseSave } from '../src/platform/save';
import { SIM_DT, World, type PlayerInput } from '../src/sim/world';

const level = getLevel('ftue-meadow');

/**
 * QA 2026-10-15 S2 (M2-30): on attempts 2 and 3 the tester held the cannon in the centre (the
 * charge habit learned in attempt 1), so the M2-29 rule (6 aimed, off-centre x2 hits; step 2
 * never auto-completes) kept "Drag to the x2 gate" up for the whole battle.
 */
function centreFirer(f: Ftue, seconds: number) {
  const w = new World(level);
  const prompts = new Set<string>();
  const input: PlayerInput = { aimX: 0, firing: true, queen: false };
  for (let i = 0; i < seconds / SIM_DT && w.outcome === 'playing'; i++) {
    input.queen = w.queenReady;
    f.update(w, input, SIM_DT);
    w.step(input);
    prompts.add(f.prompt);
  }
  return { w, prompts };
}

describe('M2-30 FTUE retry (stuck "Drag to the x2 gate")', () => {
  it('first attempt is unchanged: a centre-firer stays in step 2 (M2-29 spec)', () => {
    const f = new Ftue();
    const { prompts } = centreFirer(f, 30);
    expect(f.step).toBe(FtueStep.Gate);
    expect(prompts.has(FTUE_PROMPTS[FtueStep.Gate])).toBe(true);
  });

  it('retry after step 2 was learned: steps 1-2 show no prompt and never hold the player', () => {
    const f = new Ftue(0, 1, FtueStep.Gate);
    const { prompts } = centreFirer(f, 30);
    expect(f.step).toBeGreaterThan(FtueStep.Gate);
    expect(prompts.has(FTUE_PROMPTS[FtueStep.Aim])).toBe(false);
    expect(prompts.has(FTUE_PROMPTS[FtueStep.Gate])).toBe(false);
    // Unlearned steps still teach: step 3's prompt shows.
    expect(prompts.has(FTUE_PROMPTS[FtueStep.Lead])).toBe(true);
  });

  it('retry after every step was learned: the battle runs to step 5 with no prompts', () => {
    const f = new Ftue(0, 1, FtueStep.Finish);
    const { prompts } = centreFirer(f, 40);
    expect(f.step).toBeGreaterThanOrEqual(FtueStep.Finish);
    expect([...prompts]).toEqual(['']);
  });

  it('game.ts passes the saved progress and records each completed step', () => {
    const g = readFileSync('src/game.ts', 'utf8');
    expect(g).toMatch(/new Ftue\(0, 1, this\.save\.ftueStep\)/);
    expect(g).toMatch(/this\.save\.ftueStep = e\.step/);
  });
});

describe('M2-33 hold hint shown once (persisted)', () => {
  it('step 1 "Hold and drag to aim" is not shown again once learned', () => {
    const f = new Ftue(0, 1, FtueStep.Aim);
    const { prompts } = centreFirer(f, 5);
    expect(prompts.has(FTUE_PROMPTS[FtueStep.Aim])).toBe(false);
  });

  it('save keeps ftueStep and holdUsed (parse, defaults, merge)', () => {
    expect(defaultSave()).toMatchObject({ ftueStep: 0, holdUsed: false });
    const s = parseSave(JSON.stringify({ ...defaultSave(), ftueStep: 2, holdUsed: true }));
    expect(s).toMatchObject({ ftueStep: 2, holdUsed: true });
    expect(parseSave(JSON.stringify({ version: 1, ftueStep: 99 })).ftueStep).toBe(6);
    const m = mergeSaves({ ...defaultSave(), ftueStep: 3 }, { ...defaultSave(), holdUsed: true });
    expect(m).toMatchObject({ ftueStep: 3, holdUsed: true });
  });

  it('the generic "Hold & drag" HUD hint is hidden once hold was used', () => {
    const g = readFileSync('src/game.ts', 'utf8');
    expect(g).toMatch(/if \(this\.ftue \|\| this\.save\.holdUsed\) this\.hud\.hideHint\(\)/);
    expect(g).toMatch(/this\.save\.holdUsed = true/);
  });
});
