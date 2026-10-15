/**
 * Feedback 2026-10-15: pre-level boosts, each unlocked by a (mock) rewarded ad on the boost
 * screen. Pure data: World reads them; the UI only picks which one is active.
 */
export type BoostId = 'doubleCannon' | 'fastFire' | 'fastQueen' | 'megaSwarm';

export interface BoostInfo {
  id: BoostId;
  icon: string;
  title: string;
  desc: string;
}

export const BOOSTS: BoostInfo[] = [
  { id: 'doubleCannon', icon: '🔫', title: '2x Cannon', desc: 'Two barrels: 2 bees per shot' },
  { id: 'fastFire', icon: '⚡', title: '2x Fire speed', desc: 'Shoot twice as fast' },
  { id: 'fastQueen', icon: '👑', title: 'Fast Queen', desc: 'Queen charges in half the time' },
  { id: 'megaSwarm', icon: '🐝', title: '10x Bees', desc: 'First 5 s of firing: 10 bees per shot' },
];

export type BattleBoosts = Partial<Record<BoostId, boolean>>;

/** Seconds of firing that the 10x Bees boost lasts. */
export const MEGA_SWARM_S = 5;
/** Bees per shot while 10x Bees is active. */
export const MEGA_SWARM_MUL = 10;
/** Lateral offset of the two barrels for 2x Cannon (lane units). */
export const DOUBLE_CANNON_DX = 0.45;

export function boostById(id: string): BoostInfo | undefined {
  return BOOSTS.find((b) => b.id === id);
}
