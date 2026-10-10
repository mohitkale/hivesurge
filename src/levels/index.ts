import type { LevelDef } from '../sim/types';
import { parseLevel } from './parse';
import ftueMeadow from './ftue-meadow.json';
import dandelionDrift from './dandelion-drift.json';
import cloverRun from './clover-run.json';
import thistleGauntlet from './thistle-gauntlet.json';
import waspQueenNest from './wasp-queen-nest.json';

export { parseLevel };

/** Ordered campaign (docs/design/levels-m2.md L1–L5). Add a level by dropping a JSON file here and listing it. */
export const LEVELS: LevelDef[] = [
  ftueMeadow,
  dandelionDrift,
  cloverRun,
  thistleGauntlet,
  waspQueenNest,
].map(parseLevel);

export function getLevel(id: string): LevelDef {
  const l = LEVELS.find((x) => x.id === id);
  if (!l) throw new Error(`unknown level ${id}`);
  return l;
}
