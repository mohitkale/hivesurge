import type { GateDef, LevelDef, WaveDef } from '../sim/types';
import { LEVELS } from './index';
import { overrideFor } from './overrides';
import TUNING from './genTuning.json';
import type { Band } from './validate';

/**
 * Feedback round 2026-10-15 (Mohit: "every level looks the same, only the multipliers change").
 * The campaign is the 5 authored levels, then an endless run of generated levels. Each generated
 * level remixes a mid-campaign template so it stays winnable (the bot balance tests check this),
 * but its layout visibly differs: mirrored lanes, shifted gate rows, thorn-wall obstacles, and a
 * bigger, stronger nest with more defenders as the world band rises.
 */
export const AUTHORED = LEVELS.length;
/** Levels per world band (one environment theme per band). */
export const BAND_SIZE = 5;
/** Generated level strength per tier (5 levels), capped so late levels stay winnable. */
export const STRENGTH_STEP = 0.04;
export const STRENGTH_CAP = 1.48;
/** Levels 6..(5 + VALIDATED) are calibrated and checked by the M7-1 validator. */
export const VALIDATED = TUNING.length;

const NAME_A = ['Lavender', 'Moonlit', 'Frost', 'Amber', 'Bramble', 'Ember', 'Misty', 'Golden'];
const NAME_B = ['Hollow', 'Ridge', 'Terrace', 'Crossing', 'Thicket', 'Pass', 'Glade', 'Steps'];

/** 1-based level number → world band (0 = the authored Meadow world). */
export function worldBand(levelNo: number): number {
  return Math.floor((Math.max(1, levelNo) - 1) / BAND_SIZE);
}

/**
 * M7-1 difficulty band of a 1-based level (levels-m2.md generator): position in the 5-level
 * saw-tooth, [A breather, B, B, C, Boss]. Authored levels report their own role.
 */
export function levelBand(levelNo: number): Band {
  return (['A', 'B', 'B', 'C', 'Boss'] as const)[(Math.max(1, levelNo) - 1) % BAND_SIZE];
}

/** Enemy strength multiplier for a 1-based level number (1 for authored levels). */
export function levelStrength(levelNo: number): number {
  if (levelNo <= AUTHORED) return 1;
  return Math.min(STRENGTH_CAP, 1 + STRENGTH_STEP * worldBand(levelNo));
}

const cache = new Map<number, LevelDef>();

/** Campaign level at 0-based index `i` (authored first, then generated; deterministic). */
export function campaignLevel(i: number): LevelDef {
  // M7 (a): an admin-edited row with the same id wins over the shipped / generated level.
  if (i < AUTHORED) return overrideFor(LEVELS[i].id) ?? LEVELS[i];
  const o = overrideFor(`gen-${i + 1}`);
  if (o) return o;
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

/**
 * Nest-HP and wave-size calibration (percent) for generated level n, from `src/levels/genTuning.json`
 * (written by `npm run levels:calibrate`). Past the validated range the table repeats, and the
 * capped strength makes those levels the same shape as validated ones.
 */
export function levelTuning(n: number): [nestPct: number, wavePct: number] {
  const k = n - AUTHORED - 1;
  const t = (TUNING as number[][])[k % TUNING.length] ?? [100, 100];
  return [t[0], t[1] ?? 100];
}

/**
 * M7-1 templated generator (levels-m2.md "Templated level generator"). Band picks the template:
 * A breather = L2 Dandelion Drift, B = L3 Clover Run / L4 Thistle Gauntlet in turn,
 * C = Thistle plus a hornet wave and a moving multiplier, Boss = L5 Wasp Queen Nest (3 phases,
 * the mini-objective). Every level then gets a mirror, a row shift, and a thorn-wall obstacle.
 * `tuning` overrides the calibration (the calibration script uses it). Exported for tests.
 */
export function generateLevel(n: number, tuning = levelTuning(n)): LevelDef {
  const [nestPct, wavePct] = tuning;
  const k = n - AUTHORED - 1;
  const band = levelBand(n);
  const tier = worldBand(n);
  // Template index into LEVELS by saw-tooth position: A→L2, B→L3 then L4, C→L4, Boss→L5.
  const base = LEVELS[[1, 2, 3, 3, 4][(n - 1) % BAND_SIZE]];
  const s = levelStrength(n);
  const ws = (s * wavePct) / 100; // wave strength
  const mirror = tier % 2 === 1 ? -1 : 1;
  // Deterministic per-level row shift (−1, 0 or +1.2 lane units) so gate rows move around.
  const shift = [0, 1.2, -1][(k + tier) % 3];
  const top = base.laneLength - 6;
  const gates: GateDef[] = base.gates.map((g) => {
    const isHiveGuard = g.kind === 'sub' && g.value >= 600; // side walls by the hive stay put
    return {
      ...g,
      x: g.x * mirror,
      y: isHiveGuard || g.fromPhase ? g.y : clamp(g.y + shift, 5, top),
      ...(g.kind === 'sub' && !isHiveGuard ? { value: Math.round(g.value * s) } : {}),
    };
  });
  if (band === 'C') {
    // Greedy row: the first still multiplier starts to drift (never two movers in a row).
    const i = gates.findIndex((g) => g.kind === 'mul' && !g.motion);
    if (i >= 0) {
      const rowHasMover = gates.some(
        (g, j) => j !== i && g.motion && Math.abs(g.y - gates[i].y) < 2,
      );
      if (!rowHasMover) gates[i] = { ...gates[i], motion: { amplitude: 1.2, speed: 0.6 } };
    }
  }
  // Thorn wall obstacle: a short trap off the main gate column, between the first two rows.
  const rows = [...new Set(gates.filter((g) => g.kind !== 'sub').map((g) => g.y))].sort(
    (a, b) => a - b,
  );
  if (rows.length >= 2) {
    const y = Math.round(((rows[0] + rows[1]) / 2) * 10) / 10;
    gates.push({
      kind: 'sub',
      value: Math.round(15 * s),
      x: -3.2 * mirror,
      y,
      width: 1.8,
      obstacle: true,
    });
  }
  const waves: WaveDef[] = base.waves.map((w) => ({
    ...w,
    x: w.x * mirror,
    count: Math.max(1, Math.round(w.count * ws)),
  }));
  if (band === 'C') {
    const at = Math.round(base.timeLimit * 0.45);
    waves.push({ at, kind: 'hornet', count: Math.max(1, Math.round(3 * ws)), x: 0, spread: 3 });
    waves.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
  }
  const bossPhases = base.bossPhases?.map((p) => ({
    ...p,
    ...(p.burst ? { burst: p.burst.map((b) => scaleSpawn(b, ws, mirror)) } : {}),
    ...(p.repeat ? { repeat: p.repeat.map((b) => scaleSpawn(b, ws, mirror)) } : {}),
  }));
  return {
    ...base,
    id: `gen-${n}`,
    name: `${NAME_A[(n * 3) % NAME_A.length]} ${NAME_B[(n * 5) % NAME_B.length]}`,
    seed: base.seed + n * 101,
    nestHp: Math.max(200, Math.round((base.nestHp * s * nestPct) / 1000) * 10),
    gates,
    waves,
    bossPhases,
  };
}

function scaleSpawn<T extends { kind: string; count: number; x: number }>(
  w: T,
  s: number,
  mirror: number,
): T {
  return {
    ...w,
    x: w.x * mirror,
    count: w.kind === 'matriarch' ? w.count : Math.max(1, Math.round(w.count * s)),
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
