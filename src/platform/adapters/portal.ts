import type { Platform, RewardedPlacement, RewardedResult, Sku } from '../platform';
import { AD_LOAD_TIMEOUT_MS } from '../mockPlatform';

/**
 * M7-4 portal adapters (Poki, CrazyGames) in their SDK sandbox modes. Loaded only by builds
 * made with `VITE_PLATFORM=poki|crazygames` (dynamic import, so the default own-site/sandbox
 * build carries none of this). No production submission happens from here.
 *
 * Guardrails every adapter keeps (platform contract tests, tests/platformAdaptersM7-4.test.ts):
 * - G10: a rewarded placement resolves `completed` only when the SDK reports the ad finished.
 * - G18: `gameplayStop()` is sent before any ad; the game resumes with `gameplayStart()` itself.
 * - A missing/blocked SDK or a load past AD_LOAD_TIMEOUT_MS is `error` / no interstitial.
 * - Portal builds sell nothing (portal rules): `purchase` always resolves false.
 */

import type { PortalFlag } from '../platformFlag';

export type { PortalFlag };

export interface AdHooks {
  onAdStart: () => void;
  onAdEnd: () => void;
}

/** The part of the Poki SDK v2 we use (https://sdk.poki.com/). */
export interface PokiSdk {
  init(): Promise<unknown>;
  setDebug(on: boolean): void;
  gameLoadingFinished?(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  commercialBreak(onStart?: () => void): Promise<unknown>;
  rewardedBreak(opts?: { size?: string; onStart?: () => void }): Promise<boolean>;
}

/** The part of the CrazyGames SDK v3 we use (https://docs.crazygames.com/). */
export interface CrazySdk {
  init(): Promise<unknown>;
  environment: 'local' | 'crazygames' | 'disabled' | string;
  ad: {
    requestAd(
      type: 'midgame' | 'rewarded',
      cb: { adStarted?: () => void; adFinished?: () => void; adError?: (e: unknown) => void },
    ): void;
  };
  game: { gameplayStart(): void; gameplayStop(): void; loadingStop?(): void };
}

export const SDK_URLS: Record<PortalFlag, string> = {
  poki: 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js',
  crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
};

const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(fallback);
      },
    );
  });

abstract class PortalBase implements Platform {
  abstract readonly name: string;
  private playing = false;
  constructor(
    protected readonly hooks: AdHooks,
    protected readonly timeoutMs = AD_LOAD_TIMEOUT_MS,
  ) {}
  protected abstract sdkStart(): void;
  protected abstract sdkStop(): void;
  protected abstract rewarded(onStart: () => void): Promise<RewardedResult>;
  protected abstract midgame(onStart: () => void): Promise<boolean>;

  gameplayStart(): void {
    if (this.playing) return;
    this.playing = true;
    this.sdkStart();
  }
  gameplayStop(): void {
    if (!this.playing) return;
    this.playing = false;
    this.sdkStop();
  }
  async showRewarded(p: RewardedPlacement): Promise<boolean> {
    return (await this.requestRewarded(p)) === 'completed';
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- part of the Platform contract
  async requestRewarded(_placement: RewardedPlacement): Promise<RewardedResult> {
    this.gameplayStop(); // G18
    let started = false;
    const r = await withTimeout(
      this.rewarded(() => {
        started = true;
        this.hooks.onAdStart();
      }),
      this.timeoutMs,
      'error' as RewardedResult,
    );
    if (started) this.hooks.onAdEnd();
    return r;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- part of the Platform contract
  async showInterstitial(_placement: string): Promise<boolean> {
    this.gameplayStop(); // G18
    let started = false;
    const shown = await withTimeout(
      this.midgame(() => {
        started = true;
        this.hooks.onAdStart();
      }),
      this.timeoutMs,
      false,
    );
    if (started) this.hooks.onAdEnd();
    return shown && started;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- part of the Platform contract
  purchase(_sku: Sku): Promise<boolean> {
    return Promise.resolve(false); // portal builds sell nothing
  }
}

export class PokiPlatform extends PortalBase {
  readonly name = 'poki';
  constructor(
    private readonly sdk: PokiSdk,
    hooks: AdHooks,
    timeoutMs?: number,
  ) {
    super(hooks, timeoutMs);
  }
  protected sdkStart() {
    this.sdk.gameplayStart();
  }
  protected sdkStop() {
    this.sdk.gameplayStop();
  }
  protected async rewarded(onStart: () => void): Promise<RewardedResult> {
    let started = false;
    const ok = await this.sdk.rewardedBreak({
      size: 'small',
      onStart: () => {
        started = true;
        onStart();
      },
    });
    // G10: Poki resolves true only for a watched ad; false without a start = no fill.
    return ok === true ? 'completed' : started ? 'closed' : 'no_fill';
  }
  protected async midgame(onStart: () => void): Promise<boolean> {
    await this.sdk.commercialBreak(onStart);
    return true;
  }
}

export class CrazyGamesPlatform extends PortalBase {
  readonly name = 'crazygames';
  constructor(
    private readonly sdk: CrazySdk,
    hooks: AdHooks,
    timeoutMs?: number,
  ) {
    super(hooks, timeoutMs);
  }
  protected sdkStart() {
    this.sdk.game.gameplayStart();
  }
  protected sdkStop() {
    this.sdk.game.gameplayStop();
  }
  private request(type: 'midgame' | 'rewarded', onStart: () => void): Promise<RewardedResult> {
    if (this.sdk.environment === 'disabled') return Promise.resolve('no_fill');
    return new Promise((resolve) =>
      this.sdk.ad.requestAd(type, {
        adStarted: onStart,
        adFinished: () => resolve('completed'),
        adError: (e) => {
          const code = (e as { code?: string } | null)?.code;
          resolve(code === 'unfilled' || code === 'adblock' ? 'no_fill' : 'error');
        },
      }),
    );
  }
  protected rewarded(onStart: () => void): Promise<RewardedResult> {
    return this.request('rewarded', onStart);
  }
  protected async midgame(onStart: () => void): Promise<boolean> {
    return (await this.request('midgame', onStart)) === 'completed';
  }
}

/** Load a script tag once (portal builds only). */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`sdk load failed: ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * Create the portal adapter in SDK sandbox mode: Poki with `setDebug(true)` (test ads),
 * CrazyGames in its `local` environment (demo ads on localhost). Returns null when the SDK
 * cannot load, so the game keeps the sandbox mock.
 */
export async function createPortalPlatform(
  flag: PortalFlag,
  hooks: AdHooks,
  w: Window & { PokiSDK?: PokiSdk; CrazyGames?: { SDK: CrazySdk } } = window,
): Promise<Platform | null> {
  try {
    if (flag === 'poki') {
      if (!w.PokiSDK) await loadScript(SDK_URLS.poki);
      const sdk = w.PokiSDK;
      if (!sdk) return null;
      await sdk.init();
      sdk.setDebug(true);
      sdk.gameLoadingFinished?.();
      return new PokiPlatform(sdk, hooks);
    }
    if (!w.CrazyGames) await loadScript(SDK_URLS.crazygames);
    const sdk = w.CrazyGames?.SDK;
    if (!sdk) return null;
    await sdk.init();
    sdk.game.loadingStop?.();
    return new CrazyGamesPlatform(sdk, hooks);
  } catch {
    return null;
  }
}
