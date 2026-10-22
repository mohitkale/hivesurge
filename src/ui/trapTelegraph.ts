/**
 * Trap (blocker) telegraph. Trap gates absorb `value` bees, then break.
 * M2-32 kept the label at the starting value; feedback round 4 (Mohit, 2026-10-22: "the counter
 * should decrease so that we know how many more strikes needed to break the blocking area and it
 * should probably disappear then like a breaking glass effect") replaces that: the label shows the
 * hits still needed, counts down on every hit with a small pulse, never goes below 0, and at 0 the
 * blocker shatters (render/shatter.ts) and is removed so units pass. The drain bar stays.
 * On L2's first trap hit a one-time tip explains it; "shown" is saved, so it never repeats.
 */
import type { GateDef } from '../sim/types';

export const TRAP_TIP = {
  text: 'Blockers count down as bees hit them. Break them or aim for gates!',
  /** Levels whose first trap hit shows the tip (L2, where traps are introduced). */
  levels: ['dandelion-drift'] as readonly string[],
  /** Seconds on screen. */
  durationS: 4,
};

/** Seconds the glass-break effect runs once a blocker reaches 0. */
export const SHATTER_S = 0.5;
/** Seconds a hit pulse takes to decay. */
export const HIT_PULSE_S = 0.16;

/** Hits still needed, clamped to [0, value] (never negative, whatever the sim reports). */
export function hitsLeft(g: Pick<GateDef, 'value'>, left: number): number {
  if (!Number.isFinite(left)) return 0;
  return Math.max(0, Math.min(Math.max(0, g.value), Math.ceil(left)));
}

/** Live trap label: the remaining hit count ("−599"); empty once broken (the gate is gone). */
export function trapLabelText(g: Pick<GateDef, 'value'>, left: number): string {
  const n = hitsLeft(g, left);
  return n > 0 ? `−${n}` : '';
}

/** Fill-bar fraction, 1 (full) to 0 (drained). */
export function trapFill(g: Pick<GateDef, 'value'>, left: number): number {
  return g.value > 0 ? hitsLeft(g, left) / g.value : 0;
}

export type BlockerState = 'live' | 'shattering' | 'gone';

/**
 * Per-blocker view state (pure, no Three.js): what the label shows, the hit pulse and the
 * shatter lifecycle. The renderer feeds it the sim's remaining count each frame.
 */
export class BlockerCounter {
  shown: number;
  pulse = 0;
  state: BlockerState = 'live';
  /** Seconds into the shatter (0..SHATTER_S). */
  shatterT = 0;
  private readonly gate: Pick<GateDef, 'value'>;

  constructor(gate: Pick<GateDef, 'value'>) {
    this.gate = gate;
    this.shown = hitsLeft(gate, gate.value);
    if (this.shown === 0) this.state = 'gone';
  }

  /**
   * Feed the remaining count. `hit` = the label must redraw (count went down);
   * `shatter` = it just reached 0 (fires once).
   */
  sync(left: number): { hit: boolean; shatter: boolean } {
    const n = hitsLeft(this.gate, left);
    if (this.state !== 'live' || n >= this.shown) return { hit: false, shatter: false };
    this.shown = n;
    this.pulse = 1;
    if (n > 0) return { hit: true, shatter: false };
    this.state = 'shattering';
    this.shatterT = 0;
    return { hit: true, shatter: true };
  }

  tick(dt: number): void {
    this.pulse = Math.max(0, this.pulse - dt / HIT_PULSE_S);
    if (this.state === 'shattering') {
      this.shatterT += dt;
      if (this.shatterT >= SHATTER_S) this.state = 'gone';
    }
  }

  get label(): string {
    return trapLabelText(this.gate, this.shown);
  }

  /** Label scale: a quick pop on each hit. */
  get labelScale(): number {
    return 1 + 0.22 * this.pulse;
  }

  /** The gate model is drawn only while live (the shards take over on break). */
  get visible(): boolean {
    return this.state === 'live';
  }
}

/** Show the tip on this trap hit? True once per device (the caller saves `trapTipShown`). */
export function shouldShowTrapTip(levelId: string, trapTipShown: boolean): boolean {
  return !trapTipShown && TRAP_TIP.levels.includes(levelId);
}
