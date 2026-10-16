/**
 * Round 3 (2026-10-16, Mohit: "the viewport vibrates, hard to see"). Root cause: every bee
 * that reached the nest added camera shake (from round 1 on), and the offset was re-randomised
 * each frame, so a steady stream of hits kept the camera jittering at up to 0.6 units.
 *
 * Now: nest hits never shake; only big events (your hive hit, battle end) add a tiny kick.
 * The amplitude is capped, decays fast, and is zero when the "Screen shake" setting is off
 * (the default) or the player prefers reduced motion.
 */
export type ShakeEvent = 'nestHit' | 'hiveHit' | 'end';

/** Kick per event (world units, before the cap). Nest hits are continuous, so they add none. */
export const SHAKE_KICK: Record<ShakeEvent, number> = { nestHit: 0, hiveHit: 0.05, end: 0.12 };
/** Hard cap on the shake amplitude (world units); was 0.6. */
export const SHAKE_CAP = 0.12;
/** Decay per second (amplitude units); a full-cap kick is gone in 0.2 s. */
export const SHAKE_DECAY = 0.6;

export class Shake {
  amp = 0;
  /** False when the setting is off or reduced motion is on: no shake at all. */
  enabled: boolean;
  constructor(enabled = false) {
    this.enabled = enabled;
  }
  kick(e: ShakeEvent): void {
    if (!this.enabled) return;
    this.amp = Math.min(SHAKE_CAP, this.amp + SHAKE_KICK[e]);
  }
  /** Advance by dt; returns the camera offset for this frame. */
  update(dt: number, rnd: () => number = Math.random): { x: number; y: number } {
    this.amp = this.enabled ? Math.max(0, this.amp - dt * SHAKE_DECAY) : 0;
    if (this.amp === 0) return { x: 0, y: 0 };
    return { x: (rnd() - 0.5) * this.amp, y: (rnd() - 0.5) * this.amp };
  }
}

/** Effective shake setting: the player's toggle, always off under prefers-reduced-motion. */
export function shakeEnabled(setting: boolean, reducedMotion: boolean): boolean {
  return setting && !reducedMotion;
}
