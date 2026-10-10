import type { GateDef } from './types';

/** Current centre x of a (possibly moving) gate at time t, clamped to the lane. */
export function gateX(g: GateDef, t: number, laneWidth: number): number {
  return gateXAtAngle(g, g.motion ? t * g.motion.speed : 0, laneWidth);
}

/**
 * Gate x for an accumulated motion angle (radians, = ∫ speed dt). The sim integrates the angle per
 * tick so a speed change (boss phase `gateSpeedScale`) never makes the gate jump.
 */
export function gateXAtAngle(g: GateDef, angle: number, laneWidth: number): number {
  if (!g.motion) return g.x;
  const x = g.x + Math.sin(angle + (g.motion.phase ?? 0)) * g.motion.amplitude;
  const half = laneWidth / 2 - g.width / 2;
  return Math.max(-half, Math.min(half, x));
}

/** True if a unit moving from prevY to y crossed the gate line inside its span. */
export function crossesGate(g: GateDef, gx: number, ux: number, prevY: number, y: number): boolean {
  const lo = Math.min(prevY, y);
  const hi = Math.max(prevY, y);
  if (!(g.y > lo && g.y <= hi)) return false;
  return Math.abs(ux - gx) <= g.width / 2;
}

/**
 * How many extra units a gate produces for one crossing unit.
 * add +k: k new units; mul xk: k-1 clones; sub: 0 (handled as a trap).
 */
export function gateSpawnCount(g: GateDef): number {
  switch (g.kind) {
    case 'add':
      return Math.max(0, Math.floor(g.value));
    case 'mul':
      return Math.max(0, Math.floor(g.value) - 1);
    case 'sub':
      return 0;
  }
}

export function gateLabel(g: GateDef): string {
  switch (g.kind) {
    case 'add':
      return `+${g.value}`;
    case 'mul':
      return `×${g.value}`;
    case 'sub':
      return `−${g.value}`;
  }
}
