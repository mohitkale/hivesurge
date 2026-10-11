/**
 * QA-only URL params (M2-21 QA follow-ups). They take effect only in dev builds
 * (`import.meta.env.DEV`); production builds ignore them, so they can never change the
 * economy or ad pacing for players (guardrails: no debug path in production).
 *
 * - `?level=<id>`: start on this level (unknown ids are ignored).
 * - `?revive=force`: show the revive offer on every loss, skipping the nest-damage threshold
 *   and the FTUE/caps checks. One revive per battle still applies (`world.revive()`).
 */
export interface DebugParams {
  level: string | null;
  reviveForce: boolean;
}

export const NO_DEBUG: DebugParams = { level: null, reviveForce: false };

export function debugParamsFromUrl(
  search: string,
  isDev: boolean,
  levelIds: readonly string[],
): DebugParams {
  if (!isDev) return NO_DEBUG;
  const q = new URLSearchParams(search);
  const level = q.get('level');
  return {
    level: level && levelIds.includes(level) ? level : null,
    reviveForce: q.get('revive') === 'force',
  };
}
