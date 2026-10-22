// M5-6e / M5-8: Stripe webhook (verify_jwt = false; Stripe signs the body instead).
// Secrets (never in the repo): STRIPE_WEBHOOK_SECRET (whsec_...), as an Edge Function secret
// or in Supabase Vault (see _shared/secrets.ts).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { restPurchaseStore } from '../_shared/restStore.ts';
import { getSecret } from '../_shared/secrets.ts';
import { handleStripeWebhook } from '../_shared/webhook.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const secret = await getSecret('STRIPE_WEBHOOK_SECRET', (k) => Deno.env.get(k));
  if (!secret.startsWith('whsec_'))
    return Response.json({ error: 'stripe_not_configured' }, { status: 503 });
  const store = restPurchaseStore(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  try {
    const r = await handleStripeWebhook(await req.text(), req.headers.get('stripe-signature'), {
      secret,
      store,
      now: Date.now,
    });
    return Response.json(r.body, { status: r.status });
  } catch {
    // 500 makes Stripe retry; the handler is idempotent.
    return Response.json({ error: 'temporary failure' }, { status: 500 });
  }
});
