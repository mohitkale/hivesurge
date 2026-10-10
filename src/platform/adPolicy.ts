/**
 * Pure ad-pacing rules shared by every platform adapter (see plan §4.2/§6.1):
 * - interstitials only at level transitions, at most one per `minGapMs`
 * - never after a rewarded ad on the same transition
 * - never for players who bought anything (any purchase removes forced ads)
 * - first battles are ad-free so onboarding stays smooth
 */
export interface AdPolicyState {
  lastInterstitialAt: number;
  battlesCompleted: number;
  noAds: boolean;
}

export const INTERSTITIAL_MIN_GAP_MS = 3 * 60 * 1000;
export const AD_FREE_BATTLES = 2;

export function canShowInterstitial(
  s: AdPolicyState,
  now: number,
  rewardedShownThisTransition: boolean,
): boolean {
  if (s.noAds) return false;
  if (rewardedShownThisTransition) return false;
  if (s.battlesCompleted < AD_FREE_BATTLES) return false;
  return now - s.lastInterstitialAt >= INTERSTITIAL_MIN_GAP_MS;
}
