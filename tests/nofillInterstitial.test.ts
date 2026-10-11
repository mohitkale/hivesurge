import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockPlatform } from '../src/platform/mockPlatform';
import { ReviveOffer, ReviveSession } from '../src/platform/revive';

/** QA on PR 047: with ?ads=nofill a no-fill interstitial made a later revive free. */
describe('no-fill interstitial does not count as "an ad loaded this session"', () => {
  afterEach(() => vi.useRealTimers());
  const hooks = { onAdStart: vi.fn(), onAdEnd: vi.fn() };
  const root = {} as HTMLElement;

  it.each(['noFill', 'error'] as const)(
    '%s: showInterstitial resolves false, shows nothing',
    async (mode) => {
      const p = new MockPlatform(root, hooks, mode);
      await expect(p.showInterstitial('level_transition')).resolves.toBe(false);
      expect(hooks.onAdStart).not.toHaveBeenCalled();
    },
  );

  it('repro: nofill interstitial on Home, then lose and tap Revive -> no free revive', async () => {
    const p = new MockPlatform(root, hooks, 'noFill');
    const session = new ReviveSession();
    session.noteInterstitial(await p.showInterstitial('level_transition'));
    expect(session.adsEverLoadedThisSession).toBe(false);
    const o = new ReviveOffer(session);
    o.request();
    expect(o.onAdResult(await p.requestRewarded('revive'))).toEqual({ kind: 'unavailable' });
    expect(o.button).not.toBe('free');
    expect(o.takeFree()).toBeNull();
  });

  it('an interstitial that did show still sets the flag', () => {
    const s = new ReviveSession();
    s.noteInterstitial(true);
    expect(s.adsEverLoadedThisSession).toBe(true);
  });
});
