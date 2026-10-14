/**
 * Hive Surge art palette (see art/ART_DIRECTION.md). Team readability rule:
 * bees are LIGHT + WARM + ROUND, wasps are DARK + COOL + ANGULAR. Value
 * contrast (light vs dark) is what survives at 12 px, so never paint a wasp
 * with a light body or a bee with a dark one.
 */
export const ART = {
  // Bee team (player)
  beeBody: '#ffcf3a',
  beeStripe: '#3a2412',
  beeHead: '#3a2412',
  beeFuzz: '#fff1b8',
  beeWing: '#dff7ff',
  beeTeam: '#2ec4b6',
  queenBody: '#ffb21e',
  queenStripe: '#7a3a12',
  crown: '#ffe066',
  crownGem: '#2ec4b6',
  // Wasp team (rival)
  waspBody: '#2b1636',
  waspBand: '#ff7f3a',
  waspHead: '#4a1d63',
  waspWing: '#b9a3d9',
  waspEye: '#ff3d3d',
  hornetBody: '#1c0d26',
  hornetBand: '#e2304a',
  hornetHead: '#8a1f3c',
  stinger: '#120818',
  // Props
  teal: '#2ec4b6',
  tealDeep: '#1f8f86',
  honey: '#ffc83d',
  honeyDeep: '#f2a516',
  wood: '#a8683a',
  paper: '#7d6a8f',
  paperDark: '#4f3f63',
  paperLight: '#a593b8',
  nestEntry: '#14061c',
} as const;

export type ArtColor = keyof typeof ART;
