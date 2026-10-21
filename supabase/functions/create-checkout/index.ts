// M5-6d / M5-7: create a Stripe TEST-mode Checkout Session for one catalog SKU.
// verify_jwt = true (signed-in players only). Secrets: STRIPE_SECRET_KEY (sk_test_/rk_test_
// only, anything else is refused), optional ALLOWED_ORIGINS (comma-separated return origins).
import { handleCreateCheckout, isTestSecretKey, stripeRest } from '../_shared/checkout.ts';

const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

Deno.serve(async (req: Request) => {
  const origins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  const allowed = origins.length ? origins : DEFAULT_ORIGINS;
  const origin = req.headers.get('origin') ?? '';
  const cors = {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST')
    return new Response('method not allowed', { status: 405, headers: cors });

  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!isTestSecretKey(key))
    return Response.json({ error: 'stripe_not_configured' }, { status: 503, headers: cors });

  // Resolve the caller from their JWT (the gateway already verified it).
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const auth = req.headers.get('authorization') ?? '';
  const u = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: auth } });
  const user = u.ok ? ((await u.json()) as { id?: string }) : null;

  try {
    const body = await req.json().catch(() => ({}));
    const r = await handleCreateCheckout(user?.id ?? null, body, {
      stripe: stripeRest(key),
      allowedOrigins: allowed,
    });
    return Response.json(r.body, { status: r.status, headers: cors });
  } catch {
    return Response.json({ error: 'checkout unavailable' }, { status: 502, headers: cors });
  }
});
