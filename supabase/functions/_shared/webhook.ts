import { applyPurchaseToSave, type PurchaseRecord } from './grant.ts';
import { amountFor, type Currency, serverSku } from './skus.ts';
import { verifyStripeSignature } from './stripeSig.ts';

/** Storage used by the webhook: PostgREST + service role in the Edge Function, memory in the mock. */
export interface PurchaseStore {
  /** Insert unless the session id exists. */
  insertPurchase(p: PurchaseRecord): Promise<'inserted' | 'exists'>;
  getPurchase(sessionId: string): Promise<PurchaseRecord | null>;
  /** Mark the purchase with this payment intent refunded; returns the updated row. */
  markRefunded(paymentIntent: string, atIso: string): Promise<PurchaseRecord | null>;
  /** Read-modify-write the user's cloud save with optimistic concurrency (no row = no-op). */
  updateSave(userId: string, fn: (data: unknown) => boolean): Promise<void>;
}

export interface WebhookResult {
  status: number;
  body: { received?: boolean; error?: string; result?: string };
}

type Obj = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : '');

/**
 * Stripe webhook core (M5-6e / M5-8). Verifies the signature on the raw body, then grants
 * `checkout.session.completed` (paid) and `checkout.session.async_payment_succeeded`, and
 * revokes currency on a full `charge.refunded`. Everything is idempotent by session id, so
 * Stripe retries and replays never grant twice.
 */
export async function handleStripeWebhook(
  rawBody: string,
  signature: string | null,
  deps: {
    secret: string;
    store: PurchaseStore;
    now: () => number;
    provider?: 'stripe_test' | 'mock';
  },
): Promise<WebhookResult> {
  const ok = await verifyStripeSignature(
    rawBody,
    signature,
    deps.secret,
    Math.floor(deps.now() / 1000),
  );
  if (!ok) return { status: 400, body: { error: 'bad signature' } };
  let ev: Obj;
  try {
    ev = JSON.parse(rawBody) as Obj;
  } catch {
    return { status: 400, body: { error: 'bad json' } };
  }
  if (ev.livemode === true) return { status: 400, body: { error: 'live mode event refused' } };
  const obj = ((ev.data as Obj | undefined)?.object ?? {}) as Obj;
  const type = str(ev.type);

  if (
    type === 'checkout.session.completed' ||
    type === 'checkout.session.async_payment_succeeded'
  ) {
    if (obj.payment_status !== 'paid') return done('ignored: unpaid');
    const meta = (obj.metadata ?? {}) as Obj;
    const sku = serverSku(meta.sku);
    const user = str(obj.client_reference_id) || str(meta.user_id);
    const currency = str(obj.currency).toLowerCase() as Currency;
    const sessionId = str(obj.id);
    if (!sku || !user || !sessionId || (currency !== 'usd' && currency !== 'inr'))
      return done('ignored: not a Hive Surge session');
    if (obj.amount_total !== amountFor(sku, currency)) return done('ignored: amount mismatch');
    const rec: PurchaseRecord = {
      session_id: sessionId,
      user_id: user,
      sku: sku.id,
      provider: deps.provider ?? 'stripe_test',
      status: 'paid',
      amount: amountFor(sku, currency),
      currency,
      grants: sku.grants,
      payment_intent: str(obj.payment_intent) || null,
      created_at: new Date(deps.now()).toISOString(),
      refunded_at: null,
    };
    const ins = await deps.store.insertPurchase(rec);
    const row = ins === 'inserted' ? rec : ((await deps.store.getPurchase(sessionId)) ?? rec);
    await deps.store.updateSave(row.user_id, (d) => applyPurchaseToSave(d, row, deps.now()));
    return done(ins === 'inserted' ? 'granted' : 'duplicate');
  }

  if (type === 'charge.refunded') {
    if (obj.refunded !== true) return done('ignored: partial refund');
    const pi = str(obj.payment_intent);
    if (!pi) return done('ignored: no payment intent');
    const row = await deps.store.markRefunded(pi, new Date(deps.now()).toISOString());
    if (!row) return done('ignored: unknown payment');
    await deps.store.updateSave(row.user_id, (d) => applyPurchaseToSave(d, row, deps.now()));
    return done('refunded');
  }
  return done('ignored');
}

const done = (result: string): WebhookResult => ({ status: 200, body: { received: true, result } });
