import type { GemButtonState, ReviveButton } from '../platform/revive';

export interface ReviveRowView {
  button: ReviveButton;
  gemState: GemButtonState;
  price: number;
  balance: number;
  countdown: number;
  /** OBS-04: gem cap reached; a short disabled line replaces the hidden gem button. */
  gemCapNote?: string | null;
}

/**
 * Revive offer row (revive-m2.md "Gem revive"): three equal buttons in a fixed order
 * (ad, gems, no thanks). G9 / C5: same class for all, no default, no autofocus, no
 * highlight or pulse. C4: when the balance is short the gem button is disabled, still shows
 * the price, and there is no buy-gems link anywhere.
 */
export function reviveRowHtml(v: ReviveRowView): string {
  const secs = `<span class="revive-count" aria-live="off">${Math.ceil(v.countdown)}</span>`;
  const ad =
    v.button === 'ad'
      ? `<button class="btn" data-a="revive">Revive (watch ad) · ${secs}</button>`
      : v.button === 'free'
        ? `<button class="btn" data-a="reviveFree">Revive (free) · ${secs}</button>`
        : v.button === 'limit'
          ? '<button class="btn" data-a="adLimit" disabled>Ad limit reached</button>'
          : '<button class="btn" data-a="unavailable" disabled>Ad not available</button>';
  let gem = '';
  if (v.gemState === 'enabled')
    gem = `<button class="btn" data-a="reviveGems">Revive (💎 ${v.price} gems)</button>`;
  else if (v.gemState === 'disabled') {
    const label = `Revive for ${v.price} gems, unavailable, you have ${v.balance}`;
    gem = `<span class="gem-slot"><button class="btn gem-locked" data-a="reviveGems" disabled aria-label="${label}">🔒 Revive (💎 ${v.price} gems)</button><span class="small">You have ${v.balance}</span></span>`;
  }
  // OBS-04: not a button (nothing to tap, no buy link), just a short greyed explanation.
  const note =
    v.gemState === 'hidden' && v.gemCapNote
      ? `<p class="small gem-cap-note" aria-disabled="true">💎 ${v.gemCapNote}</p>`
      : '';
  return `<div class="row revive-row">${ad}${gem}<button class="btn" data-a="noThanks">No thanks</button>${note}</div>`;
}

/** Gem confirm sheet: price, balance before/after, two equal buttons (no default). */
export function gemConfirmHtml(price: number, balance: number): string {
  return `<div class="row revive-row gem-confirm"><p class="small">Revive for 💎 ${price} gems · balance ${balance} → ${balance - price}</p><button class="btn" data-a="gemSpend">Spend ${price} gems</button><button class="btn" data-a="gemBack">Back</button></div>`;
}
