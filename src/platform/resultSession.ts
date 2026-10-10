/**
 * Per-result-screen state (one per battle end). Pure, so it is unit-testable.
 * - Rewards can be claimed exactly once (guards double clicks / 2X-then-"No thanks").
 * - Records whether any rewarded ad was shown on this transition, completed or not,
 *   so no interstitial can follow it (adPolicy: never after a rewarded ad).
 */
export class ResultSession {
  private claimed = false;
  private rewarded = false;
  private reviveTried = false;

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
   * Revive is offered at most once per battle: once its ad has been shown
   * (completed or closed early) it is never offered again on this result.
   */
  markReviveAttempted(): void {
    this.reviveTried = true;
  }

  get canOfferRevive(): boolean {
    return !this.reviveTried && !this.claimed;
  }

  get rewardedShown(): boolean {
    return this.rewarded;
  }
}
