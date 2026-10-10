export interface SaveData {
  version: 1;
  coins: number;
  gems: number;
  bestStars: Record<string, number>;
  noAds: boolean;
  battlesCompleted: number;
  lastInterstitialAt: number;
}

export const DEFAULT_SAVE: SaveData = {
  version: 1,
  coins: 0,
  gems: 0,
  bestStars: {},
  noAds: false,
  battlesCompleted: 0,
  lastInterstitialAt: 0,
};

/** Parse a stored save defensively; unknown or corrupt data falls back to defaults. */
export function parseSave(raw: string | null): SaveData {
  if (!raw) return { ...DEFAULT_SAVE, bestStars: {} };
  try {
    const d = JSON.parse(raw) as Partial<SaveData>;
    if (d.version !== 1) return { ...DEFAULT_SAVE, bestStars: {} };
    return {
      ...DEFAULT_SAVE,
      ...d,
      coins: num(d.coins),
      gems: num(d.gems),
      battlesCompleted: num(d.battlesCompleted),
      lastInterstitialAt: num(d.lastInterstitialAt),
      bestStars: typeof d.bestStars === 'object' && d.bestStars ? d.bestStars : {},
      noAds: d.noAds === true,
    };
  } catch {
    return { ...DEFAULT_SAVE, bestStars: {} };
  }
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

const KEY = 'hivesurge.save.v1';
export const loadSave = (): SaveData => parseSave(localStorage.getItem(KEY));
export const writeSave = (s: SaveData): void => localStorage.setItem(KEY, JSON.stringify(s));
