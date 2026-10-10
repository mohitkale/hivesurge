export type GateKind = 'add' | 'mul' | 'sub';

export interface GateMotion {
  /** Half-distance of travel along x. */
  amplitude: number;
  /** Angular speed in radians per second. */
  speed: number;
  phase?: number;
}

export interface GateDef {
  kind: GateKind;
  value: number;
  /** Centre x at rest. */
  x: number;
  /** Distance up the lane (0 = player hive, laneLength = wasp nest). */
  y: number;
  width: number;
  motion?: GateMotion;
}

export type EnemyKind = 'wasp' | 'hornet';

export interface WaveDef {
  /** Seconds after battle start. */
  at: number;
  kind: EnemyKind;
  count: number;
  x: number;
  spread: number;
}

export interface LevelDef {
  id: string;
  name: string;
  seed: number;
  laneWidth: number;
  laneLength: number;
  timeLimit: number;
  nestHp: number;
  hiveHp: number;
  /** Seconds between worker shots while firing. */
  fireInterval: number;
  /** Seconds of firing needed to charge the Queen. */
  queenCharge: number;
  /** Background trickle: one wasp every N seconds (0 disables). */
  trickleInterval: number;
  gates: GateDef[];
  waves: WaveDef[];
}

export const enum UnitKind {
  Worker = 0,
  Queen = 1,
  Wasp = 2,
  Hornet = 3,
}

export const enum Team {
  Bees = 0,
  Wasps = 1,
}

export interface UnitStats {
  hp: number;
  speed: number;
  radius: number;
  team: Team;
}

export const UNIT_STATS: Record<UnitKind, UnitStats> = {
  [UnitKind.Worker]: { hp: 1, speed: 7, radius: 0.22, team: Team.Bees },
  [UnitKind.Queen]: { hp: 25, speed: 4.2, radius: 0.6, team: Team.Bees },
  [UnitKind.Wasp]: { hp: 1, speed: 4.5, radius: 0.24, team: Team.Wasps },
  [UnitKind.Hornet]: { hp: 8, speed: 3, radius: 0.45, team: Team.Wasps },
};

export type BattleOutcome = 'playing' | 'won' | 'lost';

export type SimEvent =
  | { type: 'gate'; gate: number; x: number; y: number; spawned: number }
  | { type: 'trap'; gate: number; x: number; y: number }
  | { type: 'clash'; x: number; y: number }
  | { type: 'nestHit'; damage: number; x: number }
  | { type: 'hiveHit'; damage: number; x: number }
  | { type: 'queen'; x: number }
  | { type: 'end'; outcome: BattleOutcome };
