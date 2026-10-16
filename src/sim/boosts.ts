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
  { id: 'doubleCannon', icon: '🔫', title: '2x Cannon', desc: 'Two barrels side by side' },
  { id: 'fastFire', icon: '⚡', title: '2x Fire speed', desc: 'Shoot twice as fast' },
  { id: 'fastQueen', icon: '👑', title: 'Fast Queen', desc: 'Queen charges in half the time' },
  {
    id: 'megaSwarm',
    icon: '🐝',
    title: '10x Bees',
    desc: 'Whole level: 10 bees per (slower) shot',
  },
];

export type BattleBoosts = Partial<Record<BoostId, boolean>>;

/**
 * Round 3 (2026-10-16, Mohit): every boost lasts the whole level. 10x Bees used to run for
 * the first 5 s of firing; for a full level it is rebalanced so it is strong but not a free
 * win: 10 bees per shot, but each shot takes MEGA_SWARM_INTERVAL_MUL x as long (net
 * MEGA_SWARM_MUL / MEGA_SWARM_INTERVAL_MUL = 2x bees, like the other 2x boosts), and the live-bee cap still applies.
 */
export const MEGA_SWARM_MUL = 10;
/** Shot interval multiplier while 10x Bees is active (whole level). */
export const MEGA_SWARM_INTERVAL_MUL = 5;
/** Lateral offset of the two barrels for 2x Cannon (lane units). */
export const DOUBLE_CANNON_DX = 0.45;

/**
 * Round 3 rebalance: whole-level boosts made every level a free win even with no aiming
 * (bot sweep). A boosted battle therefore faces a tougher nest: nest HP and wasp wave counts
 * scale by this factor (none = 1, so unboosted battles are unchanged).
 */
export const BOOST_ENEMY_SCALE: Record<BoostId, { nestHp: number; waves: number }> = {
  doubleCannon: { nestHp: 2, waves: 1.4 },
  fastFire: { nestHp: 1.7, waves: 1.3 },
  megaSwarm: { nestHp: 1.7, waves: 1.3 },
  fastQueen: { nestHp: 1.15, waves: 1.1 },
};

/** Enemy scale for a battle's boosts (product over active boosts; 1 with none). */
export function boostEnemyScale(b: BattleBoosts): { nestHp: number; waves: number } {
  let nestHp = 1;
  let waves = 1;
  for (const id of Object.keys(b) as BoostId[])
    if (b[id] && BOOST_ENEMY_SCALE[id]) {
      nestHp *= BOOST_ENEMY_SCALE[id].nestHp;
      waves *= BOOST_ENEMY_SCALE[id].waves;
    }
  return { nestHp, waves };
}

export function boostById(id: string): BoostInfo | undefined {
  return BOOSTS.find((b) => b.id === id);
}
