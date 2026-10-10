import { describe, expect, it } from 'vitest';
import { parseLevel } from '../src/levels';
import cloverJson from '../src/levels/clover-run.json';
import { UnitKind } from '../src/sim/types';
import { World } from '../src/sim/world';

const idle = { aimX: 0, firing: false, queen: false };
const base = { ...cloverJson, trickleInterval: 0, waves: [] as unknown[] };

describe('M2-3 schema extensions (DES proposal 1)', () => {
  it('accepts trigger waves and spawns them only when fired', () => {
    const L = parseLevel({
      ...base,
      waves: [
        { trigger: 'step3', kind: 'wasp', count: 8, x: 0, spread: 2 },
        { at: 1, kind: 'wasp', count: 2, x: 0, spread: 1 },
      ],
    });
    expect(L.waves[0]).toEqual({ trigger: 'step3', kind: 'wasp', count: 8, x: 0, spread: 2 });
    const w = new World(L);
    for (let i = 0; i < 120; i++) w.step(idle);
    expect(w.wasps.count).toBe(2);
    w.fireTrigger('step3');
    w.fireTrigger('step3'); // idempotent
    expect(w.wasps.count).toBe(10);
  });

  it('rejects waves with both or neither of at/trigger', () => {
    const wv = { kind: 'wasp', count: 1, x: 0, spread: 0 };
    expect(() => parseLevel({ ...base, waves: [wv] })).toThrow(/exactly one/);
    expect(() => parseLevel({ ...base, waves: [{ ...wv, at: 1, trigger: 'a' }] })).toThrow(
      /exactly one/,
    );
  });

  it('accepts the Wasp Matriarch enemy (hp 120, takes 1/3 damage)', () => {
    const L = parseLevel({
      ...base,
      waves: [{ at: 0, kind: 'matriarch', count: 1, x: 0, spread: 0 }],
    });
    const w = new World(L);
    w.step(idle);
    expect(w.wasps.kind[0]).toBe(UnitKind.Matriarch);
    expect(w.wasps.hp[0]).toBe(120);
  });

  it('accepts bossPhases: bursts, repeat waves and phase-gated gates', () => {
    const L = parseLevel({
      ...base,
      nestHp: 100,
      gates: [
        { kind: 'mul', value: 2, x: 0, y: 10, width: 3 },
        { kind: 'sub', value: 30, x: 0, y: 30, width: 4, fromPhase: 2 },
      ],
      bossPhases: [
        { nestBelow: 1, repeat: [{ every: 1, kind: 'wasp', count: 1, x: 0, spread: 0 }] },
        {
          nestBelow: 0.5,
          burst: [{ kind: 'hornet', count: 3, x: 0, spread: 1 }],
          gateSpeedScale: 1.4,
        },
      ],
    });
    const w = new World(L);
    w.step(idle);
    expect(w.bossPhase).toBe(1);
    expect(w.gateActive(1)).toBe(false);
    for (let i = 0; i < 61; i++) w.step(idle);
    expect(w.wasps.count).toBe(1); // one repeat wave after 1 s
    w.nestHp = 40;
    w.step(idle);
    expect(w.bossPhase).toBe(2);
    expect(w.gateActive(1)).toBe(true);
    let hornets = 0;
    for (let i = 0; i < w.wasps.count; i++) if (w.wasps.kind[i] === UnitKind.Hornet) hornets++;
    expect(hornets).toBe(3);
  });

  it('rejects bad boss data', () => {
    const g = { kind: 'add', value: 1, x: 0, y: 5, width: 1, fromPhase: 3 };
    expect(() => parseLevel({ ...base, gates: [g], bossPhases: [{ nestBelow: 1 }] })).toThrow(
      /fromPhase/,
    );
    expect(() =>
      parseLevel({ ...base, bossPhases: [{ nestBelow: 0.5 }, { nestBelow: 0.8 }] }),
    ).toThrow(/descending/);
    expect(() => parseLevel({ ...base, bossPhases: [{ nestBelow: 1.5 }] })).toThrow(/<= 1/);
    expect(() =>
      parseLevel({ ...base, waves: [{ at: 1, kind: 'dragon', count: 1, x: 0, spread: 0 }] }),
    ).toThrow(/kind/);
  });
});
