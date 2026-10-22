import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { campaignLevel } from '../src/levels/campaign';
import { LEVELS } from '../src/levels';
import {
  loadCachedLevelOverrides,
  refreshLevelOverrides,
  setLevelOverrides,
} from '../src/levels/overrides';

const mem = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
};

describe('M7 (a): the game plays admin-edited level rows, with fallback to shipped files', () => {
  afterEach(() => {
    setLevelOverrides([]);
    vi.unstubAllGlobals();
  });

  it('a valid row replaces the shipped and the generated level with the same id', () => {
    const edited = { ...LEVELS[2], nestHp: 1234, name: 'Clover Run (edited)' };
    const gen = { ...campaignLevel(7), nestHp: 777 };
    expect(
      setLevelOverrides([
        { level_id: 'clover-run', data: edited },
        { level_id: 'gen-8', data: gen },
      ]),
    ).toBe(2);
    expect(campaignLevel(2).nestHp).toBe(1234);
    expect(campaignLevel(2).name).toBe('Clover Run (edited)');
    expect(campaignLevel(7).nestHp).toBe(777);
    expect(campaignLevel(7).id).toBe('gen-8');
  });

  it('an invalid row is skipped: the shipped level stays', () => {
    expect(
      setLevelOverrides([
        { level_id: 'clover-run', data: { ...LEVELS[2], nestHp: -5 } },
        { level_id: 'x', data: 'nope' },
      ]),
    ).toBe(0);
    expect(campaignLevel(2)).toBe(LEVELS[2]);
    setLevelOverrides('garbage');
    expect(campaignLevel(2)).toBe(LEVELS[2]);
  });

  it('refresh fetches payload columns with the anon key, caches, and the cache loads at boot', async () => {
    const store = mem();
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            { level_id: 'ftue-meadow', data: { ...LEVELS[0], timeLimit: 99 }, version: 2 },
          ]),
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    expect(
      await refreshLevelOverrides({ url: 'https://x.supabase.co', anonKey: 'anon' }, store),
    ).toBe(1);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain(
      'level_overrides?select=level_id,data,version',
    );
    setLevelOverrides([]);
    expect(campaignLevel(0).timeLimit).toBe(LEVELS[0].timeLimit);
    expect(loadCachedLevelOverrides(store)).toBe(1);
    expect(campaignLevel(0).timeLimit).toBe(99);
  });

  it('no backend or a failed fetch keeps the shipped levels (guest play, zero env vars)', async () => {
    expect(await refreshLevelOverrides(null, mem())).toBe(false);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('err', { status: 500 })),
    );
    expect(await refreshLevelOverrides({ url: 'u', anonKey: 'k' }, mem())).toBe(false);
    expect(campaignLevel(2)).toBe(LEVELS[2]);
  });

  it('migration: players read payload columns only; the editor stays admin-only', () => {
    const sql = readFileSync('supabase/migrations/20261022000900_m7_live_levels.sql', 'utf8');
    expect(sql).toMatch(
      /grant select \(level_id, data, version, updated_at\) on public\.level_overrides to anon, authenticated/,
    );
    expect(sql).not.toMatch(/grant (insert|update|delete)/i);
    expect(sql).toMatch(/private\.require_role\(array\['viewer'/);
  });
});
