import { describe, expect, it } from 'vitest';
import {
  AD_FREE_BATTLES,
  canShowInterstitial,
  INTERSTITIAL_MIN_GAP_MS,
} from '../src/platform/adPolicy';
import { ResultSession } from '../src/platform/resultSession';

describe('ResultSession claim guard (REVIEW-002 #1)', () => {
  it('allows exactly one claim per result screen', () => {
    const s = new ResultSession();
    let coins = 0;
    const claim = (n: number) => {
      if (s.tryClaim()) coins += n;
    };
    claim(100); // 2X path
    claim(50); // "No thanks" clicked under the ad modal
    claim(50); // double-click
    expect(coins).toBe(100);
    expect(s.isClaimed).toBe(true);
  });

  it('a fresh session (next battle) can claim again', () => {
    const a = new ResultSession();
    expect(a.tryClaim()).toBe(true);
    expect(new ResultSession().tryClaim()).toBe(true);
  });
});

describe('ResultSession rewarded flag (REVIEW-002 #2)', () => {
  const eligible = { noAds: false, battlesCompleted: AD_FREE_BATTLES + 5, lastInterstitialAt: 0 };
  const now = INTERSTITIAL_MIN_GAP_MS * 10;

  it('without a rewarded ad an interstitial is allowed', () => {
    const s = new ResultSession();
    expect(canShowInterstitial(eligible, now, s.rewardedShown)).toBe(true);
  });

  it('a rewarded ad closed early still blocks the interstitial', () => {
    const s = new ResultSession();
    s.markRewardedShown(); // shown, then user closed before completion (ok = false)
    expect(canShowInterstitial(eligible, now, s.rewardedShown)).toBe(false);
  });
});
