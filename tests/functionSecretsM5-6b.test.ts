import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { clearSecretCache, getSecret } from '../supabase/functions/_shared/secrets.ts';

const env = (m: Record<string, string>) => (k: string) => m[k];
const base = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service' };

beforeEach(() => clearSecretCache());

describe('M5-6b Edge Function secret lookup', () => {
  it('prefers the function secret and never calls Vault then', async () => {
    const f = vi.fn();
    expect(
      await getSecret('STRIPE_SECRET_KEY', env({ ...base, STRIPE_SECRET_KEY: 'sk_test_env' }), f),
    ).toBe('sk_test_env');
    expect(f).not.toHaveBeenCalled();
  });

  it('falls back to the service-role-only Vault RPC and caches the value', async () => {
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe('https://x.supabase.co/rest/v1/rpc/function_secret');
      expect((init!.headers as Record<string, string>).apikey).toBe('service');
      expect(JSON.parse(String(init!.body))).toEqual({ p_name: 'STRIPE_WEBHOOK_SECRET' });
      return new Response(JSON.stringify('whsec_vault'), { status: 200 });
    });
    expect(await getSecret('STRIPE_WEBHOOK_SECRET', env(base), f as never)).toBe('whsec_vault');
    expect(await getSecret('STRIPE_WEBHOOK_SECRET', env(base), f as never)).toBe('whsec_vault');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('returns empty (functions answer 503 stripe_not_configured) on any failure', async () => {
    expect(await getSecret('STRIPE_SECRET_KEY', env({}), vi.fn())).toBe('');
    expect(
      await getSecret(
        'STRIPE_SECRET_KEY',
        env(base),
        (async () => new Response('', { status: 401 })) as never,
      ),
    ).toBe('');
    expect(
      await getSecret('STRIPE_SECRET_KEY', env(base), (async () => new Response('null')) as never),
    ).toBe('');
    expect(
      await getSecret('STRIPE_SECRET_KEY', env(base), (async () => {
        throw new Error('down');
      }) as never),
    ).toBe('');
  });

  it('the Vault RPC is callable by the service role only, for the two Stripe names only', () => {
    const sql = readFileSync('supabase/migrations/20261022000800_m5_function_secrets.sql', 'utf8');
    expect(sql).toMatch(
      /revoke all on function public\.function_secret\(text\) from public, anon, authenticated;/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.function_secret\(text\) to service_role;/,
    );
    expect(sql).toMatch(/p_name in \('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'\)/);
  });
});
