import { CATALOG, type Sku } from './platform';

export interface Wallet {
  coins: number;
  gems: number;
  noAds: boolean;
}

/**
 * G6 entitlement layer: apply a confirmed purchase. ANY successful purchase removes forced ads
 * (interstitials/banners), regardless of what the SKU lists; rewarded ads stay opt-in.
 */
export function applyPurchase(w: Wallet, sku: Sku): void {
  const g = CATALOG[sku].grants;
  w.coins += g.coins ?? 0;
  w.gems += g.gems ?? 0;
  w.noAds = true;
}
