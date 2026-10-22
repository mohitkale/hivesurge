import { CHESTS } from './defs';

/**
 * M7-3 / M7-10 event rules and reward strings: the publish check part, kept small and free of
 * the live-ops engine so the remote-config loader (initial bundle) stays light.
 */

/** Reward string: `coins:200`, `gems:5`, `chest:silver`, `cards:orchid:2`, `skin:season-s1`, `xp:50`. */
export type Reward = string;

export function rewardValid(r: unknown): boolean {
  if (typeof r !== 'string') return false;
  const [k, a, b] = r.split(':');
  const pos = (v: string | undefined) =>
    !!v && /^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 100000;
  if (k === 'coins' || k === 'gems' || k === 'xp') return pos(a);
  if (k === 'chest') return !!a && a in CHESTS;
  if (k === 'cards') return !!a && /^[a-z-]{2,24}$/.test(a) && pos(b);
  if (k === 'skin') return !!a && /^[a-z0-9-]{2,32}$/.test(a);
  return false;
}

/** Rule twists an event (or the weekly rule-tweak event, M7-10) can apply to its levels. */
export interface EventRules {
  /** All + / × gates gain this value (Pollen Rush). */
  gateAdd?: number;
  /** Wave sizes ×, 0.5..2 (Pollen Rush 1.3). */
  waveMul?: number;
  /** Queen charge time ×, 0.25..2 (Queen's Ball 0.5). */
  queenChargeMul?: number;
  /** Share of wasps that come as hornets, 0..0.6 (Hornet Hunt 0.5). */
  hornetShare?: number;
  /** M7-10 rule tweak: only ×3 gates count (other + / × gates are removed; traps stay). */
  onlyX3?: boolean;
  /** Event levels in the event (default 3); the last one is the event final level. */
  levels?: number;
  /** 1-based campaign level the event levels are built from (default 6, validated range). */
  baseLevel?: number;
  /** Points: per win, per queen, per hornet; multiplier (finale 1.5). */
  points?: { win?: number; queen?: number; hornet?: number; mul?: number };
  /** [points, reward] milestones, ascending. */
  milestones?: [number, Reward][];
}

const inRange = (v: unknown, lo: number, hi: number) =>
  v === undefined || (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi);

/** Publish check for `events[].rules` (remote config M6-5). */
export function validateEventRules(r: unknown, path = 'rules'): string[] {
  const e: string[] = [];
  if (r === undefined) return e;
  if (!r || typeof r !== 'object' || Array.isArray(r)) return [`${path} must be an object`];
  const x = r as EventRules;
  if (!inRange(x.gateAdd, 0, 5)) e.push(`${path}.gateAdd must be 0..5`);
  if (!inRange(x.waveMul, 0.5, 2)) e.push(`${path}.waveMul must be 0.5..2`);
  if (!inRange(x.queenChargeMul, 0.25, 2)) e.push(`${path}.queenChargeMul must be 0.25..2`);
  if (!inRange(x.hornetShare, 0, 0.6)) e.push(`${path}.hornetShare must be 0..0.6`);
  if (x.onlyX3 !== undefined && typeof x.onlyX3 !== 'boolean')
    e.push(`${path}.onlyX3 must be true/false`);
  if (!inRange(x.levels, 1, 10) || (x.levels !== undefined && !Number.isInteger(x.levels)))
    e.push(`${path}.levels must be 1..10`);
  if (!inRange(x.baseLevel, 6, 105)) e.push(`${path}.baseLevel must be 6..105`);
  if (x.points !== undefined) {
    const p = x.points;
    if (!p || typeof p !== 'object') e.push(`${path}.points must be an object`);
    else if (
      !inRange(p.win, 0, 1000) ||
      !inRange(p.queen, 0, 100) ||
      !inRange(p.hornet, 0, 100) ||
      !inRange(p.mul, 0.5, 3)
    )
      e.push(`${path}.points out of range`);
  }
  if (x.milestones !== undefined) {
    const m = x.milestones;
    if (!Array.isArray(m) || m.length > 10) e.push(`${path}.milestones must be up to 10 entries`);
    else if (
      !m.every(
        (v, i) =>
          Array.isArray(v) &&
          Number.isInteger(v[0]) &&
          v[0] > 0 &&
          (i === 0 || v[0] > m[i - 1][0]) &&
          rewardValid(v[1]),
      )
    )
      e.push(`${path}.milestones must be ascending [points, reward] with valid rewards`);
  }
  return e;
}
