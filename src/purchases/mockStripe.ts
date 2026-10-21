import type { StripeApi } from '../../supabase/functions/_shared/checkout.ts';
import type { PurchaseRecord } from '../../supabase/functions/_shared/grant.ts';
import { signStripePayload } from '../../supabase/functions/_shared/stripeSig.ts';
import {
  handleStripeWebhook,
  type PurchaseStore,
  type WebhookResult,
} from '../../supabase/functions/_shared/webhook.ts';
import type { KeyValueStore } from '../analytics/analytics';

/**
 * Faithful in-browser Stripe mock (no network, no money): Checkout Sessions with Stripe's
 * shapes, Stripe test-card outcomes, and signed webhook events delivered to the SAME
 * `handleStripeWebhook` the Edge Function runs, which grants idempotently into a purchase store.
 */
export const MOCK_WEBHOOK_SECRET = 'whsec_mock_hivesurge_sandbox';

/** Stripe test cards (https://docs.stripe.com/testing). */
export const TEST_CARDS = {
  success: '4242424242424242',
  decline: '4000000000000002',
  insufficient: '4000000000009995',
  threeDS: '4000002500003155',
} as const;

export type PayResult =
  | { ok: true; paymentIntent: string }
  | {
      ok: false;
      code: 'card_declined' | 'insufficient_funds' | 'authentication_failed' | 'session_closed';
    }
  | { ok: false; requiresAction: true };

type Obj = Record<string, unknown>;

const rid = (prefix: string) => {
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  return (
    prefix +
    Array.from(b, (x) => x.toString(36).padStart(2, '0'))
      .join('')
      .slice(0, 24)
  );
};

/** Purchases kept per user in local storage (mock of `purchases_sandbox`). */
export class MockPurchaseStore implements PurchaseStore {
  constructor(
    private readonly kv: KeyValueStore,
    private readonly key = 'hivesurge.mockpurchases.v1',
    private readonly onSave?: (userId: string, fn: (data: unknown) => boolean) => Promise<void>,
  ) {}
  all(): PurchaseRecord[] {
    try {
      const v = JSON.parse(this.kv.getItem(this.key) ?? '[]') as unknown;
      return Array.isArray(v) ? (v as PurchaseRecord[]) : [];
    } catch {
      return [];
    }
  }
  private write(rows: PurchaseRecord[]) {
    try {
      this.kv.setItem(this.key, JSON.stringify(rows));
    } catch {
      /* in-memory only */
    }
  }
  list(userId: string): PurchaseRecord[] {
    return this.all().filter((r) => r.user_id === userId);
  }
  async insertPurchase(p: PurchaseRecord) {
    const rows = this.all();
    if (rows.some((r) => r.session_id === p.session_id)) return 'exists' as const;
    rows.push(p);
    this.write(rows);
    return 'inserted' as const;
  }
  async getPurchase(id: string) {
    return this.all().find((r) => r.session_id === id) ?? null;
  }
  async markRefunded(pi: string, at: string) {
    const rows = this.all();
    const r = rows.find((x) => x.payment_intent === pi);
    if (!r) return null;
    if (r.status === 'paid') {
      r.status = 'refunded';
      r.refunded_at = at;
      this.write(rows);
    }
    return r;
  }
  async updateSave(userId: string, fn: (data: unknown) => boolean) {
    await this.onSave?.(userId, fn);
  }
}

export class MockStripe implements StripeApi {
  readonly sessions = new Map<string, Obj>();
  constructor(
    private readonly store: PurchaseStore,
    private readonly now: () => number = Date.now,
    private readonly secret = MOCK_WEBHOOK_SECRET,
  ) {}

  async findPriceId(): Promise<string | null> {
    return null; // inline server prices, like an unseeded Stripe account
  }

  async createCheckoutSession(p: URLSearchParams): Promise<Obj> {
    const id = rid('cs_test_');
    const s: Obj = {
      id,
      object: 'checkout.session',
      livemode: false,
      mode: p.get('mode'),
      status: 'open',
      payment_status: 'unpaid',
      amount_total: Number(p.get('line_items[0][price_data][unit_amount]')),
      currency: p.get('line_items[0][price_data][currency]'),
      client_reference_id: p.get('client_reference_id'),
      metadata: { sku: p.get('metadata[sku]'), user_id: p.get('metadata[user_id]') },
      payment_intent: null,
      success_url: p.get('success_url'),
      cancel_url: p.get('cancel_url'),
      created: Math.floor(this.now() / 1000),
      url: `mock-checkout:${id}`,
    };
    this.sessions.set(id, s);
    return { ...s };
  }

  /** Pay with a test card; 3DS cards need `approve3ds` (true = authenticated). */
  async pay(id: string, card: string, approve3ds?: boolean): Promise<PayResult> {
    const s = this.sessions.get(id);
    if (!s || s.status !== 'open') return { ok: false, code: 'session_closed' };
    const n = card.replace(/\s/g, '');
    if (n === TEST_CARDS.decline) return { ok: false, code: 'card_declined' };
    if (n === TEST_CARDS.insufficient) return { ok: false, code: 'insufficient_funds' };
    if (n === TEST_CARDS.threeDS && approve3ds === undefined)
      return { ok: false, requiresAction: true };
    if (n === TEST_CARDS.threeDS && !approve3ds)
      return { ok: false, code: 'authentication_failed' };
    if (n !== TEST_CARDS.success && n !== TEST_CARDS.threeDS)
      return { ok: false, code: 'card_declined' };
    const pi = rid('pi_test_');
    Object.assign(s, { status: 'complete', payment_status: 'paid', payment_intent: pi });
    await this.deliver('checkout.session.completed', { ...s });
    return { ok: true, paymentIntent: pi };
  }

  /** Customer left Checkout (cancel_url); Stripe keeps the session open until it expires. */
  expire(id: string): void {
    const s = this.sessions.get(id);
    if (s && s.status === 'open') s.status = 'expired';
  }

  /** Dashboard refund (full). */
  refund(paymentIntent: string): Promise<WebhookResult> {
    return this.deliver('charge.refunded', {
      id: rid('ch_test_'),
      object: 'charge',
      payment_intent: paymentIntent,
      refunded: true,
      livemode: false,
    });
  }

  /** Sign and POST (in memory) an event to the shared webhook handler. */
  async deliver(type: string, object: Obj): Promise<WebhookResult> {
    const body = JSON.stringify({
      id: rid('evt_'),
      object: 'event',
      type,
      livemode: false,
      created: Math.floor(this.now() / 1000),
      data: { object },
    });
    const sig = await signStripePayload(this.secret, body, Math.floor(this.now() / 1000));
    return handleStripeWebhook(body, sig, {
      secret: MOCK_WEBHOOK_SECRET,
      store: this.store,
      now: this.now,
      provider: 'mock',
    });
  }
}
