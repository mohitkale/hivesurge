/**
 * Crowd LOD policy (fix/crowd-lod-hysteresis). Pure logic, no three.js, so it is unit-tested.
 *
 * Two layers of hysteresis keep the triangle count from oscillating:
 *  1. Crowd switch: LOD turns on when a side has >= `enterAt` live units and off only when it
 *     drops to <= `exitAt` (exitAt < enterAt), and never changes state again within `holdMs`.
 *  2. Per-unit distance bands: a unit moves to a coarser band once it is `margin` past the band
 *     edge and back to a finer band only once it is `margin` inside it, so units that hover
 *     around an edge (clash lines) do not swap meshes every frame.
 */

export const enum LodBand {
  Full = 0,
  Mid = 1,
  Far = 2,
}

export interface CrowdLodThresholds {
  /** Live units on a side at/above which crowd LOD switches on. */
  enterAt: number;
  /** Live units at/below which it switches off again. Must be < enterAt. */
  exitAt: number;
}

/** Minimum time between two crowd-switch changes. */
export const CROWD_LOD_HOLD_MS = 1500;

export class CrowdLodSwitch {
  active = false;
  private lastChange = -Infinity;

  constructor(
    public thresholds: CrowdLodThresholds,
    readonly holdMs = CROWD_LOD_HOLD_MS,
  ) {}

  /** Feed the current unit count; returns whether crowd LOD is active. */
  update(count: number, nowMs: number): boolean {
    if (nowMs - this.lastChange < this.holdMs) return this.active;
    const { enterAt, exitAt } = this.thresholds;
    const want = this.active ? count > exitAt : count >= enterAt;
    if (want !== this.active) {
      this.active = want;
      this.lastChange = nowMs;
    }
    return this.active;
  }
}

/**
 * Next band for a unit at distance `d` (lane units from the camera end) given its previous band.
 * `edges[k]` is the distance where band k ends and band k+1 starts (ascending).
 */
export function nextBand(
  prev: number,
  d: number,
  edges: readonly number[],
  margin: number,
): number {
  let b = prev;
  while (b < edges.length && d > edges[b] + margin) b++;
  while (b > 0 && d < edges[b - 1] - margin) b--;
  return b;
}

/** Band edges as fractions of lane length: Full < 0.3 L <= Mid < 0.6 L <= Far. */
export const LOD_EDGE_FRACS = [0.3, 0.6] as const;
/** Half-width of the dead zone around each edge, as a fraction of lane length. */
export const LOD_MARGIN_FRAC = 0.03;
