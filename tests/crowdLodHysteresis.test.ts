import { describe, expect, it } from 'vitest';
import { CrowdLodSwitch, nextBand } from '../src/render/crowdLod';

describe('CrowdLodSwitch', () => {
  it('uses separate enter/exit thresholds', () => {
    const s = new CrowdLodSwitch({ enterAt: 160, exitAt: 120 }, 0);
    expect(s.update(159, 0)).toBe(false);
    expect(s.update(160, 1)).toBe(true);
    expect(s.update(140, 2)).toBe(true); // between exit and enter: stays on
    expect(s.update(121, 3)).toBe(true);
    expect(s.update(120, 4)).toBe(false);
    expect(s.update(150, 5)).toBe(false); // between: stays off
  });

  it('holds a state for at least holdMs', () => {
    const s = new CrowdLodSwitch({ enterAt: 160, exitAt: 120 }, 1500);
    expect(s.update(300, 1000)).toBe(true);
    expect(s.update(10, 1500)).toBe(true); // too soon
    expect(s.update(10, 2499)).toBe(true);
    expect(s.update(10, 2500)).toBe(false);
    expect(s.update(300, 3000)).toBe(false); // too soon again
    expect(s.update(300, 4000)).toBe(true);
  });

  it('does not oscillate when the count hovers around one threshold', () => {
    const s = new CrowdLodSwitch({ enterAt: 160, exitAt: 120 }, 1500);
    let flips = 0;
    let prev = false;
    for (let t = 0; t < 10_000; t += 16) {
      const on = s.update(t % 32 ? 161 : 159, t); // jitters across enterAt every frame
      if (on !== prev) flips++;
      prev = on;
    }
    expect(flips).toBe(1);
  });

  it('caps changes at one per hold window even under a square wave', () => {
    const s = new CrowdLodSwitch({ enterAt: 160, exitAt: 120 }, 1500);
    let flips = 0;
    let prev = false;
    for (let t = 0; t < 15_000; t += 16) {
      const on = s.update(Math.floor(t / 200) % 2 ? 300 : 0, t);
      if (on !== prev) flips++;
      prev = on;
    }
    expect(flips).toBeLessThanOrEqual(Math.ceil(15_000 / 1500));
  });
});

describe('nextBand', () => {
  const edges = [30, 60];
  it('picks bands by distance', () => {
    expect(nextBand(0, 10, edges, 2)).toBe(0);
    expect(nextBand(0, 45, edges, 2)).toBe(1);
    expect(nextBand(0, 90, edges, 2)).toBe(2);
    expect(nextBand(2, 10, edges, 2)).toBe(0);
  });

  it('has a dead zone around each edge', () => {
    expect(nextBand(0, 31, edges, 2)).toBe(0);
    expect(nextBand(1, 29, edges, 2)).toBe(1);
    expect(nextBand(0, 32.1, edges, 2)).toBe(1);
    expect(nextBand(1, 27.9, edges, 2)).toBe(0);
  });

  it('a unit jittering across an edge changes band at most once', () => {
    let b = 0;
    let flips = 0;
    for (let i = 0; i < 1000; i++) {
      const nb = nextBand(b, 30 + Math.sin(i) * 1.9, edges, 2);
      if (nb !== b) flips++;
      b = nb;
    }
    expect(flips).toBe(0);
    b = nextBand(b, 33, edges, 2);
    for (let i = 0; i < 1000; i++) b = nextBand(b, 30 + Math.sin(i) * 1.9, edges, 2);
    expect(b).toBe(1);
  });
});
