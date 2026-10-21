import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../src/analytics/analytics';
import { shouldShowInterstitialOnClaim } from '../src/platform/adPolicy';
import { canShowPopupOffer, starterOfferEligible } from '../src/platform/offers';
import { ResultSession } from '../src/platform/resultSession';
import {
  defaultSave,
  mergeSaves,
  parseSave,
  reconcileSave,
  type SaveData,
} from '../src/platform/save';
import { checkoutReturn, purchaseMode, stripePublishableKey } from '../src/purchases/config';
import { MockStripe, MockPurchaseStore, TEST_CARDS } from '../src/purchases/mockStripe';
import { applyPurchaseRecords } from '../src/purchases/records';
import { type CheckoutUi, PurchaseService, type RemotePurchases } from '../src/purchases/service';
import type { PurchaseRecord } from '../supabase/functions/_shared/grant.ts';

const ORIGIN = 'http://localhost:5173';
const SUPA = {
  VITE_SUPABASE_URL: 'https://abc.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_x',
};

/** Scripted mock-Checkout screen: plays the given card choices in order. */
function script(
  cards: (string | null)[],
  threeDs: boolean[] = [],
): CheckoutUi & { errors: string[] } {
  const errors: string[] = [];
  return {
    errors,
    async chooseCard(_s, error) {
      errors.push(error);
      return cards.length ? cards.shift()! : null;
    },
    async confirm3ds() {
      return threeDs.shift() ?? false;
    },
  };
}

function rig(
  ui?: CheckoutUi,
  opts: { user?: string | null; remote?: RemotePurchases; kv?: MemoryStore; save?: SaveData } = {},
) {
  const save = opts.save ?? defaultSave();
  const navigated: string[] = [];
  const svc = new PurchaseService({
    save: () => save,
    device: 'd:a',
    userId: async () => opts.user ?? null,
    returnUrl: `${ORIGIN}/`,
    allowedOrigins: [ORIGIN],
    kv: opts.kv ?? new MemoryStore(),
    ui,
    remote: opts.remote ?? null,
    navigate: (u) => navigated.push(u),
    sleep: async () => {},
  });
  return { save, svc, navigated };
}

describe('M5-7 purchase mode (zero env vars = mock)', () => {
  it('uses real Stripe test mode only with pk_test_ + Supabase env', () => {
    expect(purchaseMode({})).toBe('mock');
    expect(purchaseMode({ VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_abc' })).toBe('mock');
    expect(purchaseMode({ ...SUPA, VITE_STRIPE_PUBLISHABLE_KEY: 'pk_live_abc' })).toBe('mock');
    expect(stripePublishableKey({ VITE_STRIPE_PUBLISHABLE_KEY: 'pk_live_abc' })).toBeNull();
    expect(purchaseMode({ ...SUPA, VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_abc' })).toBe('stripe');
  });

  it('parses the Checkout return URL', () => {
    expect(checkoutReturn('?checkout=success&session_id=cs_test_a1B2')).toEqual({
      kind: 'success',
      sessionId: 'cs_test_a1B2',
    });
    expect(checkoutReturn('?checkout=cancel')).toEqual({ kind: 'cancel', sessionId: '' });
    expect(checkoutReturn('?checkout=success&session_id=<script>')).toBeNull();
    expect(checkoutReturn('?x=1')).toBeNull();
  });
});

describe('M5-9 purchase matrix (mock Checkout, same webhook code as the Edge Function)', () => {
  it('4242 succeeds: server record, grant applied once, restore adds nothing', async () => {
    const { save, svc } = rig(script([TEST_CARDS.success]));
    const out = await svc.buy('gems_small', 'usd');
    expect(out.status).toBe('granted');
    expect(save.gems).toBe(120);
    expect(save.noAds).toBe(true); // G6
    expect(await svc.restore()).toEqual([]);
    expect(save.gems).toBe(120);
    const recs = await svc.records();
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({
      provider: 'mock',
      amount: 499,
      currency: 'usd',
      user_id: 'guest:d:a',
    });
  });

  it('decline and insufficient funds show Stripe-style errors and charge nothing; retry succeeds', async () => {
    const ui = script([TEST_CARDS.decline, TEST_CARDS.insufficient, TEST_CARDS.success]);
    const { save, svc } = rig(ui);
    const out = await svc.buy('no_ads', 'inr');
    expect(out.status).toBe('granted');
    expect(ui.errors[1]).toMatch(/declined/);
    expect(ui.errors[2]).toMatch(/Insufficient/);
    expect(save.noAds).toBe(true);
    expect((await svc.records())[0]).toMatchObject({ amount: 14900, currency: 'inr' });
  });

  it('3DS: approved grants; failed authentication then cancel grants nothing', async () => {
    const a = rig(script([TEST_CARDS.threeDS], [true]));
    expect((await a.svc.buy('starter_pack', 'usd')).status).toBe('granted');
    expect(a.save.coins).toBe(500);
    expect(a.save.skins).toContain('starter');
    const b = rig(script([TEST_CARDS.threeDS, null], [false]));
    expect((await b.svc.buy('starter_pack', 'usd')).status).toBe('cancelled');
    expect(b.save.coins).toBe(0);
    expect(await b.svc.records()).toEqual([]);
  });

  it('cancel leaves no purchase and expires the session', async () => {
    const { save, svc } = rig(script([null]));
    expect((await svc.buy('gems_large', 'usd')).status).toBe('cancelled');
    expect(save.gems).toBe(0);
    expect([...svc.mockStripe.sessions.values()][0].status).toBe('expired');
  });

  it('unavailable SKUs cannot be bought (server catalog decides)', async () => {
    const { svc } = rig(script([TEST_CARDS.success]));
    expect(await svc.buy('season_pass', 'usd')).toEqual({
      status: 'failed',
      reason: 'unknown or unavailable item',
    });
  });

  it('refund: restore removes the currency once, keeps No Ads', async () => {
    const { save, svc } = rig(script([TEST_CARDS.success]));
    await svc.buy('gems_medium', 'usd');
    const pi = (await svc.records())[0].payment_intent!;
    expect((await svc.mockStripe.refund(pi)).body.result).toBe('refunded');
    expect((await svc.restore()).length).toBe(1);
    expect(await svc.restore()).toEqual([]);
    expect(save.gems).toBe(0);
    expect(save.noAds).toBe(true);
  });

  it('a forged webhook (wrong secret) is rejected and grants nothing', async () => {
    const store = new MockPurchaseStore(new MemoryStore());
    const evil = new MockStripe(store, Date.now, 'whsec_attacker');
    const s = await evil.createCheckoutSession(
      new URLSearchParams({
        mode: 'payment',
        client_reference_id: 'u1',
        'metadata[sku]': 'gems_large',
        'line_items[0][price_data][unit_amount]': '1999',
        'line_items[0][price_data][currency]': 'usd',
      }),
    );
    const r = await evil.deliver('checkout.session.completed', { ...s, payment_status: 'paid' });
    expect(r.status).toBe(400);
    expect(store.all()).toEqual([]);
  });

  it('purchases restore on a second device and merge to a single grant', async () => {
    const kv = new MemoryStore(); // same mock store = same "server"
    const a = rig(script([TEST_CARDS.success]), { kv, user: 'u1' });
    await a.svc.buy('starter_pack', 'usd');
    const b = rig(undefined, { kv, user: 'u1' });
    expect((await b.svc.restore()).length).toBe(1);
    reconcileSave(a.save, 'd:a', 1);
    reconcileSave(b.save, 'd:b', 1);
    const m = mergeSaves(
      parseSave(JSON.stringify(a.save)),
      parseSave(JSON.stringify(b.save)),
      'd:a',
    );
    expect(m.coins).toBe(500);
    expect(m.gems).toBe(50);
  });
});

describe('M5-7 Stripe test-mode client path (remote stub)', () => {
  const rec: PurchaseRecord = {
    session_id: 'cs_test_r1',
    user_id: 'u1',
    sku: 'gems_small',
    provider: 'stripe_test',
    status: 'paid',
    amount: 499,
    currency: 'usd',
    grants: { gems: 120, noAds: true },
    payment_intent: 'pi_test_r1',
    created_at: '',
    refunded_at: null,
  };
  function remote(rowsAfter = 0) {
    let calls = 0;
    const r: RemotePurchases & { bodies: unknown[] } = {
      bodies: [],
      async createCheckout(b) {
        r.bodies.push(b);
        return { id: 'cs_test_r1', url: 'https://checkout.stripe.com/c/pay/cs_test_r1' };
      },
      async listPurchases() {
        return calls++ >= rowsAfter ? [rec] : [];
      },
    };
    return r;
  }

  it('requires sign-in, then redirects to hosted Checkout with the SKU only', async () => {
    const out = await rig(undefined, { remote: remote() }).svc.buy('gems_small', 'usd');
    expect(out).toEqual({ status: 'failed', reason: 'sign_in_required' });
    const rm = remote();
    const { svc, navigated } = rig(undefined, { remote: rm, user: 'u1' });
    expect(await svc.buy('gems_small', 'inr')).toEqual({ status: 'redirect' });
    expect(navigated).toEqual(['https://checkout.stripe.com/c/pay/cs_test_r1']);
    expect(rm.bodies[0]).toEqual({ sku: 'gems_small', currency: 'inr', returnUrl: `${ORIGIN}/` });
  });

  it('on return, polls until the webhook row lands, then applies it once', async () => {
    const { save, svc } = rig(undefined, { remote: remote(2), user: 'u1' });
    expect((await svc.collect('cs_test_r1', 5)).status).toBe('granted');
    expect(save.gems).toBe(120);
    expect((await svc.collect('cs_test_r1', 5)).status).toBe('granted');
    expect(save.gems).toBe(120);
    const slow = rig(undefined, { remote: remote(99), user: 'u1' });
    expect(await slow.svc.collect('cs_test_r1', 2)).toEqual({
      status: 'pending',
      sessionId: 'cs_test_r1',
    });
  });

  it('the client only applies server records (no catalog grant path)', () => {
    const s = defaultSave();
    expect(applyPurchaseRecords(s, [rec], 'd:a', 1)).toHaveLength(1);
    expect(applyPurchaseRecords(s, [rec], 'd:a', 2)).toHaveLength(0);
    expect(s.gems).toBe(120);
  });
});

describe('M5-7 offers + pacing (G13, decision 43)', () => {
  const ok = { ftueDone: true, battlesCompleted: 6, skins: [] as string[] };
  it('Starter Pack pop-up: once per session, not before 5 battles, never once owned', () => {
    expect(starterOfferEligible(ok, 0, true)).toBe(true);
    expect(starterOfferEligible(ok, 1, true)).toBe(false);
    expect(starterOfferEligible({ ...ok, battlesCompleted: 4 }, 0, true)).toBe(false);
    expect(starterOfferEligible({ ...ok, skins: ['starter'] }, 0, true)).toBe(false);
    expect(starterOfferEligible(ok, 0, false)).toBe(false);
    expect(
      canShowPopupOffer({ popupsShownThisSession: 0, ftueDone: false, screen: 'defeat' }),
    ).toBe(false);
  });

  it('declining an offer blocks the interstitial on that transition', () => {
    const state = { lastInterstitialAt: 0, battlesCompleted: 10, noAds: false, ftueDone: true };
    const pacer = { canInterstitial: () => true };
    const r = new ResultSession();
    expect(shouldShowInterstitialOnClaim(state, 1e9, r.blocksInterstitial, false, pacer)).toBe(
      true,
    );
    r.markOfferDeclined();
    expect(r.offerWasDeclined).toBe(true);
    expect(shouldShowInterstitialOnClaim(state, 1e9, r.blocksInterstitial, false, pacer)).toBe(
      false,
    );
    // The next battle's result starts clean.
    expect(ResultSession.forBattleEnd(r, false).blocksInterstitial).toBe(false);
  });
});
