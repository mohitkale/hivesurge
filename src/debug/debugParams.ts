/**
 * QA-only URL params (M2-21 QA follow-ups, M2-19a). They take effect only in dev builds
 * (`import.meta.env.DEV`); production builds ignore them, so they can never change the
 * economy or ad pacing for players (guardrails: no debug path in production).
 *
 * - `?level=<id>`: start on this level (unknown ids are ignored).
 * - `?revive=force`: show the revive offer on every loss, skipping the nest-damage threshold
 *   and the FTUE/caps checks. One revive per battle still applies (`world.revive()`).
 * - `?battle=<N>` (M2-19a, e.g. `?debug&battle=6`): make the next battle the player's Nth.
 *   Seeds the save as if N-1 battles were completed: FTUE done, `battlesCompleted = N-1`
 *   and one star on the first N-1 levels, so G1 (interstitials from battle 6) and G2
 *   (rewarded offers from battle 4) apply as on a real device. It never lowers progress
 *   and writes into the dev save (clear localStorage to reset). N is an integer, 1..999.
 */
import type { SaveData } from '../platform/save';

export interface DebugParams {
  level: string | null;
  reviveForce: boolean;
  battle: number | null;
}

export const NO_DEBUG: DebugParams = { level: null, reviveForce: false, battle: null };

export const MAX_DEBUG_BATTLE = 999;

export function debugParamsFromUrl(
  search: string,
  isDev: boolean,
  levelIds: readonly string[],
): DebugParams {
  if (!isDev) return NO_DEBUG;
  const q = new URLSearchParams(search);
  const level = q.get('level');
  const b = q.get('battle');
  const n = b !== null && /^\d+$/.test(b) ? Number(b) : NaN;
  return {
    level: level && levelIds.includes(level) ? level : null,
    reviveForce: q.get('revive') === 'force',
    battle: n >= 1 && n <= MAX_DEBUG_BATTLE ? n : null,
  };
}

/** `?battle=N`: seed the save so the next battle is battle N (see above). Dev only. */
export function seedSaveForBattle(
  save: Pick<SaveData, 'battlesCompleted' | 'ftueDone' | 'bestStars'>,
  battle: number,
  levelIds: readonly string[],
): void {
  if (battle <= 1) return;
  const done = battle - 1;
  save.ftueDone = true;
  save.battlesCompleted = Math.max(save.battlesCompleted, done);
  for (const id of levelIds.slice(0, done))
    save.bestStars[id] = Math.max(save.bestStars[id] ?? 0, 1);
}
