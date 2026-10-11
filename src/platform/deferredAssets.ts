/**
 * Progressive loading (PLAN M3-7, research PERF-C): the first battle needs only the core JS.
 * M3 art (GLBs) and audio (Opus cues) are requested only after the first `gameplayStart`.
 * Each task runs once, in order; a throwing task does not stop the others.
 */
export class DeferredAssets {
  private started = false;

  constructor(private readonly tasks: ReadonlyArray<() => void>) {}

  get isStarted(): boolean {
    return this.started;
  }

  /** Call right after `platform.gameplayStart()`. Only the first call does anything. */
  onGameplayStart(): void {
    if (this.started) return;
    this.started = true;
    for (const t of this.tasks) {
      try {
        t();
      } catch (e) {
        console.warn('[assets] deferred task failed', e);
      }
    }
  }
}

/** performance.mark name set when the first battle starts (used by the M3-7 load test). */
export const FIRST_BATTLE_MARK = 'hs:first-battle';
