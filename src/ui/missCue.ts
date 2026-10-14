/**
 * M2-31 missed-gate cue (QA 2026-10-15: "no feedback on a missed gate"). Design ruling
 * (2026-10-15): "Missed!" after 6 bees pass a gate row without a gate hit, 4 s cooldown, at
 * most 3 per level, suppressed while any FTUE prompt is on screen, on for all levels.
 * The floater appears at the cannon's x on that row. `enabled: false` turns it off.
 */
export const MISS_CUE = {
  enabled: true,
  text: 'Missed!',
  /** Bees that must miss one row (since that row's last cue) before it cues. */
  minMisses: 6,
  /** Seconds between cues on any row. */
  cooldownS: 4,
  /** Cues per level (per battle). */
  maxPerLevel: 3,
} as const;

export interface MissCueConfig {
  enabled: boolean;
  minMisses: number;
  cooldownS: number;
  maxPerLevel: number;
}

/** Decides when to show the cue from the world's per-row miss counters. No allocations. */
export class MissCue {
  private readonly seen: number[];
  private cooldown = 0;
  /** Cues shown this level. */
  shown = 0;

  constructor(
    rowCount: number,
    private readonly cfg: MissCueConfig = MISS_CUE,
  ) {
    this.seen = new Array<number>(rowCount).fill(0);
  }

  /**
   * Returns the row index to cue now, or -1. Call once per frame with the world's counters.
   * `suppressed` (an FTUE prompt is on screen): misses are absorbed and never cue later.
   */
  update(rowMisses: readonly number[], dt: number, suppressed = false): number {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!this.cfg.enabled || this.shown >= this.cfg.maxPerLevel) return -1;
    for (let r = 0; r < this.seen.length; r++) {
      if (rowMisses[r] - this.seen[r] < this.cfg.minMisses) continue;
      this.seen[r] = rowMisses[r]; // misses while blocked do not stack up a later cue
      if (this.cooldown > 0 || suppressed) continue;
      this.cooldown = this.cfg.cooldownS;
      this.shown++;
      return r;
    }
    return -1;
  }
}
