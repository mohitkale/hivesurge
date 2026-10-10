import type { GateDef, GateKind, LevelDef, WaveDef } from '../sim/types';

/** Validates untrusted level JSON (bundled or, later, remote config) into a LevelDef. */
export function parseLevel(raw: unknown): LevelDef {
  const o = obj(raw, 'level');
  const num = (k: string, min = -Infinity): number => {
    const v = o[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min)
      throw new Error(`level.${k} invalid`);
    return v;
  };
  const str = (k: string): string => {
    const v = o[k];
    if (typeof v !== 'string' || v.length === 0) throw new Error(`level.${k} invalid`);
    return v;
  };
  const laneLength = num('laneLength', 1);
  if (!Array.isArray(o.gates) || !Array.isArray(o.waves))
    throw new Error('level.gates/waves must be arrays');
  return {
    id: str('id'),
    name: str('name'),
    seed: num('seed'),
    laneWidth: num('laneWidth', 1),
    laneLength,
    timeLimit: num('timeLimit', 1),
    nestHp: num('nestHp', 1),
    hiveHp: num('hiveHp', 1),
    fireInterval: num('fireInterval', 0.001),
    queenCharge: num('queenCharge', 0),
    trickleInterval: num('trickleInterval', 0),
    gates: o.gates.map((g, i) => parseGate(g, i, laneLength)),
    waves: o.waves.map((w, i) => parseWave(w, i)),
  };
}

const GATE_KINDS: GateKind[] = ['add', 'mul', 'sub'];

function parseGate(raw: unknown, i: number, laneLength: number): GateDef {
  const g = obj(raw, `gates[${i}]`);
  if (!GATE_KINDS.includes(g.kind as GateKind)) throw new Error(`gates[${i}].kind invalid`);
  const gate: GateDef = {
    kind: g.kind as GateKind,
    value: n(g.value, `gates[${i}].value`, 1),
    x: n(g.x, `gates[${i}].x`),
    y: n(g.y, `gates[${i}].y`, 0),
    width: n(g.width, `gates[${i}].width`, 0.1),
  };
  if (gate.y > laneLength) throw new Error(`gates[${i}].y beyond lane`);
  if (g.motion !== undefined) {
    const m = obj(g.motion, `gates[${i}].motion`);
    gate.motion = {
      amplitude: n(m.amplitude, 'motion.amplitude', 0),
      speed: n(m.speed, 'motion.speed'),
    };
    if (m.phase !== undefined) gate.motion.phase = n(m.phase, 'motion.phase');
  }
  return gate;
}

function parseWave(raw: unknown, i: number): WaveDef {
  const w = obj(raw, `waves[${i}]`);
  if (w.kind !== 'wasp' && w.kind !== 'hornet') throw new Error(`waves[${i}].kind invalid`);
  return {
    at: n(w.at, `waves[${i}].at`, 0),
    kind: w.kind,
    count: n(w.count, `waves[${i}].count`, 1),
    x: n(w.x, `waves[${i}].x`),
    spread: n(w.spread, `waves[${i}].spread`, 0),
  };
}

function obj(v: unknown, path: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v))
    throw new Error(`${path} must be an object`);
  return v as Record<string, unknown>;
}

function n(v: unknown, path: string, min = -Infinity): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min) throw new Error(`${path} invalid`);
  return v;
}
