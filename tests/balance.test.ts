import { describe, expect, it } from 'vitest';
import { CLOVER_RUN } from '../src/sim/levels';
import { World, type PlayerInput } from '../src/sim/world';

/** Scripted players to keep Clover Run inside its intended difficulty band. */
function play(policy: (w: World) => PlayerInput): World {
  const w = new World(CLOVER_RUN);
  while (w.outcome === 'playing') w.step(policy(w));
  return w;
}

describe('Clover Run balance', () => {
  it('idle player loses', () => {
    expect(play(() => ({ aimX: 0, firing: false, queen: false })).outcome).toBe('lost');
  });

  it('firing straight up the middle without aiming loses (aiming matters)', () => {
    const w = play(() => ({ aimX: 0.0, firing: true, queen: false }));
    expect(w.outcome).toBe('lost');
  });

  it('a player who aims up the gate column (x 1.3) and uses the queen wins', () => {
    const w = play(() => ({ aimX: 1.3, firing: true, queen: true }));
    expect(w.outcome).toBe('won');
    expect(w.hiveHp).toBeGreaterThan(0);
  });
});
