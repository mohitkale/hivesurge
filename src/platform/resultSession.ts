/**
 * Per-result-screen state (one per battle end). Pure, so it is unit-testable.
 * - Rewards can be claimed exactly once (guards double clicks / 2X-then-"No thanks").
 * - Records whether any rewarded ad was shown on this transition, completed or not,
 *   so no interstitial can follow it (adPolicy: never after a rewarded ad).
 */
export class ResultSession {
  private claimed = false;
  private rewarded = false;
  private revived = false;
  private declined = false;
  private offerDeclined = false;

  /** Returns true only on the first call. */
  tryClaim(): boolean {
    if (this.claimed) return false;
    this.claimed = true;
    return true;
  }

  get isClaimed(): boolean {
    return this.claimed;
  }

  markRewardedShown(): void {
    this.rewarded = true;
  }

  /**
   * revive-m2.md: called only when a revive is granted (not when its ad is closed early).
   * The early-close count and countdown live in ReviveOffer.
   */
  markReviveGranted(): void {
    this.revived = true;
  }

  get canOfferRevive(): boolean {
    return !this.revived && !this.claimed;
  }

  get rewardedShown(): boolean {
    return this.rewarded;
  }

  /**
   * STATUS decision 43 (QA BUG-05): the player pressed "No thanks" on a rewarded offer
   * (2X, revive) on this result screen. No interstitial follows on this transition; the next
   * one follows normal pacing on a later level end (a fresh ResultSession starts clean).
   */
  markRewardedDeclined(): void {
    this.declined = true;
  }

  get rewardedDeclined(): boolean {
    return this.declined;
  }

  /** M5-7 (G13 + decision 43): "No thanks" on a pop-up IAP offer also blocks the interstitial. */
  markOfferDeclined(): void {
    this.offerDeclined = true;
  }

  get offerWasDeclined(): boolean {
    return this.offerDeclined;
  }

  /** G4 + decision 43: true when the claim on this result must not show an interstitial. */
  get blocksInterstitial(): boolean {
    return this.rewarded || this.declined || this.offerDeclined;
  }

  /**
   * Result state for a battle that just ended (QA M2-14 bug A, G4). A battle continued by a
   * revive is the same level transition as the revive offer, so a rewarded ad shown there
   * still blocks the interstitial on this result's claim. A fresh battle starts clean.
   */
  static forBattleEnd(prev: ResultSession, revivedThisBattle: boolean): ResultSession {
    const next = new ResultSession();
    if (revivedThisBattle && prev.rewardedShown) next.markRewardedShown();
    if (revivedThisBattle) next.markReviveGranted();
    return next;
  }

  /**
   * Result state right after a granted revive, for the rest of the battle. Keeps a rewarded ad
   * already shown, and a gem revive counts like one (revive-m2.md: blocks the interstitial on
   * this transition, G4). `forBattleEnd` then carries it to the battle's result (PR 051).
   */
  static afterRevive(prev: ResultSession, source: 'ad' | 'free' | 'gems'): ResultSession {
    const next = new ResultSession();
    next.markReviveGranted();
    if (prev.rewardedShown || source === 'gems') next.markRewardedShown();
    return next;
  }
}
