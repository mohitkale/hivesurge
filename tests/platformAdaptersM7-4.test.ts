import { describe, expect, it, vi } from 'vitest';
import {
  createPortalPlatform,
  CrazyGamesPlatform,
  PokiPlatform,
  type CrazySdk,
  type PokiSdk,
} from '../src/platform/adapters/portal';
import { platformFlag } from '../src/platform/platformFlag';
import { MockPlatform } from '../src/platform/mockPlatform';
import type { Platform } from '../src/platform/platform';

type Outcome = 'complete' | 'close' | 'nofill' | 'error' | 'hang';

function fakePoki(log: string[], o: { reward: Outcome; mid: Outcome }): PokiSdk {
  return {
    init: async () => log.push('init'),
    setDebug: (on) => log.push(`debug:${on}`),
    gameLoadingFinished: () => log.push('loaded'),
    gameplayStart: () => log.push('start'),
    gameplayStop: () => log.push('stop'),
    commercialBreak: (onStart) => {
      log.push('commercialBreak');
      if (o.mid === 'hang') return new Promise(() => {});
      if (o.mid !== 'nofill') onStart?.();
      return Promise.resolve();
    },
    rewardedBreak: (opts) => {
      log.push('rewardedBreak');
      if (o.reward === 'hang') return new Promise(() => {});
      if (o.reward === 'error') return Promise.reject(new Error('x'));
      if (o.reward !== 'nofill') opts?.onStart?.();
      return Promise.resolve(o.reward === 'complete');
    },
  };
}

function fakeCrazy(log: string[], o: { reward: Outcome; mid: Outcome }, env = 'local'): CrazySdk {
  return {
    init: async () => log.push('init'),
    environment: env,
    ad: {
      requestAd: (type, cb) => {
        log.push(`requestAd:${type}`);
        const out = type === 'rewarded' ? o.reward : o.mid;
        if (out === 'hang') return;
        if (out === 'nofill') return cb.adError?.({ code: 'unfilled' });
        if (out === 'error') return cb.adError?.({ code: 'other' });
        cb.adStarted?.();
        // CrazyGames has no "closed early" for rewarded: an ad that finishes is completed.
        if (out === 'close') return cb.adError?.({ code: 'other' });
        cb.adFinished?.();
      },
    },
    game: {
      gameplayStart: () => log.push('start'),
      gameplayStop: () => log.push('stop'),
      loadingStop: () => log.push('loaded'),
    },
  };
}

const hooks = (log: string[]) => ({
  onAdStart: () => log.push('mute'),
  onAdEnd: () => log.push('unmute'),
});

const adapters: [string, (log: string[], o: { reward: Outcome; mid: Outcome }) => Platform][] = [
  ['poki', (log, o) => new PokiPlatform(fakePoki(log, o), hooks(log), 50)],
  ['crazygames', (log, o) => new CrazyGamesPlatform(fakeCrazy(log, o), hooks(log), 50)],
];

describe('M7-4 platform build flag', () => {
  it('VITE_PLATFORM selects the adapter; default and unknown values are the sandbox mock', () => {
    expect(platformFlag(undefined)).toBe('sandbox');
    expect(platformFlag('')).toBe('sandbox');
    expect(platformFlag('steam')).toBe('sandbox');
    expect(platformFlag('poki')).toBe('poki');
    expect(platformFlag('crazygames')).toBe('crazygames');
    expect(platformFlag('own')).toBe('own');
  });
  it('the sandbox mock implements the same Platform contract', () => {
    const p: Platform = new MockPlatform({} as HTMLElement, hooks([]));
    expect(p.name).toBe('sandbox');
  });
});

describe.each(adapters)('M7-4 %s adapter (SDK sandbox mode)', (name, make) => {
  it('G10: reward only when the ad completed', async () => {
    for (const [out, want] of [
      ['complete', 'completed'],
      ['nofill', 'no_fill'],
      ['error', 'error'],
    ] as const) {
      const p = make([], { reward: out, mid: 'complete' });
      expect(await p.requestRewarded('win_double'), `${name} ${out}`).toBe(want);
    }
    expect(await make([], { reward: 'close', mid: 'complete' }).showRewarded('revive')).toBe(false);
    expect(await make([], { reward: 'complete', mid: 'complete' }).showRewarded('revive')).toBe(
      true,
    );
  });

  it('G18: gameplayStop is sent before any ad, and start/stop are not repeated', async () => {
    const log: string[] = [];
    const p = make(log, { reward: 'complete', mid: 'complete' });
    p.gameplayStart();
    p.gameplayStart();
    await p.requestRewarded('boost');
    p.gameplayStart();
    await p.showInterstitial('level_transition');
    const ads = log.filter((x) => /Break|requestAd/.test(x));
    expect(ads).toHaveLength(2);
    for (const a of ads) {
      const i = log.indexOf(a);
      expect(log.slice(0, i).lastIndexOf('stop')).toBeGreaterThan(
        log.slice(0, i).lastIndexOf('start'),
      );
    }
    expect(log.filter((x) => x === 'start')).toHaveLength(2);
    // Audio is muted for the ad and restored after it.
    expect(log.filter((x) => x === 'mute')).toHaveLength(2);
    expect(log.filter((x) => x === 'unmute')).toHaveLength(2);
  });

  it('a hanging SDK times out: rewarded = error, no interstitial counted', async () => {
    vi.useFakeTimers();
    try {
      const p = make([], { reward: 'hang', mid: 'hang' });
      const r = p.requestRewarded('boost');
      const i = p.showInterstitial('level_transition');
      await vi.advanceTimersByTimeAsync(60);
      expect(await r).toBe('error');
      expect(await i).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('an unfilled interstitial is not counted as shown', async () => {
    expect(
      await make([], { reward: 'complete', mid: 'nofill' }).showInterstitial('level_transition'),
    ).toBe(false);
  });

  it('portal builds sell nothing', async () => {
    expect(await make([], { reward: 'complete', mid: 'complete' }).purchase('gems_small')).toBe(
      false,
    );
  });
});

describe('M7-4 createPortalPlatform (sandbox modes, no network in tests)', () => {
  it('Poki: init, debug mode on, loading finished', async () => {
    const log: string[] = [];
    const sdk = fakePoki(log, { reward: 'complete', mid: 'complete' });
    const p = await createPortalPlatform('poki', hooks(log), { PokiSDK: sdk } as never);
    expect(p?.name).toBe('poki');
    expect(log).toEqual(['init', 'debug:true', 'loaded']);
  });
  it('CrazyGames: init in the local environment; disabled = no fill', async () => {
    const log: string[] = [];
    const sdk = fakeCrazy(log, { reward: 'complete', mid: 'complete' });
    const p = await createPortalPlatform('crazygames', hooks(log), {
      CrazyGames: { SDK: sdk },
    } as never);
    expect(p?.name).toBe('crazygames');
    expect(log).toEqual(['init', 'loaded']);
    const off = new CrazyGamesPlatform(
      fakeCrazy([], { reward: 'complete', mid: 'complete' }, 'disabled'),
      hooks([]),
    );
    expect(await off.requestRewarded('boost')).toBe('no_fill');
  });
  it('an SDK whose init fails leaves the game on the sandbox mock (null)', async () => {
    const sdk = fakePoki([], { reward: 'complete', mid: 'complete' });
    sdk.init = () => Promise.reject(new Error('blocked'));
    expect(await createPortalPlatform('poki', hooks([]), { PokiSDK: sdk } as never)).toBeNull();
  });
});
