# PR 051: fix/m2-14-m2-25-qa-g4-starter-skin

QA fail on main `36f9a21` for M2-14 and M2-25 (QA PR 050). Base: main `5f453c7`. Bug B (revive countdown vs G13) is left alone; it's waiting on a ruling.

## Bug A (G4): interstitial right after a revive rewarded ad

- Cause: `applyReviveStep` carried `rewardedShown` into a fresh `ResultSession`, but `endBattle` then replaced it with `new ResultSession()`. The win claim after the revived battle then allowed an interstitial.
- Fix: `ResultSession.forBattleEnd(prev, revivedThisBattle)`. A battle continued by a revive keeps `rewardedShown` and the revive-granted flag. A new battle starts clean, so a 2X ad from the previous battle doesn't block the next transition.
- Regression tests:
  - loss → revive ad → win: `canShowInterstitial` is false, and still no second revive.
  - new battle: clean.
- Overlap with open PRs: `git merge-tree` against 047 (`fix/m2-21-qa-followups`) and 048 (`feat/m2-21c-gem-revive`) shows no conflicts. 048's gem revive sets the rewarded flag on the post-revive session, and this fix carries it to the battle end, so G4 also holds for gem revives.

## Bug C: Starter Pack didn't grant the 'starter' bee skin

- `SkuInfo.grants.skin` added; `starter_pack` gets `skin: 'starter'`, matching `monetization/skus.json`.
- `applyPurchase(wallet, sku, sandbox)` adds the skin once to `save.skins` (new field: parsed defensively, union on merge). The skin is granted only for sandbox / test purchases: the game passes `platform.name === 'sandbox'`.
- Tests: the catalog matches `skus.json`; a sandbox purchase grants the skin once and it persists and survives a merge; a non-sandbox purchase and other SKUs grant no skin.
- Note for art: there's no `starter` entry in `src/art/skins.ts` yet, so this grants the entitlement only. It isn't rendered yet.

## Checks

lint ok · tests 229/229 · build ok · size budget: initial JS 2.29 KiB gzip, dist 901.90 KiB.
