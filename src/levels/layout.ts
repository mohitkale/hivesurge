import type { GateDef, LevelDef } from '../sim/types';
import { createRng } from '../sim/rng';

/**
 * Feedback round 4 #4 (Mohit, 2026-10-22: "Every level starts with the same structure of -600
 * at the beginning ... almost all the levels are giving me the same feel"). Gate layouts for
 * generated levels are composed from an opening archetype plus mid-level modules, all from a
 * per-level seed (deterministic). Blocker values follow the army a player can have at that
 * point (`holdValue`), not one fixed number. Waves, nest HP and the A/B/B/C/Boss saw-tooth
 * stay in campaign.ts, so the PLAN difficulty curve and the validator bots are unchanged.
 */

export const OPENINGS = ['gentle', 'split', 'moving', 'blocker', 'walls'] as const;
export type Opening = (typeof OPENINGS)[number];

export const MODULES = [
  'choice',
  'plusMinus',
  'mover',
  'laneSplit',
  'multiBlockers',
  'swinger',
] as const;
export type Module = (typeof MODULES)[number];

/** Bees per second from one barrel at the standard fire interval (0.11 s). */
export const FIRE_RATE = 9;
/** Best-path multiplier cap for sizing blockers (levels-m2.md: best-path product M in 6..18). */
export const FLOW_CAP = 18;
/** Best-path product after which rows only offer x2 / +1 (see buildLayout). */
export const RICH_FLOW = 8;

/** Units out per unit in for a positive gate (+k adds k workers, xk makes k-1 clones). */
export const gateFactor = (g: Pick<GateDef, 'kind' | 'value'>): number =>
  g.kind === 'mul' ? g.value : g.kind === 'add' ? 1 + g.value : 1;

/**
 * Blocker value for an army flowing at `flow` x the base fire rate that should take about
 * `seconds` of full fire to break, at enemy strength `s`. Never below 3.
 */
export function holdValue(flow: number, seconds: number, s: number): number {
  return Math.max(3, Math.round(FIRE_RATE * Math.min(flow, FLOW_CAP) * seconds * s));
}

/** First structure of a level: the gates in the lowest band (first 2.5 lane units), as a kind. */
export function classifyOpening(level: Pick<LevelDef, 'gates'>): Opening {
  const gates = level.gates.filter((g) => !g.fromPhase && !g.obstacle);
  if (!gates.length) return 'gentle';
  const y0 = Math.min(...gates.map((g) => g.y));
  const first = gates.filter((g) => g.y <= y0 + 2.5);
  const subs = first.filter((g) => g.kind === 'sub');
  const pos = first.filter((g) => g.kind !== 'sub');
  if (subs.filter((g) => Math.abs(g.x) >= 2.5).length >= 2) return 'walls';
  if (subs.length) return 'blocker';
  if (pos.some((g) => (g.motion?.amplitude ?? 0) > 0)) return 'moving';
  if (pos.length >= 2) return 'split';
  return 'gentle';
}

const r1 = (v: number) => Math.round(v * 10) / 10;

export interface LayoutCtx {
  /** 1-based level number. */
  n: number;
  laneLength: number;
  /** Enemy strength multiplier (campaign levelStrength). */
  s: number;
  /** World tier (campaign worldBand). */
  tier: number;
  opening: Opening;
  /** Mini-boss tower in front of the nest (band C and boss levels). */
  tower: boolean;
  /**
   * Layout re-roll from the calibration table (genTuning.json 3rd column, default 0): picked
   * when the first layout has no nest size that lands the aim bot in the validator window.
   * The opening archetype does not change.
   */
  variant?: number;
}

export interface Layout {
  gates: GateDef[];
  modules: Module[];
  /** Expected army multiplier along the best column after all rows. */
  flow: number;
}

/** Deterministic seed for level n's layout (independent of the battle seed). */
export const layoutSeed = (n: number): number => (n * 2654435761) >>> 0;

/** Gate layout for generated level n (see the file comment). */
export function buildLayout(c: LayoutCtx): Layout {
  const rng = createRng((layoutSeed(c.n) ^ Math.imul(c.variant ?? 0, 0x9e3779b9)) >>> 0);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length) % xs.length];
  const side = () => (rng() < 0.5 ? -1 : 1);
  const gates: GateDef[] = [];
  let flow = 1;
  // Once the best path already multiplies by RICH_FLOW, later rows only offer small gains, so
  // the best-path product stays near levels-m2.md's 6..18 range (no 100x snowball levels).
  const rich = () => flow >= RICH_FLOW;
  const mulV = () => (!rich() && c.tier >= 2 && rng() < 0.35 ? 3 : 2);
  const addV = () => (rich() ? 1 : pick(c.tier >= 3 ? [2, 3, 5] : [2, 3]));
  // Rows: the opening low on the lane, then evenly spaced mid rows below the tower zone.
  const y0 = r1(6 + rng() * 2);
  const top = c.laneLength - (c.tower ? 11 : 7);
  const mids = c.laneLength >= 40 ? 3 : 2;
  const rowY = Array.from({ length: mids }, (_, k) =>
    r1(y0 + 7 + ((top - y0 - 7) * k) / Math.max(1, mids - 1)),
  );

  // ---- opening
  const sd = side();
  switch (c.opening) {
    case 'gentle':
      gates.push({ kind: 'mul', value: 2, x: r1(sd * 1.7), y: y0, width: 3 });
      flow *= 2;
      break;
    case 'split': {
      const k = pick([2, 3]);
      gates.push(
        { kind: 'add', value: k, x: r1(-sd * 1.6), y: y0, width: 2.4 },
        { kind: 'mul', value: 2, x: r1(sd * 1.6), y: y0, width: 2.4 },
      );
      flow *= Math.max(1 + k, 2);
      break;
    }
    case 'moving':
      gates.push({
        kind: 'mul',
        value: 2,
        x: r1(sd * 1.4),
        y: y0,
        width: 2.6,
        motion: { amplitude: r1(1.6 + rng() * 0.6), speed: r1(0.6 + rng() * 0.3) },
      });
      flow *= 2;
      break;
    case 'blocker':
      // A small blocker right in the middle: shoot around it, or break it for a clean lane.
      gates.push(
        { kind: 'sub', value: holdValue(1, 1.3, c.s), x: 0, y: r1(y0 - 1.5), width: 2.2 },
        { kind: 'add', value: 2, x: r1(sd * 2.6), y: y0, width: 2.4 },
      );
      flow *= 3;
      break;
    case 'walls': {
      // Side walls by the hive, sized to the opening army (was a fixed -600 on every level).
      const v = holdValue(1, 2, c.s);
      gates.push(
        { kind: 'sub', value: v, x: -3.8, y: r1(y0 - 1.5), width: 2.4 },
        { kind: 'sub', value: v, x: 3.8, y: r1(y0 - 1.5), width: 2.4 },
        { kind: 'mul', value: 2, x: r1(sd * 1.4), y: y0, width: 2.6 },
      );
      flow *= 2;
      break;
    }
  }

  // Thorn-wall obstacle (M7-9 variety): a short blocker off the gate column before row 1.
  gates.push({
    kind: 'sub',
    value: holdValue(flow, 0.6, c.s),
    x: r1(-sd * 3.4),
    y: r1((y0 + rowY[0]) / 2),
    width: 1.8,
    obstacle: true,
  });

  // ---- mid rows: no module twice in a row, at most one mover per row.
  const modules: Module[] = [];
  for (const y of rowY) {
    let m: Module = pick(MODULES);
    if (m === modules.at(-1)) m = MODULES[(MODULES.indexOf(m) + 1) % MODULES.length];
    modules.push(m);
    const s2 = side();
    switch (m) {
      case 'choice': {
        const a = { kind: 'add' as const, value: addV(), x: r1(-s2 * 1.5), y, width: 2.4 };
        const b = { kind: 'mul' as const, value: mulV(), x: r1(s2 * 1.5), y, width: 2.2 };
        gates.push(a, b);
        flow *= Math.max(gateFactor(a), gateFactor(b));
        break;
      }
      case 'plusMinus': {
        const g = { kind: 'mul' as const, value: mulV(), x: r1(s2 * 1.6), y, width: 2.4 };
        gates.push(g, {
          kind: 'sub',
          value: holdValue(flow, 1.2, c.s),
          x: r1(-s2 * 1.6),
          y,
          width: 2.6,
        });
        flow *= gateFactor(g);
        break;
      }
      case 'mover': {
        const g: GateDef = {
          kind: 'mul',
          value: mulV(),
          x: r1(s2 * 1.2),
          y,
          width: 2.2,
          motion: { amplitude: 1.8, speed: r1(0.7 + rng() * 0.4), phase: r1(rng() * 6) },
        };
        const a = { kind: 'add' as const, value: 2, x: r1(-s2 * 3), y, width: 2 };
        gates.push(g, a);
        flow *= Math.max(2, gateFactor(g) * 0.8);
        break;
      }
      case 'laneSplit': {
        // A divider down the middle: pick a side (or break through the middle).
        const a = { kind: 'add' as const, value: addV(), x: r1(-s2 * 2.8), y, width: 2.4 };
        const b = { kind: 'mul' as const, value: mulV(), x: r1(s2 * 2.8), y, width: 2.4 };
        gates.push(a, b, { kind: 'sub', value: holdValue(flow, 2, c.s), x: 0, y, width: 1.6 });
        flow *= Math.max(gateFactor(a), gateFactor(b));
        break;
      }
      case 'multiBlockers': {
        // Several weaker blockers with gaps, and a reward through the right gap.
        const v = holdValue(flow, 0.5, c.s);
        for (const x of [-3.2, 0, 3.2])
          gates.push({ kind: 'sub', value: v, x, y: r1(y - 1.5), width: 2 });
        const g = { kind: 'mul' as const, value: 2, x: r1(s2 * 1.6), y: r1(y + 0.5), width: 1.2 };
        gates.push(g);
        flow *= 2;
        break;
      }
      case 'swinger': {
        // One fast, narrow multiplier sweeping the whole lane: time the shot.
        gates.push({
          kind: 'mul',
          value: mulV() + (c.tier >= 1 && !rich() ? 1 : 0),
          x: 0,
          y,
          width: 2,
          motion: { amplitude: 3, speed: r1(1.1 + rng() * 0.3), phase: r1(rng() * 6) },
        });
        flow *= 2;
        break;
      }
    }
  }

  // ---- mini-boss tower in front of the nest (band C and boss levels).
  if (c.tower)
    gates.push({
      kind: 'sub',
      value: holdValue(flow, 1.4, c.s),
      x: r1((rng() - 0.5) * 3),
      y: r1(c.laneLength - 7.5),
      width: 3.2,
      tower: true,
    });
  return { gates, modules, flow };
}

/**
 * Opening archetype for generated level n: seeded, and never the same as level n-1's
 * (`prev` = the previous level's opening).
 */
export function pickOpening(n: number, prev: Opening): Opening {
  const rng = createRng(layoutSeed(n) ^ 0x5bd1e995);
  const options = OPENINGS.filter((o) => o !== prev);
  return options[Math.floor(rng() * options.length) % options.length];
}
