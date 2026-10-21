/**
 * Server copy of the IAP catalog (`monetization/skus.json`). Edge Functions are deployed on
 * their own, so they cannot import the repo root; `tests/purchaseServerM5-8.test.ts` asserts this
 * copy equals skus.json and the client CATALOG. Prices are what Checkout charges: the client
 * only sends a SKU id and never a price.
 */
export type ServerSkuId =
  | 'no_ads'
  | 'starter_pack'
  | 'gems_small'
  | 'gems_medium'
  | 'gems_large'
  | 'skip_tickets_10'
  | 'season_pass';

export interface Grants {
  coins?: number;
  gems?: number;
  noAds?: boolean;
  skin?: string;
  skipTickets?: number;
  seasonPremium?: boolean;
}

export interface ServerSku {
  id: ServerSkuId;
  name: string;
  usd: number;
  inr: number;
  grants: Grants;
  /** Sellable now (must match the client catalog `available`). */
  available: boolean;
}

export const SERVER_SKUS: Record<ServerSkuId, ServerSku> = {
  no_ads: {
    id: 'no_ads',
    name: 'No Ads',
    usd: 2.99,
    inr: 149,
    grants: { noAds: true },
    available: true,
  },
  starter_pack: {
    id: 'starter_pack',
    name: 'Starter Pack',
    usd: 2.99,
    inr: 149,
    grants: { coins: 500, gems: 50, noAds: true, skin: 'starter' },
    available: true,
  },
  gems_small: {
    id: 'gems_small',
    name: 'Pouch of Gems',
    usd: 4.99,
    inr: 249,
    grants: { gems: 120, noAds: true },
    available: true,
  },
  gems_medium: {
    id: 'gems_medium',
    name: 'Jar of Gems',
    usd: 9.99,
    inr: 499,
    grants: { gems: 300, noAds: true },
    available: true,
  },
  gems_large: {
    id: 'gems_large',
    name: 'Hive of Gems',
    usd: 19.99,
    inr: 999,
    grants: { gems: 700, noAds: true },
    available: true,
  },
  skip_tickets_10: {
    id: 'skip_tickets_10',
    name: '10 Skip Tickets',
    usd: 2.99,
    inr: 99,
    grants: { skipTickets: 10, noAds: true },
    available: true,
  },
  season_pass: {
    id: 'season_pass',
    name: 'Season Pass',
    usd: 4.99,
    inr: 249,
    grants: { seasonPremium: true, noAds: true },
    available: false,
  },
};

export type Currency = 'usd' | 'inr';

export const serverSku = (id: unknown): ServerSku | null =>
  typeof id === 'string' && Object.prototype.hasOwnProperty.call(SERVER_SKUS, id)
    ? SERVER_SKUS[id as ServerSkuId]
    : null;

/** Amount in the smallest currency unit (cents / paise), as Stripe expects. */
export const amountFor = (sku: ServerSku, currency: Currency): number =>
  Math.round(sku[currency] * 100);
