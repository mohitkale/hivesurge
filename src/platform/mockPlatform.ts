import {
  CATALOG,
  type Platform,
  type RewardedPlacement,
  type RewardedResult,
  type Sku,
} from './platform';

/**
 * Mock ad fill modes (M2-21): `normal` shows the fake ad; `noFill` reports no ad available;
 * `error` never loads and fails after the load timeout. Set with `?ads=nofill|error` or
 * `setAdMode()` (tests).
 */
export type MockAdMode = 'normal' | 'noFill' | 'error';
export const AD_LOAD_TIMEOUT_MS = 5000;

export function adModeFromUrl(search: string): MockAdMode {
  const v = new URLSearchParams(search).get('ads');
  return v === 'nofill' ? 'noFill' : v === 'error' ? 'error' : 'normal';
}

/**
 * Sandbox adapter: fake ads and purchases rendered as clearly-labelled DOM
 * modals. No network, no SDK, no money. Hooks let the game pause + mute.
 */
export class MockPlatform implements Platform {
  readonly name = 'sandbox';
  constructor(
    private readonly root: HTMLElement,
    private readonly hooks: { onAdStart: () => void; onAdEnd: () => void },
    private mode: MockAdMode = 'normal',
    private readonly loadTimeoutMs = AD_LOAD_TIMEOUT_MS,
  ) {}

  setAdMode(mode: MockAdMode): void {
    this.mode = mode;
  }

  async showRewarded(placement: RewardedPlacement): Promise<boolean> {
    return (await this.requestRewarded(placement)) === 'completed';
  }

  requestRewarded(placement: RewardedPlacement): Promise<RewardedResult> {
    if (this.mode === 'noFill') return Promise.resolve('no_fill');
    if (this.mode === 'error')
      return new Promise((resolve) => setTimeout(() => resolve('error'), this.loadTimeoutMs));
    return this.fakeAd(`Rewarded ad · ${placement}`, 3, true).then((ok) =>
      ok ? 'completed' : 'closed',
    );
  }

  async showInterstitial(placement: string): Promise<void> {
    if (this.mode !== 'normal') return; // nothing to show
    await this.fakeAd(`Interstitial · ${placement}`, 2, false);
  }

  purchase(sku: Sku): Promise<boolean> {
    const info = CATALOG[sku];
    return new Promise((resolve) => {
      const el = this.modal(`
        <div class="ad-tag">SANDBOX PURCHASE · no money is charged</div>
        <h2>${info.title}</h2><p class="price">${info.price}</p>
        <div class="row"><button class="btn" data-a="cancel">Cancel</button>
        <button class="btn primary" data-a="ok">Confirm (test)</button></div>`);
      el.addEventListener('click', (e) => {
        const a = (e.target as HTMLElement).dataset.a;
        if (!a) return;
        el.remove();
        resolve(a === 'ok');
      });
    });
  }

  gameplayStart(): void {}
  gameplayStop(): void {}

  private fakeAd(label: string, seconds: number, skippable: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      this.hooks.onAdStart();
      const el = this.modal(`
        <div class="ad-tag">SANDBOX AD</div><h2>${label}</h2>
        <p class="ad-count">${seconds}</p>
        ${skippable ? '<button class="btn" data-a="close">Close (no reward)</button>' : ''}`);
      const count = el.querySelector('.ad-count') as HTMLElement;
      let left = seconds;
      const done = (ok: boolean) => {
        clearInterval(timer);
        el.remove();
        this.hooks.onAdEnd();
        resolve(ok);
      };
      const timer = setInterval(() => {
        left--;
        count.textContent = String(left);
        if (left <= 0) done(true);
      }, 1000);
      el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).dataset.a === 'close') done(false);
      });
    });
  }

  private modal(html: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'modal ad-modal';
    el.innerHTML = `<div class="card">${html}</div>`;
    this.root.appendChild(el);
    return el;
  }
}
