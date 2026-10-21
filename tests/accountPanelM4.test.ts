import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../src/analytics/analytics';
import { cloudEnv, shouldAutoStartCloud, supabaseSessionKey } from '../src/platform/cloud/config';
import { friendlyError } from '../src/platform/cloud/controller';
import { accountHtml } from '../src/ui/account';

describe('M4 config: zero env vars = offline/mock, guests never auto-load the cloud', () => {
  it('needs both public values; placeholders do not count', () => {
    expect(cloudEnv({})).toBeNull();
    expect(
      cloudEnv({
        VITE_SUPABASE_URL: 'https://your-project-ref.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'your-public-anon-or-publishable-key',
      }),
    ).toBeNull();
    expect(cloudEnv({ VITE_SUPABASE_URL: 'https://abc.supabase.co' })).toBeNull();
    expect(
      cloudEnv({ VITE_SUPABASE_URL: 'https://abc.supabase.co/', VITE_SUPABASE_ANON_KEY: 'k' }),
    ).toEqual({ url: 'https://abc.supabase.co', anonKey: 'k' });
  });

  it('auto-starts only for a stored session or an auth redirect', () => {
    const kv = new MemoryStore();
    const env = { url: 'https://abc.supabase.co', anonKey: 'k' };
    const loc = { hash: '', search: '' };
    expect(shouldAutoStartCloud(kv, loc, null)).toBe(false);
    expect(shouldAutoStartCloud(kv, loc, env)).toBe(false);
    expect(shouldAutoStartCloud(kv, { hash: '#access_token=x', search: '' }, env)).toBe(true);
    expect(shouldAutoStartCloud(kv, { hash: '', search: '?code=1' }, env)).toBe(true);
    kv.setItem(supabaseSessionKey(env.url), '{}');
    expect(supabaseSessionKey(env.url)).toBe('sb-abc-auth-token');
    expect(shouldAutoStartCloud(kv, loc, env)).toBe(true);
  });
});

describe('M4-4 account panel', () => {
  it('guest: opt-in buttons only; signed-in email is escaped', () => {
    const base = { kind: 'mock' as const, status: 'off' as const, lastSyncAt: 0, message: '' };
    const guest = accountHtml({ ...base, user: null });
    expect(guest).toContain('data-a="acct:guest"');
    expect(guest).toContain('MOCK CLOUD');
    const html = accountHtml({
      ...base,
      kind: 'supabase',
      status: 'idle',
      user: { id: 'x', email: '<b>@x.io', anonymous: false },
    });
    expect(html).not.toContain('<b>@x.io');
    expect(html).toContain('data-a="acct:signout"');
    const anon = accountHtml({ ...base, user: { id: 'x', email: null, anonymous: true } });
    expect(anon).toContain('data-a="acct:link"');
  });
});

describe('M4-4 friendly errors', () => {
  it('maps backend errors to plain language', () => {
    expect(friendlyError('Anonymous sign-ins are disabled')).toMatch(/Email me a link/);
    expect(friendlyError('TypeError: Failed to fetch')).toMatch(/offline/);
    expect(friendlyError('boom')).toBe('Could not do that: boom');
  });
});

describe('M4 lazy loading: Supabase stays out of the first-load bundle', () => {
  it('only supabaseCloud.ts imports supabase-js, and only through dynamic imports', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const walk = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`],
      );
    const importers = walk('src').filter((f) =>
      /from '@supabase\/supabase-js'|import\('@supabase\/supabase-js'\)/.test(
        readFileSync(f, 'utf8'),
      ),
    );
    expect(importers).toEqual(['src/platform/cloud/supabaseCloud.ts']);
    const src = readFileSync('src/platform/cloud/supabaseCloud.ts', 'utf8');
    expect(src).toMatch(/^import type .*@supabase\/supabase-js/m);
    expect(src).not.toMatch(/^import \{[^}]*\} from '@supabase/m);
    for (const f of walk('src'))
      expect(readFileSync(f, 'utf8')).not.toMatch(
        /from '\.\/(platform\/)?cloud\/(supabaseCloud|controller)'/,
      );
    const main = readFileSync('src/main.ts', 'utf8');
    expect(main).not.toMatch(/cloud\/controller|supabaseCloud/);
  });
});
