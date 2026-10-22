import type { Page } from '@playwright/test';

/**
 * Feedback round 4 (Mohit, 2026-10-22: "vertical scrollbars at many places"): every meta screen
 * and modal, opened through the dev-only `window.__hsGame` hook so no battle is needed.
 * Shared by the scrollbar audit (e2e/noScrollbars.e2e.ts) and the screenshot script.
 */
type G = Record<string, (...a: unknown[]) => unknown> & {
  save: { meta: { chests: unknown[] } };
  overlay: HTMLElement;
};

export interface Screen {
  name: string;
  /** Runs in the page; must leave the screen on top. */
  open: (g: G) => unknown;
  /** Selector that proves the screen is showing. */
  ready: string;
}

export const SCREENS: Screen[] = [
  { name: 'home', open: (g) => g.showTitle(), ready: '.home' },
  { name: 'map', open: (g) => g.showMap(), ready: '.home' },
  { name: 'liveops', open: (g) => g.showLiveops(), ready: '.liveops-screen' },
  { name: 'shop', open: (g) => g.showShop(), ready: '[data-a=restore]' },
  { name: 'settings', open: (g) => g.showSettings(), ready: '[data-a=account]' },
  { name: 'account', open: (g) => g.showAccount(), ready: '[data-a^="acct:"]' },
  { name: 'skins', open: (g) => g.showSkins(), ready: '.skin-row' },
  { name: 'bees', open: (g) => g.showBees(), ready: '.bees-screen' },
  { name: 'hive', open: (g) => g.showHive(), ready: '.hive-screen' },
  { name: 'boosts', open: (g) => g.showBoosts(), ready: '[data-a=go]' },
  {
    name: 'chest',
    open: (g) => {
      g.save.meta.chests.splice(0, 9, {
        id: 'e2e-gold',
        type: 'gold',
        earnedAt: Date.now(),
        unlockAt: null,
      });
      g.showChest('e2e-gold');
    },
    ready: '.chest-info',
  },
  {
    name: 'chest-open',
    open: (g) => {
      g.save.meta.chests.splice(0, 9, { id: 'e2e-royal', type: 'royal', earnedAt: 0, unlockAt: 1 });
      g.showChest('e2e-royal');
      g.overlay.querySelector<HTMLElement>('[data-a=open]')?.click();
    },
    ready: '.chest-open',
  },
  {
    name: 'win',
    open: (g) => g.showWin({ coins: 120, stars: 3, nestDamage: 1, gems: 0 }),
    ready: '[data-a=claim], [data-a=double]',
  },
  {
    name: 'loss',
    open: (g) => g.showLoss({ coins: 40, stars: 0, nestDamage: 0.62, gems: 0 }),
    ready: '[data-a=retry]',
  },
];

export const VIEWPORTS = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 1280, height: 800 },
];

export async function openScreen(page: Page, s: Screen): Promise<void> {
  await page.evaluate(`(${s.open.toString()})(window.__hsGame)`);
  await page.locator(s.ready).first().waitFor({ state: 'visible', timeout: 10_000 });
  await page.waitForTimeout(450); // pop-in animation
}

export interface ScrollIssue {
  what: string;
  el: string;
}

/** Runs in the page: visible native scrollbars, page-level scrolling, scrollers without a fade. */
export function auditScroll(): ScrollIssue[] {
  const out: { what: string; el: string }[] = [];
  const name = (el: Element) =>
    `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${[...el.classList].map((c) => '.' + c).join('')}`;
  const de = document.documentElement;
  const b = document.body;
  for (const el of [de, b]) {
    const cs = getComputedStyle(el);
    if (cs.overflowY !== 'hidden' || cs.overflowX !== 'hidden')
      out.push({ what: `page scroll allowed (${cs.overflowX}/${cs.overflowY})`, el: name(el) });
  }
  if (de.scrollHeight > innerHeight + 1 || de.scrollWidth > innerWidth + 1)
    out.push({ what: `page overflow ${de.scrollWidth}x${de.scrollHeight}`, el: 'html' });
  for (const el of document.querySelectorAll<HTMLElement>('body *')) {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
    const cs = getComputedStyle(el);
    const bl = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    const bt = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    // Only scroll containers can draw a native bar (a scrollbar steals client width/height).
    const canY = /auto|scroll/.test(cs.overflowY);
    const canX = /auto|scroll/.test(cs.overflowX);
    if (!canY && !canX) continue;
    const vBar = el.offsetWidth - el.clientWidth - bl;
    const hBar = el.offsetHeight - el.clientHeight - bt;
    if (vBar > 0.5) out.push({ what: `vertical scrollbar ${vBar}px`, el: name(el) });
    if (hBar > 0.5) out.push({ what: `horizontal scrollbar ${hBar}px`, el: name(el) });
    const scrollY = canY && el.scrollHeight > el.clientHeight + 2;
    const scrollX = canX && el.scrollWidth > el.clientWidth + 2;
    if (scrollY || scrollX) {
      const mask = cs.maskImage || cs.getPropertyValue('-webkit-mask-image');
      if (!mask || mask === 'none') out.push({ what: 'scroller without fade hint', el: name(el) });
    }
  }
  return out;
}
