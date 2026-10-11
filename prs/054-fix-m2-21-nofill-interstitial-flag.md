# PR 054: fix/m2-21-nofill-interstitial-flag

QA bug on PR 047 (screenshots in /tmp/qa-pr047/). With `?ads=nofill`, a no-fill interstitial on a Home transition set `ReviveSession.adsEverLoadedThisSession`, so a later revive offered and granted a free revive. Base: main `422c10d`.

## Cause

`claim()` called `reviveSession.noteAdLoaded()` after every `showInterstitial()`. The mock returned nothing on no fill or error, so the game couldn't tell whether an ad had shown.

## Fix

- `Platform.showInterstitial` now resolves `boolean`: true only if an ad loaded and showed. MockPlatform returns false for `noFill` and `error`.
- `ReviveSession.noteInterstitial(shown)` sets the flag only when `shown` is true. Rewarded ads already set it only for `completed` or `closed`.
- `ad_watched` is tracked only for a shown interstitial. A no-fill now tracks `ad_failed {placement: level_transition, reason: no_fill}`.
- Unchanged, flagged for review: the interstitial gap and caps are still recorded before the ad is requested. That's existing behaviour.

## Tests

`tests/nofillInterstitial.test.ts`:

- `noFill` and `error` interstitials resolve false and show nothing.
- Repro: nofill interstitial, then a revive gets no free revive ("Ad not available").
- A shown interstitial still sets the flag.

## 048

048 (gem revive) uses the same flag through `ReviveOffer` but doesn't touch the interstitial path. It picks this fix up when it's rebased onto main after merge.

## Checks

lint ok · tests 237/237 · build ok · size budget: initial JS 2.29 KiB gzip, dist 902.97 KiB.
