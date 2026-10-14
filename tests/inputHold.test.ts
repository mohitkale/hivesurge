import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * M2-31c (QA recheck): "pointer press-and-hold at centre with no movement did not register".
 * Not reproduced (headless CDP mouse + touch, 390x844 and 1280x800: 28 bees / 3 s, no
 * pointercancel). This pins the logic: a pointerdown with no pointermove keeps firing on every
 * sim step until pointerup, and a sub-step tap still fires once (068 latch).
 */
type L = (e: unknown) => void;
const winL: Record<string, L[]> = {};
beforeEach(() => {
  vi.stubGlobal('window', {
    addEventListener: (t: string, f: L) => (winL[t] ??= []).push(f),
  });
  vi.stubGlobal('performance', { now: () => 0 });
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of Object.keys(winL)) delete winL[k];
});

async function setup() {
  const { Input } = await import('../src/ui/input');
  const elL: Record<string, L> = {};
  const el = {
    addEventListener: (t: string, f: L) => (elL[t] = f),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }),
  };
  const input = new Input(el as unknown as HTMLElement);
  input.setPicker(() => 0, 4.4);
  const down = (pointerType: string) =>
    elL.pointerdown({ clientX: 195, clientY: 422, pointerType, preventDefault() {} });
  const up = () => winL.pointerup.forEach((f) => f({}));
  return { input, down, up };
}

describe('M2-31c pointer hold without movement', () => {
  it.each(['mouse', 'touch'])('%s: held with no pointermove fires every step', async (t) => {
    const { input, down, up } = await setup();
    down(t);
    for (let i = 0; i < 180; i++) {
      input.update(1 / 60);
      expect(input.takeFire()).toBe(true);
    }
    up();
    expect(input.takeFire()).toBe(false);
  });

  it('tap shorter than a sim step still fires once (latched)', async () => {
    const { input, down, up } = await setup();
    down('touch');
    up();
    expect(input.takeFire()).toBe(true);
    expect(input.takeFire()).toBe(false);
  });
});
