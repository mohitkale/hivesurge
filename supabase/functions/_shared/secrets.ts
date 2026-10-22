/**
 * Edge Function secret lookup: function secrets (Deno.env) first, then the service-role-only
 * `function_secret` RPC over Supabase Vault (migration 20261022000800). Cached per isolate.
 */
const cache = new Map<string, string>();

export async function getSecret(
  name: 'STRIPE_SECRET_KEY' | 'STRIPE_WEBHOOK_SECRET',
  env: (k: string) => string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const direct = env(name);
  if (direct) return direct;
  const hit = cache.get(name);
  if (hit) return hit;
  const url = env('SUPABASE_URL') ?? '';
  const key = env('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !key) return '';
  try {
    const r = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/rpc/function_secret`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_name: name }),
    });
    if (!r.ok) return '';
    const v = (await r.json()) as unknown;
    if (typeof v !== 'string' || !v) return '';
    cache.set(name, v);
    return v;
  } catch {
    return '';
  }
}

/** Test hook. */
export const clearSecretCache = () => cache.clear();
