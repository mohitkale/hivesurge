import type { GateDef, LevelDef, WaveDef } from '../sim/types';
import { LEVELS } from './index';

/**
 * Feedback round 2026-10-15 (Mohit: "every level looks the same, only the multipliers change").
 * The campaign is the 5 authored levels, then an endless run of generated levels. Each generated
 * level remixes a mid-campaign template so it stays winnable (the bot balance tests check this),
 * but its layout visibly differs: mirrored lanes, shifted gate rows, thorn-wall obstacles, and a
 * bigger, stronger nest with more defenders as the world band rises.
 */
export const AUTHORED = LEVELS.length;
/** Authored levels used as generator templates (L2 Dandelion Drift, L3 Clover Run, L4 Thistle). */
const TEMPLATES = [1, 2, 3];
/** Levels per world band (one environment theme per band). */
export const BAND_SIZE = 5;
/** Generated level strength per band step, capped so late levels stay winnable. */
export const STRENGTH_STEP = 0.08;
export const STRENGTH_CAP = 1.48;

const NAME_A = ['Lavender', 'Moonlit', 'Frost', 'Amber', 'Bramble', 'Ember', 'Misty', 'Golden'];
const NAME_B = ['Hollow', 'Ridge', 'Terrace', 'Crossing', 'Thicket', 'Pass', 'Glade', 'Steps'];

/** 1-based level number → world band (0 = the authored Meadow world). */
export function worldBand(levelNo: number): number {
  return Math.floor((Math.max(1, levelNo) - 1) / BAND_SIZE);
}

/** Enemy strength multiplier for a 1-based level number (1 for authored levels). */
export function levelStrength(levelNo: number): number {
  if (levelNo <= AUTHORED) return 1;
  const step = Math.floor((levelNo - AUTHORED - 1) / TEMPLATES.length) + 1;
  return Math.min(STRENGTH_CAP, 1 + STRENGTH_STEP * step);
}

const cache = new Map<number, LevelDef>();

/** Campaign level at 0-based index `i` (authored first, then generated; deterministic). */
export function campaignLevel(i: number): LevelDef {
  if (i < AUTHORED) return LEVELS[i];
  let l = cache.get(i);
  if (!l) cache.set(i, (l = generateLevel(i + 1)));
  return l;
}

/** 0-based campaign index of a level id (authored or generated), or -1. */
export function campaignIndexOf(id: string): number {
  const a = LEVELS.findIndex((l) => l.id === id);
  if (a >= 0) return a;
  const m = /^gen-(\d+)$/.exec(id);
  return m ? Number(m[1]) - 1 : -1;
}

/** First campaign level without a star (the "next" level on the map). */
export function campaignNextIndex(bestStars: Record<string, number>, limit = 9999): number {
  for (let i = 0; i < limit; i++) if (!(bestStars[campaignLevel(i).id] > 0)) return i;
  return limit - 1;
}

/** Generated level for 1-based number `n` > AUTHORED. Exported for tests. */
export function generateLevel(n: number): LevelDef {
  const k = n - AUTHORED - 1;
  const base = LEVELS[TEMPLATES[k % TEMPLATES.length]];
  const s = levelStrength(n);
  const mirror = k % 2 === 1 ? -1 : 1;
  // Deterministic per-level row shift (−1, 0 or +1.2 lane units) so gate rows move around.
  const shift = [0, 1.2, -1][Math.floor(k / TEMPLATES.length) % 3];
  const top = base.laneLength - 6;
  const gates: GateDef[] = base.gates.map((g) => {
    const isHiveGuard = g.kind === 'sub' && g.value >= 600; // side walls by the hive stay put
    return {
      ...g,
      x: g.x * mirror,
      y: isHiveGuard ? g.y : clamp(g.y + shift, 5, top),
      ...(g.kind === 'sub' && !isHiveGuard ? { value: Math.round(g.value * s) } : {}),
    };
  });
  // Thorn wall obstacle: a short trap off the main gate column, between the first two rows.
  const rows = [...new Set(gates.filter((g) => g.kind !== 'sub').map((g) => g.y))].sort(
    (a, b) => a - b,
  );
  if (rows.length >= 2) {
    const y = Math.round(((rows[0] + rows[1]) / 2) * 10) / 10;
    gates.push({ kind: 'sub', value: Math.round(15 * s), x: -3.2 * mirror, y, width: 1.8 });
  }
  const waves: WaveDef[] = base.waves.map((w) => ({
    ...w,
    x: w.x * mirror,
    count: Math.round(w.count * s),
  }));
  return {
    ...base,
    id: `gen-${n}`,
    name: `${NAME_A[(n * 3) % NAME_A.length]} ${NAME_B[(n * 5) % NAME_B.length]}`,
    seed: base.seed + n * 101,
    nestHp: Math.round((base.nestHp * s) / 10) * 10,
    gates,
    waves,
    bossPhases: undefined,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
