import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DIR = 'supabase/migrations';
const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();
const sql = files.map((f) => readFileSync(`${DIR}/${f}`, 'utf8')).join('\n');

describe('M4-2/M4-3 Supabase migrations', () => {
  it('are timestamp-ordered files', () => {
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(f).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
  });

  const tables = [...sql.matchAll(/create table (public\.\w+)/g)].map((m) => m[1]);

  it('create every PLAN M4-2 table', () => {
    for (const t of [
      'profiles',
      'saves',
      'level_progress',
      'player_stats',
      'events',
      'purchases_sandbox',
      'admin_users',
    ])
      expect(tables).toContain(`public.${t}`);
  });

  it('enable RLS on every table', () => {
    for (const t of tables) expect(sql).toContain(`alter table ${t} enable row level security`);
  });

  it('give the anon role nothing and players no deletes', () => {
    expect(sql).toMatch(/revoke all on public\.profiles[\s\S]*?from anon;/);
    expect(sql).toMatch(/revoke delete, truncate on public\.profiles/);
    expect(sql).not.toMatch(/for delete/);
  });

  it('keep events insert-only for players', () => {
    const ev = [...sql.matchAll(/create policy \w+ on public\.events for (\w+)[^;]*;/g)];
    expect(ev.map((m) => m[1]).sort()).toEqual(['insert', 'select']);
    expect(sql).toMatch(/events_select_admin[^;]*is_admin/);
  });

  it('pin search_path on every function', () => {
    const fns = sql.split(/create function /).slice(1);
    expect(fns.length).toBeGreaterThan(0);
    for (const f of fns) expect(f).toMatch(/set search_path = ''/);
  });

  it('contain no keys or secrets', () => {
    // The role name may appear only in a GRANT (M5-6b Vault RPC); never a key.
    expect(sql.replace(/to service_role;/g, '')).not.toMatch(
      /eyJ[A-Za-z0-9_-]{20,}|sb_secret_|service_role/,
    );
    expect(sql).not.toMatch(/(sk|rk)_(test|live)_[A-Za-z0-9]{8,}|whsec_[A-Za-z0-9]{8,}/);
  });
});
