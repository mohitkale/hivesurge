/**
 * Revive offer rules (docs/design/revive-m2.md, M2-20 / M2-21). Pure, so it is unit-testable.
 *
 * - A revive is consumed only when it is granted (ad completed, or the session's free revive).
 * - Closing the ad early returns to the offer, at most MAX_EARLY_CLOSES times per offer.
 * - No fill / load error: one free revive per app session, only if an ad has loaded earlier
 *   in this session (ad blockers never get a free revive). A further failure shows
 *   "Ad not available" for UNAVAILABLE_MS, then the offer closes.
 * - Nothing here is saved; reloading the page resets it (and ends the battle as a loss).
 * - M2-21c gem revive: a third option. Gems are *valid* when affordable, within caps and not
 *   hidden (hidden while the free revive is shown, when caps are reached, or on an event's
 *   final level). After 2 early closes, or after an ad failure with no free revive, the ad
 *   button is disabled and the offer stays open only while gems are valid.
 */
import type { RewardedResult } from './platform';
import { debitGems, type GemReviveCaps, type GemWallet } from './reviveGems';

export const MAX_EARLY_CLOSES = 2;
export const OFFER_COUNTDOWN_S = 10;
export const UNAVAILABLE_MS = 3000;
/**
 * Default `revive.minNestDamage` (revive-m2.md, PR 049): the offer needs at least this much
 * nest damage, for every loss type (hive break and time-out). Was 0.5.
 */
export const REVIVE_NEST_DAMAGE = 0.25;

/**
 * Remote config `revive.minNestDamage`. A missing or invalid value (not a finite number in
 * [0, 1]) falls back to the default.
 */
export function reviveMinNestDamage(remote?: { minNestDamage?: unknown }): number {
  const v = remote?.minNestDamage;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : REVIVE_NEST_DAMAGE;
}

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
  /** `revive.minNestDamage` (default REVIVE_NEST_DAMAGE). */
  minNestDamage?: number;
}

export function shouldOfferRevive(e: ReviveEligibility): boolean {
  return (
    e.rewardedAllowed &&
    e.capsOk &&
    e.revives === 0 &&
    e.nestDamage >= (e.minNestDamage ?? REVIVE_NEST_DAMAGE)
  );
}

/** Ad slot state. `limit` = "Ad limit reached" (2 early closes); `unavailable` = "Ad not available". */
export type ReviveButton = 'ad' | 'free' | 'unavailable' | 'limit' | 'none';

export type GemButtonState = 'enabled' | 'disabled' | 'hidden';

/** Gem option context for one offer (absent = no gem option, PR 030 behaviour). */
export interface GemOption {
  wallet: GemWallet;
  price: number;
  caps: GemReviveCaps;
  eventFinalLevel: boolean;
}

export type ReviveStep =
  | { kind: 'grant'; source: 'ad' | 'free' | 'gems'; attempt: number; price?: number }
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
  /** Gem confirm sheet open: the countdown pauses (C5). */
  confirmOpen = false;
  /** "Ad not available" 3 s notice running (nothing enabled; see afterNotice). */
  noticeActive = false;

  constructor(
    private readonly session: ReviveSession,
    private readonly gems: GemOption | null = null,
  ) {}

  /** Gem button: hidden while the free revive is shown (C3), when caps are reached, on an event final level (C6). */
  get gemState(): GemButtonState {
    const g = this.gems;
    if (!g || this.button === 'free' || !g.caps.ok || g.eventFinalLevel) return 'hidden';
    if (g.wallet.gems < g.price) return 'disabled'; // C4: shown with price, no buy link
    return this.noticeActive ? 'disabled' : 'enabled';
  }

  /** Gems are valid: affordable, within caps and not hidden. */
  get gemsValid(): boolean {
    const g = this.gems;
    return (
      !!g && this.button !== 'free' && g.caps.ok && !g.eventFinalLevel && g.wallet.gems >= g.price
    );
  }

  get gemPrice(): number {
    return this.gems?.price ?? 0;
  }

  get adEnabled(): boolean {
    return this.open && this.button === 'ad' && this.closes < MAX_EARLY_CLOSES && !this.confirmOpen;
  }

  get open(): boolean {
    return !this.granted && !this.closed && this.countdown > 0;
  }

  /** Advance the countdown (paused while an ad is on screen). Returns true when it ran out now. */
  tick(dt: number): boolean {
    if (!this.open || this.adOnScreen || this.confirmOpen) return false;
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
    if (!this.adEnabled) return 0;
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
      if (this.closes >= MAX_EARLY_CLOSES) {
        // revive-m2.md: the offer stays open with "Ad limit reached" while gems are valid.
        this.button = 'limit';
        return this.gemsValid ? { kind: 'offer' } : this.close();
      }
      return { kind: 'offer' };
    }
    // no_fill or error: nothing was shown.
    if (!this.session.freeReviveUsed && this.session.adsEverLoadedThisSession) {
      this.button = 'free';
      return { kind: 'offer' };
    }
    this.button = 'unavailable';
    this.noticeActive = true;
    return { kind: 'unavailable' };
  }

  /** The 3 s "Ad not available" notice ended: stay open only while gems are valid. */
  afterNotice(): ReviveStep {
    this.noticeActive = false;
    if (this.open && this.gemsValid) return { kind: 'offer' };
    return this.close();
  }

  /** Gem button tapped: open the confirm sheet (pauses the countdown). */
  openGemConfirm(): boolean {
    if (!this.open || this.gemState !== 'enabled') return false;
    this.confirmOpen = true;
    return true;
  }

  /** "Back" on the confirm sheet: the countdown resumes. */
  backFromConfirm(): void {
    this.confirmOpen = false;
  }

  /**
   * C1: "Spend N gems". Grants only after an atomic debit, never when the battle was already
   * revived (`revives > 0`) or the offer is closed. Returns null (nothing debited) if refused.
   */
  takeGems(revives: number): ReviveStep | null {
    const g = this.gems;
    if (!g || revives > 0 || !this.open || !this.confirmOpen || !this.gemsValid) return null;
    if (!debitGems(g.wallet, g.price)) return null;
    g.caps.record();
    this.confirmOpen = false;
    this.granted = true;
    this.button = 'none';
    return { kind: 'grant', source: 'gems', attempt: this.attempts, price: g.price };
  }

  /** Player tapped "Revive (free)". */
  takeFree(): ReviveStep | null {
    if (!this.open || this.button !== 'free' || this.session.freeReviveUsed) return null;
    this.session.freeReviveUsed = true;
    this.granted = true;
    this.button = 'none';
    return { kind: 'grant', source: 'free', attempt: this.attempts };
  }

  /** "No thanks". */
  decline(): ReviveStep {
    return this.close();
  }

  private close(): ReviveStep {
    this.closed = true;
    this.button = 'none';
    return { kind: 'closed' };
  }
}
