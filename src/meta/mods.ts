import type { SaveData } from '../platform/save';
import { type MetaMods, NO_MODS } from '../sim/world';
import { enemyScale, equippedBees, roomLevel } from './economy';

/**
 * Bee effects implemented as sim knobs (M5-4). Bees without a knob yet are listed in
 * `PENDING_EFFECTS` and shown as "effect coming soon" in the collection.
 */
export const LIVE_EFFECTS = ['worker', 'dart', 'mason', 'orchid'] as const;
export const PENDING_EFFECTS = [
  'bumble',
  'carpenter',
  'sweat',
  'leafcutter',
  'honeyguard',
  'royal-jelly',
  'sunburst',
  'frost-wing',
];

/** Modifiers for the next battle: worker level (always), equipped bees, rooms, easing. */
export function metaMods(s: SaveData, stage: number, levelId: string): MetaMods {
  const m = { ...NO_MODS };
  const worker = s.meta.bees.worker?.level ?? 1;
  m.fireRateMul *= 1 + 0.02 * Math.max(0, worker - 1);
  for (const b of equippedBees(s, stage)) {
    const l = b.level;
    if (b.id === 'dart') m.beeSpeedMul *= 1.1 + 0.02 * (l - 1);
    else if (b.id === 'mason') m.hiveHpBonus += 10 + 2 * (l - 1);
    else if (b.id === 'orchid') m.queenChargeMul /= 1.15 + 0.02 * (l - 1);
  }
  m.hiveHpBonus += 3 * roomLevel(s, 'wax');
  m.queenChargeSec += 0.2 * roomLevel(s, 'brood');
  m.enemyScale = enemyScale(s, levelId, stage);
  return m;
}
