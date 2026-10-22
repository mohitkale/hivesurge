import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BlockerCounter,
  HIT_PULSE_S,
  hitsLeft,
  SHATTER_S,
  trapFill,
  trapLabelText,
} from '../src/ui/trapTelegraph';
import { World } from '../src/sim/world';
import { LEVELS } from '../src/levels';
import { SHARDS, SLOTS } from '../src/render/shatter';

// Feedback round 4 #3: blocker health countdown and glass-break shatter.
const g = { value: 5 };

describe('blocker counter logic', () => {
  it('hitsLeft clamps to [0, value] and never goes negative', () => {
    expect(hitsLeft(g, 5)).toBe(5);
    expect(hitsLeft(g, 3)).toBe(3);
    expect(hitsLeft(g, 0)).toBe(0);
    expect(hitsLeft(g, -4)).toBe(0);
    expect(hitsLeft(g, 99)).toBe(5);
    expect(hitsLeft(g, NaN)).toBe(0);
    expect(hitsLeft(g, 2.2)).toBe(3);
    expect(trapLabelText(g, -1)).toBe('');
    expect(trapFill(g, -1)).toBe(0);
  });

  it('counts down live on each hit with a pulse, shatters once at 0, then is gone', () => {
    const c = new BlockerCounter(g);
    expect(c.label).toBe('−5');
    expect(c.visible).toBe(true);
    expect(c.sync(5)).toEqual({ hit: false, shatter: false });
    const shown: string[] = [];
    for (const left of [4, 3, 2, 1]) {
      expect(c.sync(left)).toEqual({ hit: true, shatter: false });
      expect(c.pulse).toBe(1);
      expect(c.labelScale).toBeGreaterThan(1);
      shown.push(c.label);
      c.tick(HIT_PULSE_S);
      expect(c.pulse).toBe(0);
      expect(c.labelScale).toBe(1);
    }
    expect(shown).toEqual(['−4', '−3', '−2', '−1']);
    expect(c.sync(-3)).toEqual({ hit: true, shatter: true });
    expect(c.shown).toBe(0);
    expect(c.label).toBe('');
    expect(c.state).toBe('shattering');
    expect(c.visible).toBe(false);
    // Fires once: later frames (still 0, or a stale negative) do nothing.
    expect(c.sync(0)).toEqual({ hit: false, shatter: false });
    expect(c.sync(-1)).toEqual({ hit: false, shatter: false });
    c.tick(SHATTER_S / 2);
    expect(c.state).toBe('shattering');
    c.tick(SHATTER_S / 2);
    expect(c.state).toBe('gone');
  });

  it('a burst of several hits in one frame jumps straight to the new count', () => {
    const c = new BlockerCounter({ value: 600 });
    expect(c.sync(588)).toEqual({ hit: true, shatter: false });
    expect(c.label).toBe('−588');
    expect(c.sync(590)).toEqual({ hit: false, shatter: false }); // never counts back up
    expect(c.label).toBe('−588');
  });

  it('a 0-value blocker starts gone', () => {
    expect(new BlockerCounter({ value: 0 }).state).toBe('gone');
  });

  it('the sim lets units pass once a blocker is at 0', () => {
    // A lane with one 20-hit blocker in front of the cannon and no enemies.
    const L = {
      ...LEVELS[1],
      gates: [{ kind: 'sub' as const, value: 20, x: 0, y: 8, width: 3 }],
      waves: [],
      trickleInterval: 0,
    };
    const i = 0;
    const w = new World(L);
    const t = L.gates[i];
    const input = { firing: true, aimX: t.x, queen: false };
    for (let k = 0; k < 60 * 40 && w.trapRemaining(i) > 0 && w.outcome === 'playing'; k++)
      w.step(input);
    expect(w.trapRemaining(i)).toBe(0);
    const passes = w.gatePasses[i];
    for (let k = 0; k < 60 * 3 && w.outcome === 'playing'; k++) w.step(input);
    expect(w.trapRemaining(i)).toBe(0); // never negative
    expect(w.gatePasses[i]).toBeGreaterThan(passes); // bees keep crossing the broken line
  });
});

describe('shatter effect budget', () => {
  it('pooled, short and cheap: <= 100 shards in one instanced draw, 0.5 s', () => {
    expect(SHATTER_S).toBe(0.5);
    expect(SHARDS * SLOTS).toBeLessThanOrEqual(100);
    const src = readFileSync('src/render/shatter.ts', 'utf8');
    expect(src).toMatch(/new THREE\.InstancedMesh/);
    expect(src).not.toMatch(/TextureLoader|CanvasTexture/);
    const scene = readFileSync('src/render/scene.ts', 'utf8');
    expect(scene).toMatch(/this\.shatter\.burst\(/);
    expect(scene).toMatch(/this\.shatter\.update\(dt\)/);
  });
});
