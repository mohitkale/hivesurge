import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { defaultSave, mergeSaves, parseSave } from '../src/platform/save';

const MIG = 'supabase/migrations/20261022000700_m6_admin.sql';
const sql = readFileSync(MIG, 'utf8');

describe('M6-2 admin server (migration static checks; live checks in supabase/tests/rls_test.sql)', () => {
  it('no SECURITY DEFINER function in an exposed schema (all migrations)', () => {
    for (const f of readdirSync('supabase/migrations')) {
      const s = readFileSync(`supabase/migrations/${f}`, 'utf8');
      for (const m of s.matchAll(/create (?:or replace )?function public\.(\w+)[\s\S]*?\$\$;/g))
        expect(m[0], `${f}: public.${m[1]}`).not.toMatch(/security definer/);
    }
  });

  it('every admin write function checks a role and writes an audit row', () => {
    for (const fn of [
      'admin_grant',
      'admin_reset_save',
      'admin_publish_config',
      'admin_rollback_config',
      'admin_save_level',
    ]) {
      const body = sql.match(
        new RegExp(`create function private\\.${fn}\\([\\s\\S]*?\\n\\$\\$;`),
      )![0];
      expect(body, fn).toMatch(/private\.require_role\(array\[/);
      expect(body, fn).toMatch(/private\.audit\(/);
      expect(body, fn).not.toMatch(/'viewer'/);
    }
  });

  it('the server publish check mirrors the client (odds 100, G5 caps 4/15, 12/30)', () => {
    expect(sql).toMatch(/must sum to 100/);
    expect(sql).toMatch(/\('interstitialPerSession', 4\), \('interstitialPerDay', 15\)/);
    expect(sql).toMatch(/\('rewardedPerSession', 12\), \('rewardedPerDay', 30\)/);
  });

  it('the RLS suite covers escalation attempts for every admin RPC', () => {
    const t = readFileSync('supabase/tests/rls_test.sql', 'utf8');
    for (const s of [
      'FAIL: A self-grant',
      'FAIL: A private grant',
      'FAIL: A forged audit',
      'FAIL: A role edit',
      'FAIL: viewer grant',
      'FAIL: support publish',
      'FAIL: liveops odds',
      'FAIL: one audit row per write',
    ])
      expect(t).toContain(s);
  });
});

describe('M6-3 admin reset epoch', () => {
  it('a higher resetEpoch replaces the other save instead of merging it back', () => {
    const local = defaultSave();
    local.coins = 500;
    local.revision = 7;
    local.bestStars = { a: 3 };
    const server = parseSave(
      JSON.stringify({ version: 2, revision: 9, resetEpoch: 1, noAds: true }),
    );
    for (const m of [mergeSaves(local, server, 'd1'), mergeSaves(server, local, 'd1')]) {
      expect(m.resetEpoch).toBe(1);
      expect(m.coins).toBe(0);
      expect(m.bestStars).toEqual({});
      expect(m.noAds).toBe(true);
      expect(m.revision).toBe(10);
    }
  });

  it('same epoch still merges normally', () => {
    const a = defaultSave();
    a.bestStars = { a: 2 };
    const b = defaultSave();
    b.bestStars = { b: 1 };
    expect(mergeSaves(a, b, 'd').bestStars).toEqual({ a: 2, b: 1 });
    expect(parseSave(JSON.stringify({ version: 2 })).resetEpoch).toBe(0);
  });
});
