import { CANNON_Y, type PlayerInput, type World } from '../sim/world';

/** Worker speed (UNIT_STATS) used for the aim-ahead line. */
const WORKER_SPEED = 7;

export const FTUE_LEVEL_ID = 'ftue-meadow';

/**
 * Decision 40: a win before step 5 does not finish the FTUE; the remaining steps carry into
 * the next battle on L2 (resuming after the furthest learned step, via `knownThrough`).
 * Gate indices per level: the off-centre x2 gate (step 2) and the moving gate (step 3).
 * Only the FTUE level shields the hive and slows the moving gate on the step 3 timeout, so L2
 * keeps its own difficulty.
 */
export const FTUE_CARRY_LEVEL_ID = 'dandelion-drift';
export const FTUE_LEVELS: Record<string, { gateX2: number; movingGate: number }> = {
  [FTUE_LEVEL_ID]: { gateX2: 0, movingGate: 1 },
  [FTUE_CARRY_LEVEL_ID]: { gateX2: 0, movingGate: 2 },
};

/** Ftue for a level (L1 or the L2 carry), resuming after `knownThrough`. */
export function ftueForLevel(levelId: string, knownThrough: number, step2Attempt: number): Ftue {
  const g = FTUE_LEVELS[levelId] ?? FTUE_LEVELS[FTUE_LEVEL_ID];
  return new Ftue(g.gateX2, g.movingGate, knownThrough, step2Attempt, levelId === FTUE_LEVEL_ID);
}

/** ftue-m2.md step flow. */
export enum FtueStep {
  Boot = 0,
  Aim = 1,
  Gate = 2,
  Lead = 3,
  Queen = 4,
  Finish = 5,
  Done = 6,
}

/** Prompts: max 8 words each (spec), longest is 5. */
export const FTUE_PROMPTS: Record<FtueStep, string> = {
  [FtueStep.Boot]: '',
  [FtueStep.Aim]: 'Hold and drag to aim',
  [FtueStep.Gate]: 'Drag to the x2 gate',
  [FtueStep.Lead]: 'Aim ahead of moving gates',
  [FtueStep.Queen]: 'Tap the queen!',
  [FtueStep.Finish]: 'Smash the nest!',
  [FtueStep.Done]: '',
};

/**
 * validation-m2.md #1 (M2-27): each prompt stays up at least this long before the next step,
 * so fast players still read prompts 2 to 4.
 */
export const MIN_PROMPT_DWELL_S = 1.5;

/** validation-m2.md #3 (M2-27): step 3 timeout halves the moving gate's speed. */
export const LEAD_TIMEOUT_SPEED_MUL = 0.5;

/** M2-29: aimed hits on the off-centre x2 gate to finish step 2. */
export const AIMED_HITS = 6;
/** M2-29: the cannon must be at least this far from centre (lane units) for a hit to count. */
export const AIM_MIN_OFFSET = 1.5;

/**
 * M2-30b escape for players who never make an aimed x2 hit. Attempts are counted per FTUE
 * battle that ends with step 2 not learned (saved as `ftueStep2Fails`). Design can tune both.
 * - From attempt FTUE_STEP2_DEMO_ATTEMPT, step 2 shows a ghost cannon sliding from the centre
 *   onto the x2 gate.
 * - From attempt FTUE_STEP2_MAX_ATTEMPTS, step 2 completes (and is saved as learned) at its
 *   6 s timeout, so the FTUE continues.
 * Attempt 1 is unchanged (M2-29: 6 aimed hits, timeout only pulses).
 */
export const FTUE_STEP2_DEMO_ATTEMPT = 2;
export const FTUE_STEP2_MAX_ATTEMPTS = 3;
/** Ghost demo loop: slide time and hold time at the gate, seconds. */
export const FTUE_DEMO_SLIDE_S = 1.2;
export const FTUE_DEMO_HOLD_S = 0.6;

/** Seconds before a step's timeout fallback (spec column "Timeout fallback"). */
const TIMEOUTS: Partial<Record<FtueStep, number>> = {
  [FtueStep.Aim]: 4,
  [FtueStep.Gate]: 6,
  [FtueStep.Lead]: 6,
  [FtueStep.Queen]: 5,
};

export interface FtueStepEvent {
  step: FtueStep;
  /** ms since the first player input (0 before any input). */
  msSinceFirstInput: number;
  /** The step's timeout fallback fired before the player completed it. */
  timedOut: boolean;
}

/**
 * Action-gated FTUE controller for level `ftue-meadow`. Pure logic: the game feeds it the
 * world and input each fixed step; it advances only when the taught action happens, fires the
 * level's trigger waves ("step3", "step5"), shields the hive until step 5 and exposes the
 * prompt, the emphasis (timeout fallback) and the aim-ahead target for the renderer.
 */
export class Ftue {
  step = FtueStep.Boot;
  /** Emitted once per completed step (for `ftue_step` analytics). */
  readonly completed: FtueStepEvent[] = [];
  /** True once the current step's timeout passed: UI pulses the prompt / haptic tick. */
  emphasis = false;

  private stepTime = 0;
  private fireHeld = 0;
  private firstInputAt = -1;
  private gateMark = 0;
  private stepTimedOut = false;
  /** M2-29: seconds the cannon has been continuously inside gate x2's span while firing. */
  aimHoldS = 0;
  /** M2-29: aimed, off-centre hits on gate x2 this step. */
  aimedHits = 0;
  private passesSeen = 0;

  /**
   * Indices into the FTUE level's gates (spec layout: x2 at y 8, moving +3 at y 15).
   * `knownThrough` (M2-30/M2-33): the highest step this player completed in an earlier FTUE
   * attempt (saved). On a retry those steps show no prompt and never block: each still
   * completes on its exit condition, or at its timeout instead of pulsing.
   */
  constructor(
    private readonly gateX2 = 0,
    private readonly movingGate = 1,
    private readonly knownThrough: number = FtueStep.Boot,
    /** M2-30b: 1-based FTUE attempt at step 2 (saved fails + 1). */
    readonly step2Attempt = 1,
    /** FTUE level only: hive shield before step 5 and the step 3 timeout slow-down. */
    private readonly onFtueLevel = true,
  ) {}

  /** Index of the moving gate (lead line, step 3). */
  get movingGateIndex(): number {
    return this.movingGate;
  }

  /** M2-30b: ghost cannon x for the step 2 demo, or null when no demo is shown. */
  demoX(w: World): number | null {
    if (this.step !== FtueStep.Gate || this.stepKnown) return null;
    if (this.step2Attempt < FTUE_STEP2_DEMO_ATTEMPT) return null;
    const period = FTUE_DEMO_SLIDE_S + FTUE_DEMO_HOLD_S;
    const p = Math.min(1, (this.stepTime % period) / FTUE_DEMO_SLIDE_S);
    const ease = p * p * (3 - 2 * p);
    return ease * w.currentGateX(this.gateX2);
  }

  /** The current step was already completed in an earlier attempt (M2-30/M2-33). */
  get stepKnown(): boolean {
    return this.step !== FtueStep.Boot && this.step <= this.knownThrough;
  }

  /** Step 4's prompt waits for a full queen meter (spec trigger "queen meter full"). */
  get prompt(): string {
    if (this.stepKnown) return '';
    if (this.step === FtueStep.Queen && !this.queenPromptShown) return '';
    return FTUE_PROMPTS[this.step];
  }

  /** Step 4's prompt appeared (meter full); it then stays for the dwell even after the launch. */
  private queenPromptShown = false;

  get done(): boolean {
    return this.step === FtueStep.Done;
  }

  /** Lead line target x for step 3: the moving gate's x at t + travelTime (`world.gateXAhead`); null otherwise. */
  leadTargetX(w: World): number | null {
    if (this.step !== FtueStep.Lead) return null;
    return leadX(w, this.movingGate);
  }

  /** Call before each `world.step(input)`. */
  update(w: World, input: PlayerInput, dt: number): void {
    if (this.done) return;
    w.hiveShield = this.onFtueLevel && this.step < FtueStep.Finish;
    if (this.step === FtueStep.Queen && w.queenReady) this.queenPromptShown = true;
    // The queen step's clock (and timeout) starts when the meter is full.
    if (this.step !== FtueStep.Queen || this.queenPromptShown) this.stepTime += dt;
    if (input.firing && this.firstInputAt < 0) this.firstInputAt = w.time;
    const timeout = TIMEOUTS[this.step];
    if (timeout !== undefined && this.stepTime >= timeout && this.stepKnown) {
      // Retry: a step already learned never holds the player (no prompt, no pulse).
      this.stepTimedOut = true;
      this.advance(w);
      return;
    }
    if (
      this.step === FtueStep.Gate &&
      this.step2Attempt >= FTUE_STEP2_MAX_ATTEMPTS &&
      timeout !== undefined &&
      this.stepTime >= timeout
    ) {
      // M2-30b escape: after FTUE_STEP2_MAX_ATTEMPTS attempts, step 2 completes at its timeout.
      this.stepTimedOut = true;
      this.advance(w);
      return;
    }
    if (timeout !== undefined && this.stepTime >= timeout && !this.emphasis) {
      this.emphasis = true;
      this.stepTimedOut = true;
      if (this.step === FtueStep.Lead && this.onFtueLevel)
        w.gateSpeedMul[this.movingGate] = LEAD_TIMEOUT_SPEED_MUL;
    }
    // Prompt steps advance only after the prompt has been on screen for the minimum dwell.
    const dwellOk = this.stepTime >= MIN_PROMPT_DWELL_S;
    switch (this.step) {
      case FtueStep.Boot:
        if (this.stepTime >= 1.5) this.advance(w);
        break;
      case FtueStep.Aim:
        if (input.firing) this.fireHeld += dt;
        if (this.fireHeld >= 1.0 && dwellOk) this.advance(w);
        break;
      case FtueStep.Gate: {
        const g = w.level.gates[this.gateX2];
        const inSpan =
          input.firing &&
          Math.abs(w.cannonX - w.currentGateX(this.gateX2)) <= g.width / 2 &&
          Math.abs(w.cannonX) >= AIM_MIN_OFFSET;
        this.aimHoldS = inSpan ? this.aimHoldS + dt : 0;
        const passes = w.gatePasses[this.gateX2];
        // Crossing bees count only if they were fired from inside the span: the hold must be
        // at least one bee travel time to the gate row.
        if (this.aimHoldS >= (g.y - CANNON_Y) / WORKER_SPEED)
          this.aimedHits += passes - this.passesSeen;
        this.passesSeen = passes;
        if (this.aimedHits >= AIMED_HITS && dwellOk) this.advance(w);
        break;
      }
      case FtueStep.Lead:
        if (w.gatePasses[this.movingGate] - this.gateMark >= 5 && dwellOk) this.advance(w);
        break;
      case FtueStep.Queen:
        // Dwell applies only once the prompt is visible; a queen launched before the meter
        // prompt appeared completes the step at once (no prompt flashes by).
        if (w.stats.queens > 0 && (!this.queenPromptShown || dwellOk)) this.advance(w);
        break;
      case FtueStep.Finish:
        if (w.outcome !== 'playing') this.advance(w);
        break;
    }
    // Entering step 4 with a full meter shows its prompt on this tick.
    if (this.step === FtueStep.Queen && w.queenReady) this.queenPromptShown = true;
  }

  private advance(w: World): void {
    if (this.step !== FtueStep.Boot)
      this.completed.push({
        step: this.step,
        msSinceFirstInput:
          this.firstInputAt < 0 ? 0 : Math.round((w.time - this.firstInputAt) * 1000),
        timedOut: this.stepTimedOut,
      });
    if (this.step === FtueStep.Lead) w.gateSpeedMul[this.movingGate] = 1;
    this.step++;
    this.stepTime = 0;
    this.emphasis = false;
    this.stepTimedOut = false;
    if (this.step === FtueStep.Gate) {
      this.passesSeen = w.gatePasses[this.gateX2];
      this.aimHoldS = 0;
      this.aimedHits = 0;
    }
    if (this.step === FtueStep.Lead) {
      this.gateMark = w.gatePasses[this.movingGate];
      w.fireTrigger('step3');
    }
    if (this.step === FtueStep.Finish) {
      w.hiveShield = false;
      w.fireTrigger('step5');
    }
  }
}

export function leadX(w: World, gate: number): number {
  const g = w.level.gates[gate];
  const travel = (g.y - CANNON_Y) / WORKER_SPEED;
  return w.gateXAhead(gate, travel);
}

/** FTUE runs only for a player who has not finished it, on L1 or (decision 40 carry) L2. */
export function shouldRunFtue(ftueDone: boolean, levelId: string): boolean {
  return !ftueDone && levelId in FTUE_LEVELS;
}

/**
 * Decision 40: does this win finish the FTUE? Yes once step 5 is complete (`done`). A win on the
 * L2 carry also ends it (L2 is the last FTUE level), so ads/offers gating (G1/G2) cannot stay
 * on forever.
 */
export function ftueDoneOnWin(f: Ftue, levelId: string): boolean {
  return f.done || levelId === FTUE_CARRY_LEVEL_ID;
}
