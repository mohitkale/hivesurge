import type { LevelDef } from '../sim/types';

/** Campaign position: the first level without a star; after the last, keep replaying it. */
export function nextLevelIndex(levels: LevelDef[], bestStars: Record<string, number>): number {
  const i = levels.findIndex((l) => !(bestStars[l.id] > 0));
  return i < 0 ? levels.length - 1 : i;
}
