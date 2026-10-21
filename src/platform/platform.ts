/** `boost`: pre-level boost screen (feedback 2026-10-15). */
/** M5-5 adds chest_skip, daily_pack and away_doubler (monetization/ad-placements.md #5, #7, #10). */
export type RewardedPlacement =
  'win_double' | 'revive' | 'boost' | 'chest_skip' | 'daily_pack' | 'away_doubler';
/**
 * Outcome of a rewarded ad request. `completed` / `closed` were impressions (an ad was shown);
 * `no_fill` / `error` (load failure or 5 s timeout) showed nothing.
 */
export type RewardedResult = 'completed' | 'closed' | 'no_fill' | 'error';
export type Sku =
  | 'no_ads'
  | 'starter_pack'
  | 'gems_small'
  | 'gems_medium'
  | 'gems_large'
  | 'skip_tickets_10'
  | 'season_pass';

export type SkuType = 'non_consumable' | 'consumable' | 'non_consumable_per_season';

/** Test prices (monetization/iap-catalog.md). USD anchors; INR tiers are PPP assumptions. */
export interface SkuPrice {
  usd: number;
  inr: number;
}

export interface SkuGrants {
  coins?: number;
  gems?: number;
  noAds?: boolean;
  /** Bee skin id unlocked by the purchase. */
  skin?: string;
  /** Ad-skip tickets (G8: skip a rewarded ad and still get the reward). */
  skipTickets?: number;
  /** Season pass premium track (M7-2). */
  seasonPremium?: boolean;
}

export interface SkuInfo {
  id: Sku;
  title: string;
  type: SkuType;
  price: SkuPrice;
  /** M5-11 / G12: paid SKUs never grant random items. */
  random: false;
  /** false = listed in skus.json but not sold yet (season pass waits for M7-2). */
  available: boolean;
  grants: SkuGrants;
}

/**
 * M5-6a: the frozen catalog, kept in sync with monetization/skus.json by a unit test.
 * G6: every SKU also grants `noAds`.
 */
export const CATALOG: Record<Sku, SkuInfo> = {
  no_ads: {
    id: 'no_ads',
    title: 'No Forced Ads',
    type: 'non_consumable',
    price: { usd: 2.99, inr: 149 },
    random: false,
    available: true,
    grants: { noAds: true },
  },
  starter_pack: {
    id: 'starter_pack',
    title: 'Starter Pack',
    type: 'non_consumable',
    price: { usd: 2.99, inr: 149 },
    random: false,
    available: true,
    grants: { coins: 500, gems: 50, noAds: true, skin: 'starter' },
  },
  gems_small: {
    id: 'gems_small',
    title: 'Pouch of Gems',
    type: 'consumable',
    price: { usd: 4.99, inr: 249 },
    random: false,
    available: true,
    grants: { gems: 120, noAds: true },
  },
  gems_medium: {
    id: 'gems_medium',
    title: 'Jar of Gems',
    type: 'consumable',
    price: { usd: 9.99, inr: 499 },
    random: false,
    available: true,
    grants: { gems: 300, noAds: true },
  },
  gems_large: {
    id: 'gems_large',
    title: 'Comb of Gems',
    type: 'consumable',
    price: { usd: 19.99, inr: 999 },
    random: false,
    available: true,
    grants: { gems: 700, noAds: true },
  },
  skip_tickets_10: {
    id: 'skip_tickets_10',
    title: '10 Ad-Skip Tickets',
    type: 'consumable',
    price: { usd: 2.99, inr: 99 },
    random: false,
    available: true, // M5-5: tickets halve chest timers instead of an ad (G8)
    grants: { skipTickets: 10, noAds: true },
  },
  season_pass: {
    id: 'season_pass',
    title: 'Season Pass',
    type: 'non_consumable_per_season',
    price: { usd: 4.99, inr: 249 },
    random: false,
    available: false, // M7-2: no season yet
    grants: { seasonPremium: true, noAds: true },
  },
};

export type Currency = 'usd' | 'inr';

/** Display price for a SKU, e.g. "$2.99" or "₹149". */
export function formatPrice(p: SkuPrice, currency: Currency = 'usd'): string {
  return currency === 'inr' ? `₹${p.inr}` : `$${p.usd.toFixed(2)}`;
}

/** INR for Indian locales / time zone, USD elsewhere (test prices only). */
export function currencyFor(locale: string, timeZone = ''): Currency {
  return /-IN\b/i.test(locale) || /Asia\/(Calcutta|Kolkata)/.test(timeZone) ? 'inr' : 'usd';
}

/**
 * G16 / M5-4b: regions where paid random items are disabled (research M5-3: Belgium by law,
 * Netherlands conservatively, plus CN, SK, RS per guardrails.md). Remote config may extend it.
 */
export const RANDOM_PAID_BLOCKED_REGIONS = ['BE', 'NL', 'CN', 'SK', 'RS'];

/** Minimal shape so the filter also covers future (random) SKUs. */
export interface ListedSku {
  id: string;
  available: boolean;
  random: boolean;
}

/** SKUs the store may show in a region: sold now, and no paid random items where blocked. */
export function visibleSkus<T extends ListedSku>(
  skus: readonly T[],
  country: string,
  blocked: readonly string[] = RANDOM_PAID_BLOCKED_REGIONS,
): T[] {
  const c = country.toUpperCase();
  return skus.filter((s) => s.available && !(s.random && blocked.includes(c)));
}

/** Best-effort country from the browser locale (e.g. "nl-BE" -> "BE"); '' when unknown. */
export function countryFromLocale(locale: string): string {
  const m = /[-_]([A-Za-z]{2})\b/.exec(locale);
  return m ? m[1].toUpperCase() : '';
}

/**
 * One interface per distribution target (own site, Poki, CrazyGames, ...).
 * Build flags pick the implementation; the slice ships only the sandbox mock.
 */
export interface Platform {
  readonly name: string;
  /** Resolves true only if the ad was watched to completion. */
  showRewarded(placement: RewardedPlacement): Promise<boolean>;
  /** Like showRewarded, but tells closed-early apart from no fill / load error. */
  requestRewarded(placement: RewardedPlacement): Promise<RewardedResult>;
  /** Resolves true only if an interstitial actually loaded and showed (false: no fill / error). */
  showInterstitial(placement: string): Promise<boolean>;
  /** Resolves true only when the purchase is confirmed (webhook in production). */
  purchase(sku: Sku): Promise<boolean>;
  gameplayStart(): void;
  gameplayStop(): void;
}
