import type { LevelDef } from '../src/sim/types';

export function testLevel(over: Partial<LevelDef> = {}): LevelDef {
  return {
    id: 't',
    name: 'test',
    seed: 1,
    laneWidth: 10,
    laneLength: 40,
    timeLimit: 60,
    nestHp: 100000,
    hiveHp: 100000,
    fireInterval: 0.1,
    queenCharge: 2,
    trickleInterval: 0,
    gates: [],
    waves: [],
    ...over,
  };
}
