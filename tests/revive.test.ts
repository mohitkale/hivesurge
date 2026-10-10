import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AD_FREE_BATTLES,
  canOfferRewarded,
  canShowInterstitial,
  FTUE_BATTLES,
  INTERSTITIAL_MIN_GAP_MS,
} from '../src/platform/adPolicy';
import { adModeFromUrl, AD_LOAD_TIMEOUT_MS, MockPlatform } from '../src/platform/mockPlatform';
import { ResultSession } from '../src/platform/resultSession';
import {
  MAX_EARLY_CLOSES,
  OFFER_COUNTDOWN_S,
  ReviveOffer,
  ReviveSession,
  shouldOfferRevive,
} from '../src/platform/revive';
import { getLevel } from '../src/levels';
import { World } from '../src/sim/world';

/** A lost battle (idle bot) with the nest still at full health is enough for world.revive(). */
function lostWorld(): World {
  const w = new World(getLevel('clover-run'));
  while (w.outcome === 'playing') w.step({ aimX: 0, firing: false, queen: false });
  return w;
}

/** Mirrors Game.applyReviveStep: a grant calls world.revive() once. */
function grant(w: World, step: ReturnType<ReviveOffer['onAdResult']> | null): boolean {
  return step?.kind === 'grant' ? w.revive() : false;
}

function loadedSession(): ReviveSession {
  const s = new ReviveSession();
  s.noteAdLoaded(); // an earlier ad loaded in this session
  return s;
}

describe('revive-m2.md test cases (M2-21)', () => {
  it('1. close early -> back to the offer, countdown resumes, revives === 0, no reward', () => {
    const w = lostWorld();
    const o = new ReviveOffer(loadedSession());
    o.tick(3);
    expect(o.request()).toBe(1);
    expect(o.tick(5)).toBe(false); // paused while the ad is on screen
    expect(o.countdown).toBe(OFFER_COUNTDOWN_S - 3);
    const step = o.onAdResult('closed');
    expect(step).toEqual({ kind: 'offer' });
    expect(grant(w, step)).toBe(false);
    expect(w.revives).toBe(0);
    expect(w.outcome).toBe('lost');
    expect(o.open).toBe(true);
    expect(o.button).toBe('ad');
    o.tick(1); // resumes
    expect(o.countdown).toBe(OFFER_COUNTDOWN_S - 4);
  });

  it('2. close early twice -> the offer is gone, defeat screen remains', () => {
    const o = new ReviveOffer(loadedSession());
    o.request();
    expect(o.onAdResult('closed').kind).toBe('offer');
    o.request();
    expect(o.onAdResult('closed').kind).toBe('closed');
    expect(MAX_EARLY_CLOSES).toBe(2);
    expect(o.open).toBe(false);
    expect(o.request()).toBe(0); // no third ad
  });

  it('3. close early, then complete -> revive granted once; no second offer', () => {
    const w = lostWorld();
    const result = new ResultSession();
    const o = new ReviveOffer(loadedSession());
    o.request();
    o.onAdResult('closed');
    expect(o.request()).toBe(2);
    const step = o.onAdResult('completed');
    expect(step).toEqual({ kind: 'grant', source: 'ad', attempt: 2 });
    expect(grant(w, step)).toBe(true);
    result.markReviveGranted();
    expect(w.revives).toBe(1);
    expect(o.open).toBe(false);
    // Next defeat in this battle: no offer.
    expect(result.canOfferRevive).toBe(false);
    expect(
      shouldOfferRevive({
        rewardedAllowed: true,
        capsOk: true,
        revives: w.revives,
        nestDamage: 0.9,
      }),
    ).toBe(false);
  });

  it('4. no fill -> one free revive; a second no fill in the session -> "Ad not available"', () => {
    const session = loadedSession();
    const w = lostWorld();
    const a = new ReviveOffer(session);
    a.request();
    expect(a.onAdResult('no_fill')).toEqual({ kind: 'offer' });
    expect(a.button).toBe('free');
    expect(a.closes).toBe(0);
    const step = a.takeFree();
    expect(step).toEqual({ kind: 'grant', source: 'free', attempt: 1 });
    expect(grant(w, step)).toBe(true);
    expect(session.freeReviveUsed).toBe(true);

    const b = new ReviveOffer(session); // a later defeat in the same session
    b.request();
    expect(b.onAdResult('error')).toEqual({ kind: 'unavailable' });
    expect(b.button).toBe('unavailable');
    expect(b.takeFree()).toBeNull();
    expect(b.decline()).toEqual({ kind: 'closed' }); // after the 3 s "Ad not available"
  });

  it('4b. no free revive if no ad ever loaded this session (ad blocker)', () => {
    const o = new ReviveOffer(new ReviveSession());
    o.request();
    expect(o.onAdResult('no_fill')).toEqual({ kind: 'unavailable' });
    expect(o.takeFree()).toBeNull();
  });

  it('5. interstitial is blocked after any revive ad on that transition', () => {
    const eligible = {
      noAds: false,
      battlesCompleted: AD_FREE_BATTLES + 5,
      lastInterstitialAt: 0,
      ftueDone: true,
    };
    const now = INTERSTITIAL_MIN_GAP_MS * 10;
    for (const res of ['closed', 'completed'] as const) {
      const r = new ResultSession();
      r.markRewardedShown(); // Game.watchRewarded marks every impression
      expect(res).toBeTruthy();
      expect(canShowInterstitial(eligible, now, r.rewardedShown)).toBe(false);
    }
    // No fill / error was not an impression: nothing marked, interstitial rules unchanged.
    expect(canShowInterstitial(eligible, now, new ResultSession().rewardedShown)).toBe(true);
  });

  it('6. FTUE (first 3 battles): no revive offer', () => {
    for (let b = 0; b < FTUE_BATTLES; b++) {
      const allowed = canOfferRewarded({ battlesCompleted: b, ftueDone: true });
      expect(
        shouldOfferRevive({ rewardedAllowed: allowed, capsOk: true, revives: 0, nestDamage: 0.9 }),
      ).toBe(false);
    }
    expect(canOfferRewarded({ battlesCompleted: 5, ftueDone: false })).toBe(false);
    const after = canOfferRewarded({ battlesCompleted: FTUE_BATTLES, ftueDone: true });
    expect(
      shouldOfferRevive({ rewardedAllowed: after, capsOk: true, revives: 0, nestDamage: 0.9 }),
    ).toBe(true);
  });

  describe('7. mock adapter noFill / error modes', () => {
    afterEach(() => vi.useRealTimers());
    const hooks = { onAdStart: vi.fn(), onAdEnd: vi.fn() };
    const root = {} as HTMLElement; // never touched in these modes

    it('noFill resolves no_fill at once and shows nothing', async () => {
      const p = new MockPlatform(root, hooks, 'noFill');
      await expect(p.requestRewarded('revive')).resolves.toBe('no_fill');
      await expect(p.showRewarded('revive')).resolves.toBe(false);
      expect(hooks.onAdStart).not.toHaveBeenCalled();
    });

    it('error resolves error after the 5 s load timeout', async () => {
      vi.useFakeTimers();
      const p = new MockPlatform(root, hooks, 'normal');
      p.setAdMode('error');
      let res: string | undefined;
      void p.requestRewarded('revive').then((r) => (res = r));
      await vi.advanceTimersByTimeAsync(AD_LOAD_TIMEOUT_MS - 1);
      expect(res).toBeUndefined();
      await vi.advanceTimersByTimeAsync(1);
      expect(res).toBe('error');
      expect(hooks.onAdStart).not.toHaveBeenCalled();
    });

    it('mode from URL', () => {
      expect(adModeFromUrl('?ads=nofill')).toBe('noFill');
      expect(adModeFromUrl('?ads=error')).toBe('error');
      expect(adModeFromUrl('')).toBe('normal');
    });
  });

  it('nothing is saved: a new app session starts with no free-revive state', () => {
    const s = new ReviveSession();
    expect(s.freeReviveUsed).toBe(false);
    expect(s.adsEverLoadedThisSession).toBe(false);
  });

  it('countdown running out closes the offer', () => {
    const o = new ReviveOffer(loadedSession());
    expect(o.tick(OFFER_COUNTDOWN_S)).toBe(true);
    expect(o.open).toBe(false);
    expect(o.request()).toBe(0);
  });
});
