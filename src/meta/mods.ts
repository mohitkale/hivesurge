import type { SaveData } from '../platform/save';
import { type MetaMods, NO_MODS } from '../sim/world';
import { enemyScale, equippedBees, roomLevel } from './economy';

/**
 * Bee effects implemented as sim knobs (M5-4, the other 8 in M7). Bees without a knob would be
 * listed in `PENDING_EFFECTS` and shown as "effect coming soon" in the collection; none are left.
 */
export const LIVE_EFFECTS = [
  'worker',
  'dart',
  'mason',
  'orchid',
  'bumble',
  'carpenter',
  'sweat',
  'leafcutter',
  'honeyguard',
  'royal-jelly',
  'sunburst',
  'frost-wing',
] as const;
export const PENDING_EFFECTS: string[] = [];

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
    // M7 (meta-m5.md bee table): the 8 effects that were "coming soon".
    else if (b.id === 'bumble') {
      m.bumbleEvery = 10;
      m.bumbleHp = 3 + Math.floor((l - 1) / 3);
    } else if (b.id === 'carpenter') m.trapAbsorb = Math.max(0.5, 0.8 - 0.03 * (l - 1));
    else if (b.id === 'sweat') m.sweatChance = Math.min(0.5, 0.1 + 0.02 * (l - 1));
    else if (b.id === 'leafcutter') m.leafSeconds = 5;
    else if (b.id === 'honeyguard') m.honeyBlocks = 15;
    else if (b.id === 'royal-jelly') m.queenHp = 40;
    else if (b.id === 'sunburst') {
      m.volleyEvery = 20;
      m.volleyCount = 12;
    } else if (b.id === 'frost-wing') {
      m.frostSlow = 0.4;
      m.frostSeconds = 3;
    }
  }
  m.hiveHpBonus += 3 * roomLevel(s, 'wax');
  m.queenChargeSec += 0.2 * roomLevel(s, 'brood');
  m.enemyScale = enemyScale(s, levelId, stage);
  return m;
}
