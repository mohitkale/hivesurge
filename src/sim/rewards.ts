import type { BattleOutcome } from './types';

export interface BattleSummary {
  outcome: BattleOutcome;
  nestHp: number;
  nestMax: number;
  hiveHp: number;
  hiveMax: number;
  timeLeft: number;
}

export interface Rewards {
  coins: number;
  stars: number;
  /** 0..1 share of the nest destroyed; shown on defeat as a near-miss cue. */
  nestDamage: number;
}

/**
 * Reward table. Wins pay a base plus hive health and time bonuses; losses still
 * pay a little scaled by nest damage, so every run moves the player forward.
 */
export function computeRewards(s: BattleSummary): Rewards {
  const nestDamage = clamp01(1 - s.nestHp / s.nestMax);
  if (s.outcome === 'won') {
    const hiveShare = clamp01(s.hiveHp / s.hiveMax);
    const stars = 1 + (hiveShare >= 0.5 ? 1 : 0) + (hiveShare >= 0.9 ? 1 : 0);
    const coins = 50 + Math.round(hiveShare * 30) + Math.round(Math.max(0, s.timeLeft) / 2);
    return { coins, stars, nestDamage: 1 };
  }
  return { coins: Math.round(nestDamage * 20), stars: 0, nestDamage };
}

/** Rewarded "2X" multiplier: applies once, only to coins. */
export function applyMultiplier(r: Rewards, factor: number): Rewards {
  return { ...r, coins: r.coins * factor };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
