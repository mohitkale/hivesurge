import { describe, expect, it } from 'vitest';
import { getLevel, LEVELS, parseLevel } from '../src/levels';
import { CLOVER_RUN } from '../src/sim/levels';
import cloverJson from '../src/levels/clover-run.json';

describe('level data files', () => {
  it('loads Clover Run from JSON with the original tuning', () => {
    expect(CLOVER_RUN).toBe(getLevel('clover-run'));
    expect(LEVELS.map((l) => l.id)).toEqual(['clover-run']);
    expect(CLOVER_RUN).toMatchObject({
      seed: 1337,
      laneWidth: 10,
      laneLength: 40,
      timeLimit: 90,
      nestHp: 2600,
      hiveHp: 40,
      fireInterval: 0.11,
      queenCharge: 7,
      trickleInterval: 0.9,
    });
    expect(CLOVER_RUN.gates).toHaveLength(5);
    expect(CLOVER_RUN.gates[2]).toEqual({
      kind: 'mul',
      value: 3,
      x: 0,
      y: 17,
      width: 2.6,
      motion: { amplitude: 3, speed: 0.9 },
    });
    expect(CLOVER_RUN.waves).toHaveLength(9);
    expect(CLOVER_RUN.waves.reduce((s, w) => s + w.count, 0)).toBe(284);
  });

  it('round-trips the JSON exactly', () => {
    expect(parseLevel(cloverJson)).toEqual(cloverJson);
  });

  it('rejects malformed levels', () => {
    expect(() => parseLevel(null)).toThrow();
    expect(() => parseLevel({ ...cloverJson, nestHp: -1 })).toThrow(/nestHp/);
    expect(() =>
      parseLevel({ ...cloverJson, gates: [{ kind: 'div', value: 2, x: 0, y: 1, width: 1 }] }),
    ).toThrow(/kind/);
    expect(() =>
      parseLevel({ ...cloverJson, gates: [{ kind: 'add', value: 2, x: 0, y: 99, width: 1 }] }),
    ).toThrow(/beyond/);
    expect(() =>
      parseLevel({ ...cloverJson, waves: [{ at: 1, kind: 'bee', count: 1, x: 0, spread: 0 }] }),
    ).toThrow(/kind/);
    expect(() => getLevel('nope')).toThrow();
  });
});
