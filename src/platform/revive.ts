/**
 * Revive offer rules (docs/design/revive-m2.md, M2-20 / M2-21). Pure, so it is unit-testable.
 *
 * - A revive is consumed only when it is granted (ad completed, or the session's free revive).
 * - Closing the ad early returns to the offer, at most MAX_EARLY_CLOSES times per offer.
 * - No fill / load error: one free revive per app session, only if an ad has loaded earlier
 *   in this session (ad blockers never get a free revive). A further failure shows
 *   "Ad not available" for UNAVAILABLE_MS, then the offer closes.
 * - Nothing here is saved; reloading the page resets it (and ends the battle as a loss).
 */
import type { RewardedResult } from './platform';

export const MAX_EARLY_CLOSES = 2;
export const OFFER_COUNTDOWN_S = 10;
export const UNAVAILABLE_MS = 3000;
/** Revive is offered only when the nest has at most this much health left. */
export const REVIVE_NEST_DAMAGE = 0.5;

/** Per app session; never persisted. */
export class ReviveSession {
  freeReviveUsed = false;
  adsEverLoadedThisSession = false;

  /** Any ad that actually loaded and showed (rewarded or interstitial). */
  noteAdLoaded(): void {
    this.adsEverLoadedThisSession = true;
  }

  /** Interstitial result: only one that actually loaded and showed sets the flag (QA 047 bug). */
  noteInterstitial(shown: boolean): void {
    if (shown) this.noteAdLoaded();
  }
}

export interface ReviveEligibility {
  /** canOfferRewarded(save): false during FTUE (G2). */
  rewardedAllowed: boolean;
  /** AdPacer.canRewarded('revive') (G5). */
  capsOk: boolean;
  revives: number;
  nestDamage: number;
}

export function shouldOfferRevive(e: ReviveEligibility): boolean {
  return e.rewardedAllowed && e.capsOk && e.revives === 0 && e.nestDamage >= REVIVE_NEST_DAMAGE;
}

export type ReviveButton = 'ad' | 'free' | 'unavailable' | 'none';

export type ReviveStep =
  | { kind: 'grant'; source: 'ad' | 'free'; attempt: number }
  | { kind: 'offer' } // back to the offer (button state may have changed)
  | { kind: 'unavailable' } // show "Ad not available" for UNAVAILABLE_MS, then close
  | { kind: 'closed' }; // offer gone, normal defeat screen

/** One revive offer (one defeat). */
export class ReviveOffer {
  closes = 0;
  attempts = 0;
  granted = false;
  closed = false;
  button: ReviveButton = 'ad';
  countdown = OFFER_COUNTDOWN_S;
  /** True while an ad is on screen: the countdown pauses. */
  adOnScreen = false;

  constructor(private readonly session: ReviveSession) {}

  get open(): boolean {
    return !this.granted && !this.closed && this.countdown > 0;
  }

  /** Advance the countdown (paused while an ad is on screen). Returns true when it ran out now. */
  tick(dt: number): boolean {
    if (!this.open || this.adOnScreen) return false;
    this.countdown = Math.max(0, this.countdown - dt);
    if (this.countdown === 0) {
      this.closed = true;
      this.button = 'none';
      return true;
    }
    return false;
  }

  /** Player tapped "Revive (watch ad)". Returns the attempt number (1..3) or 0 if not allowed. */
  request(): number {
    if (!this.open || this.button !== 'ad') return 0;
    this.adOnScreen = true;
    return ++this.attempts;
  }

  /** The platform's answer to the ad requested by `request()`. */
  onAdResult(result: RewardedResult): ReviveStep {
    this.adOnScreen = false;
    if (result === 'completed') {
      this.session.noteAdLoaded();
      this.granted = true;
      this.button = 'none';
      return { kind: 'grant', source: 'ad', attempt: this.attempts };
    }
    if (result === 'closed') {
      this.session.noteAdLoaded();
      this.closes++;
      if (this.closes >= MAX_EARLY_CLOSES) return this.close();
      return { kind: 'offer' };
    }
    // no_fill or error: nothing was shown.
    if (!this.session.freeReviveUsed && this.session.adsEverLoadedThisSession) {
      this.button = 'free';
      return { kind: 'offer' };
    }
    this.button = 'unavailable';
    return { kind: 'unavailable' };
  }

  /** Player tapped "Revive (free)". */
  takeFree(): ReviveStep | null {
    if (!this.open || this.button !== 'free' || this.session.freeReviveUsed) return null;
    this.session.freeReviveUsed = true;
    this.granted = true;
    this.button = 'none';
    return { kind: 'grant', source: 'free', attempt: this.attempts };
  }

  /** "No thanks", or the "Ad not available" pause finished. */
  decline(): ReviveStep {
    return this.close();
  }

  private close(): ReviveStep {
    this.closed = true;
    this.button = 'none';
    return { kind: 'closed' };
  }
}
