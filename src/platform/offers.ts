/** G13 offer scheduler rules for pop-up IAP offers (M5-7: the Starter Pack offer uses them). */
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

/** Battles before the first pop-up offer (after the FTUE, like G1's ad-free battles). */
export const STARTER_OFFER_MIN_BATTLES = 5;

/**
 * M5-7 Starter Pack pop-up (iap-catalog #17) on a win screen: G13 (one pop-up per session,
 * none on an FTUE defeat), never during the first battles, never once owned, no countdown.
 */
export function starterOfferEligible(
  s: { ftueDone: boolean; battlesCompleted: number; skins: string[] },
  popupsShownThisSession: number,
  available: boolean,
): boolean {
  return (
    available &&
    !s.skins.includes('starter') &&
    s.battlesCompleted >= STARTER_OFFER_MIN_BATTLES &&
    canShowPopupOffer({ popupsShownThisSession, ftueDone: s.ftueDone, screen: 'win' })
  );
}
