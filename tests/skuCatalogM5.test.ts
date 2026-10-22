import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  countryFromLocale,
  currencyFor,
  formatPrice,
  RANDOM_PAID_BLOCKED_REGIONS,
  type Sku,
  visibleSkus,
} from '../src/platform/platform';

interface JsonSku {
  id: string;
  type: string;
  usd: number;
  inr: number;
  random: boolean;
  grants: Record<string, unknown>;
  contents?: { random?: boolean }[];
}
const skus = JSON.parse(readFileSync('monetization/skus.json', 'utf8')) as JsonSku[];

describe('M5-6a skus.json is valid and matches CATALOG', () => {
  it('has unique ids with a type, positive test prices and grants', () => {
    expect(new Set(skus.map((s) => s.id)).size).toBe(skus.length);
    for (const s of skus) {
      expect(['non_consumable', 'consumable', 'non_consumable_per_season']).toContain(s.type);
      expect(s.usd).toBeGreaterThan(0);
      expect(Number.isInteger(s.inr) && s.inr > 0).toBe(true);
      expect(Object.keys(s.grants).length).toBeGreaterThan(0);
    }
  });

  it('every SKU in the JSON is in CATALOG with the same type, prices and grants', () => {
    expect(Object.keys(CATALOG).sort()).toEqual(skus.map((s) => s.id).sort());
    for (const s of skus) {
      const c = CATALOG[s.id as Sku];
      expect(c.type).toBe(s.type);
      expect(c.price).toEqual({ usd: s.usd, inr: s.inr });
      expect(c.grants).toEqual(s.grants);
    }
  });

  it('avoids sub-$2 web price points (Stripe fee rule)', () => {
    for (const c of Object.values(CATALOG)) expect(c.price.usd).toBeGreaterThanOrEqual(2);
  });
});

describe('M5-11 / G12: no real-money purchase grants random items', () => {
  it('every paid SKU has fixed contents', () => {
    for (const s of skus) {
      expect(s.random).toBe(false);
      for (const tier of s.contents ?? []) expect(tier.random).toBe(false);
    }
    for (const c of Object.values(CATALOG)) expect(c.random).toBe(false);
  });
  it('G6: every SKU removes forced ads', () => {
    for (const c of Object.values(CATALOG)) expect(c.grants.noAds).toBe(true);
  });
});

describe('M5-4b / G16: paid random items hidden in restricted regions', () => {
  const list = [
    ...Object.values(CATALOG),
    { id: 'card_pack_paid', available: true, random: true }, // hypothetical paid random SKU
  ];
  it('BE (and NL) hide any paid random SKU; fixed SKUs stay', () => {
    for (const cc of ['BE', 'be', 'NL']) {
      const ids = visibleSkus(list, cc).map((s) => s.id);
      expect(ids).not.toContain('card_pack_paid');
      expect(ids).toContain('gems_small');
    }
    expect(visibleSkus(list, 'IN').map((s) => s.id)).toContain('card_pack_paid');
    expect(RANDOM_PAID_BLOCKED_REGIONS).toEqual(expect.arrayContaining(['BE', 'NL']));
  });
  it('unavailable SKUs are not listed; the season pass is sold from M7-3', () => {
    expect(visibleSkus(Object.values(CATALOG), 'US').map((s) => s.id)).toContain('season_pass');
    const off = Object.values(CATALOG).map((s) => ({ ...s, available: s.id !== 'season_pass' }));
    expect(visibleSkus(off, 'US').map((s) => s.id)).not.toContain('season_pass');
  });
  it('country and currency from the locale', () => {
    expect(countryFromLocale('nl-BE')).toBe('BE');
    expect(countryFromLocale('en')).toBe('');
    expect(currencyFor('en-IN')).toBe('inr');
    expect(currencyFor('en-US', 'Asia/Calcutta')).toBe('inr');
    expect(currencyFor('en-US', 'America/New_York')).toBe('usd');
    expect(formatPrice(CATALOG.gems_small.price)).toBe('$4.99');
    expect(formatPrice(CATALOG.gems_small.price, 'inr')).toBe('₹249');
  });
});

describe('M5-6f live-key guard covers env vars and edge functions', () => {
  const fake = (prefix: string) => `${prefix}${'Z9y8X7w6'.repeat(3)}`;
  it('flags non-test Stripe keys by variable name only', async () => {
    const { findNonTestStripeEnv } = await import('../scripts/live-key-guard.mjs');
    const bad = findNonTestStripeEnv({
      VITE_STRIPE_PUBLISHABLE_KEY: fake('pk_' + 'live_'),
      STRIPE_SECRET_KEY: fake('sk_test_'),
      STRIPE_RESTRICTED: fake('rk_' + 'live_'),
      OTHER: fake('sk_' + 'live_'), // not a STRIPE_* name: covered by the file scan instead
      STRIPE_WEBHOOK_SECRET: 'whsec_x',
    });
    expect(bad).toEqual(['VITE_STRIPE_PUBLISHABLE_KEY', 'STRIPE_RESTRICTED']);
  });
  it('the guard run fails when a live Stripe key is in the build env', async () => {
    const { spawnSync } = await import('node:child_process');
    const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'hs-env-'));
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src/a.ts'), 'export {}');
    const run = (env: Record<string, string>) =>
      spawnSync(process.execPath, ['scripts/live-key-guard.mjs', dir], {
        env: { PATH: process.env.PATH ?? '', ...env },
      }).status;
    expect(run({ VITE_STRIPE_PUBLISHABLE_KEY: fake('pk_' + 'live_') })).toBe(1);
    expect(run({ VITE_STRIPE_PUBLISHABLE_KEY: fake('pk_test_') })).toBe(0);
    mkdirSync(join(dir, 'supabase/functions/x'), { recursive: true });
    writeFileSync(
      join(dir, 'supabase/functions/x/index.ts'),
      `const k = '${fake('sk_' + 'live_')}';`,
    );
    expect(run({})).toBe(1);
  });
});
