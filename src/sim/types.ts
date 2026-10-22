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
  /** Boss levels: gate appears only from this boss phase (1-based) onward. */
  fromPhase?: number;
  /** M7-9: a thorn-wall obstacle (a short trap placed off the gate column). */
  obstacle?: boolean;
}

export type EnemyKind = 'wasp' | 'hornet' | 'matriarch';

export interface WaveDef {
  /** Seconds after battle start. Exactly one of `at` / `trigger` is set. */
  at?: number;
  /** Named trigger (e.g. FTUE step "step3"); spawned when `World.fireTrigger(name)` is called. */
  trigger?: string;
  kind: EnemyKind;
  count: number;
  x: number;
  spread: number;
}

/** A repeating wave while a boss phase is active. */
export interface RepeatWave {
  every: number;
  kind: EnemyKind;
  count: number;
  x: number;
  spread: number;
}

/** Boss nest phase, entered when nest HP fraction drops to `nestBelow` (1 = at start). */
export interface BossPhase {
  nestBelow: number;
  /** Spawned once on entering the phase. */
  burst?: Omit<WaveDef, 'at' | 'trigger'>[];
  /** Repeating waves while this phase is the current one. */
  repeat?: RepeatWave[];
  /** Multiplies moving-gate speed while this phase is current. */
  gateSpeedScale?: number;
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
  /** Boss levels only; ordered by descending `nestBelow`. */
  bossPhases?: BossPhase[];
  /** M7-3: the last level of a live event (M2-21c C6: no gem revive there). */
  isEventFinalLevel?: boolean;
}

export const enum UnitKind {
  Worker = 0,
  Queen = 1,
  Wasp = 2,
  Hornet = 3,
  /** Wasp Matriarch (boss L5 phase 3). */
  Matriarch = 4,
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
  [UnitKind.Matriarch]: { hp: 120, speed: 1.5, radius: 1.0, team: Team.Wasps },
};

export type BattleOutcome = 'playing' | 'won' | 'lost';

export type SimEvent =
  | { type: 'gate'; gate: number; x: number; y: number; spawned: number }
  | { type: 'trap'; gate: number; x: number; y: number }
  | { type: 'clash'; x: number; y: number }
  | { type: 'nestHit'; damage: number; x: number }
  | { type: 'hiveHit'; damage: number; x: number }
  | { type: 'queen'; x: number }
  | { type: 'frost'; x: number }
  | { type: 'volley'; x: number; count: number }
  | { type: 'honeyBlock'; x: number }
  | { type: 'end'; outcome: BattleOutcome };
