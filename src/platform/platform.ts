export type RewardedPlacement = 'win_double' | 'revive';
export type Sku = 'no_ads' | 'starter_pack' | 'gems_small';

export interface SkuInfo {
  id: Sku;
  title: string;
  price: string;
  grants: { coins?: number; gems?: number; noAds?: boolean };
}

export const CATALOG: Record<Sku, SkuInfo> = {
  no_ads: { id: 'no_ads', title: 'No Forced Ads', price: '$2.99', grants: { noAds: true } },
  starter_pack: {
    id: 'starter_pack',
    title: 'Starter Pack',
    price: '$2.99',
    grants: { coins: 500, gems: 50, noAds: true },
  },
  gems_small: {
    id: 'gems_small',
    title: 'Pouch of Gems',
    price: '$4.99',
    grants: { gems: 120, noAds: true }, // G6: every purchase removes forced ads
  },
};

/**
 * One interface per distribution target (own site, Poki, CrazyGames, ...).
 * Build flags pick the implementation; the slice ships only the sandbox mock.
 */
export interface Platform {
  readonly name: string;
  /** Resolves true only if the ad was watched to completion. */
  showRewarded(placement: RewardedPlacement): Promise<boolean>;
  showInterstitial(placement: string): Promise<void>;
  /** Resolves true only when the purchase is confirmed (webhook in production). */
  purchase(sku: Sku): Promise<boolean>;
  gameplayStart(): void;
  gameplayStop(): void;
}
