import { describe, expect, it } from 'vitest';
import { BEE_CAP, World, type PlayerInput } from '../src/sim/world';
import { UnitKind } from '../src/sim/types';
import { testLevel } from './helpers';

const idle: PlayerInput = { aimX: 0, firing: false, queen: false };
const fire = (aimX = 0): PlayerInput => ({ aimX, firing: true, queen: false });

function run(w: World, input: PlayerInput, seconds: number) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) w.step(input);
}

describe('World', () => {
  it('fires workers at the configured rate while firing', () => {
    const w = new World(testLevel({ fireInterval: 0.1 }));
    run(w, fire(), 1);
    expect(w.stats.fired).toBeGreaterThanOrEqual(10);
    expect(w.stats.fired).toBeLessThanOrEqual(11);
    run(w, idle, 1);
    expect(w.stats.fired).toBeLessThanOrEqual(11);
  });

  it('x3 gate triples a single worker exactly once', () => {
    const w = new World(testLevel({ gates: [{ kind: 'mul', value: 3, x: 0, y: 5, width: 10 }] }));
    w.bees.spawn(UnitKind.Worker, 0, 4);
    run(w, idle, 0.5);
    expect(w.bees.count).toBe(3);
    run(w, idle, 1);
    expect(w.bees.count).toBe(3); // clones carry the gate bit: no re-trigger
  });

  it('chained gates multiply: x2 then x3 = 6', () => {
    const w = new World(
      testLevel({
        gates: [
          { kind: 'mul', value: 2, x: 0, y: 5, width: 10 },
          { kind: 'mul', value: 3, x: 0, y: 10, width: 10 },
        ],
      }),
    );
    w.bees.spawn(UnitKind.Worker, 0, 4);
    run(w, idle, 2);
    expect(w.bees.count).toBe(6);
  });

  it('add gate adds k workers', () => {
    const w = new World(testLevel({ gates: [{ kind: 'add', value: 4, x: 0, y: 5, width: 10 }] }));
    w.bees.spawn(UnitKind.Worker, 0, 4);
    run(w, idle, 0.5);
    expect(w.bees.count).toBe(5);
  });

  it('sub gate absorbs exactly `value` bees then breaks', () => {
    const w = new World(testLevel({ gates: [{ kind: 'sub', value: 3, x: 0, y: 5, width: 10 }] }));
    for (let i = 0; i < 5; i++) w.bees.spawn(UnitKind.Worker, -2 + i, 4);
    run(w, idle, 0.5);
    expect(w.bees.count).toBe(2);
    expect(w.trapRemaining(0)).toBe(0);
  });

  it('multiply gate clones a queen with her hp', () => {
    const w = new World(testLevel({ gates: [{ kind: 'mul', value: 2, x: 0, y: 5, width: 10 }] }));
    w.bees.spawn(UnitKind.Queen, 0, 4);
    run(w, idle, 0.5);
    expect(w.bees.count).toBe(2);
    expect(w.bees.kind[1]).toBe(UnitKind.Queen);
    expect(w.bees.hp[1]).toBe(25);
  });

  it('respects the unit cap by folding overflow into hp', () => {
    const w = new World(testLevel({ gates: [{ kind: 'add', value: 50, x: 0, y: 5, width: 10 }] }));
    for (let i = 0; i < BEE_CAP - 10; i++) w.bees.spawn(UnitKind.Worker, 0, 0.5);
    w.bees.spawn(UnitKind.Worker, 0, 4.9);
    const before = w.bees.totalHp();
    w.step(idle);
    expect(w.bees.count).toBe(BEE_CAP);
    expect(w.bees.totalHp()).toBe(before + 50); // no hp lost to the cap
  });

  it('contact combat is one-for-one attrition', () => {
    const w = new World(testLevel());
    w.bees.spawn(UnitKind.Worker, 0, 10);
    w.wasps.spawn(UnitKind.Wasp, 0, 10.1);
    w.step(idle);
    expect(w.bees.count).toBe(0);
    expect(w.wasps.count).toBe(0);
    expect(w.stats.kills).toBe(1);
  });

  it('a hornet absorbs several workers', () => {
    const w = new World(testLevel());
    w.wasps.spawn(UnitKind.Hornet, 0, 10);
    for (let i = 0; i < 3; i++) w.bees.spawn(UnitKind.Worker, 0, 10);
    w.step(idle);
    expect(w.bees.count).toBe(0);
    expect(w.wasps.hp[0]).toBe(5);
  });

  it('bees reaching the top damage the nest; win at zero', () => {
    const w = new World(testLevel({ nestHp: 3 }));
    for (let i = 0; i < 3; i++) w.bees.spawn(UnitKind.Worker, i - 1, 39);
    run(w, idle, 0.5);
    expect(w.nestHp).toBe(0);
    expect(w.outcome).toBe('won');
  });

  it('wasps reaching the bottom damage the hive; lose at zero', () => {
    const w = new World(testLevel({ hiveHp: 2 }));
    w.wasps.spawn(UnitKind.Wasp, 3, 1);
    w.wasps.spawn(UnitKind.Wasp, -3, 1);
    run(w, idle, 1);
    expect(w.outcome).toBe('lost');
  });

  it('loses when the timer expires and then stops simulating', () => {
    const w = new World(testLevel({ timeLimit: 1 }));
    run(w, idle, 2);
    expect(w.outcome).toBe('lost');
    expect(w.time).toBeCloseTo(1, 1);
  });

  it('queen charges only while firing and launches once', () => {
    const w = new World(testLevel({ queenCharge: 1 }));
    run(w, idle, 2);
    expect(w.queenReady).toBe(false);
    run(w, fire(), 1.1);
    expect(w.queenReady).toBe(true);
    w.step({ aimX: 0, firing: false, queen: true });
    expect(w.stats.queens).toBe(1);
    expect(w.queenReady).toBe(false);
  });

  it('clamps the cannon to the lane', () => {
    const w = new World(testLevel());
    run(w, { aimX: 99, firing: false, queen: false }, 2);
    expect(w.cannonX).toBeCloseTo(w.maxCannonX, 2);
  });

  it('is deterministic for the same seed and inputs', () => {
    const a = new World(testLevel({ trickleInterval: 0.5, nestHp: 50, hiveHp: 50 }));
    const b = new World(testLevel({ trickleInterval: 0.5, nestHp: 50, hiveHp: 50 }));
    for (let i = 0; i < 600; i++) {
      const inp = fire(Math.sin(i / 40) * 4);
      a.step(inp);
      b.step(inp);
    }
    expect(a.bees.count).toBe(b.bees.count);
    expect(a.nestHp).toBe(b.nestHp);
    expect(a.hiveHp).toBe(b.hiveHp);
  });

  it('revive restores a lost battle exactly once', () => {
    const w = new World(testLevel({ hiveHp: 10, timeLimit: 30 }));
    for (let i = 0; i < 10; i++) w.wasps.spawn(UnitKind.Wasp, 0, 0.41);
    w.wasps.spawn(UnitKind.Wasp, 0, 12);
    w.step(idle);
    expect(w.outcome).toBe('lost');
    expect(w.revive()).toBe(true);
    expect(w.outcome).toBe('playing');
    expect(w.hiveHp).toBe(5);
    expect(w.wasps.count).toBe(0);
    expect(w.revive()).toBe(false);
  });

  it('revive after a timeout grants extra time', () => {
    const w = new World(testLevel({ timeLimit: 1 }));
    run(w, idle, 2);
    expect(w.revive()).toBe(true);
    expect(w.timeLeft).toBeGreaterThanOrEqual(19.9);
    run(w, idle, 5);
    expect(w.outcome).toBe('playing');
  });

  it('cannot revive a won battle', () => {
    const w = new World(testLevel({ nestHp: 1 }));
    w.bees.spawn(UnitKind.Worker, 0, 39.9);
    w.step(idle);
    expect(w.outcome).toBe('won');
    expect(w.revive()).toBe(false);
  });
});
