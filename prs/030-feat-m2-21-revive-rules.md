# PR 030 — feat/m2-21-revive-rules (M2-21; base: fix/m2-18-clover-run-ease, PR 029)

**Summary:** Implements `docs/design/revive-m2.md` (M2-20, `e35bd48`). A revive is consumed only when it is granted,
and closing the ad early returns the player to the offer. This fixes PR 002 QA bug 1. It **replaces** the REVIEW-002
nit "revive at most once per battle, even if closed early".

**Changes**

- `src/platform/revive.ts` (pure):
  - `ReviveSession`: per app session, never saved. Holds `freeReviveUsed` and `adsEverLoadedThisSession`.
  - `shouldOfferRevive`:
    - not during FTUE (G2, via `canOfferRewarded`)
    - rewarded caps OK (G5)
    - `revives === 0`
    - nest damage at least 50%
  - `ReviveOffer` (one per defeat):
    - 10 s countdown that pauses while an ad is on screen
    - early-close counter, with the offer closing after 2 closes
    - **no fill or error:** "Revive (free)" once per session, only if an ad has loaded earlier in this session.
      Otherwise "Ad not available" for 3 s, then the offer closes.
- `Platform.requestRewarded()` returns `completed | closed | no_fill | error`. `showRewarded()` remains a boolean
  wrapper.
- `MockPlatform` has ad modes `normal | noFill | error`, set with `setAdMode()` or `?ads=nofill|error`.
  - `noFill` resolves at once.
  - `error` resolves after the 5 s load timeout.
  - In both modes nothing is shown and interstitials are skipped.
- `ResultSession`: `markReviveAttempted()` is replaced by `markReviveGranted()`, which is called only on a grant.
  `canOfferRevive = !revived && !claimed`.
- `src/game.ts`, defeat screen:
  - "Revive (watch ad) · N", "Revive (free) · N", or a disabled "Ad not available", next to an equal-size
    "No thanks" button (G9).
  - Retry and Home are unchanged.
  - The countdown ticks on screen.
- `src/game.ts`, ad handling:
  - `gameplayStop()` runs before the ad. `gameplayStart()` runs only after a granted revive (G18).
  - `world.revive()` is still the final guard.
  - Only real impressions (`completed`/`closed`) count toward caps and set `rewardedShown`, so the interstitial is still
    blocked after any revive ad (G4). No fill and error do not count.
  - After a granted revive, the next result keeps the "rewarded ad shown" block.
- Analytics: added `ad_requested {attempt}`, `ad_failed {reason}`, `revive_granted {source, attempt}` and
  `revive_declined {reason: button|timeout, closesBefore}`. `ad_offered` now also carries `nestDamage` and `levelId`.

**Tests:** `tests/revive.test.ts` covers the spec's 7 cases, plus an ad-blocker case, a countdown-expiry case and a
nothing-saved case.

1. Close early: back to the offer, the countdown paused during the ad and then resumed, `revives === 0`, no reward.
2. Close early twice: the offer is gone and no third ad.
3. Close early, then complete: one grant (`attempt: 2`) and no second offer.
4. No fill: a free revive. The next failure in the same session shows "Ad not available". There is no free revive
   when no ad ever loaded.
5. Interstitial blocked after a closed or completed revive ad. No fill is not an impression.
6. No offer during FTUE (battles 0–2, or `ftueDone` false).
7. Mock `noFill` / `error` modes (fake timers for the 5 s timeout) and the URL switch.

`tests/resultSession.test.ts`: the old "early close burns the revive" test is replaced by "only a grant uses it up".

**Test results:** lint pass · `npm test` 143/143 · build pass. The game chunk is 61.45 kB (20.59 kB gzip), up from
56.80. Initial JS is 2.25 KiB gzip and within budget.

**Not verified in a browser:** My headless bot could not lose with at least 50% nest damage (it won every attempt), so
the offer UI was not reached end to end. Manual QA can check it with `?ads=nofill` / `?ads=error` and a real loss.

**Reviewer:** hivesurge-review

**Status:** awaiting review
