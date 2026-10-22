import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/levels';
import { SIM_DT, World } from '../src/sim/world';
import { MISS_CUE, MissCue } from '../src/ui/missCue';
import { shouldShowTrapTip, TRAP_TIP, trapFill, trapLabelText } from '../src/ui/trapTelegraph';
import { defaultSave, mergeSaves, parseSave } from '../src/platform/save';

const L1 = getLevel('ftue-meadow');
const L2 = getLevel('dandelion-drift');

function fireAt(w: World, x: number, seconds: number, onStep?: () => void) {
  for (let i = 0; i < seconds / SIM_DT && w.outcome === 'playing'; i++) {
    w.step({ aimX: x, firing: true, queen: false });
    onStep?.();
  }
}

describe('M2-31 missed-gate feedback (QA S1-S3: volleys go straight up past the gates)', () => {
  it('the world counts bees that fly past a gate row without passing a gate', () => {
    const w = new World(L1);
    expect(w.gateRowY).toEqual([8, 15]); // x2 row, moving +3 row (traps excluded)
    fireAt(w, 0, 6); // centre: misses the x2 gate at x -2.8
    expect(w.rowMisses[0]).toBeGreaterThan(20);
    const aimed = new World(L1);
    fireAt(aimed, -2.8, 6);
    expect(aimed.rowMisses[0]).toBeLessThan(w.rowMisses[0] / 4);
  });

  it('traps and later-phase gates are never miss targets', () => {
    const w = new World(L2);
    expect(w.gateRowY).toEqual([9, 18]); // the side-wall trap rows at y 5 are not targets
    const L5 = new World(getLevel('wasp-queen-nest'));
    const subYs = getLevel('wasp-queen-nest')
      .gates.filter((g) => g.kind === 'sub')
      .map((g) => g.y);
    for (const y of subYs)
      if (!getLevel('wasp-queen-nest').gates.some((g) => g.kind !== 'sub' && g.y === y))
        expect(L5.gateRowY).not.toContain(y);
  });

  it('design ruling: Missed!, 6 bees, 4 s cooldown, 3 per level, on', () => {
    expect(MISS_CUE).toEqual({
      enabled: true,
      text: 'Missed!',
      minMisses: 6,
      cooldownS: 4,
      maxPerLevel: 3,
    });
  });

  it('cue: fires after 6 misses on a row, then waits out the 4 s cooldown', () => {
    const c = new MissCue(2);
    expect(c.update([5, 0], 0.1)).toBe(-1);
    expect(c.update([6, 0], 0.1)).toBe(0);
    expect(c.update([20, 0], 3)).toBe(-1); // 3 s into the cooldown
    expect(c.update([20, 0], 0.9)).toBe(-1); // misses during the cooldown do not stack
    expect(c.update([26, 0], 0.2)).toBe(0); // 4.1 s: cools down, 6 new misses
    expect(new MissCue(1, { ...MISS_CUE, enabled: false }).update([99], 1)).toBe(-1);
  });

  it('cue: at most 3 per level', () => {
    const c = new MissCue(1);
    let n = 0;
    for (let k = 1; k <= 20; k++) if (c.update([k * 6], 5) >= 0) n++;
    expect(n).toBe(3);
    expect(c.shown).toBe(3);
  });

  it('cue: suppressed while an FTUE prompt is on screen (misses then do not carry over)', () => {
    const c = new MissCue(1);
    expect(c.update([10], 0.1, true)).toBe(-1);
    expect(c.update([10], 0.1, false)).toBe(-1); // absorbed while suppressed
    expect(c.update([16], 0.1, false)).toBe(0);
    expect(c.shown).toBe(1);
  });

  it('game.ts suppresses the cue while the FTUE prompt is non-empty', () => {
    const g = readFileSync('src/game.ts', 'utf8');
    expect(g).toMatch(
      /missCue\?\.update\(\s*w\.rowMisses,\s*dt,\s*!!this\.ftue && this\.ftue\.prompt !== ''/,
    );
  });

  it('a centre-firing L1 player sees the cue within 3 s; an aimed player not on the x2 row', () => {
    const run = (x: number) => {
      const w = new World(L1);
      const c = new MissCue(w.gateRowY.length);
      const cues: [number, number][] = [];
      fireAt(w, x, 3, () => {
        const r = c.update(w.rowMisses, SIM_DT);
        if (r >= 0) cues.push([r, w.time]);
      });
      return cues;
    };
    const centre = run(0);
    expect(centre[0]?.[0]).toBe(0);
    expect(centre[0][1]).toBeLessThan(3);
    expect(run(-2.8).filter(([r]) => r === 0)).toEqual([]);
  });

  it('straight-up volleys are intended: bees fly up their launch column (lane shooter)', () => {
    const w = new World(L1);
    let maxDrift = 0;
    fireAt(w, 0, 3, () => {
      const b = w.bees;
      for (let i = 0; i < b.count; i++)
        if (b.y[i] < 8) maxDrift = Math.max(maxDrift, Math.abs(b.x[i]));
    });
    expect(maxDrift).toBeLessThan(1.2); // the x2 gate span starts at |x| 1.6: centre always misses
  });
});

describe('M2-32 trap telegraph (design ruling)', () => {
  const trapIdx = L2.gates.findIndex((g) => g.kind === 'sub' && g.x < 0);
  const trap = L2.gates[trapIdx];

  it('sim is unchanged: a trap absorbs one bee per crossing, 200 in total (was 600 before feedback round 4)', () => {
    const w = new World(L2);
    expect(w.trapRemaining(trapIdx)).toBe(200);
    fireAt(w, -3.8, 4);
    const left = w.trapRemaining(trapIdx);
    expect(left).toBeLessThan(200);
    expect(200 - left).toBe(w.gatePasses[trapIdx]);
  });

  it('feedback round 4: the label counts down with each absorbed bee (was fixed in M2-32)', () => {
    const w = new World(L2);
    const labels: string[] = [];
    fireAt(w, -3.8, 4, () => labels.push(trapLabelText(trap, w.trapRemaining(trapIdx))));
    expect(labels[0]).toBe('−200');
    expect(new Set(labels).size).toBeGreaterThan(1);
    expect(labels.at(-1)).toBe(`−${w.trapRemaining(trapIdx)}`);
    expect(trapLabelText(trap, 0)).toBe('');
  });

  it('fill bar drains with absorbed bees', () => {
    expect(trapFill(trap, 200)).toBe(1);
    expect(trapFill(trap, 100)).toBe(0.5);
    expect(trapFill(trap, 0)).toBe(0);
    const w = new World(L2);
    const fills: number[] = [];
    fireAt(w, -3.8, 4, () => fills.push(trapFill(trap, w.trapRemaining(trapIdx))));
    for (let i = 1; i < fills.length; i++) expect(fills[i]).toBeLessThanOrEqual(fills[i - 1]);
    expect(fills.at(-1)).toBeLessThan(1);
  });

  it('one-time tip: L2 first trap hit only, then saved as shown', () => {
    expect(TRAP_TIP.text).toMatch(/count down/);
    expect(shouldShowTrapTip('dandelion-drift', false)).toBe(true);
    expect(shouldShowTrapTip('dandelion-drift', true)).toBe(false);
    expect(shouldShowTrapTip('clover-run', false)).toBe(false);
    expect(defaultSave().trapTipShown).toBe(false);
    const s = parseSave(JSON.stringify({ ...defaultSave(), trapTipShown: true }));
    expect(s.trapTipShown).toBe(true);
    expect(mergeSaves(defaultSave(), s).trapTipShown).toBe(true);
    const g = readFileSync('src/game.ts', 'utf8');
    expect(g).toMatch(/shouldShowTrapTip\(w\.level\.id, this\.save\.trapTipShown\)/);
    expect(g).toMatch(/this\.save\.trapTipShown = true;\s*this\.persist\(\)/);
  });
});
