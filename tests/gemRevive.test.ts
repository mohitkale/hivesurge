import { readFileSync } from 'node:fs';
import { ResultSession } from '../src/platform/resultSession';
import { canShowInterstitial } from '../src/platform/adPolicy';
import { describe, expect, it } from 'vitest';
import { canOfferRewarded, FTUE_BATTLES } from '../src/platform/adPolicy';
import {
  MAX_EARLY_CLOSES,
  ReviveOffer,
  ReviveSession,
  type GemOption,
} from '../src/platform/revive';
import {
  debitGems,
  emptyGemReviveDay,
  GemReviveCaps,
  isEventFinalLevel,
  REVIVE_GEM_DEFAULTS,
  reviveGemConfig,
} from '../src/platform/reviveGems';
import { defaultSave, mergeGemDay, mergeSaves, parseSave } from '../src/platform/save';
import { gemConfirmHtml, reviveRowHtml } from '../src/ui/reviveOffer';

const NOW = Date.parse('2026-10-11T10:00:00');
function loaded(): ReviveSession {
  const s = new ReviveSession();
  s.noteAdLoaded();
  return s;
}
function gems(balance: number, opts: Partial<GemOption> = {}, caps?: GemReviveCaps): GemOption {
  return {
    wallet: { gems: balance },
    price: 10,
    caps: caps ?? new GemReviveCaps(emptyGemReviveDay(), REVIVE_GEM_DEFAULTS.gemCaps, () => NOW),
    eventFinalLevel: false,
    ...opts,
  };
}
const closeTwice = (o: ReviveOffer) => {
  o.request();
  o.onAdResult('closed');
  o.request();
  return o.onAdResult('closed');
};

describe('M2-21c gem revive: takeGems (C1)', () => {
  it('insufficient balance: no debit, no grant', () => {
    const g = gems(4);
    const o = new ReviveOffer(loaded(), g);
    expect(o.gemState).toBe('disabled');
    expect(o.openGemConfirm()).toBe(false);
    expect(o.takeGems(0)).toBeNull();
    expect(g.wallet.gems).toBe(4);
    expect(o.granted).toBe(false);
  });

  it('debit and grant are atomic: exactly price debited, granted once, a second take refused', () => {
    const g = gems(25);
    const o = new ReviveOffer(loaded(), g);
    expect(o.openGemConfirm()).toBe(true);
    expect(o.takeGems(0)).toEqual({ kind: 'grant', source: 'gems', attempt: 0, price: 10 });
    expect(g.wallet.gems).toBe(15);
    expect(o.open).toBe(false);
    expect(o.takeGems(0)).toBeNull();
    expect(g.wallet.gems).toBe(15);
  });

  it('refused when revives > 0, when the offer is closed, or without the confirm sheet', () => {
    const g = gems(50);
    const a = new ReviveOffer(loaded(), g);
    a.openGemConfirm();
    expect(a.takeGems(1)).toBeNull();
    const b = new ReviveOffer(loaded(), g);
    expect(b.takeGems(0)).toBeNull(); // confirm sheet not open
    b.openGemConfirm();
    b.backFromConfirm();
    b.decline();
    expect(b.takeGems(0)).toBeNull();
    expect(g.wallet.gems).toBe(50);
  });

  it('debitGems is all or nothing', () => {
    const w = { gems: 9 };
    expect(debitGems(w, 10)).toBe(false);
    expect(w.gems).toBe(9);
    expect(debitGems(w, 9)).toBe(true);
    expect(w.gems).toBe(0);
  });
});

describe('M2-21c early-close / ad-failure rule (PR 039 final)', () => {
  it(`after ${MAX_EARLY_CLOSES} early closes with gems valid: open, ad disabled "limit", gems + No thanks`, () => {
    const o = new ReviveOffer(loaded(), gems(10), 0);
    o.tick(3);
    expect(closeTwice(o)).toEqual({ kind: 'offer' });
    expect(o.open).toBe(true);
    expect(o.button).toBe('limit');
    expect(o.adEnabled).toBe(false);
    expect(o.request()).toBe(0);
    expect(o.gemState).toBe('enabled');
    expect(o.countdown).toBeCloseTo(7); // keeps running from where it was
    o.tick(1);
    expect(o.countdown).toBeCloseTo(6);
    const html = reviveRowHtml({
      button: o.button,
      gemState: o.gemState,
      price: 10,
      balance: 10,
      countdown: 6,
    });
    expect(html).toContain('Ad limit reached');
    expect(html).toContain('data-a="noThanks"');
  });

  it.each([
    ["can't afford", gems(9)],
    ['caps reached', gems(50, {}, capsAt(2))],
    ['event final level', gems(50, { eventFinalLevel: true })],
  ])('after 2 early closes the offer closes when gems are not valid: %s', (_n, g) => {
    const o = new ReviveOffer(loaded(), g);
    expect(closeTwice(o)).toEqual({ kind: 'closed' });
    expect(o.open).toBe(false);
  });

  it('second ad failure: "Ad not available"; stays open after the 3 s notice only while gems are valid', () => {
    const session = loaded();
    session.freeReviveUsed = true;
    const ok = new ReviveOffer(session, gems(10));
    ok.request();
    expect(ok.onAdResult('no_fill')).toEqual({ kind: 'unavailable' });
    expect(ok.gemState).toBe('disabled'); // nothing enabled during the notice
    expect(ok.afterNotice()).toEqual({ kind: 'offer' });
    expect(ok.open).toBe(true);
    expect(ok.gemState).toBe('enabled');
    const poor = new ReviveOffer(session, gems(3));
    poor.request();
    poor.onAdResult('error');
    expect(poor.afterNotice()).toEqual({ kind: 'closed' });
  });

  it('11 / C3: free revive shown -> gem button hidden; free used and ad fails -> gems shown', () => {
    const session = loaded();
    const a = new ReviveOffer(session, gems(30));
    a.request();
    a.onAdResult('no_fill');
    expect(a.button).toBe('free');
    expect(a.gemState).toBe('hidden');
    expect(a.gemsValid).toBe(false);
    a.takeFree();
    const b = new ReviveOffer(session, gems(30));
    b.request();
    b.onAdResult('no_fill');
    b.afterNotice();
    expect(b.gemState).toBe('enabled');
  });

  it('12 / C5: confirm sheet pauses the countdown; Back resumes it', () => {
    const o = new ReviveOffer(loaded(), gems(10), 0);
    o.tick(2);
    o.openGemConfirm();
    o.tick(5);
    expect(o.countdown).toBeCloseTo(8);
    expect(o.adEnabled).toBe(false);
    o.backFromConfirm();
    o.tick(1);
    expect(o.countdown).toBeCloseTo(7);
  });
});

function capsAt(sessionCount: number, dayCount = sessionCount): GemReviveCaps {
  const day = { day: '', count: 0 };
  const c = new GemReviveCaps(day, REVIVE_GEM_DEFAULTS.gemCaps, () => NOW);
  for (let i = 0; i < sessionCount; i++) c.record();
  day.count = dayCount;
  return c;
}

describe('G19 tests T-G19a–g', () => {
  it('T-G19a: flat price 5 gems (decision 36), no escalation; config matches revive-gem.json (C8)', () => {
    const cfg = JSON.parse(
      readFileSync(
        new URL('../monetization/revive-gem.json', import.meta.url) as unknown as string,
        'utf8',
      ) as unknown as string,
    );
    expect(REVIVE_GEM_DEFAULTS.gemPrice).toBe(cfg.price_gems);
    expect(REVIVE_GEM_DEFAULTS.gemPrice).toBe(5);
    expect(cfg.escalation).toBe(false);
    expect(REVIVE_GEM_DEFAULTS.gemCaps).toEqual({
      session: cfg.max_gem_revives_per_session,
      day: cfg.max_gem_revives_per_day,
    });
    const g = gems(100, { price: REVIVE_GEM_DEFAULTS.gemPrice });
    for (let i = 0; i < 2; i++) {
      const o = new ReviveOffer(loaded(), g);
      o.openGemConfirm();
      expect(o.takeGems(0)).toMatchObject({ price: 5 });
    }
    expect(g.wallet.gems).toBe(90);
    // Remote config can change the price but never past the G19 caps.
    expect(reviveGemConfig({ gemPrice: 12, gemCaps: { session: 9, day: 9 } })).toEqual({
      gemPrice: 12,
      gemCaps: { session: 2, day: 3 },
    });
    expect(reviveGemConfig({ gemPrice: -1 }).gemPrice).toBe(5);
  });

  it('T-G19b: one revive per battle total across ad, free and gems', () => {
    const g = gems(100);
    const o = new ReviveOffer(loaded(), g);
    o.request();
    o.onAdResult('completed');
    expect(o.openGemConfirm()).toBe(false);
    const again = new ReviveOffer(loaded(), g);
    again.openGemConfirm();
    expect(again.takeGems(1)).toBeNull(); // world.revives > 0
    expect(g.wallet.gems).toBe(100);
  });

  it('T-G19c: at most 2 gem revives per session and 3 per day; daily count persisted, session not', () => {
    const day = emptyGemReviveDay();
    const s1 = new GemReviveCaps(day, REVIVE_GEM_DEFAULTS.gemCaps, () => NOW);
    const g = gems(100, {}, s1);
    for (let i = 0; i < 2; i++) {
      const o = new ReviveOffer(loaded(), g);
      o.openGemConfirm();
      expect(o.takeGems(0)).not.toBeNull();
    }
    expect(new ReviveOffer(loaded(), g).gemState).toBe('hidden'); // 3rd in a session
    const save = defaultSave();
    save.reviveGemDay = day;
    const restored = parseSave(JSON.stringify(save)).reviveGemDay;
    expect(restored.count).toBe(2);
    const s2 = new GemReviveCaps(restored, REVIVE_GEM_DEFAULTS.gemCaps, () => NOW); // new session
    const g2 = gems(100, {}, s2);
    const o = new ReviveOffer(loaded(), g2);
    o.openGemConfirm();
    expect(o.takeGems(0)).not.toBeNull(); // 3rd today
    expect(new ReviveOffer(loaded(), g2).gemState).toBe('hidden'); // 4th in a day
    const tomorrow = new GemReviveCaps(
      restored,
      REVIVE_GEM_DEFAULTS.gemCaps,
      () => NOW + 86_400_000,
    );
    expect(tomorrow.ok).toBe(true);
  });

  it('T-G19d: no revive offer at all in the first 3 battles', () => {
    for (let b = 0; b < FTUE_BATTLES; b++)
      expect(canOfferRewarded({ battlesCompleted: b, ftueDone: true })).toBe(false);
    expect(canOfferRewarded({ battlesCompleted: 3, ftueDone: true })).toBe(true);
    expect(FTUE_BATTLES).toBe(3);
  });

  it('T-G19e: no buy-gems upsell; short balance shows a disabled button with price and balance', () => {
    const html = reviveRowHtml({
      button: 'ad',
      gemState: 'disabled',
      price: 10,
      balance: 4,
      countdown: 10,
    });
    expect(html).toMatch(/data-a="reviveGems" disabled/);
    expect(html).toContain('Revive for 10 gems, unavailable, you have 4');
    expect(html).toContain('You have 4');
    for (const h of [
      html,
      reviveRowHtml({ button: 'ad', gemState: 'enabled', price: 10, balance: 40, countdown: 10 }),
      gemConfirmHtml(10, 40),
    ])
      expect(h).not.toMatch(/shop|store|buy|href|purchase/i);
  });

  it('T-G19f: no gem revive on an event final level (stub false until M7-3)', () => {
    expect(isEventFinalLevel('clover-run')).toBe(false);
    expect(new ReviveOffer(loaded(), gems(50, { eventFinalLevel: true })).gemState).toBe('hidden');
  });

  it('T-G19g: countdown pauses on confirm; three equal buttons, fixed order, no default', () => {
    const o = new ReviveOffer(loaded(), gems(10));
    o.openGemConfirm();
    expect(o.tick(20)).toBe(false);
    expect(o.open).toBe(true);
    const html = reviveRowHtml({
      button: 'ad',
      gemState: 'enabled',
      price: 10,
      balance: 10,
      countdown: 10,
    });
    const buttons = [...html.matchAll(/<button class="([^"]+)" data-a="(\w+)"/g)];
    expect(buttons.map((b) => b[2])).toEqual(['revive', 'reviveGems', 'noThanks']);
    expect(new Set(buttons.map((b) => b[1]))).toEqual(new Set(['btn']));
    expect(html).not.toMatch(/autofocus|primary|pulse|glow|recommended|tabindex/i);
    expect(gemConfirmHtml(10, 10)).not.toMatch(/autofocus|primary|pulse/i);
  });
});

describe('M2-21c save merge (048 follow-up)', () => {
  const save = (gems: number, revision: number, day: string, count: number) => ({
    ...defaultSave(),
    gems,
    revision,
    reviveGemDay: { day, count },
  });

  it('a gem spend on one device is not undone by merging a stale save', () => {
    // M4-5a: both saves share the opening grant; only one has the spend entry.
    const open = { id: 'g1', delta: 20, reason: 'stars:l1', at: 1 };
    const spent = {
      ...save(10, 5, '2026-10-11', 1),
      gemLedger: [open, { id: 's1', delta: -10, reason: 'revive', at: 2 }],
    };
    const stale = { ...save(20, 9, '2026-10-11', 0), gemLedger: [open] }; // newer revision, before the spend
    expect(mergeSaves(spent, stale).gems).toBe(10);
    expect(mergeSaves(stale, spent).gems).toBe(10);
  });

  it('daily counter: same day takes the max, regardless of which save is newer', () => {
    const a = save(0, 1, '2026-10-11', 3);
    const b = save(0, 7, '2026-10-11', 1);
    expect(mergeSaves(a, b).reviveGemDay).toEqual({ day: '2026-10-11', count: 3 });
    expect(mergeSaves(b, a).reviveGemDay).toEqual({ day: '2026-10-11', count: 3 });
  });

  it('daily counter: different days keep the later day', () => {
    expect(mergeGemDay({ day: '2026-10-10', count: 3 }, { day: '2026-10-11', count: 1 })).toEqual({
      day: '2026-10-11',
      count: 1,
    });
    expect(mergeGemDay({ day: '2026-10-11', count: 0 }, { day: '', count: 2 })).toEqual({
      day: '2026-10-11',
      count: 0,
    });
  });
});

describe('G4 across a revive (048 + PR 051)', () => {
  const ADS_ON = { lastInterstitialAt: 0, battlesCompleted: 20, noAds: false, ftueDone: true };
  const NOW_MS = 10 * 60 * 1000;

  it('gem revive (no ad shown) blocks the interstitial at the end of the revived battle', () => {
    const atLoss = new ResultSession();
    const atEnd = ResultSession.forBattleEnd(ResultSession.afterRevive(atLoss, 'gems'), true);
    expect(atEnd.rewardedShown).toBe(true);
    expect(canShowInterstitial(ADS_ON, NOW_MS, atEnd.rewardedShown)).toBe(false);
  });

  it('rewarded revive ad: the flag still carries to the battle end (PR 051)', () => {
    const atLoss = new ResultSession();
    atLoss.markRewardedShown();
    const atEnd = ResultSession.forBattleEnd(ResultSession.afterRevive(atLoss, 'ad'), true);
    expect(atEnd.rewardedShown).toBe(true);
    expect(atEnd.canOfferRevive).toBe(false);
  });

  it('free revive with no ad shown does not block the interstitial', () => {
    const atEnd = ResultSession.forBattleEnd(
      ResultSession.afterRevive(new ResultSession(), 'free'),
      true,
    );
    expect(atEnd.rewardedShown).toBe(false);
    expect(canShowInterstitial(ADS_ON, NOW_MS, atEnd.rewardedShown)).toBe(true);
  });
});
