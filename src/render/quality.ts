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

/** Play-start frames that never count toward a tier change. */
export const BATTLE_START_GRACE_MS = 2500;

export interface AutoQualityOptions {
  /** Step down when the rolling average fps stays below this. */
  downFps?: number;
  /** Step up when it stays above this (well above downFps: hysteresis band). */
  upFps?: number;
  /** Rolling window length in ms. */
  windowMs?: number;
  /** Minimum time after any change before stepping down again, ms. */
  settleMs?: number;
  /** Headroom must last this long since the last change before stepping up, ms. */
  upSettleMs?: number;
  /** med -> high promotions allowed per session (caps high/med flip-flopping). */
  maxHighUps?: number;
}

/**
 * Rolling-average fps watcher. Steps: high -> med -> low -> low@floor and back up.
 * Feed it frame times; it returns true when the tier or pixel ratio changed.
 *
 * fix/perf-lowend-2: it can climb back from low/floor after a load spike (only after
 * upSettleMs of sustained headroom, doubled each time a climb is undone within one
 * window), and only the med <-> high flip is capped per session.
 */
export class AutoQuality {
  tier: QualityTier;
  /** True once 'low' has also dropped to LOW_FLOOR_PIXEL_RATIO. */
  floor = false;
  readonly pinned: boolean;
  private readonly samples: number[] = [];
  private sum = 0;
  private sinceChange = 0;
  private highUps = 0;
  private bounces = 0;
  private lastWasUp = false;
  private readonly o: Required<AutoQualityOptions>;

  constructor(
    start: QualityTier,
    pinned = false,
    private readonly deviceRatio = 1,
    opts: AutoQualityOptions = {},
  ) {
    this.tier = start;
    this.pinned = pinned;
    this.o = {
      downFps: 28,
      upFps: 50,
      windowMs: 2000,
      settleMs: 2500,
      upSettleMs: 6000,
      maxHighUps: 1,
      ...opts,
    };
  }

  get settings(): TierSettings {
    return TIER_SETTINGS[this.tier];
  }

  get pixelRatio(): number {
    const cap = this.floor ? LOW_FLOOR_PIXEL_RATIO : this.settings.maxPixelRatio;
    return Math.min(this.deviceRatio, cap);
  }

  /** Label for the overlay / bench: tier, floor, and whether it is pinned. */
  get label(): string {
    return `${this.tier}${this.floor ? '@floor' : ''}${this.pinned ? ' (pinned)' : ' (auto)'}`;
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

  /**
   * Battle start: forget title/transition frames (scene rebuild, shader compiles) so they
   * cannot trigger a drop. Never changes the tier, pinned or not.
   */
  onBattleStart(): void {
    this.reset();
    this.graceLeft = BATTLE_START_GRACE_MS;
  }

  /** Frames ignored right after battle start (shader compiles, GLB swap, scene rebuild). */
  private graceLeft = 0;

  sample(frameMs: number): boolean {
    const ms = Math.max(0, Math.min(1000, frameMs));
    if (this.graceLeft > 0) {
      this.graceLeft -= ms;
      return false;
    }
    this.samples.push(ms);
    this.sum += ms;
    this.sinceChange += ms;
    while (this.samples.length > 1 && this.sum - this.samples[0] >= this.o.windowMs)
      this.sum -= this.samples.shift()!;
    if (this.pinned || this.sinceChange < this.o.settleMs) return false;
    const fps = this.avgFps;
    if (fps === 0) return false;
    if (fps < this.o.downFps) return this.down();
    const upAfter = Math.min(60000, this.o.upSettleMs * 2 ** this.bounces);
    if (fps > this.o.upFps && this.sinceChange >= upAfter) return this.up();
    return false;
  }

  private down(): boolean {
    const i = TIERS.indexOf(this.tier);
    if (i < TIERS.length - 1) this.tier = TIERS[i + 1];
    else if (!this.floor && this.deviceRatio > LOW_FLOOR_PIXEL_RATIO) this.floor = true;
    else return false;
    // A climb that is undone right away is a bounce: wait longer before the next climb.
    if (this.lastWasUp && this.sinceChange < this.o.settleMs + this.o.windowMs) this.bounces++;
    this.lastWasUp = false;
    this.reset();
    return true;
  }

  private up(): boolean {
    if (this.floor) this.floor = false;
    else if (this.tier === 'low') this.tier = 'med';
    else if (this.tier === 'med' && this.highUps < this.o.maxHighUps) {
      this.tier = 'high';
      this.highUps++;
    } else return false;
    this.lastWasUp = true;
    this.reset();
    return true;
  }
}
