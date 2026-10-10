import type { LevelDef } from '../sim/types';
import { parseLevel } from './parse';
import cloverRun from './clover-run.json';

export { parseLevel };

/** Ordered campaign. Add a level by dropping a JSON file here and listing it. */
export const LEVELS: LevelDef[] = [cloverRun].map(parseLevel);

export function getLevel(id: string): LevelDef {
  const l = LEVELS.find((x) => x.id === id);
  if (!l) throw new Error(`unknown level ${id}`);
  return l;
}
