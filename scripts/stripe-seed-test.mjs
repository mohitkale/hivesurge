#!/usr/bin/env node
// M5-6c: create Stripe TEST-mode Products/Prices (USD + INR) from monetization/skus.json.
// Price lookup_key = `<sku>_<currency>` (create-checkout uses it when present).
// Idempotent: a second run creates nothing. Refuses any key that is not sk_test_/rk_test_.
// Usage: STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-seed-test.mjs   (never commit the key)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const API = 'https://api.stripe.com/v1';
export const isTestKey = (k) => typeof k === 'string' && /^(sk|rk)_test_[A-Za-z0-9]+$/.test(k);

/** @returns {Promise<{created: string[], skipped: string[]}>} */
export async function seedStripe({ key, skus, fetchImpl = fetch, log = () => {} }) {
  if (!isTestKey(key))
    throw new Error('refusing: STRIPE_SECRET_KEY must be a sk_test_/rk_test_ key');
  const headers = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const call = async (method, path, params) => {
    const r = await fetchImpl(`${API}${path}`, {
      method,
      headers,
      body: params ? new URLSearchParams(params).toString() : undefined,
    });
    const j = await r.json();
    if (j && j.livemode === true) throw new Error('refusing: live-mode object returned');
    return { ok: r.ok, status: r.status, json: j };
  };
  const created = [];
  const skipped = [];
  for (const s of skus) {
    const productId = `hs_${s.id}`;
    const p = await call('GET', `/products/${productId}`);
    if (p.status === 404) {
      const c = await call('POST', '/products', {
        id: productId,
        name: `Hive Surge — ${s.id}`,
        'metadata[sku]': s.id,
      });
      if (!c.ok) throw new Error(`product ${s.id} failed`);
      created.push(`product:${productId}`);
    } else if (!p.ok) throw new Error(`product ${s.id} lookup failed`);
    for (const cur of ['usd', 'inr']) {
      const lk = `${s.id}_${cur}`;
      const q = new URLSearchParams({ 'lookup_keys[]': lk, limit: '1' });
      const found = await call('GET', `/prices?${q}`);
      if (found.ok && found.json.data && found.json.data.length) {
        skipped.push(`price:${lk}`);
        continue;
      }
      const c = await call('POST', '/prices', {
        product: productId,
        currency: cur,
        unit_amount: String(Math.round(s[cur] * 100)),
        lookup_key: lk,
        'metadata[sku]': s.id,
      });
      if (!c.ok) throw new Error(`price ${lk} failed`);
      created.push(`price:${lk}`);
    }
  }
  log(`created ${created.length}, already present ${skipped.length}`);
  return { created, skipped };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const skus = JSON.parse(
    readFileSync(new URL('../monetization/skus.json', import.meta.url), 'utf8'),
  );
  seedStripe({ key: process.env.STRIPE_SECRET_KEY, skus, log: console.log }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
