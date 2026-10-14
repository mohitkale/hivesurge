/**
 * Fixed-step clock (fix/perf-lowend). The battle sim advances in SIM_DT steps from real
 * elapsed time, independent of how often frames are rendered: 60 sim steps per second at
 * 60 fps or at 5 fps. Only gaps longer than maxCatchUpSec (tab stalls, debugger) are dropped.
 */
export class FixedStepper {
  private acc = 0;

  constructor(
    readonly stepSec: number,
    private readonly maxCatchUpSec = 0.25,
  ) {}

  reset(): void {
    this.acc = 0;
  }

  /** Run `step` for every whole step in `elapsedSec`; returns how many ran. */
  advance(elapsedSec: number, step: (i: number) => boolean | void): number {
    this.acc += Math.max(0, Math.min(this.maxCatchUpSec, elapsedSec));
    let n = 0;
    while (this.acc >= this.stepSec) {
      this.acc -= this.stepSec;
      if (step(n++) === false) {
        this.acc = 0;
        break;
      }
    }
    return n;
  }
}

/**
 * Starts the timer that keeps the fixed-step sim pumping between frames; returns a stop
 * function. Callers must stop it on teardown (fix/perf-lowend-2 review nit).
 */
export function startSimTimer(pump: () => void, stepSec: number): () => void {
  const id = setInterval(pump, 1000 * stepSec);
  return () => clearInterval(id);
}
