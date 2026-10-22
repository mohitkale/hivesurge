import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isTestKey, seedStripe } from '../scripts/stripe-seed-test.mjs';
import { CATALOG } from '../src/platform/platform';
import { defaultSave, mergeSaves, parseSave, reconcileSave } from '../src/platform/save';
import {
  checkoutParams,
  handleCreateCheckout,
  isTestSecretKey,
  safeReturnUrl,
  type StripeApi,
  stripeRest,
} from '../supabase/functions/_shared/checkout.ts';
import { applyPurchaseToSave, type PurchaseRecord } from '../supabase/functions/_shared/grant.ts';
import { restPurchaseStore } from '../supabase/functions/_shared/restStore.ts';
import { SERVER_SKUS } from '../supabase/functions/_shared/skus.ts';
import {
  signStripePayload,
  verifyStripeSignature,
} from '../supabase/functions/_shared/stripeSig.ts';
import { handleStripeWebhook, type PurchaseStore } from '../supabase/functions/_shared/webhook.ts';

const SECRET = 'whsec_test_secret_for_unit_tests';
const NOW = 1_800_000_000_000;
const USER = '11111111-1111-4111-8111-111111111111';

class MemStore implements PurchaseStore {
  rows: PurchaseRecord[] = [];
  saves = new Map<string, { revision: number; data: unknown }>();
  async insertPurchase(p: PurchaseRecord) {
    if (this.rows.some((r) => r.session_id === p.session_id)) return 'exists' as const;
    this.rows.push(structuredClone(p));
    return 'inserted' as const;
  }
  async getPurchase(id: string) {
    return this.rows.find((r) => r.session_id === id) ?? null;
  }
  async markRefunded(pi: string, at: string) {
    const r = this.rows.find((x) => x.payment_intent === pi);
    if (!r) return null;
    if (r.status === 'paid') Object.assign(r, { status: 'refunded', refunded_at: at });
    return r;
  }
  async updateSave(uid: string, fn: (d: unknown) => boolean) {
    const s = this.saves.get(uid);
    if (s && fn(s.data)) s.revision++;
  }
}

function session(over: Record<string, unknown> = {}) {
  return {
    id: 'cs_test_a1',
    object: 'checkout.session',
    mode: 'payment',
    status: 'complete',
    payment_status: 'paid',
    amount_total: 499,
    currency: 'usd',
    client_reference_id: USER,
    metadata: { sku: 'gems_small', user_id: USER },
    payment_intent: 'pi_test_a1',
    livemode: false,
    ...over,
  };
}
const event = (type: string, object: unknown, id = 'evt_test_1') =>
  JSON.stringify({ id, object: 'event', type, livemode: false, data: { object } });

async function send(store: MemStore, body: string, secret = SECRET, t = NOW / 1000) {
  const sig = await signStripePayload(secret, body, t);
  return handleStripeWebhook(body, sig, { secret: SECRET, store, now: () => NOW });
}

function cloudSave() {
  const s = defaultSave();
  s.coins = 40;
  reconcileSave(s, 'd:a', 1);
  return JSON.parse(JSON.stringify(s)) as unknown;
}

describe('M5-6a server catalog', () => {
  it('matches monetization/skus.json and the client CATALOG', () => {
    const json = JSON.parse(readFileSync('monetization/skus.json', 'utf8')) as {
      id: keyof typeof SERVER_SKUS;
      usd: number;
      inr: number;
      grants: Record<string, unknown>;
    }[];
    expect(Object.keys(SERVER_SKUS).sort()).toEqual(json.map((s) => s.id).sort());
    for (const s of json) {
      const v = SERVER_SKUS[s.id];
      expect([v.usd, v.inr]).toEqual([s.usd, s.inr]);
      expect(v.grants).toEqual(s.grants);
      const c = CATALOG[s.id];
      expect(c.available).toBe(v.available);
      expect(c.price).toEqual({ usd: v.usd, inr: v.inr });
    }
  });
});

describe('M5-6e webhook signature', () => {
  const body = event('checkout.session.completed', session());
  it('accepts a valid signature and rejects bad, stale or tampered ones', async () => {
    const t = NOW / 1000;
    const sig = await signStripePayload(SECRET, body, t);
    expect(await verifyStripeSignature(body, sig, SECRET, t)).toBe(true);
    expect(await verifyStripeSignature(body, sig, 'whsec_other', t)).toBe(false);
    expect(await verifyStripeSignature(body + ' ', sig, SECRET, t)).toBe(false);
    expect(await verifyStripeSignature(body, sig, SECRET, t + 301)).toBe(false);
    expect(await verifyStripeSignature(body, null, SECRET, t)).toBe(false);
    expect(await verifyStripeSignature(body, `t=${t},v1=deadbeef`, SECRET, t)).toBe(false);
    // Stripe may send several v1 signatures during secret rotation.
    expect(await verifyStripeSignature(body, `t=${t},v1=00,${sig.split(',')[1]}`, SECRET, t)).toBe(
      true,
    );
  });

  it('the handler answers 400 to a bad signature and grants nothing', async () => {
    const store = new MemStore();
    const r = await send(store, body, 'whsec_attacker');
    expect(r.status).toBe(400);
    expect(store.rows).toHaveLength(0);
  });
});

describe('M5-8 server-authoritative grants', () => {
  it('a paid session is recorded once and granted into the cloud save once', async () => {
    const store = new MemStore();
    store.saves.set(USER, { revision: 3, data: cloudSave() });
    const body = event('checkout.session.completed', session());
    expect((await send(store, body)).body.result).toBe('granted');
    expect((await send(store, body)).body.result).toBe('duplicate'); // Stripe retry
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]).toMatchObject({ sku: 'gems_small', amount: 499, status: 'paid' });
    const s = parseSave(JSON.stringify(store.saves.get(USER)!.data));
    expect(s.gems).toBe(120);
    expect(s.noAds).toBe(true);
    expect(s.coins).toBe(40);
    expect(s.gemLedger.filter((e) => e.id === 'purchase:cs_test_a1')).toHaveLength(1);
  });

  it('ignores unpaid, mismatched, unknown and live-mode sessions', async () => {
    const store = new MemStore();
    for (const o of [
      session({ payment_status: 'unpaid' }),
      session({ amount_total: 1 }),
      session({ metadata: { sku: 'free_gems' } }),
      session({ currency: 'eur' }),
    ])
      expect((await send(store, event('checkout.session.completed', o))).status).toBe(200);
    expect(store.rows).toHaveLength(0);
    const live = JSON.stringify({
      type: 'checkout.session.completed',
      livemode: true,
      data: { object: session() },
    });
    expect((await send(store, live)).status).toBe(400);
  });

  it('INR sessions are priced from the server catalog', async () => {
    const store = new MemStore();
    const r = await send(
      store,
      event(
        'checkout.session.completed',
        session({ id: 'cs_test_inr', currency: 'inr', amount_total: 24900 }),
      ),
    );
    expect(r.body.result).toBe('granted');
  });

  it('full refund removes the currency once, keeps No Ads; partial refunds are ignored', async () => {
    const store = new MemStore();
    store.saves.set(USER, { revision: 1, data: cloudSave() });
    await send(
      store,
      event(
        'checkout.session.completed',
        session({ id: 'cs_test_sp', amount_total: 299, metadata: { sku: 'starter_pack' } }),
      ),
    );
    const partial = { object: 'charge', payment_intent: 'pi_test_a1', refunded: false };
    expect((await send(store, event('charge.refunded', partial))).body.result).toMatch(/partial/);
    const full = { object: 'charge', payment_intent: 'pi_test_a1', refunded: true };
    expect((await send(store, event('charge.refunded', full))).body.result).toBe('refunded');
    expect((await send(store, event('charge.refunded', full))).body.result).toBe('refunded');
    const s = parseSave(JSON.stringify(store.saves.get(USER)!.data));
    expect(s.coins).toBe(40);
    expect(s.gems).toBe(0);
    expect(s.noAds).toBe(true);
    expect(s.skins).toContain('starter');
    expect(store.rows[0].status).toBe('refunded');
  });

  it('client copy + server copy merge to a single grant', () => {
    const rec: PurchaseRecord = {
      session_id: 'cs_test_m',
      user_id: USER,
      sku: 'starter_pack',
      provider: 'mock',
      status: 'paid',
      amount: 299,
      currency: 'usd',
      grants: SERVER_SKUS.starter_pack.grants,
      payment_intent: null,
      created_at: '',
      refunded_at: null,
    };
    const server = cloudSave();
    expect(applyPurchaseToSave(server, rec, NOW)).toBe(true);
    expect(applyPurchaseToSave(server, rec, NOW)).toBe(false);
    const client = parseSave(JSON.stringify(cloudSave()));
    applyPurchaseToSave(client, rec, NOW + 5);
    const m = mergeSaves(parseSave(JSON.stringify(server)), client, 'd:a');
    expect(m.coins).toBe(540);
    expect(m.gems).toBe(50);
    expect(m.equippedSkin).toBe('starter');
    expect(applyPurchaseToSave({ version: 1, coins: 3 }, rec, NOW)).toBe(false);
  });
});

describe('M5-6d create-checkout', () => {
  const calls: URLSearchParams[] = [];
  const stripe = (priceId: string | null = null): StripeApi => ({
    async createCheckoutSession(p) {
      calls.push(p);
      return { id: 'cs_test_new', url: 'https://checkout.stripe.com/c/pay/cs_test_new' };
    },
    async findPriceId() {
      return priceId;
    },
  });
  const origins = ['http://localhost:5173'];

  it('needs a signed-in user, an available SKU and an allowed return URL', async () => {
    const d = { stripe: stripe(), allowedOrigins: origins };
    const ok = { sku: 'gems_small', currency: 'usd', returnUrl: 'http://localhost:5173/' };
    expect((await handleCreateCheckout(null, ok, d)).status).toBe(401);
    expect((await handleCreateCheckout(USER, { ...ok, sku: 'nope' }, d)).status).toBe(400);
    SERVER_SKUS.season_pass.available = false;
    expect((await handleCreateCheckout(USER, { ...ok, sku: 'season_pass' }, d)).status).toBe(400);
    SERVER_SKUS.season_pass.available = true;
    expect(
      (await handleCreateCheckout(USER, { ...ok, returnUrl: 'https://evil.example/' }, d)).status,
    ).toBe(400);
    const r = await handleCreateCheckout(USER, { ...ok, price: 0 }, d);
    expect(r).toEqual({
      status: 200,
      body: { id: 'cs_test_new', url: expect.stringContaining('cs_test_new') },
    });
    const p = calls[calls.length - 1];
    expect(p.get('line_items[0][price_data][unit_amount]')).toBe('499'); // server price, not client
    expect(p.get('client_reference_id')).toBe(USER);
    expect(p.get('metadata[sku]')).toBe('gems_small');
    expect(p.get('success_url')).toBe(
      'http://localhost:5173/?checkout=success&session_id={CHECKOUT_SESSION_ID}',
    );
  });

  it('uses the seeded lookup-key price when present', async () => {
    await handleCreateCheckout(
      USER,
      { sku: 'no_ads', currency: 'inr', returnUrl: 'http://localhost:5173/play?x=1' },
      { stripe: stripe('price_123'), allowedOrigins: origins },
    );
    const p = calls[calls.length - 1];
    expect(p.get('line_items[0][price]')).toBe('price_123');
    expect(p.get('line_items[0][price_data][currency]')).toBeNull();
    expect(p.get('cancel_url')).toBe('http://localhost:5173/play?checkout=cancel');
  });

  it('refuses live or malformed keys', () => {
    for (const k of ['sk_live_abc', 'pk_test_abc', 'rk_live_abc', '', 'sk_test_'])
      expect(isTestSecretKey(k)).toBe(false);
    expect(isTestSecretKey('sk_test_abc123')).toBe(true);
    expect(() => stripeRest('sk_live_abc')).toThrow(/non-test/);
    expect(safeReturnUrl('javascript:alert(1)', origins)).toBeNull();
    expect(() => checkoutParams('nope', 'usd', USER, 'http://localhost:5173/', null)).toThrow();
  });

  it('REST client sends the test key as a bearer token and refuses live-mode sessions', async () => {
    const seen: RequestInit[] = [];
    const f = (async (_u: string, init: RequestInit) => {
      seen.push(init);
      return new Response(JSON.stringify({ id: 'cs_test_x', url: 'u', livemode: true }));
    }) as unknown as typeof fetch;
    await expect(
      stripeRest('sk_test_abc', f).createCheckoutSession(new URLSearchParams()),
    ).rejects.toThrow(/live/);
    expect((seen[0].headers as Record<string, string>).Authorization).toBe('Bearer sk_test_abc');
  });
});

describe('M5-6c stripe-seed-test script', () => {
  function fakeStripe() {
    const products = new Set<string>();
    const prices = new Map<string, string>();
    let posts = 0;
    const f = (async (url: string, init: RequestInit = {}) => {
      const u = new URL(url);
      const path = u.pathname.replace('/v1', '');
      const body = new URLSearchParams((init.body as string) ?? '');
      const res = (j: unknown, status = 200) => new Response(JSON.stringify(j), { status });
      if (init.method === 'GET' && path.startsWith('/products/'))
        return products.has(path.slice(10)) ? res({ id: path.slice(10) }) : res({ error: {} }, 404);
      if (init.method === 'POST' && path === '/products') {
        posts++;
        products.add(body.get('id')!);
        return res({ id: body.get('id') });
      }
      if (init.method === 'GET' && path === '/prices') {
        const lk = u.searchParams.get('lookup_keys[]')!;
        return res({ data: prices.has(lk) ? [{ id: prices.get(lk) }] : [] });
      }
      if (init.method === 'POST' && path === '/prices') {
        posts++;
        prices.set(body.get('lookup_key')!, `price_${prices.size}`);
        return res({ id: 'p' });
      }
      return res({}, 400);
    }) as unknown as typeof fetch;
    return { f, prices, posts: () => posts };
  }
  const skus = JSON.parse(readFileSync('monetization/skus.json', 'utf8')) as {
    id: string;
    usd: number;
    inr: number;
  }[];

  it('refuses any non-test key', async () => {
    for (const k of ['sk_live_x1', 'pk_test_x1', undefined])
      await expect(seedStripe({ key: k, skus })).rejects.toThrow(/refusing/);
    expect(isTestKey('rk_test_x1')).toBe(true);
  });

  it('is idempotent: the second run creates nothing', async () => {
    const s = fakeStripe();
    const a = await seedStripe({ key: 'sk_test_x1', skus, fetchImpl: s.f });
    expect(a.created.filter((c) => c.startsWith('price:'))).toHaveLength(skus.length * 2);
    expect(s.prices.has('gems_small_inr')).toBe(true);
    const before = s.posts();
    const b = await seedStripe({ key: 'sk_test_x1', skus, fetchImpl: s.f });
    expect(b.created).toEqual([]);
    expect(s.posts()).toBe(before);
  });
});

describe('M5-8 PostgREST store (service role, server only)', () => {
  it('updateSave retries on a revision race and writes revision + 1', async () => {
    let rev = 4;
    let patches = 0;
    const f = (async (url: string, init: RequestInit = {}) => {
      if (url.includes('/saves') && (init.method ?? 'GET') === 'GET')
        return new Response(JSON.stringify([{ revision: rev, data: cloudSave() }]));
      if (url.includes('/saves') && init.method === 'PATCH') {
        patches++;
        if (patches === 1) {
          rev = 5; // a client pushed in between
          return new Response('[]');
        }
        expect(url).toContain('revision=eq.5');
        expect(JSON.parse(init.body as string).revision).toBe(6);
        return new Response(JSON.stringify([{ revision: 6 }]));
      }
      return new Response('[]');
    }) as unknown as typeof fetch;
    const st = restPurchaseStore('https://x.supabase.co', 'service', f, () => NOW);
    await st.updateSave(USER, () => true);
    expect(patches).toBe(2);
  });
});

describe('M5-8 migration', () => {
  const sql = readdirSync('supabase/migrations')
    .sort()
    .map((f) => readFileSync(`supabase/migrations/${f}`, 'utf8'))
    .join('\n');
  it('drops the client insert policy and revokes insert/update on purchases', () => {
    expect(sql).toMatch(/drop policy purchases_insert on public\.purchases_sandbox;/);
    expect(sql).toMatch(/revoke insert, update on public\.purchases_sandbox from authenticated;/);
    expect(sql).toMatch(/session_id text unique/);
  });
});
