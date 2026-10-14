import { describe, expect, it, beforeAll } from 'vitest';
import {
  AutoQuality,
  initialTier,
  isSoftwareRenderer,
  LOW_FLOOR_PIXEL_RATIO,
  qualityOverrideFromUrl,
  TIER_SETTINGS,
} from '../src/render/quality';
import { FixedStepper } from '../src/sim/fixedStep';
import { SIM_DT } from '../src/sim/world';

const SWIFTSHADER =
  'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)';

describe('quality tiers (fix/perf-lowend)', () => {
  it('parses ?quality and ignores junk', () => {
    expect(qualityOverrideFromUrl('?quality=low')).toBe('low');
    expect(qualityOverrideFromUrl('?debug&quality=med')).toBe('med');
    expect(qualityOverrideFromUrl('?quality=high')).toBe('high');
    expect(qualityOverrideFromUrl('?quality=ultra')).toBeNull();
    expect(qualityOverrideFromUrl('')).toBeNull();
  });
  it('detects software renderers and starts them on low', () => {
    expect(isSoftwareRenderer(SWIFTSHADER)).toBe(true);
    expect(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(isSoftwareRenderer('ANGLE (Apple, Apple M2, OpenGL 4.1)')).toBe(false);
    expect(initialTier(null, SWIFTSHADER)).toBe('low');
    expect(initialTier(null, 'Adreno (TM) 640')).toBe('high');
    expect(initialTier('high', SWIFTSHADER)).toBe('high');
  });
  it('tiers get strictly cheaper', () => {
    const [h, m, l] = [TIER_SETTINGS.high, TIER_SETTINGS.med, TIER_SETTINGS.low];
    expect(h.maxPixelRatio).toBeGreaterThan(m.maxPixelRatio);
    expect(m.maxPixelRatio).toBeGreaterThan(l.maxPixelRatio);
    expect(h.particles).toBeGreaterThan(m.particles);
    expect(m.particles).toBeGreaterThan(l.particles);
    expect(h.props).toBeGreaterThan(m.props);
    expect(m.props).toBeGreaterThan(l.props);
    expect(l.lighting).toBe('unlit');
    expect([h, m, l].some((t) => t.shadows)).toBe(false);
  });
  it('steps high -> med -> low -> pixel-ratio floor on a rolling average below 28 fps', () => {
    const q = new AutoQuality('high', false, 2);
    const seen: string[] = [];
    for (let i = 0; i < 2000; i++)
      if (q.sample(100)) seen.push(`${q.tier}${q.floor ? '@floor' : ''}`);
    expect(seen).toEqual(['med', 'low', 'low@floor']);
    expect(q.pixelRatio).toBe(LOW_FLOOR_PIXEL_RATIO);
  });
  it('waits for the settle time and a full window before judging', () => {
    const q = new AutoQuality('high', false, 1);
    // 2 s of 10 fps frames: window full but still inside the 2.5 s settle time.
    for (let i = 0; i < 20; i++) expect(q.sample(100)).toBe(false);
    expect(q.tier).toBe('high');
  });
  it('a single hitch does not drop the tier', () => {
    const q = new AutoQuality('high', false, 1);
    for (let i = 0; i < 600; i++) q.sample(i === 300 ? 900 : 16);
    expect(q.tier).toBe('high');
  });
  it('climbs back from the floor after a load spike (fix/perf-lowend-2)', () => {
    const q = new AutoQuality('high', false, 1);
    for (let i = 0; i < 600; i++) q.sample(100); // spike: high -> med -> low -> floor
    expect(q.label).toBe('low@floor (auto)');
    const seen: string[] = [];
    for (let i = 0; i < 6000; i++) if (q.sample(10)) seen.push(q.label);
    expect(seen).toEqual(['low (auto)', 'med (auto)', 'high (auto)']);
  });
  it('needs sustained headroom before climbing (hysteresis)', () => {
    const q = new AutoQuality('low', false, 1);
    // 45 fps is above the 28 fps drop line but below the 50 fps climb line: stays put.
    for (let i = 0; i < 3000; i++) expect(q.sample(1000 / 45)).toBe(false);
    // 100 fps: no climb before 6 s since the last change.
    const q2 = new AutoQuality('low', false, 1);
    let t = 0;
    let at = -1;
    for (let i = 0; i < 2000 && at < 0; i++) {
      t += 10;
      if (q2.sample(10)) at = t;
    }
    expect(at).toBeGreaterThanOrEqual(6000);
  });
  it('caps only the med <-> high flip-flop', () => {
    const q = new AutoQuality('med', false, 1);
    const flips: string[] = [];
    for (let round = 0; round < 4; round++) {
      for (let i = 0; i < 1500; i++) if (q.sample(8)) flips.push(q.tier);
      for (let i = 0; i < 60; i++) if (q.sample(100)) flips.push(q.tier);
    }
    // One promotion to high; afterwards it drops to med/low and climbs back to med only.
    expect(flips.filter((t) => t === 'high')).toHaveLength(1);
    expect(flips.at(-1)).not.toBe('high');
    expect(flips.filter((t) => t === 'med').length).toBeGreaterThan(1);
  });
  it('a pinned tier survives battle start and auto ticks', () => {
    for (const tier of ['low', 'med', 'high'] as const) {
      const q = new AutoQuality(tier, true, 0.75);
      const pr = q.pixelRatio;
      for (let round = 0; round < 3; round++) {
        q.onBattleStart();
        for (let i = 0; i < 1000; i++) expect(q.sample(round % 2 ? 5 : 250)).toBe(false);
      }
      expect(q.tier).toBe(tier);
      expect(q.pixelRatio).toBe(pr);
      expect(q.label).toBe(`${tier} (pinned)`);
    }
  });
  it('play-start hitches inside the settle time do not drop the tier', () => {
    const q = new AutoQuality('high', false, 1);
    q.onBattleStart();
    // Play start: 2 s of shader-compile / GLB-swap hitches, then smooth frames.
    for (let i = 0; i < 5; i++) expect(q.sample(400)).toBe(false);
    for (let i = 0; i < 600; i++) expect(q.sample(16)).toBe(false);
    expect(q.tier).toBe('high');
  });
  it('a pinned tier never changes', () => {
    const q = new AutoQuality('med', true, 2);
    for (let i = 0; i < 2000; i++) expect(q.sample(200)).toBe(false);
    expect(q.tier).toBe('med');
    expect(q.pixelRatio).toBe(1);
  });
});

describe('fixed-step sim (fix/perf-lowend)', () => {
  const simulate = (fps: number, seconds: number) => {
    const s = new FixedStepper(SIM_DT);
    let steps = 0;
    for (let t = 0; t < seconds * fps; t++) steps += s.advance(1 / fps, () => {});
    return steps;
  };
  it('runs 60 steps per real second at 60, 12, 5 and 4 fps', () => {
    for (const fps of [60, 12, 5, 4])
      expect(Math.abs(simulate(fps, 10) - 600)).toBeLessThanOrEqual(1);
  });
  it('drops only gaps longer than the catch-up cap', () => {
    const s = new FixedStepper(SIM_DT, 0.25);
    expect(s.advance(3, () => {})).toBe(15);
  });
  it('stops stepping when the step callback ends the battle', () => {
    const s = new FixedStepper(SIM_DT);
    expect(s.advance(0.1, (i) => i < 2)).toBe(3);
    expect(s.advance(0, () => {})).toBe(0);
  });
});

// Minimal DOM stand-ins: Input only needs addEventListener and getBoundingClientRect.
class FakeEl extends EventTarget {
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 200, height: 100 };
  }
}
const ptr = (type: string, x = 0, y = 0) =>
  Object.assign(new Event(type), { clientX: x, clientY: y, preventDefault() {} });

describe('input independent of render fps (fix/perf-lowend)', () => {
  let Input: typeof import('../src/ui/input').Input;
  beforeAll(async () => {
    (globalThis as unknown as { window: EventTarget }).window ??= new EventTarget();
    ({ Input } = await import('../src/ui/input'));
  });
  const make = () => {
    const el = new FakeEl();
    const input = new Input(el as unknown as HTMLElement);
    // Lane x = ndc x * 10 (stands in for the camera ray pick).
    input.setPicker((nx) => nx * 10, 4);
    return { el, input };
  };
  it('aims in the pointer handler, with no frame or update() in between', () => {
    const { el, input } = make();
    el.dispatchEvent(ptr('pointerdown', 150, 50)); // ndc x = 0.5 -> lane 5 -> clamped 4
    expect(input.aimX).toBe(4);
    window.dispatchEvent(ptr('pointermove', 90, 50)); // ndc x = -0.1 -> lane -1
    expect(input.aimX).toBeCloseTo(-1);
    expect(input.firing).toBe(true);
  });
  it('a tap shorter than one frame still fires one sim step', () => {
    const { el, input } = make();
    el.dispatchEvent(ptr('pointerdown', 100, 50));
    window.dispatchEvent(ptr('pointerup'));
    expect(input.firing).toBe(false);
    expect(input.takeFire()).toBe(true);
    expect(input.takeFire()).toBe(false);
  });
  it('ignores pointer moves while disabled and resets cleanly', () => {
    const { el, input } = make();
    el.dispatchEvent(ptr('pointerdown', 100, 50));
    input.enabled = false;
    window.dispatchEvent(ptr('pointermove', 190, 50));
    expect(input.aimX).toBe(0);
    input.reset();
    expect(input.takeFire()).toBe(false);
  });
});

describe('perf-lowend-2 helpers', () => {
  it('sim timer stops on teardown', async () => {
    const { startSimTimer } = await import('../src/sim/fixedStep');
    let n = 0;
    const stop = startSimTimer(() => n++, 0.005);
    await new Promise((r) => setTimeout(r, 40));
    stop();
    const after = n;
    expect(after).toBeGreaterThan(0);
    await new Promise((r) => setTimeout(r, 40));
    expect(n).toBe(after);
  });
  it('gate floaters: one per gate per cooldown, at most 3 live', async () => {
    const { FloaterLimiter } = await import('../src/ui/floaterLimiter');
    const f = new FloaterLimiter(600, 3, 700);
    expect(f.allow(0, 0)).toBe(true);
    expect(f.allow(0, 100)).toBe(false); // same gate, same spot: would overlap
    expect(f.allow(1, 100)).toBe(true);
    expect(f.allow(2, 100)).toBe(true);
    expect(f.allow(3, 100)).toBe(false); // 3 live
    expect(f.allow(0, 800)).toBe(true);
  });
  it('overlay text: real fps to one decimal, verts and tris', async () => {
    const { PerfStats } = await import('../src/ui/perfStats');
    const { formatPerf } = await import('../src/ui/perfOverlay');
    const s = new PerfStats();
    for (let i = 0; i < 60; i++) s.sample(i % 2 ? 33.3 : 50, 40, 25000);
    expect(s.avgFps).toBeCloseTo(24.0, 1);
    const t = formatPerf(s, 300, 0.6, 'low (pinned)', 61234);
    expect(t).toContain('fps 24.0');
    expect(t).toContain('verts 61.2k');
    expect(t).toContain('tris 25.0k');
    expect(t).toContain('low (pinned)');
  });
});
