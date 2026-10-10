import type {
  BossPhase,
  EnemyKind,
  GateDef,
  GateKind,
  LevelDef,
  RepeatWave,
  WaveDef,
} from '../sim/types';

/** Gates are tracked in a 32-bit per-unit bitmask in the sim. */
export const MAX_GATES = 32;

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
  const laneWidth = num('laneWidth', 1);
  if (!Array.isArray(o.gates) || !Array.isArray(o.waves))
    throw new Error('level.gates/waves must be arrays');
  if (o.gates.length > MAX_GATES) throw new Error(`level.gates: at most ${MAX_GATES} gates`);
  if (o.bossPhases !== undefined && !Array.isArray(o.bossPhases))
    throw new Error('level.bossPhases must be an array');
  const gates = o.gates.map((g, i) => parseGate(g, i, laneLength, laneWidth));
  const bossPhases = (o.bossPhases as unknown[] | undefined)?.map((p, i) => parsePhase(p, i));
  if (bossPhases)
    for (let i = 1; i < bossPhases.length; i++)
      if (bossPhases[i].nestBelow >= bossPhases[i - 1].nestBelow)
        throw new Error('bossPhases must have descending nestBelow');
  for (const [i, g] of gates.entries())
    if (g.fromPhase !== undefined && g.fromPhase > (bossPhases?.length ?? 0))
      throw new Error(`gates[${i}].fromPhase beyond bossPhases`);
  const level: LevelDef = {
    id: str('id'),
    name: str('name'),
    seed: num('seed'),
    laneWidth,
    laneLength,
    timeLimit: num('timeLimit', 1),
    nestHp: num('nestHp', 1),
    hiveHp: num('hiveHp', 1),
    fireInterval: num('fireInterval', 0.001),
    queenCharge: num('queenCharge', 0),
    trickleInterval: num('trickleInterval', 0),
    gates,
    waves: o.waves.map((w, i) => parseWave(w, i)),
  };
  if (bossPhases) level.bossPhases = bossPhases;
  return level;
}

const GATE_KINDS: GateKind[] = ['add', 'mul', 'sub'];

function parseGate(raw: unknown, i: number, laneLength: number, laneWidth: number): GateDef {
  const g = obj(raw, `gates[${i}]`);
  if (!GATE_KINDS.includes(g.kind as GateKind)) throw new Error(`gates[${i}].kind invalid`);
  const gate: GateDef = {
    kind: g.kind as GateKind,
    value: int(g.value, `gates[${i}].value`, 1),
    x: n(g.x, `gates[${i}].x`),
    y: n(g.y, `gates[${i}].y`, 0),
    width: n(g.width, `gates[${i}].width`, 0.1),
  };
  if (gate.y > laneLength) throw new Error(`gates[${i}].y beyond lane`);
  // Rest position must fit inside the lane; moving gates are clamped to the lane by gateX().
  if (Math.abs(gate.x) + gate.width / 2 > laneWidth / 2 + 1e-9)
    throw new Error(`gates[${i}] does not fit in lane width`);
  if (g.motion !== undefined) {
    const m = obj(g.motion, `gates[${i}].motion`);
    gate.motion = {
      amplitude: n(m.amplitude, 'motion.amplitude', 0),
      speed: n(m.speed, 'motion.speed'),
    };
    if (m.phase !== undefined) gate.motion.phase = n(m.phase, 'motion.phase');
  }
  if (g.fromPhase !== undefined) gate.fromPhase = int(g.fromPhase, `gates[${i}].fromPhase`, 1);
  return gate;
}

const ENEMY_KINDS: EnemyKind[] = ['wasp', 'hornet', 'matriarch'];

function parseSpawn(w: Record<string, unknown>, path: string) {
  if (!ENEMY_KINDS.includes(w.kind as EnemyKind)) throw new Error(`${path}.kind invalid`);
  return {
    kind: w.kind as EnemyKind,
    count: int(w.count, `${path}.count`, 1),
    x: n(w.x, `${path}.x`),
    spread: n(w.spread, `${path}.spread`, 0),
  };
}

function parseWave(raw: unknown, i: number): WaveDef {
  const path = `waves[${i}]`;
  const w = obj(raw, path);
  const hasAt = w.at !== undefined;
  const hasTrigger = w.trigger !== undefined;
  if (hasAt === hasTrigger) throw new Error(`${path} needs exactly one of at / trigger`);
  const wave: WaveDef = parseSpawn(w, path);
  if (hasAt) wave.at = n(w.at, `${path}.at`, 0);
  else {
    if (typeof w.trigger !== 'string' || !w.trigger) throw new Error(`${path}.trigger invalid`);
    wave.trigger = w.trigger;
  }
  return wave;
}

function parsePhase(raw: unknown, i: number): BossPhase {
  const path = `bossPhases[${i}]`;
  const p = obj(raw, path);
  const nestBelow = n(p.nestBelow, `${path}.nestBelow`, 0);
  if (nestBelow > 1) throw new Error(`${path}.nestBelow must be <= 1`);
  const phase: BossPhase = { nestBelow };
  if (p.burst !== undefined) {
    if (!Array.isArray(p.burst)) throw new Error(`${path}.burst must be an array`);
    phase.burst = p.burst.map((b, j) =>
      parseSpawn(obj(b, `${path}.burst[${j}]`), `${path}.burst[${j}]`),
    );
  }
  if (p.repeat !== undefined) {
    if (!Array.isArray(p.repeat)) throw new Error(`${path}.repeat must be an array`);
    phase.repeat = p.repeat.map((r, j): RepeatWave => {
      const rp = `${path}.repeat[${j}]`;
      const o = obj(r, rp);
      return { every: n(o.every, `${rp}.every`, 0.5), ...parseSpawn(o, rp) };
    });
  }
  if (p.gateSpeedScale !== undefined)
    phase.gateSpeedScale = n(p.gateSpeedScale, `${path}.gateSpeedScale`, 0.1);
  return phase;
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

function int(v: unknown, path: string, min: number): number {
  const x = n(v, path, min);
  if (!Number.isInteger(x)) throw new Error(`${path} must be an integer`);
  return x;
}
