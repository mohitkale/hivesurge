import { describe, expect, it } from 'vitest';
import { hasUserActivation } from '../src/audio/sfx';
import { debugParamsFromUrl } from '../src/debug/debugParams';
import { canShowInterstitial, isLevelTransition } from '../src/platform/adPolicy';
import { MAX_EARLY_CLOSES, ReviveOffer, ReviveSession } from '../src/platform/revive';

const IDS = ['ftue-meadow', 'dandelion-drift'];

describe('M2-21 QA follow-ups', () => {
  it('?level and ?revive=force work only in dev builds', () => {
    const q = '?level=dandelion-drift&revive=force';
    expect(debugParamsFromUrl(q, true, IDS)).toEqual({
      level: 'dandelion-drift',
      reviveForce: true,
    });
    expect(debugParamsFromUrl(q, false, IDS)).toEqual({ level: null, reviveForce: false });
    expect(debugParamsFromUrl('?level=nope&revive=1', true, IDS)).toEqual({
      level: null,
      reviveForce: false,
    });
  });

  it('G3: Retry is not a level transition, so no interstitial on Retry', () => {
    const s = { lastInterstitialAt: 0, battlesCompleted: 20, noAds: false, ftueDone: true };
    const now = 10 * 60 * 1000;
    const allowed = (replay: boolean) =>
      isLevelTransition(replay) && canShowInterstitial(s, now, false);
    expect(allowed(true)).toBe(false); // Retry
    expect(allowed(false)).toBe(true); // Home / next level
  });

  it(`revive-m2.md: ${MAX_EARLY_CLOSES} early closes per offer (adEnabled = closes < 2)`, () => {
    const o = new ReviveOffer(new ReviveSession());
    expect(o.request()).toBe(1);
    expect(o.onAdResult('closed')).toEqual({ kind: 'offer' }); // close 1: back to the offer
    expect(o.open).toBe(true);
    expect(o.request()).toBe(2);
    // close 2 is the limit: no gem option yet (M2-21c), so no valid option left: offer closes.
    expect(o.onAdResult('closed')).toEqual({ kind: 'closed' });
    expect(o.closes).toBe(2);
    expect(o.request()).toBe(0);
  });

  it('audio unlock waits for a user gesture when the browser reports none yet', () => {
    expect(hasUserActivation({ userActivation: { hasBeenActive: false } } as never)).toBe(false);
    expect(hasUserActivation({ userActivation: { hasBeenActive: true } } as never)).toBe(true);
    expect(hasUserActivation({} as never)).toBe(true); // no API: assume allowed (old Safari)
  });
});
