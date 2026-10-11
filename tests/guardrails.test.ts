import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  AD_FREE_BATTLES,
  canOfferRewarded,
  canShowInterstitial,
  FTUE_BATTLES,
  INTERSTITIAL_MIN_GAP_MS,
} from '../src/platform/adPolicy';
import { AD_CAPS, AdPacer } from '../src/platform/adPacer';
import { applyPurchase } from '../src/platform/entitlements';
import { canShowPopupOffer, isAllowedOfferTimer } from '../src/platform/offers';
import { CATALOG, type Sku } from '../src/platform/platform';
import { emptyAdDay } from '../src/platform/save';
import { findLiveKeys } from '../scripts/live-key-guard.mjs';

const later = INTERSTITIAL_MIN_GAP_MS * 10;
const base = { lastInterstitialAt: 0, noAds: false };

describe('T-G1 no forced ads in FTUE', () => {
  it('AD_FREE_BATTLES is 5', () => expect(AD_FREE_BATTLES).toBe(5));
  it('no interstitial before 5 battles even with FTUE done', () => {
    for (let b = 0; b < 5; b++)
      expect(
        canShowInterstitial({ ...base, battlesCompleted: b, ftueDone: true }, later, false),
      ).toBe(false);
  });
  it('no interstitial while tutorial incomplete, however many battles', () => {
    expect(
      canShowInterstitial({ ...base, battlesCompleted: 50, ftueDone: false }, later, false),
    ).toBe(false);
  });
  it('allowed after 5 battles and tutorial complete', () => {
    expect(
      canShowInterstitial({ ...base, battlesCompleted: 5, ftueDone: true }, later, false),
    ).toBe(true);
  });
});

describe('T-G2 no rewarded offers in FTUE', () => {
  it('none during the first 3 battles or before the tutorial is done', () => {
    expect(FTUE_BATTLES).toBe(3);
    for (let b = 0; b < 3; b++)
      expect(canOfferRewarded({ battlesCompleted: b, ftueDone: true })).toBe(false);
    expect(canOfferRewarded({ battlesCompleted: 10, ftueDone: false })).toBe(false);
    expect(canOfferRewarded({ battlesCompleted: 3, ftueDone: true })).toBe(true);
  });
});

describe('T-G5 AdPacer session and day caps (mock clock)', () => {
  const day1 = new Date(2026, 9, 11, 10).getTime();
  const day2 = new Date(2026, 9, 12, 10).getTime();

  it('caps rewarded at 12 per session', () => {
    let t = day1;
    const p = new AdPacer(emptyAdDay(), () => t, {
      ...AD_CAPS,
      placements: {}, // isolate the global session cap
    });
    for (let i = 0; i < 12; i++) {
      expect(p.canRewarded('x')).toBe(true);
      p.recordRewarded('x');
      t += 1000;
    }
    expect(p.canRewarded('x')).toBe(false);
  });

  it('caps rewarded at 30 per day across sessions, and resets the next day', () => {
    let t = day1;
    const day = emptyAdDay();
    const caps = { ...AD_CAPS, placements: {} };
    for (let s = 0; s < 3; s++) {
      const p = new AdPacer(day, () => t, caps); // new session, persisted day counters
      for (let i = 0; i < 10; i++) p.recordRewarded('x');
    }
    expect(new AdPacer(day, () => t, caps).canRewarded('x')).toBe(false);
    t = day2;
    expect(new AdPacer(day, () => t, caps).canRewarded('x')).toBe(true);
  });

  it('applies per-placement caps (revive 3/session)', () => {
    const p = new AdPacer(emptyAdDay(), () => day1);
    for (let i = 0; i < 3; i++) p.recordRewarded('revive');
    expect(p.canRewarded('revive')).toBe(false);
    expect(p.canRewarded('win_double')).toBe(true);
  });

  it('caps interstitials at 4 per session', () => {
    const p = new AdPacer(emptyAdDay(), () => day1);
    for (let i = 0; i < 4; i++) {
      expect(p.canInterstitial()).toBe(true);
      p.recordInterstitial();
    }
    expect(p.canInterstitial()).toBe(false);
  });
});

describe('T-G6 any purchase grants noAds', () => {
  for (const sku of Object.keys(CATALOG) as Sku[]) {
    it(`${sku} catalog entry and entitlement set noAds`, () => {
      expect(CATALOG[sku].grants.noAds).toBe(true);
      const w = { coins: 0, gems: 0, noAds: false, skins: [] as string[] };
      applyPurchase(w, sku);
      expect(w.noAds).toBe(true);
    });
  }
  it('gems_small still grants its gems', () => {
    const w = { coins: 0, gems: 0, noAds: false, skins: [] as string[] };
    applyPurchase(w, 'gems_small');
    expect(w.gems).toBe(120);
  });
});

describe('T-G13 offer scheduler', () => {
  it('max one pop-up offer per session', () => {
    expect(canShowPopupOffer({ popupsShownThisSession: 0, ftueDone: true, screen: 'title' })).toBe(
      true,
    );
    expect(canShowPopupOffer({ popupsShownThisSession: 1, ftueDone: true, screen: 'title' })).toBe(
      false,
    );
  });
  it('never on a defeat screen within FTUE', () => {
    expect(
      canShowPopupOffer({ popupsShownThisSession: 0, ftueDone: false, screen: 'defeat' }),
    ).toBe(false);
  });
  it('no countdown timers under 24 h', () => {
    expect(isAllowedOfferTimer(60 * 60 * 1000)).toBe(false);
    expect(isAllowedOfferTimer(24 * 60 * 60 * 1000)).toBe(true);
    expect(isAllowedOfferTimer(null)).toBe(true);
  });
});

describe('T-G17 build refuses live keys', () => {
  const guard = fileURLToPath(new URL('../scripts/live-key-guard.mjs', import.meta.url));
  // Built at runtime so this test file itself never contains a key-shaped literal.
  const fake = (prefix: string) => `${prefix}${'A1b2C3d4'.repeat(3)}`;

  function project(content: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'hs-keys-'));
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src/config.ts'), content);
    return dir;
  }

  for (const prefix of ['sk_' + 'live_', 'pk_' + 'live_', 'rcb_']) {
    it(`fails on ${prefix}…`, () => {
      const dir = project(`export const KEY = '${fake(prefix)}';`);
      expect(findLiveKeys([join(dir, 'src')]).length).toBe(1);
      expect(spawnSync(process.execPath, [guard, dir]).status).toBe(1);
    });
  }

  it('fails on a live key in .env.local', () => {
    const dir = project('export {}');
    writeFileSync(join(dir, '.env.local'), `VITE_STRIPE_PK=${fake('pk_' + 'live_')}`);
    expect(spawnSync(process.execPath, [guard, dir]).status).toBe(1);
  });

  it('passes with test/sandbox keys', () => {
    const dir = project(
      `export const A = '${fake('pk_test_')}'; export const B = '${fake('rcb_sb_')}';`,
    );
    expect(spawnSync(process.execPath, [guard, dir]).status).toBe(0);
  });
});
