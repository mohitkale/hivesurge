/**
 * M2 exit recheck follow-ups (playtests/m2-exit-recheck-2026-10-17.md, STATUS decision 45):
 * BUG-07 confirm-sheet button layout, OBS-04 gem cap note, OBS-01 countdown start grace.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GEM_CAP_DAY_NOTE,
  GEM_CAP_SESSION_NOTE,
  OFFER_APPEAR_S,
  OFFER_COUNTDOWN_S,
  OFFER_GRACE_S,
  OFFER_START_DELAY_S,
  ReviveOffer,
  ReviveSession,
  type GemOption,
} from '../src/platform/revive';
import { GemReviveCaps, emptyGemReviveDay } from '../src/platform/reviveGems';
import { gemConfirmHtml, reviveRowHtml } from '../src/ui/reviveOffer';

const NOW = Date.parse('2026-10-17T10:00:00');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const rule = (sel: string): string => {
  const i = css.indexOf(`${sel} {`);
  expect(i, sel).toBeGreaterThanOrEqual(0);
  return css.slice(i, css.indexOf('}', i));
};
function loaded(): ReviveSession {
  const s = new ReviveSession();
  s.noteAdLoaded();
  return s;
}
function caps(session: number, day = session): GemReviveCaps {
  const d = emptyGemReviveDay();
  const c = new GemReviveCaps(d, { session: 2, day: 3 }, () => NOW);
  void c.ok; // roll the day key to today
  for (let i = 0; i < session; i++) c.record();
  d.count = day;
  return c;
}
function gems(balance: number, c: GemReviveCaps = caps(0)): GemOption {
  return { wallet: { gems: balance }, price: 5, caps: c, eventFinalLevel: false };
}

describe('OBS-01 (decision 45): countdown starts after the panel appears plus 1.5 s grace', () => {
  it('delay = defeat card pop-in length + 1.5 s, and matches the CSS animation', () => {
    expect(OFFER_GRACE_S).toBe(1.5);
    expect(OFFER_START_DELAY_S).toBeCloseTo(OFFER_APPEAR_S + 1.5);
    const m = rule('.card').match(/animation:\s*pop-in\s+([\d.]+)s/);
    expect(m, '.card pop-in duration').not.toBeNull();
    expect(Number(m![1])).toBeCloseTo(OFFER_APPEAR_S);
  });

  it('nothing counts down during the appear + grace window; then the full 10 s runs', () => {
    const o = new ReviveOffer(loaded(), gems(50));
    expect(o.tick(OFFER_APPEAR_S)).toBe(false); // panel appearing
    expect(o.countdown).toBe(OFFER_COUNTDOWN_S);
    expect(o.tick(1.4)).toBe(false); // still inside the 1.5 s grace
    expect(o.countdown).toBe(OFFER_COUNTDOWN_S);
    expect(o.open).toBe(true);
    o.tick(0.1 + 1); // grace ends; 1 s of countdown
    expect(o.countdown).toBeCloseTo(OFFER_COUNTDOWN_S - 1);
    expect(o.tick(OFFER_COUNTDOWN_S - 1.01)).toBe(false);
    expect(o.open).toBe(true);
    expect(o.tick(0.02)).toBe(true);
    expect(o.open).toBe(false);
  });

  it('a single large tick spills over the delay into the countdown', () => {
    const o = new ReviveOffer(loaded());
    o.tick(OFFER_START_DELAY_S + 2);
    expect(o.countdown).toBeCloseTo(OFFER_COUNTDOWN_S - 2);
    // Offer stays open for the full delay + 10 s, not 10 s from the defeat.
    const p = new ReviveOffer(loaded());
    expect(p.tick(OFFER_COUNTDOWN_S)).toBe(false);
    expect(p.open).toBe(true);
  });

  it('the grace does not run while the confirm sheet is open', () => {
    const o = new ReviveOffer(loaded(), gems(50));
    o.openGemConfirm();
    o.tick(30);
    expect(o.startDelay).toBeCloseTo(OFFER_START_DELAY_S);
    expect(o.countdown).toBe(OFFER_COUNTDOWN_S);
  });

  it('the game uses the default delay (no explicit 0 in game.ts)', () => {
    const game = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
    expect(game).toMatch(/new ReviveOffer\(this\.reviveSession, \{/);
    expect(game).not.toMatch(/new ReviveOffer\([^)]*\},\s*0\s*\)/);
  });
});

describe('OBS-04: gem cap reached shows a short disabled line, not a silent gap', () => {
  it('session cap: gem button hidden, note "Gem revive used up this session"', () => {
    const o = new ReviveOffer(loaded(), gems(110, caps(2)));
    expect(o.gemState).toBe('hidden');
    expect(o.gemCapNote).toBe(GEM_CAP_SESSION_NOTE);
    expect(GEM_CAP_SESSION_NOTE).toBe('Gem revive used up this session');
    const html = reviveRowHtml({
      button: 'ad',
      gemState: o.gemState,
      price: 5,
      balance: 110,
      countdown: 10,
      gemCapNote: o.gemCapNote,
    });
    expect(html).toContain('Gem revive used up this session');
    expect(html).toMatch(/class="small gem-cap-note" aria-disabled="true"/);
    expect(html).not.toContain('data-a="reviveGems"'); // nothing to tap
    expect(html).not.toMatch(/shop|store|buy|href|purchase/i); // C4: no upsell
  });

  it('day cap (new session, 3 today): "used up today"', () => {
    const o = new ReviveOffer(loaded(), gems(110, caps(0, 3)));
    expect(o.gemCapNote).toBe(GEM_CAP_DAY_NOTE);
  });

  it('no note when the cap is not the reason', () => {
    expect(new ReviveOffer(loaded(), gems(110)).gemCapNote).toBeNull(); // enabled
    expect(new ReviveOffer(loaded(), gems(2)).gemCapNote).toBeNull(); // short balance
    expect(new ReviveOffer(loaded()).gemCapNote).toBeNull(); // no gem option
    expect(
      new ReviveOffer(loaded(), { ...gems(110, caps(2)), eventFinalLevel: true }).gemCapNote,
    ).toBeNull();
    const free = new ReviveOffer(loaded(), gems(110, caps(2)));
    free.request();
    free.onAdResult('no_fill');
    expect(free.button).toBe('free');
    expect(free.gemCapNote).toBeNull();
    const row = reviveRowHtml({
      button: 'ad',
      gemState: 'enabled',
      price: 5,
      balance: 9,
      countdown: 9,
    });
    expect(row).not.toContain('gem-cap-note');
  });
});

describe('BUG-07: "Spend 5 gems" keeps a readable horizontal layout', () => {
  it('confirm sheet caption takes its own line; buttons have min-width, nowrap, flex', () => {
    expect(rule('.gem-confirm > p')).toMatch(/flex:\s*1 0 100%/);
    const b = rule('.revive-row .btn');
    expect(b).toMatch(/min-width:\s*120px/);
    expect(b).toMatch(/white-space:\s*nowrap/);
    expect(b).not.toMatch(/display:\s*inline-flex/); // keeps the space before the countdown
    expect(b).toMatch(/flex:\s*1 1 auto/);
    expect(b).toMatch(/overflow-wrap:\s*normal/);
    expect(rule('.gem-confirm .btn')).toMatch(/flex:\s*1 1 120px/);
    // Later than the generic `.row .btn { min-width: 0 }` so they win at equal specificity,
    // and the confirm-sheet basis comes after the revive-row one.
    const at = (sel: string) => css.indexOf(`${sel} {`);
    expect(at('.revive-row .btn')).toBeGreaterThan(at('.row .btn'));
    expect(at('.gem-confirm .btn')).toBeGreaterThan(at('.revive-row .btn'));
  });

  it('confirm sheet markup still has the caption and two equal buttons', () => {
    const html = gemConfirmHtml(5, 120);
    expect(html).toContain('class="row revive-row gem-confirm"');
    expect(html).toContain('<button class="btn" data-a="gemSpend">Spend 5 gems</button>');
    expect(html).toContain('<button class="btn" data-a="gemBack">Back</button>');
  });
});
