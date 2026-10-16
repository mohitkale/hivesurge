import { crossesGate, gateSpawnCount, gateXAtAngle } from './gates';
import { SpatialGrid } from './grid';
import { createRng } from './rng';
import {
  UNIT_STATS,
  UnitKind,
  type BattleOutcome,
  type EnemyKind,
  type LevelDef,
  type SimEvent,
  type WaveDef,
} from './types';

/** Matriarch takes 1/3 damage per contact: it costs about 3 bees per hp. */
export const MATRIARCH_DAMAGE_TAKEN = 1 / 3;

const ENEMY_UNIT: Record<EnemyKind, UnitKind> = {
  wasp: UnitKind.Wasp,
  hornet: UnitKind.Hornet,
  matriarch: UnitKind.Matriarch,
};
import { UnitPool } from './units';
import {
  DOUBLE_CANNON_DX,
  MEGA_SWARM_INTERVAL_MUL,
  MEGA_SWARM_MUL,
  boostEnemyScale,
  type BattleBoosts,
} from './boosts';

export const SIM_DT = 1 / 60;
export const BEE_CAP = 600;
export const WASP_CAP = 400;
/** Units spawn just in front of the hive / nest. */
export const CANNON_Y = 1.2;

export interface PlayerInput {
  /** Desired cannon x (lane space). */
  aimX: number;
  firing: boolean;
  /** Edge-triggered: launch Queen if charged. */
  queen: boolean;
}

/**
 * Deterministic fixed-step battle simulation. Pure logic (no DOM / Three.js),
 * so it is unit-testable and could later run in a worker or on a server.
 */
export class World {
  readonly level: LevelDef;
  readonly bees = new UnitPool(BEE_CAP);
  readonly wasps = new UnitPool(WASP_CAP);
  readonly events: SimEvent[] = [];
  time = 0;
  cannonX = 0;
  nestHp: number;
  hiveHp: number;
  queenCharge = 0;
  outcome: BattleOutcome = 'playing';
  stats = { fired: 0, gateSpawns: 0, peakBees: 0, kills: 0, queens: 0 };
  /** Bees (incl. queens) that crossed each gate line, traps included. */
  readonly gatePasses: number[];
  /**
   * M2-31: rows of positive (non-trap) gates, by y. `rowMisses[r]` counts bees that crossed row
   * r's y without passing any of its gates (a missed gate). Counters only, no per-bee events.
   */
  readonly gateRowY: number[] = [];
  readonly rowMisses: number[] = [];
  private readonly rowMask: number[] = [];
  /** FTUE: while true, wasps reaching the hive deal no damage (ftue-m2.md: no loss before step 5). */
  hiveShield = false;

  private readonly rng: () => number;
  private fireTimer = 0;
  private trickleTimer = 0;
  private nextWave = 0;
  private readonly trapLeft: number[];
  private readonly gateXs: number[];
  /** Accumulated motion angle per gate (integrated per tick). */
  private readonly gateAngles: number[];
  /** Per-gate speed multiplier (FTUE step 3 timeout halves the moving gate, M2-27). */
  readonly gateSpeedMul: number[];
  private readonly waspGrid: SpatialGrid;
  /** Timed waves sorted by `at`; trigger waves are spawned by fireTrigger(). */
  private readonly timedWaves: WaveDef[];
  private readonly firedTriggers = new Set<string>();
  /** Current boss phase (0 = none entered yet). */
  bossPhase = 0;
  private repeatTimers: number[] = [];

  /** Pre-level boosts (feedback 2026-10-15); empty = none. */
  readonly boosts: BattleBoosts;

  constructor(level: LevelDef, boosts: BattleBoosts = {}) {
    if (level.gates.length > 32) throw new Error('max 32 gates per level');
    this.boosts = { ...boosts };
    const k = boostEnemyScale(this.boosts);
    if (k.nestHp !== 1 || k.waves !== 1)
      level = {
        ...level,
        nestHp: Math.round(level.nestHp * k.nestHp),
        waves: level.waves.map((w) => ({ ...w, count: Math.round(w.count * k.waves) })),
      };
    this.level = level;
    this.nestHp = level.nestHp;
    this.hiveHp = level.hiveHp;
    this.rng = createRng(level.seed);
    this.trapLeft = level.gates.map((g) => (g.kind === 'sub' ? g.value : 0));
    this.gateXs = level.gates.map((g) => g.x);
    this.gatePasses = level.gates.map(() => 0);
    this.gateAngles = level.gates.map(() => 0);
    this.gateSpeedMul = level.gates.map(() => 1);
    this.waspGrid = new SpatialGrid(level.laneWidth, level.laneLength, 1, WASP_CAP);
    this.timedWaves = level.waves
      .filter((w) => w.at !== undefined)
      .sort((a, b) => (a.at as number) - (b.at as number));
    for (let i = 0; i < level.gates.length; i++) if (!this.gateActive(i)) this.gateXs[i] = OFF_LANE;
    level.gates.forEach((g, i) => {
      if (g.kind === 'sub' || g.fromPhase) return; // traps and phase gates are not targets
      let r = this.gateRowY.indexOf(g.y);
      if (r < 0) {
        r = this.gateRowY.push(g.y) - 1;
        this.rowMisses.push(0);
        this.rowMask.push(0);
      }
      this.rowMask[r] |= 1 << i;
    });
  }

  /** Gates with `fromPhase` stay inactive (off-lane, invisible) until that boss phase. */
  gateActive(i: number): boolean {
    return (this.level.gates[i].fromPhase ?? 0) <= this.bossPhase;
  }

  /** Current boss-phase multiplier on moving-gate speed (1 outside boss phases). */
  get gateSpeedScale(): number {
    return this.level.bossPhases?.[this.bossPhase - 1]?.gateSpeedScale ?? 1;
  }

  /** Predicted x of gate i `seconds` from now at the current speed (aim-ahead / lead). */
  gateXAhead(i: number, seconds: number): number {
    const g = this.level.gates[i];
    const ahead = g.motion
      ? seconds * g.motion.speed * this.gateSpeedScale * this.gateSpeedMul[i]
      : 0;
    return gateXAtAngle(g, this.gateAngles[i] + ahead, this.level.laneWidth);
  }

  /** Spawn all waves with this trigger name (once per name). */
  fireTrigger(name: string): void {
    if (this.firedTriggers.has(name)) return;
    this.firedTriggers.add(name);
    for (const w of this.level.waves) if (w.trigger === name) this.spawnWave(w);
  }

  get maxCannonX(): number {
    return this.level.laneWidth / 2 - 0.6;
  }

  /** Seconds of firing to charge the Queen (halved by the Fast Queen boost). */
  get queenChargeMax(): number {
    return this.level.queenCharge * (this.boosts.fastQueen ? 0.5 : 1);
  }

  /** Seconds between shots (halved by the 2x Fire speed boost). */
  get fireInterval(): number {
    return (
      this.level.fireInterval *
      (this.boosts.fastFire ? 0.5 : 1) *
      (this.boosts.megaSwarm ? MEGA_SWARM_INTERVAL_MUL : 1)
    );
  }

  get queenReady(): boolean {
    return this.queenCharge >= this.queenChargeMax;
  }

  /** Extra seconds granted by a revive. */
  timeBonus = 0;
  revives = 0;

  get timeLimit(): number {
    return this.level.timeLimit + this.timeBonus;
  }

  get timeLeft(): number {
    return Math.max(0, this.timeLimit - this.time);
  }

  /**
   * Rewarded revive: once per battle, after a loss. Restores half the hive,
   * clears wasps near the hive and grants 20 extra seconds if time is short.
   */
  revive(): boolean {
    if (this.outcome !== 'lost' || this.revives > 0) return false;
    this.revives++;
    this.hiveHp = Math.max(this.hiveHp, Math.ceil(this.level.hiveHp / 2));
    // Clear ordinary wasps near the hive; bosses (Matriarch) survive a revive.
    for (let i = 0; i < this.wasps.count; i++)
      if (this.wasps.y[i] < 15 && this.wasps.kind[i] !== UnitKind.Matriarch) this.wasps.hp[i] = 0;
    this.wasps.sweepDead();
    if (this.timeLeft < 20) this.timeBonus += 20 - this.timeLeft;
    this.outcome = 'playing';
    return true;
  }

  /** Wasps in timed waves that have not spawned yet (trigger / boss waves are not counted). */
  get pendingWaveWasps(): number {
    let n = 0;
    for (let i = this.nextWave; i < this.timedWaves.length; i++) n += this.timedWaves[i].count;
    return n;
  }

  /** Feedback 2026-10-15: enemy defenders shown on the HUD = wasps alive + still to come. */
  get enemyDefenders(): number {
    return this.wasps.count + this.pendingWaveWasps;
  }

  /** Remaining traps per gate (sub gates absorb `value` bees, then break). */
  trapRemaining(i: number): number {
    return this.trapLeft[i];
  }

  currentGateX(i: number): number {
    return this.gateXs[i];
  }

  step(input: PlayerInput, dt = SIM_DT): void {
    if (this.outcome !== 'playing') return;
    const L = this.level;
    this.time += dt;
    this.updateBossPhase();
    const speedScale = this.gateSpeedScale;
    for (let i = 0; i < L.gates.length; i++) {
      const m = L.gates[i].motion;
      if (m) this.gateAngles[i] += dt * m.speed * speedScale * this.gateSpeedMul[i];
      this.gateXs[i] = this.gateActive(i)
        ? gateXAtAngle(L.gates[i], this.gateAngles[i], L.laneWidth)
        : OFF_LANE;
    }

    // Cannon: ease toward aim, clamp to lane.
    const target = Math.max(-this.maxCannonX, Math.min(this.maxCannonX, input.aimX));
    this.cannonX += (target - this.cannonX) * Math.min(1, dt * 18);

    // Fire workers + charge queen.
    if (input.firing) {
      this.fireTimer -= dt;
      this.queenCharge = Math.min(this.queenChargeMax, this.queenCharge + dt);
      // Round 3: boosts hold for the whole level (no timer).
      const perBarrel = this.boosts.megaSwarm ? MEGA_SWARM_MUL : 1;
      const barrels = this.boosts.doubleCannon ? [-DOUBLE_CANNON_DX, DOUBLE_CANNON_DX] : [0];
      while (this.fireTimer <= 0) {
        this.fireTimer += this.fireInterval;
        for (const dx of barrels)
          for (let k = 0; k < perBarrel; k++) {
            const jitter = (this.rng() - 0.5) * (k === 0 ? 0.3 : 1.2);
            const x = clamp(this.cannonX + dx + jitter, L.laneWidth / 2 - 0.25);
            if (this.bees.spawn(UnitKind.Worker, x, CANNON_Y) >= 0) this.stats.fired++;
          }
      }
    } else {
      this.fireTimer = Math.min(this.fireTimer, 0);
    }
    if (input.queen && this.queenReady) {
      if (this.bees.spawn(UnitKind.Queen, this.cannonX, CANNON_Y) >= 0) {
        this.queenCharge = 0;
        this.stats.queens++;
        this.events.push({ type: 'queen', x: this.cannonX });
      }
    }

    this.spawnEnemies(dt);
    this.moveBees(dt);
    this.moveWasps(dt);
    this.resolveCombat();
    this.bees.sweepDead();
    this.wasps.sweepDead();
    this.stats.peakBees = Math.max(this.stats.peakBees, this.bees.count);

    if (this.nestHp <= 0) this.finish('won');
    else if (this.hiveHp <= 0 || this.time >= this.timeLimit) this.finish('lost');
  }

  private finish(outcome: BattleOutcome): void {
    this.outcome = outcome;
    this.nestHp = Math.max(0, this.nestHp);
    this.hiveHp = Math.max(0, this.hiveHp);
    this.events.push({ type: 'end', outcome });
  }

  private updateBossPhase(): void {
    const phases = this.level.bossPhases;
    if (!phases) return;
    const frac = this.nestHp / this.level.nestHp;
    while (this.bossPhase < phases.length && frac <= phases[this.bossPhase].nestBelow) {
      const p = phases[this.bossPhase++];
      for (const b of p.burst ?? []) this.spawnWave(b);
      this.repeatTimers = (p.repeat ?? []).map(() => 0);
    }
  }

  private spawnWave(w: Omit<WaveDef, 'at' | 'trigger'>): void {
    const L = this.level;
    const top = L.laneLength - 1;
    const kind = ENEMY_UNIT[w.kind];
    for (let k = 0; k < w.count; k++) {
      const x = w.x + (this.rng() - 0.5) * 2 * w.spread;
      const y = top + this.rng() * 1.5;
      this.wasps.spawn(kind, clamp(x, L.laneWidth / 2 - 0.3), y);
    }
  }

  private spawnEnemies(dt: number): void {
    const L = this.level;
    const top = L.laneLength - 1;
    while (
      this.nextWave < this.timedWaves.length &&
      (this.timedWaves[this.nextWave].at as number) <= this.time
    )
      this.spawnWave(this.timedWaves[this.nextWave++]);
    const repeats = L.bossPhases?.[this.bossPhase - 1]?.repeat;
    if (repeats)
      repeats.forEach((r, i) => {
        this.repeatTimers[i] += dt;
        if (this.repeatTimers[i] >= r.every) {
          this.repeatTimers[i] -= r.every;
          this.spawnWave(r);
        }
      });
    if (L.trickleInterval > 0) {
      this.trickleTimer += dt;
      // Pressure ramps up over the battle.
      const interval = L.trickleInterval / (1 + this.time / 45);
      while (this.trickleTimer >= interval) {
        this.trickleTimer -= interval;
        const x = (this.rng() - 0.5) * (L.laneWidth - 1);
        this.wasps.spawn(UnitKind.Wasp, x, top);
      }
    }
  }

  private moveBees(dt: number): void {
    const L = this.level;
    const b = this.bees;
    const half = L.laneWidth / 2 - 0.25;
    for (let i = b.count - 1; i >= 0; i--) {
      const kind = b.kind[i] as UnitKind;
      const st = UNIT_STATS[kind];
      const prevY = b.y[i];
      // Gentle lateral wobble + damping; keeps streams readable.
      b.vx[i] = b.vx[i] * 0.9 + (this.rng() - 0.5) * 0.6;
      b.x[i] = clamp(b.x[i] + b.vx[i] * dt, half);
      b.y[i] += st.speed * dt;

      for (let g = 0; g < L.gates.length; g++) {
        const bit = 1 << g;
        if (b.gates[i] & bit) continue;
        const gate = L.gates[g];
        if (!crossesGate(gate, this.gateXs[g], b.x[i], prevY, b.y[i])) continue;
        b.gates[i] |= bit;
        this.gatePasses[g]++;
        if (gate.kind === 'sub') {
          if (this.trapLeft[g] > 0) {
            this.trapLeft[g]--;
            b.hp[i] = 0;
            this.events.push({ type: 'trap', gate: g, x: b.x[i], y: gate.y });
          }
          continue;
        }
        this.applyGate(i, g);
      }
      for (let r = 0; r < this.gateRowY.length; r++) {
        const ry = this.gateRowY[r];
        if (ry > prevY && ry <= b.y[i] && (b.gates[i] & this.rowMask[r]) === 0 && b.hp[i] > 0)
          this.rowMisses[r]++;
      }

      if (b.y[i] >= L.laneLength - 0.5 && b.hp[i] > 0) {
        const dmg = b.hp[i];
        this.nestHp -= dmg;
        b.hp[i] = 0;
        this.events.push({ type: 'nestHit', damage: dmg, x: b.x[i] });
      }
    }
  }

  /** Spawn clones / additions for bee i at gate g. Overflow becomes HP on the source bee. */
  private applyGate(i: number, g: number): void {
    const b = this.bees;
    const gate = this.level.gates[g];
    const n = gateSpawnCount(gate);
    let spawned = 0;
    const kind = b.kind[i] as UnitKind;
    // Add gates create plain workers; multiply gates clone the crossing unit (queens too).
    const cloneKind = gate.kind === 'mul' ? kind : UnitKind.Worker;
    const cloneHp = gate.kind === 'mul' ? b.hp[i] : UNIT_STATS[UnitKind.Worker].hp;
    const mask = b.gates[i];
    for (let k = 0; k < n; k++) {
      const x = b.x[i] + (this.rng() - 0.5) * gate.width * 0.8;
      const y = gate.y + 0.05 + this.rng() * 0.4;
      if (b.spawn(cloneKind, clamp(x, this.level.laneWidth / 2 - 0.25), y, mask, cloneHp) < 0) {
        b.hp[i] += cloneHp * (n - k); // unit cap: fold overflow into the source unit
        break;
      }
      spawned++;
    }
    this.stats.gateSpawns += spawned;
    this.events.push({ type: 'gate', gate: g, x: b.x[i], y: gate.y, spawned });
  }

  private moveWasps(dt: number): void {
    const w = this.wasps;
    const half = this.level.laneWidth / 2 - 0.25;
    // Wasps drift toward the cannon's column as they near the hive.
    for (let i = w.count - 1; i >= 0; i--) {
      const st = UNIT_STATS[w.kind[i] as UnitKind];
      w.y[i] -= st.speed * dt;
      const pull = w.y[i] < 10 ? 0.6 : 0.15;
      w.x[i] = clamp(w.x[i] + Math.sign(this.cannonX - w.x[i]) * pull * dt, half);
      if (w.y[i] <= 0.4 && w.hp[i] > 0) {
        const dmg = this.hiveShield ? 0 : Math.ceil(w.hp[i]);
        this.hiveHp -= dmg;
        w.hp[i] = 0;
        this.events.push({ type: 'hiveHit', damage: dmg, x: w.x[i] });
      }
    }
  }

  /** Contact attrition: overlapping bee and wasp both lose min(hpA, hpB). */
  private resolveCombat(): void {
    const b = this.bees;
    const w = this.wasps;
    this.waspGrid.build(w.x, w.y, w.count);
    for (let i = 0; i < b.count; i++) {
      if (b.hp[i] <= 0) continue;
      const bx = b.x[i];
      const by = b.y[i];
      const br = UNIT_STATS[b.kind[i] as UnitKind].radius;
      this.waspGrid.query(bx, by, (j) => {
        if (w.hp[j] <= 0) return false;
        const r = br + UNIT_STATS[w.kind[j] as UnitKind].radius;
        const dx = w.x[j] - bx;
        const dy = w.y[j] - by;
        if (dx * dx + dy * dy > r * r) return false;
        const dmg = Math.min(b.hp[i], w.hp[j]);
        b.hp[i] -= dmg;
        w.hp[j] -= w.kind[j] === UnitKind.Matriarch ? dmg * MATRIARCH_DAMAGE_TAKEN : dmg;
        if (w.hp[j] <= 0) this.stats.kills++;
        this.events.push({ type: 'clash', x: (bx + w.x[j]) / 2, y: (by + w.y[j]) / 2 });
        return b.hp[i] <= 0;
      });
    }
  }

  /** Drain and return events produced since the last call (for render/audio). */
  drainEvents(): SimEvent[] {
    return this.events.splice(0, this.events.length);
  }
}

const OFF_LANE = 1e4;

function clamp(v: number, half: number): number {
  return v < -half ? -half : v > half ? half : v;
}
