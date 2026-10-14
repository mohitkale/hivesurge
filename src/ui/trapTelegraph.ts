/**
 * M2-32 trap telegraph (design ruling 2026-10-15). Trap gates absorb `value` bees, then break.
 * The label stays at the starting value (e.g. "−600") and a fill bar drains as bees are absorbed.
 * On L2's first trap hit a one-time tip explains it; "shown" is saved, so it never repeats on
 * this device. Trap yield and damage are unchanged.
 */
import type { GateDef } from '../sim/types';

export const TRAP_TIP = {
  text: 'Traps eat bees until drained. Aim for gates!',
  /** Levels whose first trap hit shows the tip (L2, where traps are introduced). */
  levels: ['dandelion-drift'] as readonly string[],
  /** Seconds on screen. */
  durationS: 4,
};

/** Fixed trap label: the starting value, never the remaining count; "✓" once broken. */
export function trapLabelText(g: Pick<GateDef, 'value'>, left: number): string {
  return left > 0 ? `−${g.value}` : '✓';
}

/** Fill-bar fraction, 1 (full) to 0 (drained). */
export function trapFill(g: Pick<GateDef, 'value'>, left: number): number {
  return g.value > 0 ? Math.max(0, Math.min(1, left / g.value)) : 0;
}

/** Show the tip on this trap hit? True once per device (the caller saves `trapTipShown`). */
export function shouldShowTrapTip(levelId: string, trapTipShown: boolean): boolean {
  return !trapTipShown && TRAP_TIP.levels.includes(levelId);
}
