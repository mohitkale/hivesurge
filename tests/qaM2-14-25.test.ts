import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canShowInterstitial } from '../src/platform/adPolicy';
import { applyPurchase } from '../src/platform/entitlements';
import { CATALOG, type Sku } from '../src/platform/platform';
import { ResultSession } from '../src/platform/resultSession';
import { defaultSave, mergeSaves, parseSave } from '../src/platform/save';

const ADS_ON = { lastInterstitialAt: 0, battlesCompleted: 20, noAds: false, ftueDone: true };
const NOW = 10 * 60 * 1000;

describe('QA M2-14 bug A (G4): no interstitial right after a revive rewarded ad', () => {
  it('loss -> revive ad -> battle continues -> win: the win claim shows no interstitial', () => {
    // Revive granted (game.ts applyReviveStep): fresh session carrying the rewarded flag.
    const atRevive = new ResultSession();
    atRevive.markRewardedShown();
    atRevive.markReviveGranted();
    // The revived battle ends (endBattle): previously `new ResultSession()` dropped the flag.
    const atWin = ResultSession.forBattleEnd(atRevive, true);
    expect(atWin.rewardedShown).toBe(true);
    expect(canShowInterstitial(ADS_ON, NOW, atWin.rewardedShown)).toBe(false);
    expect(atWin.canOfferRevive).toBe(false); // still one revive per battle
  });

  it('a new battle starts clean: a rewarded ad from the previous battle does not carry over', () => {
    const prev = new ResultSession();
    prev.markRewardedShown();
    prev.tryClaim();
    const next = ResultSession.forBattleEnd(prev, false);
    expect(next.rewardedShown).toBe(false);
    expect(next.isClaimed).toBe(false);
    expect(canShowInterstitial(ADS_ON, NOW, next.rewardedShown)).toBe(true);
  });
});

describe('QA M2-25 bug C: Starter Pack grants the starter bee skin', () => {
  it('catalog has the skin field and matches monetization/skus.json', () => {
    const skus = JSON.parse(
      readFileSync(
        new URL('../monetization/skus.json', import.meta.url) as unknown as string,
        'utf8',
      ) as unknown as string,
    ) as
      | { skus?: { id: string; grants: { skin?: string } }[] }
      | { id: string; grants: { skin?: string } }[];
    const list = Array.isArray(skus) ? skus : (skus.skus ?? []);
    for (const s of list)
      if (s.id in CATALOG) expect(CATALOG[s.id as Sku].grants.skin).toBe(s.grants.skin);
    expect(CATALOG.starter_pack.grants.skin).toBe('starter');
  });

  it('sandbox purchase grants the skin once, persists, and survives a merge', () => {
    const save = defaultSave();
    applyPurchase(save, 'starter_pack');
    applyPurchase(save, 'starter_pack');
    expect(save.skins).toEqual(['starter']);
    expect(save.coins).toBe(1000);
    const back = parseSave(JSON.stringify(save));
    expect(back.skins).toEqual(['starter']);
    expect(mergeSaves(back, defaultSave()).skins).toEqual(['starter']);
  });

  it('non-sandbox purchase does not grant the skin yet; other SKUs grant none', () => {
    const real = defaultSave();
    applyPurchase(real, 'starter_pack', false);
    expect(real.skins).toEqual([]);
    const g = defaultSave();
    applyPurchase(g, 'gems_small');
    applyPurchase(g, 'no_ads');
    expect(g.skins).toEqual([]);
  });
});
