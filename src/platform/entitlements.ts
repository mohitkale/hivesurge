import { CATALOG, type Sku } from './platform';

export interface Wallet {
  coins: number;
  gems: number;
  noAds: boolean;
  /** Owned bee skin ids. */
  skins: string[];
}

/**
 * G6 entitlement layer: apply a confirmed purchase. ANY successful purchase removes forced ads
 * (interstitials/banners), regardless of what the SKU lists; rewarded ads stay opt-in.
 */
/**
 * Skins are granted only for sandbox / test purchases for now (no real store yet); `sandbox`
 * is true for MockPlatform purchases and in tests.
 */
export function applyPurchase(w: Wallet, sku: Sku, sandbox = true): void {
  const g = CATALOG[sku].grants;
  if (g.skin && sandbox && !w.skins.includes(g.skin)) w.skins.push(g.skin);
  w.coins += g.coins ?? 0;
  w.gems += g.gems ?? 0;
  w.noAds = true;
}
