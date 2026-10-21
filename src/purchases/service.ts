import { handleCreateCheckout } from '../../supabase/functions/_shared/checkout.ts';
import type { PurchaseRecord } from '../../supabase/functions/_shared/grant.ts';
import type { Currency } from '../../supabase/functions/_shared/skus.ts';
import type { KeyValueStore } from '../analytics/analytics';
import type { Sku } from '../platform/platform';
import type { SaveData } from '../platform/save';
import { MockPurchaseStore, MockStripe, type PayResult } from './mockStripe';
import { applyPurchaseRecords } from './records';

/**
 * M5-6d / M5-7 purchase flow (lazy chunk: nothing here loads before the shop opens).
 * Both modes end the same way: the server (Edge Function, or the mock running the same webhook
 * code) writes a purchase record, and the client applies records only.
 */
export type PurchaseOutcome =
  | { status: 'granted'; record: PurchaseRecord }
  | { status: 'cancelled' }
  | { status: 'failed'; reason: string }
  /** Real Stripe: the page is leaving for hosted Checkout; the grant happens on return. */
  | { status: 'redirect' }
  /** Paid, but the webhook has not landed yet; restore picks it up. */
  | { status: 'pending'; sessionId: string };

/** Mock hosted-Checkout screen (DOM in the game, a script in tests). */
export interface CheckoutUi {
  /** Card number chosen, or null if the player cancelled. `error` = last decline message. */
  chooseCard(
    session: { id: string; sku: string; amount: number; currency: Currency },
    error: string,
  ): Promise<string | null>;
  /** 3D Secure challenge: true = authenticated. */
  confirm3ds(): Promise<boolean>;
}

/** Real backend calls (Supabase): only present when Stripe test mode is configured. */
export interface RemotePurchases {
  createCheckout(body: {
    sku: string;
    currency: Currency;
    returnUrl: string;
  }): Promise<{ id: string; url: string }>;
  listPurchases(): Promise<PurchaseRecord[]>;
}

export interface PurchaseServiceOptions {
  save: () => SaveData;
  device: string;
  now?: () => number;
  /** Signed-in cloud user id, or null for a guest. */
  userId: () => Promise<string | null>;
  returnUrl: string;
  allowedOrigins: string[];
  kv: KeyValueStore;
  ui?: CheckoutUi;
  remote?: RemotePurchases | null;
  navigate?: (url: string) => void;
  sleep?: (ms: number) => Promise<void>;
}

export const DECLINE_TEXT: Record<string, string> = {
  card_declined: 'Your card was declined (test card 4000 0000 0000 0002).',
  insufficient_funds: 'Insufficient funds (test card 4000 0000 0000 9995).',
  authentication_failed: 'Authentication failed. Try again or use another card.',
  session_closed: 'This checkout expired. Please start again.',
};

export class PurchaseService {
  readonly mockStore: MockPurchaseStore;
  readonly mockStripe: MockStripe;
  private readonly now: () => number;

  constructor(private readonly o: PurchaseServiceOptions) {
    this.now = o.now ?? Date.now;
    this.mockStore = new MockPurchaseStore(o.kv);
    this.mockStripe = new MockStripe(this.mockStore, this.now);
  }

  get mode(): 'stripe' | 'mock' {
    return this.o.remote ? 'stripe' : 'mock';
  }

  /** Mock users: the cloud user id when signed in, else a per-device guest id. */
  private async mockUser(): Promise<string> {
    return (await this.o.userId()) ?? `guest:${this.o.device}`;
  }

  async buy(sku: Sku, currency: Currency): Promise<PurchaseOutcome> {
    if (this.o.remote) {
      if (!(await this.o.userId())) return { status: 'failed', reason: 'sign_in_required' };
      try {
        const s = await this.o.remote.createCheckout({
          sku,
          currency,
          returnUrl: this.o.returnUrl,
        });
        (this.o.navigate ?? ((u) => location.assign(u)))(s.url);
        return { status: 'redirect' };
      } catch {
        return { status: 'failed', reason: 'checkout_unavailable' };
      }
    }
    const uid = await this.mockUser();
    const r = await handleCreateCheckout(
      uid,
      { sku, currency, returnUrl: this.o.returnUrl },
      { stripe: this.mockStripe, allowedOrigins: this.o.allowedOrigins },
    );
    if (r.status !== 200 || !r.body.id)
      return { status: 'failed', reason: r.body.error ?? 'checkout_failed' };
    const id = r.body.id;
    const session = this.mockStripe.sessions.get(id)!;
    const ui = this.o.ui;
    if (!ui) return { status: 'failed', reason: 'no_checkout_ui' };
    let error = '';
    for (;;) {
      const card = await ui.chooseCard(
        { id, sku, amount: session.amount_total as number, currency },
        error,
      );
      if (card === null) {
        this.mockStripe.expire(id);
        return { status: 'cancelled' };
      }
      let res: PayResult = await this.mockStripe.pay(id, card);
      if (!res.ok && 'requiresAction' in res)
        res = await this.mockStripe.pay(id, card, await ui.confirm3ds());
      if (res.ok) break;
      const code = 'code' in res ? res.code : 'authentication_failed';
      error = DECLINE_TEXT[code] ?? 'Payment failed.';
      if (code === 'session_closed') return { status: 'failed', reason: code };
    }
    return this.collect(id);
  }

  /** Apply the record for a session (polls briefly in Stripe mode while the webhook lands). */
  async collect(sessionId: string, tries = 1): Promise<PurchaseOutcome> {
    for (let i = 0; i < tries; i++) {
      const recs = await this.records();
      const rec = recs.find((r) => r.session_id === sessionId);
      if (rec) {
        applyPurchaseRecords(this.o.save(), [rec], this.o.device, this.now());
        return { status: 'granted', record: rec };
      }
      if (i + 1 < tries)
        await (this.o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))))(2000);
    }
    return { status: 'pending', sessionId };
  }

  /** All purchase records of the current user (server rows, or the mock store). */
  async records(): Promise<PurchaseRecord[]> {
    if (this.o.remote) return this.o.remote.listPurchases();
    return this.mockStore.list(await this.mockUser());
  }

  /** Restore: re-apply every confirmed purchase (idempotent). Returns the newly applied ones. */
  async restore(): Promise<PurchaseRecord[]> {
    return applyPurchaseRecords(this.o.save(), await this.records(), this.o.device, this.now());
  }
}
