# Revive ad rules (M2-20)

Fixes PR 002 QA bug 1: closing the revive ad early burns the battle's only revive. Applies to rewarded placement `revive`. Checked against `monetization/guardrails.md` (G2, G4, G5, G8, G9, G10, G18) and `ad-placements.md` (revive: 1 per battle, hidden in FTUE).

## Decision

**A revive is consumed only when it is granted.** Closing the ad early gives no reward, and the revive is NOT used up. The player goes back to the revive offer with the countdown still running, and can tap Revive again or "No thanks".

## Revive offer state

- Shown on defeat when: not in FTUE (G2, first 3 battles), `revives === 0` this battle, nest damage at least 50% (current rule), and rewarded caps not hit (G5: 12/session, 30/day, revive 10/day per ad-placements).
- The offer has a **10 s countdown** (ring around the button). When it reaches 0, the offer closes and the normal defeat screen remains (Retry / Home). The countdown pauses while an ad is on screen and resumes when the ad returns.
- Buttons: three, see "Gem revive (M2-21b)" below.

## Outcomes

| Ad result                                          | Reward                             | Revive consumed? | Back to                         | Counts toward caps         |
| -------------------------------------------------- | ---------------------------------- | ---------------- | ------------------------------- | -------------------------- |
| Completed (`showRewarded` resolves true)           | revive (existing `world.revive()`) | yes              | battle                          | yes                        |
| Closed early (resolves false after the ad started) | none (G10)                         | **no**           | revive offer, countdown resumes | yes (it was an impression) |
| Load error or timeout (no ad shown within 5 s)     | see below                          | no               | revive offer                    | no                         |
| No fill (adapter reports no ad available)          | see below                          | no               | revive offer                    | no                         |

**Retry limit (anti-exploit):** at most **2 early closes per offer**. After the second early close, the Revive button is replaced by "No thanks" plus the normal defeat screen. Early closes never grant anything, so the limit only stops ad-spam loops and protects portal metrics.

## Ad unavailable (load failure or no fill)

- **Free revive once per session:** if the ad fails to load or has no fill, the button changes to "Revive (free)". The player gets the revive without an ad, at most **once per session** (`session.freeReviveUsed`). This is the player's fault-free fallback and keeps G8's spirit (the benefit is not gated by ad availability).
- Second ad failure in the same session: the button shows "Ad not available" (disabled) for 3 s, then the offer closes normally.
- **Eligibility:** the free revive is granted only if at least one ad has loaded successfully this session (flag `adsEverLoadedThisSession`). There is no offline check. Reason: ad-blocked players look online to the game, so an offline check would let them get a free revive every session. Accepted edge case: an online player whose first ad of the session fails gets no free revive and sees the normal defeat screen.
- The free revive does not count toward rewarded caps and is not an ad impression.

## Gem revive (M2-21b)

Pricing, caps and guardrails come from MON (`monetization/revive-m2-21a.md`, `monetization/revive-gem.json`, guardrail G19). This section covers the layout and how it fits the rules above.

### Layout

```
+------------------------------------------+
|        Revive the hive?   (10 s ring)    |
| [ Watch ad ] [ Revive 10 gems ] [No thanks] |
+------------------------------------------+
```

- Three buttons in one row (stacked on viewports under 340 px): **"Revive (watch ad)"**, **"Revive (10 gems)"** with the gem icon, **"No thanks"**.
- All the same size, shape, font and contrast (G9). There is **no default or pre-highlighted choice**: no focus ring on open, no glow, pulse or "recommended" tag, and no button pre-selected for Enter or Space. Keyboard focus starts on the panel title. Order is fixed (ad, gems, no thanks) and is never shuffled.
- **Price: 10 gems flat** (MON-defined, `revive.gemPrice` in remote config, default 10). The label always shows the live config price. No escalation.
- Tapping the gem button opens a small confirm sheet: price, current balance and balance after, with two equal buttons, "Spend 10 gems" and "Back". The 10 s countdown pauses while the sheet is open. "Back" returns to the offer with the countdown resumed. The gem debit is atomic (`takeGems()`), and the revive is granted only after the debit commits.

### Not enough gems

- The gem button stays visible but is **disabled**, still showing the price (for example "Revive (10 gems)" greyed at 40% opacity with a lock icon), plus a caption under it: "You have 4". Screen readers get "Revive for 10 gems, unavailable, you have 4".
- **No buy-gems link, no shop redirect, no store pop-up** from the offer or from the defeat screen that follows (G13, G19). Tapping the disabled button does nothing (no tooltip that sells).

### Fit with the other rules

| Situation                                  | Ad button                                | Gem button                                                  | No thanks |
| ------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------- | --------- |
| Normal offer                               | shown                                    | shown (or disabled if balance < price)                      | shown     |
| After 1 early ad close                     | shown (retry)                            | shown                                                       | shown     |
| After 2 early ad closes                    | removed                                  | **shown** (gem path still allowed while the countdown runs) | shown     |
| Ad fails and free revive available         | becomes "Revive (free)"                  | **hidden** (nobody pays for a free option)                  | shown     |
| Ad fails, free revive used or not eligible | "Ad not available" for 3 s, then removed | shown                                                       | shown     |
| Gem caps hit (2/session or 3/day)          | shown                                    | hidden                                                      | shown     |
| Event final level (`isEventFinalLevel`)    | shown                                    | **hidden** (no pay-to-finish pressure)                      | shown     |
| FTUE (first 3 battles)                     | no offer at all                          | no offer                                                    | n/a       |

- **One revive per battle total** across ad, free and gems (`world.revive()` refuses when `revives > 0`). A granted gem revive closes the offer.
- A gem revive blocks the interstitial on this transition (treated like `markRewardedShown`, G4).
- **Event final level flag:** `isEventFinalLevel` is now owned by **M7-3** (levels carry the flag). Until M7-3 lands there are no live events, so the check is always false. M2-21c reads it through a stub that defaults to false.

## Anti-exploit rules

1. The grant comes only from the platform result (`true`) or the session's single free-revive slot, never from UI state. `world.revive()` already refuses when `revives > 0`.
2. The early-close counter and the free-revive flag live in the result session (`ResultSession`), which is reset per battle (early-close counter) and per app session (free revive). They are not stored in the save, so reloading cannot farm them. A reload during the offer ends the battle as a loss.
3. Any rewarded ad shown (completed or not) still blocks an interstitial on this transition (G4, existing `markRewardedShown`).
4. `gameplayStop()` before the ad, `gameplayStart()` only after a granted revive (G18).
5. Change for ENG: `markReviveAttempted()` should be called only on grant, and early close should increment `reviveCloses`. `canOfferRevive = !revived && reviveCloses < 2 && !claimed && countdown > 0`.

## Analytics

| Event             | When                             | Props                                        |
| ----------------- | -------------------------------- | -------------------------------------------- |
| `ad_offered`      | offer shown (existing)           | placement: revive, nestDamage, levelId       |
| `ad_requested`    | Revive tapped                    | placement, attempt (1 to 3)                  |
| `ad_watched`      | ad resolved (existing)           | placement, completed true/false, msWatched   |
| `ad_failed`       | load error, timeout, no fill     | placement, reason: error, timeout or no_fill |
| `revive_granted`  | revive applied                   | source: ad or free, attempt                  |
| `revive_declined` | "No thanks" or countdown ran out | reason: button or timeout, closesBefore      |

Funnel in admin (M6-1): offered, requested, completed, granted, by level.

## Test cases (for M2-21)

1. Close early, then the offer returns with the countdown resumed, `revives === 0`, no reward.
2. Close early twice, then the offer is gone and the defeat screen shows.
3. Close early, then complete, then the revive is granted once. A second offer never appears.
4. After at least one ad has loaded this session, no fill gives a free revive. A second no fill in the same session shows "Ad not available".
5. No ad has loaded yet this session (for example, an ad blocker or the first ad fails), then the ad fails: no free revive, normal defeat screen. This holds whether or not the device is online.
6. Interstitial is blocked after any revive ad on that transition.
7. In FTUE (first 3 battles) no revive offer appears.
8. Mock adapter: add `noFill` and `error` modes to `MockPlatform.showRewarded` to test these cases.
9. Gem revive: enough gems, confirm, then debit 10, revive granted, `revive_granted{source:'gems'}`. A second offer never appears.
10. Not enough gems: button disabled, shows price and balance, tap does nothing, no store navigation is ever triggered.
11. Free revive shown: gem button hidden. After the free revive is used and the ad still fails: gem button shown.
12. Confirm sheet open pauses the countdown; "Back" resumes it.
13. Gem caps: third gem revive in a session, or fourth in a day, means the gem button is hidden.
14. `isEventFinalLevel = true` hides the gem button (stub false until M7-3).
15. No button has focus, highlight or animation on open (snapshot test).
