import type { World } from './world';

/**
 * Default driver for named trigger waves until the FTUE (M2-7) drives them from tutorial steps:
 * "step3" 6 s into the battle, "step5" once the first queen launches.
 */
export function autoTriggers(w: World): void {
  if (w.time >= 6) w.fireTrigger('step3');
  if (w.stats.queens > 0) w.fireTrigger('step5');
}
