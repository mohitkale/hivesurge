import { CATALOG, type Platform, type RewardedPlacement, type Sku } from './platform';

/**
 * Sandbox adapter: fake ads and purchases rendered as clearly-labelled DOM
 * modals. No network, no SDK, no money. Hooks let the game pause + mute.
 */
export class MockPlatform implements Platform {
  readonly name = 'sandbox';
  constructor(
    private readonly root: HTMLElement,
    private readonly hooks: { onAdStart: () => void; onAdEnd: () => void },
  ) {}

  showRewarded(placement: RewardedPlacement): Promise<boolean> {
    return this.fakeAd(`Rewarded ad · ${placement}`, 3, true);
  }

  async showInterstitial(placement: string): Promise<void> {
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
