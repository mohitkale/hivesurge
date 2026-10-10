/** G13 offer scheduler rules (pop-up IAP offers; none exist in the slice yet, rules ship first). */
export const MAX_POPUP_OFFERS_PER_SESSION = 1;
export const MIN_OFFER_TIMER_MS = 24 * 60 * 60 * 1000;

export interface OfferContext {
  popupsShownThisSession: number;
  ftueDone: boolean;
  screen: 'title' | 'win' | 'defeat' | 'shop';
}

export function canShowPopupOffer(c: OfferContext): boolean {
  if (c.popupsShownThisSession >= MAX_POPUP_OFFERS_PER_SESSION) return false;
  if (!c.ftueDone && c.screen === 'defeat') return false;
  return true;
}

/** Offers may carry a countdown only if it is at least 24 h (or none at all). */
export function isAllowedOfferTimer(durationMs: number | null): boolean {
  return durationMs === null || durationMs >= MIN_OFFER_TIMER_MS;
}
