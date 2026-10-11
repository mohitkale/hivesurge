/**
 * Pure ad-pacing rules shared by every platform adapter (see plan §4.2/§6.1 and
 * monetization/guardrails.md):
 * - G1: no interstitials until the FTUE is done AND `AD_FREE_BATTLES` battles are completed
 * - G2: no rewarded-ad offers during the FTUE (first `FTUE_BATTLES` battles), revive included
 * - G3: interstitials only at level transitions, at most one per `minGapMs`
 * - G4: never after a rewarded ad on the same transition
 * - G6: never for players who bought anything (any purchase sets `noAds`)
 * Session/day caps (G5) live in `AdPacer` (adPacer.ts).
 */
export interface AdPolicyState {
  lastInterstitialAt: number;
  battlesCompleted: number;
  noAds: boolean;
  ftueDone: boolean;
}

export const INTERSTITIAL_MIN_GAP_MS = 3 * 60 * 1000;
/** G1: raised from 2 to 5 (guardrails.md). */
export const AD_FREE_BATTLES = 5;
/** G2: battles that count as FTUE for rewarded offers. */
export const FTUE_BATTLES = 3;

export function canShowInterstitial(
  s: AdPolicyState,
  now: number,
  rewardedShownThisTransition: boolean,
): boolean {
  if (s.noAds) return false;
  if (rewardedShownThisTransition) return false;
  if (!s.ftueDone) return false;
  if (s.battlesCompleted < AD_FREE_BATTLES) return false;
  return now - s.lastInterstitialAt >= INTERSTITIAL_MIN_GAP_MS;
}

/**
 * G3: interstitials only at level transitions. Retry after a battle replays the same level
 * and is not a transition (QA finding on PR 030); Home / next level are.
 */
export function isLevelTransition(replay: boolean): boolean {
  return !replay;
}

/** G2: may a rewarded placement (2X, revive, ...) be offered at all right now? Caps are checked by AdPacer. */
export function canOfferRewarded(s: Pick<AdPolicyState, 'battlesCompleted' | 'ftueDone'>): boolean {
  return s.ftueDone && s.battlesCompleted >= FTUE_BATTLES;
}
