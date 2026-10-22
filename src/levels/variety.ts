import type { LevelDef } from '../sim/types';

/**
 * M7-9 level-variety lint: every 10-level band must use at least 3 of the 5 features.
 * - moving: a gate with motion amplitude > 0
 * - negative: a trap (sub) gate that is not an obstacle
 * - newEnemy: an enemy beyond the basic wasp (hornet or matriarch) in a wave or boss phase
 * - miniObjective: boss phases (break the nest in stages)
 * - obstacle: a thorn-wall obstacle gate (`obstacle: true`)
 */
export const FEATURES = ['moving', 'negative', 'newEnemy', 'miniObjective', 'obstacle'] as const;
export type Feature = (typeof FEATURES)[number];
export const BAND_LEVELS = 10;
export const MIN_FEATURES = 3;

export function levelFeatures(l: LevelDef): Set<Feature> {
  const f = new Set<Feature>();
  if (l.gates.some((g) => (g.motion?.amplitude ?? 0) > 0)) f.add('moving');
  if (l.gates.some((g) => g.kind === 'sub' && !g.obstacle)) f.add('negative');
  if (l.gates.some((g) => g.obstacle)) f.add('obstacle');
  if (l.bossPhases?.length) f.add('miniObjective');
  const kinds = [
    ...l.waves.map((w) => w.kind),
    ...(l.bossPhases ?? []).flatMap((p) =>
      [...(p.burst ?? []), ...(p.repeat ?? [])].map((w) => w.kind),
    ),
  ];
  if (kinds.some((k) => k !== 'wasp')) f.add('newEnemy');
  return f;
}

export interface BandCoverage {
  band: number;
  from: number;
  to: number;
  features: Feature[];
  ok: boolean;
}

/** Coverage per 10-level band for levels in campaign order (level 1 first). */
export function bandCoverage(levels: LevelDef[]): BandCoverage[] {
  const out: BandCoverage[] = [];
  for (let i = 0; i < levels.length; i += BAND_LEVELS) {
    const f = new Set<Feature>();
    for (const l of levels.slice(i, i + BAND_LEVELS)) for (const x of levelFeatures(l)) f.add(x);
    const features = FEATURES.filter((x) => f.has(x));
    out.push({
      band: i / BAND_LEVELS + 1,
      from: i + 1,
      to: Math.min(levels.length, i + BAND_LEVELS),
      features,
      ok: features.length >= MIN_FEATURES,
    });
  }
  return out;
}

export function formatCoverage(rows: BandCoverage[]): string {
  return rows
    .map(
      (r) =>
        `band ${r.band} (L${r.from}-${r.to}): ${r.features.length}/5 ${r.ok ? 'ok' : 'FAIL'} [${r.features.join(', ')}]`,
    )
    .join('\n');
}
