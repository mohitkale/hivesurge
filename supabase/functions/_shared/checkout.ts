import { amountFor, type Currency, serverSku } from './skus.ts';

type Obj = Record<string, unknown>;

/** The part of the Stripe API the Checkout function uses (real REST client or the mock). */
export interface StripeApi {
  createCheckoutSession(params: URLSearchParams): Promise<Obj>;
  /** Price id for a lookup key created by `scripts/stripe-seed-test.mjs`, or null. */
  findPriceId(lookupKey: string): Promise<string | null>;
}

/** Only test-mode secret / restricted keys may ever be used (M5-6b/M5-7). */
export const isTestSecretKey = (k: string | undefined | null): k is string =>
  !!k && /^(sk|rk)_test_[A-Za-z0-9]+$/.test(k);

/** Price lookup key for a SKU in one currency (`gems_small_inr`). */
export const lookupKey = (sku: string, currency: Currency) => `${sku}_${currency}`;

/** A return URL is accepted only on an allowed origin; query and hash are dropped. */
export function safeReturnUrl(url: unknown, allowedOrigins: string[]): string | null {
  if (typeof url !== 'string' || url.length > 500) return null;
  try {
    const u = new URL(url);
    if (!allowedOrigins.includes(u.origin)) return null;
    return `${u.origin}${u.pathname}`;
  } catch {
    return null;
  }
}

/** Form params for POST /v1/checkout/sessions (mode=payment, one fixed-content SKU). */
export function checkoutParams(
  skuId: string,
  currency: Currency,
  userId: string,
  returnUrl: string,
  priceId: string | null,
): URLSearchParams {
  const sku = serverSku(skuId);
  if (!sku) throw new Error('unknown sku');
  const p = new URLSearchParams();
  p.set('mode', 'payment');
  p.set('client_reference_id', userId);
  p.set('metadata[sku]', sku.id);
  p.set('metadata[user_id]', userId);
  p.set('payment_intent_data[metadata][sku]', sku.id);
  p.set('payment_intent_data[metadata][user_id]', userId);
  p.set('success_url', `${returnUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  p.set('cancel_url', `${returnUrl}?checkout=cancel`);
  p.set('line_items[0][quantity]', '1');
  if (priceId) p.set('line_items[0][price]', priceId);
  else {
    p.set('line_items[0][price_data][currency]', currency);
    p.set('line_items[0][price_data][unit_amount]', String(amountFor(sku, currency)));
    p.set('line_items[0][price_data][product_data][name]', `Hive Surge — ${sku.name}`);
  }
  return p;
}

export interface CheckoutResult {
  status: number;
  body: { id?: string; url?: string; error?: string };
}

/**
 * create-checkout core: a signed-in player asks for a SKU, the server prices it from its own
 * catalog and returns a hosted Checkout URL. Grants happen only in the webhook.
 */
export async function handleCreateCheckout(
  userId: string | null,
  body: unknown,
  deps: { stripe: StripeApi; allowedOrigins: string[] },
): Promise<CheckoutResult> {
  if (!userId) return { status: 401, body: { error: 'sign in to buy' } };
  const b = (body && typeof body === 'object' ? body : {}) as Obj;
  const sku = serverSku(b.sku);
  if (!sku || !sku.available)
    return { status: 400, body: { error: 'unknown or unavailable item' } };
  const currency: Currency = b.currency === 'inr' ? 'inr' : 'usd';
  const ret = safeReturnUrl(b.returnUrl, deps.allowedOrigins);
  if (!ret) return { status: 400, body: { error: 'return url not allowed' } };
  const priceId = await deps.stripe.findPriceId(lookupKey(sku.id, currency)).catch(() => null);
  const s = await deps.stripe.createCheckoutSession(
    checkoutParams(sku.id, currency, userId, ret, priceId),
  );
  if (typeof s.id !== 'string' || typeof s.url !== 'string')
    return { status: 502, body: { error: 'checkout unavailable' } };
  return { status: 200, body: { id: s.id, url: s.url } };
}

/** Stripe REST client (test keys only). `fetchImpl` is injected for tests. */
export function stripeRest(secretKey: string, fetchImpl: typeof fetch = fetch): StripeApi {
  if (!isTestSecretKey(secretKey)) throw new Error('refusing a non-test Stripe key');
  const headers = {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  return {
    async createCheckoutSession(params) {
      const r = await fetchImpl('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers,
        body: params.toString(),
      });
      const j = (await r.json()) as Obj;
      if (!r.ok) throw new Error('stripe error');
      if (j.livemode === true) throw new Error('live mode session refused');
      return j;
    },
    async findPriceId(key) {
      const q = new URLSearchParams({ 'lookup_keys[]': key, active: 'true', limit: '1' });
      const r = await fetchImpl(`https://api.stripe.com/v1/prices?${q}`, { headers });
      if (!r.ok) return null;
      const j = (await r.json()) as { data?: { id?: string }[] };
      return j.data?.[0]?.id ?? null;
    },
  };
}
