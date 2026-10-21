import { CATALOG, formatPrice, type Sku } from '../platform/platform';
import { TEST_CARDS } from './mockStripe';
import type { CheckoutUi } from './service';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Mock hosted Checkout page (DOM modal). Clearly labelled TEST MODE; offers the Stripe test
 * cards so every success / decline / 3DS / cancel path can be tried without a Stripe account.
 */
export class DomCheckoutUi implements CheckoutUi {
  constructor(private readonly root: HTMLElement) {}

  private modal(html: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'modal checkout-mock';
    el.innerHTML = `<div class="card">${html}</div>`;
    this.root.appendChild(el);
    return el;
  }

  chooseCard(
    s: { id: string; sku: string; amount: number; currency: 'usd' | 'inr' },
    error: string,
  ): Promise<string | null> {
    const info = CATALOG[s.sku as Sku];
    const price = formatPrice({ usd: s.amount / 100, inr: s.amount / 100 }, s.currency);
    const cards: [string, string][] = [
      [TEST_CARDS.success, '4242 4242 4242 4242 · succeeds'],
      [TEST_CARDS.threeDS, '4000 0025 0000 3155 · 3D Secure'],
      [TEST_CARDS.decline, '4000 0000 0000 0002 · declined'],
      [TEST_CARDS.insufficient, '4000 0000 0000 9995 · insufficient funds'],
    ];
    return new Promise((resolve) => {
      const el = this.modal(`
        <span class="ad-tag">STRIPE TEST MODE (mock) · no money is charged</span>
        <h2>${esc(info?.title ?? s.sku)}</h2>
        <p class="price">${esc(price)} <span class="small">incl. taxes where applicable</span></p>
        ${error ? `<p class="checkout-error" role="alert">${esc(error)}</p>` : ''}
        <p class="small">Pay with a Stripe test card:</p>
        ${cards
          .map(
            ([n, label]) =>
              `<div class="row"><button class="btn" data-card="${n}">${label}</button></div>`,
          )
          .join('')}
        <div class="row"><button class="btn" data-card="cancel">← Cancel and go back</button></div>
        <p class="small">Session ${esc(s.id)}</p>`);
      el.addEventListener('click', (e) => {
        const c = (e.target as HTMLElement).closest<HTMLElement>('[data-card]')?.dataset.card;
        if (!c) return;
        el.remove();
        resolve(c === 'cancel' ? null : c);
      });
    });
  }

  confirm3ds(): Promise<boolean> {
    return new Promise((resolve) => {
      const el = this.modal(`
        <span class="ad-tag">3D SECURE TEST PAGE (mock)</span>
        <h2>Authenticate payment</h2>
        <div class="row"><button class="btn" data-a="fail">Fail authentication</button>
        <button class="btn" data-a="ok">Complete authentication</button></div>`);
      el.addEventListener('click', (e) => {
        const a = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a;
        if (!a) return;
        el.remove();
        resolve(a === 'ok');
      });
    });
  }
}
