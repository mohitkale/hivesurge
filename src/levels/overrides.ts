import type { LevelDef } from '../sim/types';
import { parseLevel } from './parse';

/**
 * M7 carry-over (a): admin-edited level rows (`public.level_overrides`, edited in the M6
 * admin panel) replace the shipped level with the same id. Rows that fail `parseLevel` are
 * skipped, so a bad edit falls back to the shipped file. The fetched rows are cached in
 * localStorage and applied at boot (a launch never waits on the network); a refresh in the
 * background is used from the next level the player opens.
 */
const KEY = 'hivesurge.levelOverrides';
const live = new Map<string, LevelDef>();

export interface OverrideRow {
  level_id: string;
  data: unknown;
  version?: number;
}

/** Replace the active overrides; returns how many rows were valid. */
export function setLevelOverrides(rows: unknown): number {
  live.clear();
  if (!Array.isArray(rows)) return 0;
  for (const r of rows.slice(0, 500) as OverrideRow[]) {
    if (!r || typeof r.level_id !== 'string' || !r.data || typeof r.data !== 'object') continue;
    try {
      const l = parseLevel({ ...(r.data as object), id: r.level_id });
      live.set(r.level_id, l);
    } catch {
      // Invalid row: the shipped level stays.
    }
  }
  return live.size;
}

/** The admin-edited level for `id`, if a valid row exists. */
export const overrideFor = (id: string): LevelDef | undefined => live.get(id);

export function loadCachedLevelOverrides(store: Pick<Storage, 'getItem'> = localStorage): number {
  try {
    return setLevelOverrides(JSON.parse(store.getItem(KEY) ?? '[]'));
  } catch {
    return 0;
  }
}

/** Fetch rows with the public anon key (payload columns only) and cache them. */
export async function refreshLevelOverrides(
  env: { url: string; anonKey: string } | null,
  store: Pick<Storage, 'setItem'> = localStorage,
): Promise<number | false> {
  if (!env || typeof fetch !== 'function') return false;
  try {
    const r = await fetch(`${env.url}/rest/v1/level_overrides?select=level_id,data,version`, {
      headers: { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}` },
      cache: 'no-cache',
    });
    if (!r.ok) return false;
    const rows = (await r.json()) as unknown;
    if (!Array.isArray(rows)) return false;
    store.setItem(KEY, JSON.stringify(rows));
    return setLevelOverrides(rows);
  } catch {
    return false;
  }
}
