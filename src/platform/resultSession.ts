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
}
