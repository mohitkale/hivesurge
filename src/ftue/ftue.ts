import { CANNON_Y, type PlayerInput, type World } from '../sim/world';

/** Worker speed (UNIT_STATS) used for the aim-ahead line. */
const WORKER_SPEED = 7;

export const FTUE_LEVEL_ID = 'ftue-meadow';

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
  [FtueStep.Gate]: 'Shoot through the x2 gate',
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

  /** Indices into the FTUE level's gates (spec layout: x2 at y 8, moving +3 at y 15). */
  constructor(
    private readonly gateX2 = 0,
    private readonly movingGate = 1,
  ) {}

  /** Step 4's prompt waits for a full queen meter (spec trigger "queen meter full"). */
  get prompt(): string {
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
    w.hiveShield = this.step < FtueStep.Finish;
    if (this.step === FtueStep.Queen && w.queenReady) this.queenPromptShown = true;
    // The queen step's clock (and timeout) starts when the meter is full.
    if (this.step !== FtueStep.Queen || this.queenPromptShown) this.stepTime += dt;
    if (input.firing && this.firstInputAt < 0) this.firstInputAt = w.time;
    const timeout = TIMEOUTS[this.step];
    if (timeout !== undefined && this.stepTime >= timeout && !this.emphasis) {
      this.emphasis = true;
      this.stepTimedOut = true;
      if (this.step === FtueStep.Lead) w.gateSpeedMul[this.movingGate] = LEAD_TIMEOUT_SPEED_MUL;
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
      case FtueStep.Gate:
        if (w.gatePasses[this.gateX2] - this.gateMark >= 10 && dwellOk) this.advance(w);
        break;
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
    if (this.step === FtueStep.Gate) this.gateMark = w.gatePasses[this.gateX2];
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

/** FTUE runs only for a player who has not finished it, on the FTUE level. */
export function shouldRunFtue(ftueDone: boolean, levelId: string): boolean {
  return !ftueDone && levelId === FTUE_LEVEL_ID;
}
