import { describe, expect, it } from 'vitest';
import {
  AD_FREE_BATTLES,
  INTERSTITIAL_MIN_GAP_MS,
  shouldShowInterstitialOnClaim,
} from '../src/platform/adPolicy';
import { AdPacer } from '../src/platform/adPacer';
import { ResultSession } from '../src/platform/resultSession';
import { defaultSave } from '../src/platform/save';

// STATUS decision 43 (QA BUG-05): no interstitial right after the player declines a rewarded
// offer ("No thanks" on 2X or revive); the next interstitial follows normal pacing.
describe('decision 43: declined rewarded offer blocks the interstitial on that transition', () => {
  const NOW = INTERSTITIAL_MIN_GAP_MS * 10;
  const setup = () => {
    const save = defaultSave();
    save.ftueDone = true;
    save.battlesCompleted = AD_FREE_BATTLES + 1;
    save.lastInterstitialAt = 0;
    return { save, pacer: new AdPacer(save.adDay, () => NOW) };
  };

  it('"No thanks" on 2X: no interstitial on that claim', () => {
    const { save, pacer } = setup();
    const r = new ResultSession();
    r.markRewardedDeclined();
    expect(r.tryClaim()).toBe(true);
    expect(r.rewardedShown).toBe(false);
    expect(r.blocksInterstitial).toBe(true);
    expect(shouldShowInterstitialOnClaim(save, NOW, r.blocksInterstitial, false, pacer)).toBe(
      false,
    );
  });

  it('the following level end uses normal pacing (interstitial allowed)', () => {
    const { save, pacer } = setup();
    const declined = new ResultSession();
    declined.markRewardedDeclined();
    declined.tryClaim();
    save.battlesCompleted++;
    // Next battle: a fresh result screen, Collect with no offer.
    const next = ResultSession.forBattleEnd(declined, false);
    expect(next.blocksInterstitial).toBe(false);
    expect(next.tryClaim()).toBe(true);
    expect(shouldShowInterstitialOnClaim(save, NOW, next.blocksInterstitial, false, pacer)).toBe(
      true,
    );
  });

  it('without a decline the same claim would show an interstitial', () => {
    const { save, pacer } = setup();
    const r = new ResultSession();
    expect(shouldShowInterstitialOnClaim(save, NOW, r.blocksInterstitial, false, pacer)).toBe(true);
  });
});
