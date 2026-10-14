import { describe, expect, it } from 'vitest';
import { debugParamsFromUrl, NO_DEBUG, seedSaveForBattle } from '../src/debug/debugParams';
import { nextLevelIndex } from '../src/levels/progress';
import { AdPacer } from '../src/platform/adPacer';
import { canOfferRewarded, shouldShowInterstitialOnClaim } from '../src/platform/adPolicy';
import { ResultSession } from '../src/platform/resultSession';
import { ReviveOffer, ReviveSession, shouldOfferRevive } from '../src/platform/revive';
import { defaultSave, type SaveData } from '../src/platform/save';
import { LEVELS } from '../src/sim/levels';
import { computeRewards } from '../src/sim/rewards';
import { World } from '../src/sim/world';

const IDS = LEVELS.map((l) => l.id);
const NOW = Date.UTC(2026, 9, 14, 12);
const IDLE = { aimX: 0, firing: false, queen: false };

describe('QA M2-19a: dev-only ?battle=N jump', () => {
  it('parses ?debug&battle=N in dev only, rejecting junk', () => {
    expect(debugParamsFromUrl('?debug&battle=6', true, IDS).battle).toBe(6);
    expect(debugParamsFromUrl('?debug&battle=6', false, IDS)).toEqual(NO_DEBUG);
    for (const b of ['0', '-3', '6.5', 'six', '', '1000'])
      expect(debugParamsFromUrl(`?battle=${b}`, true, IDS).battle, b).toBeNull();
  });

  it('seeds the save so the next battle is battle N, never lowering progress', () => {
    const s = defaultSave();
    seedSaveForBattle(s, 6, IDS);
    expect(s.ftueDone).toBe(true);
    expect(s.battlesCompleted).toBe(5);
    expect(nextLevelIndex(LEVELS, s.bestStars)).toBe(LEVELS.length - 1); // campaign done: replay last
    const ahead = { ...defaultSave(), battlesCompleted: 40, ftueDone: true };
    ahead.bestStars[IDS[0]] = 3;
    seedSaveForBattle(ahead, 6, IDS);
    expect(ahead.battlesCompleted).toBe(40);
    expect(ahead.bestStars[IDS[0]]).toBe(3);
    const fresh = defaultSave();
    seedSaveForBattle(fresh, 1, IDS);
    expect(fresh).toEqual(defaultSave());
  });
});

/** Mirrors game.ts: endBattle -> showLoss -> requestRevive -> applyReviveStep -> endBattle -> claim. */
function playBattle(save: SaveData, pacer: AdPacer, revive: boolean): boolean {
  const w = new World(LEVELS[nextLevelIndex(LEVELS, save.bestStars)]);
  let result = new ResultSession();
  if (revive) {
    // A close call: most of the nest broken, then the hive falls.
    w.nestHp = Math.ceil(w.level.nestHp * 0.1);
    w.hiveHp = 0;
    w.step(IDLE);
    expect(w.outcome).toBe('lost');
    result = ResultSession.forBattleEnd(result, w.revives > 0);
    const r = computeRewards({
      outcome: w.outcome,
      nestHp: w.nestHp,
      nestMax: w.level.nestHp,
      hiveHp: w.hiveHp,
      hiveMax: w.level.hiveHp,
      timeLeft: w.timeLeft,
    });
    const offered = shouldOfferRevive({
      rewardedAllowed: canOfferRewarded(save),
      capsOk: pacer.canRewarded('revive'),
      revives: w.revives,
      nestDamage: r.nestDamage,
    });
    expect(offered && result.canOfferRevive).toBe(true);
    const offer = new ReviveOffer(new ReviveSession());
    expect(offer.request()).toBe(1);
    // watchRewarded('revive') with a completed rewarded ad.
    result.markRewardedShown();
    pacer.recordRewarded('revive');
    const step = offer.onAdResult('completed');
    expect(step).toMatchObject({ kind: 'grant', source: 'ad' });
    expect(w.revive()).toBe(true);
    result.markReviveGranted();
    result = ResultSession.afterRevive(result, 'ad');
  }
  // The (revived) battle is won.
  w.nestHp = 0;
  w.step(IDLE);
  expect(w.outcome).toBe('won');
  result = ResultSession.forBattleEnd(result, w.revives > 0);
  expect(result.tryClaim()).toBe(true);
  const rewardedShown = result.rewardedShown;
  save.battlesCompleted++;
  // Win "Collect" goes Home: a level transition (replay = false).
  return shouldShowInterstitialOnClaim(save, NOW, rewardedShown, false, pacer);
}

describe('QA M2-19a / G4: revive with a rewarded ad, then no interstitial on the win claim', () => {
  const atBattle = (n: number) => {
    const save = defaultSave();
    seedSaveForBattle(save, debugParamsFromUrl(`?debug&battle=${n}`, true, IDS).battle!, IDS);
    return { save, pacer: new AdPacer(save.adDay, () => NOW) };
  };

  for (const n of [6, 9])
    it(`battle ${n}: interstitials are eligible, but not after the revive ad`, () => {
      const { save, pacer } = atBattle(n);
      expect(save.battlesCompleted).toBe(n - 1);
      expect(playBattle(save, pacer, true)).toBe(false);
      // Control: the next battle, won without a revive, does get the interstitial.
      expect(playBattle(save, pacer, false)).toBe(true);
    });

  it('control: at battle 3 (G1) no interstitial even without a revive', () => {
    const { save, pacer } = atBattle(3);
    expect(playBattle(save, pacer, false)).toBe(false);
  });
});
