/**
 * M2-31 missed-gate cue (QA 2026-10-15: "no feedback on a missed gate"). There is no design
 * spec for a miss cue yet (checked docs/design and the design/* branches), so this is ENG's
 * minimal version, pending design confirmation: a brief "Missed!" floater at the cannon's x on
 * the gate row that a run of bees just flew past. Tuning lives in MISS_CUE; `enabled: false`
 * turns it off.
 */
export const MISS_CUE = {
  enabled: true,
  text: 'Missed!',
  /** Bees that must miss one row (since that row's last cue) before it cues. */
  minMisses: 6,
  /** Seconds between cues on any row (keeps it from nagging a player who sweeps). */
  cooldownS: 3,
} as const;

/** Decides when to show the cue from the world's per-row miss counters. No allocations. */
export class MissCue {
  private readonly seen: number[];
  private cooldown = 0;

  constructor(
    rowCount: number,
    private readonly cfg: { enabled: boolean; minMisses: number; cooldownS: number } = MISS_CUE,
  ) {
    this.seen = new Array<number>(rowCount).fill(0);
  }

  /** Returns the row index to cue now, or -1. Call once per frame with the world's counters. */
  update(rowMisses: readonly number[], dt: number): number {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!this.cfg.enabled) return -1;
    for (let r = 0; r < this.seen.length; r++) {
      if (rowMisses[r] - this.seen[r] < this.cfg.minMisses) continue;
      if (this.cooldown > 0) {
        this.seen[r] = rowMisses[r]; // misses during the cooldown do not stack up a cue
        continue;
      }
      this.seen[r] = rowMisses[r];
      this.cooldown = this.cfg.cooldownS;
      return r;
    }
    return -1;
  }
}
