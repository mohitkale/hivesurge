import type { World } from '../sim/world';

/**
 * Feedback round 2026-10-15 (Mohit): the top/bottom bars read as unlabelled decoration and the
 * enemy bar barely moved on a hit (one bee = 1 HP of a 3000+ HP nest = 0.03 %). The HUD now
 * shows both meters as labelled energy values with whole numbers, and the enemy meter shows
 * how many defenders (wasps alive + still to come in timed waves) the nest has left.
 * Pure helpers so the HUD maths is unit-tested without a DOM.
 */
export interface MeterView {
  /** Whole points left (never negative). */
  value: number;
  max: number;
  /** 0..1 fill. */
  frac: number;
}

export function meterView(hp: number, max: number): MeterView {
  const value = Math.max(0, Math.ceil(hp));
  return { value, max, frac: max > 0 ? Math.min(1, value / max) : 0 };
}

export function enemyMeter(w: World): MeterView & { defenders: number } {
  return { ...meterView(w.nestHp, w.level.nestHp), defenders: w.enemyDefenders };
}

export function hiveMeter(w: World): MeterView {
  return meterView(w.hiveHp, w.level.hiveHp);
}

/** `12345` → `12,345` (locale-free so tests are stable). */
export function fmtInt(n: number): string {
  return String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Sums nest damage and releases it as one "-N" pop at most every `gapMs`, so a stream of
 * single-HP hits still produces a readable, steady count-down instead of 60 pops a second.
 */
export class DamagePops {
  private pending = 0;
  private lastAt = -Infinity;
  constructor(private readonly gapMs = 140) {}

  add(damage: number): void {
    if (damage > 0) this.pending += damage;
  }

  /** Damage to show now (0 = nothing yet). */
  take(nowMs: number): number {
    if (this.pending <= 0 || nowMs - this.lastAt < this.gapMs) return 0;
    const d = Math.round(this.pending);
    this.pending = 0;
    this.lastAt = nowMs;
    return d;
  }
}

/** Level 1 meter tutorial: the bars pulse with their captions for this long (seconds). */
export const METER_INTRO_S = 5;
