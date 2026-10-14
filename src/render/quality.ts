/**
 * Automatic quality scaling (fix/perf-lowend). Pure logic so it can be unit-tested.
 *
 * Tiers, cheapest last. Each step down drops the next most expensive feature measured on
 * software WebGL (SwiftShader, the low-end proxy; see prs/ for the profile):
 * - high: MSAA (if the context has it), Lambert lighting, fog, full biome props, 800 particles.
 * - med:  pixel ratio <= 1, no fog, backdrop props off (edge scatter kept), 300 particles.
 *         (There are no shadow maps in the game; "shadows off" is a no-op kept for parity.)
 * - low:  unlit vertex-colour materials (no per-fragment lighting), biome props off,
 *         120 particles, pixel ratio 0.6 and then 0.5 if still slow.
 *
 * `?quality=low|med|high` pins a tier (no auto scaling) for debugging and QA.
 */
export type QualityTier = 'high' | 'med' | 'low';
export const TIERS: readonly QualityTier[] = ['high', 'med', 'low'];

export interface TierSettings {
  shadows: boolean;
  /** Upper bound on the renderer pixel ratio (also capped by devicePixelRatio). */
  maxPixelRatio: number;
  /** 'lit' = Lambert + hemisphere/sun, 'unlit' = MeshBasic with baked vertex colours. */
  lighting: 'lit' | 'unlit';
  fog: boolean;
  /** Biome prop share kept: 1 = all, 0.5 = edge scatter only (no backdrop), 0 = none. */
  props: 1 | 0.5 | 0;
  /** Live particle budget. */
  particles: number;
}

export const TIER_SETTINGS: Record<QualityTier, TierSettings> = {
  high: { shadows: false, maxPixelRatio: 2, lighting: 'lit', fog: true, props: 1, particles: 800 },
  med: {
    shadows: false,
    maxPixelRatio: 1,
    lighting: 'lit',
    fog: false,
    props: 0.5,
    particles: 300,
  },
  low: {
    shadows: false,
    maxPixelRatio: 0.6,
    lighting: 'unlit',
    fog: false,
    props: 0,
    particles: 120,
  },
};

/** Last-resort resolution step under 'low'. */
export const LOW_FLOOR_PIXEL_RATIO = 0.5;

/** `?quality=low|med|high`: pinned tier, or null for automatic. Works in every build. */
export function qualityOverrideFromUrl(search: string): QualityTier | null {
  const q = new URLSearchParams(search).get('quality');
  return q === 'low' || q === 'med' || q === 'high' ? q : null;
}

/** CPU / software rasterisers (SwiftShader, llvmpipe, Microsoft Basic Render, etc.). */
export function isSoftwareRenderer(name: string): boolean {
  return /swiftshader|llvmpipe|softpipe|software|basic render|lavapipe/i.test(name);
}

/** Starting tier: the override, else 'low' on a software renderer, else 'high'. */
export function initialTier(override: QualityTier | null, rendererName: string): QualityTier {
  if (override) return override;
  return isSoftwareRenderer(rendererName) ? 'low' : 'high';
}

export interface AutoQualityOptions {
  /** Step down when the rolling average fps stays below this. */
  downFps?: number;
  /** Step up when it stays above this. */
  upFps?: number;
  /** Rolling window length in ms. */
  windowMs?: number;
  /** Minimum time between changes, ms (lets the new tier settle before judging it). */
  settleMs?: number;
  /** Steps up allowed per session (0 disables, avoids high/low ping-pong). */
  maxUpSteps?: number;
}

/**
 * Rolling-average fps watcher. Steps: high -> med -> low -> low@floor. Feed it frame times;
 * it returns true when the tier or pixel ratio changed.
 */
export class AutoQuality {
  tier: QualityTier;
  /** True once 'low' has also dropped to LOW_FLOOR_PIXEL_RATIO. */
  floor = false;
  readonly pinned: boolean;
  private readonly samples: number[] = [];
  private sum = 0;
  private sinceChange = 0;
  private upSteps = 0;
  private readonly o: Required<AutoQualityOptions>;

  constructor(
    start: QualityTier,
    pinned = false,
    private readonly deviceRatio = 1,
    opts: AutoQualityOptions = {},
  ) {
    this.tier = start;
    this.pinned = pinned;
    this.o = { downFps: 28, upFps: 55, windowMs: 2000, settleMs: 2500, maxUpSteps: 1, ...opts };
  }

  get settings(): TierSettings {
    return TIER_SETTINGS[this.tier];
  }

  get pixelRatio(): number {
    const cap = this.floor ? LOW_FLOOR_PIXEL_RATIO : this.settings.maxPixelRatio;
    return Math.min(this.deviceRatio, cap);
  }

  /** Rolling average fps over the window (0 until the window has filled). */
  get avgFps(): number {
    return this.sum >= this.o.windowMs ? (this.samples.length * 1000) / this.sum : 0;
  }

  reset(): void {
    this.samples.length = 0;
    this.sum = 0;
    this.sinceChange = 0;
  }

  sample(frameMs: number): boolean {
    const ms = Math.max(0, Math.min(1000, frameMs));
    this.samples.push(ms);
    this.sum += ms;
    this.sinceChange += ms;
    while (this.samples.length > 1 && this.sum - this.samples[0] >= this.o.windowMs)
      this.sum -= this.samples.shift()!;
    if (this.pinned || this.sinceChange < this.o.settleMs) return false;
    const fps = this.avgFps;
    if (fps === 0) return false;
    if (fps < this.o.downFps) return this.change(-1);
    if (fps > this.o.upFps && this.upSteps < this.o.maxUpSteps) return this.change(1);
    return false;
  }

  private change(dir: -1 | 1): boolean {
    const i = TIERS.indexOf(this.tier);
    if (dir < 0) {
      if (i < TIERS.length - 1) this.tier = TIERS[i + 1];
      else if (!this.floor && this.deviceRatio > LOW_FLOOR_PIXEL_RATIO) this.floor = true;
      else return false;
    } else {
      if (this.floor) this.floor = false;
      else if (i > 0) this.tier = TIERS[i - 1];
      else return false;
      this.upSteps++;
    }
    this.reset();
    return true;
  }
}
