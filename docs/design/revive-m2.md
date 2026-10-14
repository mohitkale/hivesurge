# Revive ad rules (M2-20)

Fixes PR 002 QA bug 1: closing the revive ad early burns the battle's only revive. Applies to rewarded placement `revive`. Checked against `monetization/guardrails.md` (G2, G4, G5, G8, G9, G10, G18) and `ad-placements.md` (revive: 1 per battle, hidden in FTUE).

## Decision

**A revive is consumed only when it is granted.** Closing the ad early gives no reward, and the revive is NOT used up. The player goes back to the revive offer with the countdown still running, and can tap Revive again or "No thanks".

## Revive offer state

- Shown on defeat when: not in FTUE (G2, first 3 battles), `revives === 0` this battle, **nest damage at least `revive.minNestDamage`** (remote config, **default 0.25**; was 0.5), rewarded caps not hit (G5: 12/session, 30/day, revive 10/day per ad-placements), and, for the gem option, not an event final level. The threshold applies to every loss type, including hive break and time-out.
- Why 25%: on Dandelion Drift, hive-break losses happen at 30 to 41% nest damage, so at 50% the offer almost never appeared on the losses where a revive helps most.
- The offer has a **10 s countdown** (ring around the button). When it reaches 0, the offer closes and the normal defeat screen remains (Retry / Home). The countdown pauses while an ad is on screen and resumes when the ad returns.
- Buttons: three, see "Gem revive (M2-21b)" below.

## Outcomes

| Ad result                                          | Reward                             | Revive consumed? | Back to                         | Counts toward caps         |
| -------------------------------------------------- | ---------------------------------- | ---------------- | ------------------------------- | -------------------------- |
| Completed (`showRewarded` resolves true)           | revive (existing `world.revive()`) | yes              | battle                          | yes                        |
| Closed early (resolves false after the ad started) | none (G10)                         | **no**           | revive offer, countdown resumes | yes (it was an impression) |
| Load error or timeout (no ad shown within 5 s)     | see below                          | no               | revive offer                    | no                         |
| No fill (adapter reports no ad available)          | see below                          | no               | revive offer                    | no                         |

**Retry limit (anti-exploit):** **2 early closes are allowed per offer**, and `adEnabled = closes < 2`.

- **First early close** (`closes` becomes 1): the player returns to the offer and the ad button is **still enabled**. That is one retry.
- **Second early close** (`closes` becomes 2): the ad button becomes disabled, labelled "Ad limit reached" (same size). The offer **stays open** only if the gem option is valid (affordable, within caps, not hidden). "No thanks" stays, and the remaining countdown keeps running. If the gem option is not valid, there is no option left, so the offer closes and the normal defeat screen shows.

Early closes never grant anything, so the limit only stops ad-spam loops and protects portal metrics.

**Worked example** (10 s countdown, 14 gems, price 10):

| Time | Action                                   | `closes` | Ad button                       | Gem button | Offer                 |
| ---- | ---------------------------------------- | -------- | ------------------------------- | ---------- | --------------------- |
| 0 s  | defeat, offer shown                      | 0        | enabled                         | enabled    | open, 10 s            |
| 2 s  | taps Revive (watch ad); countdown paused | 0        | (ad playing)                    |            | open, 8 s             |
| ad   | closes the ad early                      | 1        | **enabled** (retry)             | enabled    | open, 8 s resumes     |
| 4 s  | taps Revive again, closes early again    | 2        | **disabled** "Ad limit reached" | enabled    | open, 6 s             |
| 6 s  | taps gems, confirms                      | 2        | disabled                        |            | revive granted (gems) |

With 4 gems instead of 14, the offer closes right after the second early close (no valid option left).

**Code note:** PR 047 implements `adEnabled = closes < 2` with the offer kept open only when gems are valid. That is correct for this rule. (Older note: PR 030 closed the offer after 2 early closes; M2-21c changed that.)

## Ad unavailable (load failure or no fill)

- **Free revive once per session:** if the ad fails to load or has no fill, the button changes to "Revive (free)". The player gets the revive without an ad, at most **once per session** (`session.freeReviveUsed`). This is the player's fault-free fallback and keeps G8's spirit (the benefit is not gated by ad availability).
- Second ad failure in the same session: the ad button shows "Ad not available" (disabled, same size). If the gem option is valid (affordable, within caps, not hidden), the offer stays open with the countdown running. Otherwise the offer closes after 3 s.
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
- **Price: 5 gems flat** (MON-defined, `revive.gemPrice` in remote config, default 5 since CEO decision 36; was 10. Examples below still use 10). The label always shows the live config price. No escalation.
- Tapping the gem button opens a small confirm sheet: price, current balance and balance after, with two equal buttons, "Spend 10 gems" and "Back". The 10 s countdown pauses while the sheet is open. "Back" returns to the offer with the countdown resumed. The gem debit is atomic (`takeGems()`), and the revive is granted only after the debit commits.

### Not enough gems

- The gem button stays visible but is **disabled**, still showing the price (for example "Revive (10 gems)" greyed at 40% opacity with a lock icon), plus a caption under it: "You have 4". Screen readers get "Revive for 10 gems, unavailable, you have 4".
- **No buy-gems link, no shop redirect, no store pop-up** from the offer or from the defeat screen that follows (G13, G19). Tapping the disabled button does nothing (no tooltip that sells).

### Fit with the other rules

| Situation                                  | Ad button                                | Gem button                                                              | No thanks |
| ------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------- | --------- |
| Normal offer                               | shown                                    | shown (or disabled if balance < price)                                  | shown     |
| After 1 early ad close                     | shown (retry)                            | shown                                                                   | shown     |
| After 2 early ad closes                    | disabled, "Ad limit reached" (same size) | active if affordable and caps allow; if not, the offer closes           | shown     |
| Ad fails and free revive available         | becomes "Revive (free)"                  | **hidden** (nobody pays for a free option)                              | shown     |
| Ad fails, free revive used or not eligible | disabled, "Ad not available" (same size) | active if affordable and caps allow; if not, the offer closes after 3 s | shown     |
| Gem caps hit (2/session or 3/day)          | shown                                    | hidden                                                                  | shown     |
| Event final level (`isEventFinalLevel`)    | shown                                    | **hidden** (no pay-to-finish pressure)                                  | shown     |
| FTUE (first 3 battles)                     | no offer at all                          | no offer                                                                | n/a       |

- **One revive per battle total** across ad, free and gems (`world.revive()` refuses when `revives > 0`). A granted gem revive closes the offer.
- A gem revive blocks the interstitial on this transition (treated like `markRewardedShown`, G4).
- **Event final level flag:** `isEventFinalLevel` is now owned by **M7-3** (levels carry the flag). Until M7-3 lands there are no live events, so the check is always false. M2-21c reads it through a stub that defaults to false.

## Anti-exploit rules

1. The grant comes only from the platform result (`true`) or the session's single free-revive slot, never from UI state. `world.revive()` already refuses when `revives > 0`.
2. State lives in the PR 030 classes in `src/platform/revive.ts`: the early-close counter is `ReviveOffer.closes` (one `ReviveOffer` per defeat, so it resets every offer), and the free-revive flags `freeReviveUsed` and `adsEverLoadedThisSession` are on `ReviveSession` (one per app session). `ResultSession` only tracks `markRewardedShown()` and `markReviveGranted()`. None of this is stored in the save, so reloading cannot farm it. A reload during the offer ends the battle as a loss.
3. Any rewarded ad shown (completed or not) still blocks an interstitial on this transition (G4, existing `markRewardedShown`).
4. `gameplayStop()` before the ad, `gameplayStart()` only after a granted revive (G18).
5. Change for ENG: `markReviveGranted()` is called only on grant. An early close increments `ReviveOffer.closes`. Button and offer state:
   - `adEnabled = closes < 2 && adAvailable && button === 'ad'`
   - `freeShown = button === 'free'` (ad failed, `adsEverLoadedThisSession && !freeReviveUsed`; gems hidden while shown, PR 031 rule)
   - `gemsEnabled = !freeShown && balance >= price && gemCapsOk && !isEventFinalLevel`
   - `adUnavailableNoticeActive` = true for at most 3 s (`UNAVAILABLE_MS`) after a failed ad when no free revive is available
   - `offerOpen = !granted && !closed && countdown > 0 && (adEnabled || gemsEnabled || freeShown || adUnavailableNoticeActive)`
   - During the 3 s notice the offer is open but nothing may be enabled (ad disabled "Ad not available", gems disabled or hidden). If `gemsEnabled` is true the offer stays open after the notice ends. Otherwise it closes when the notice ends. The countdown keeps running during the notice.

## Analytics

| Event                | When                                                    | Props                                                                                                      |
| -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `ad_offered`         | offer shown (existing)                                  | placement: revive, nestDamage, levelId                                                                     |
| `ad_requested`       | Revive tapped                                           | placement, attempt (1 to 3)                                                                                |
| `ad_watched`         | ad resolved (existing)                                  | placement, completed true/false, msWatched                                                                 |
| `ad_failed`          | load error, timeout, no fill                            | placement, reason: error, timeout or no_fill                                                               |
| `revive_granted`     | revive applied                                          | source: ad, free or gems; attempt; price (gems only)                                                       |
| `revive_declined`    | "No thanks", countdown ran out, or no valid option left | reason: button, timeout or no_option; closesBefore, gemBalance, gemButtonState (enabled, disabled, hidden) |
| `gems_spent`         | gem revive debit committed                              | sink: revive, amount, balanceAfter                                                                         |
| `revive_gem_confirm` | confirm sheet opened or backed out                      | action: open or back, balance                                                                              |

Funnel in admin (M6-1): offered, requested, completed, granted, by level.

## Test cases (for M2-21)

1. Close early once: the offer returns with the countdown resumed, the ad button **still enabled**, `closes === 1`, `revives === 0`, and no reward.
2. Close early twice with enough gems (caps allow): the offer stays open, the ad button is disabled with "Ad limit reached" (same size), the gem button is active, "No thanks" is shown, and the countdown keeps running from where it was. Close early twice with too few gems (or gem caps hit, or gem hidden): the offer closes and the defeat screen shows.
3. Close early, then complete, then the revive is granted once. A second offer never appears.
4. After at least one ad has loaded this session, no fill gives a free revive. A second no fill in the same session shows "Ad not available" (disabled). The offer stays open only if the gem option is valid, and otherwise closes after 3 s.
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

## Offer frequency at the 25% threshold (bot check)

Casual bot, 200 seeds per stage, levels as on `main` @ `9b969f9` (before PR 044's retune). "Offer" = loss with nest damage at or above the threshold (other eligibility rules ignored).

| Stage | Level            | Losses | Hive-break losses | Offer at 50% | Offer at 25% |
| ----- | ---------------- | ------ | ----------------- | ------------ | ------------ |
| 2     | dandelion-drift  | 1      | 1                 | 1            | 1            |
| 3     | clover-run       | 48     | 1                 | 48           | 48           |
| 4     | thistle-gauntlet | 172    | 85                | 150 (87%)    | 167 (97%)    |
| 5     | wasp-queen-nest  | 200    | 0                 | 5 (2.5%)     | 200 (100%)   |

The casual bot rarely loses on Dandelion, so this sample cannot show the 30 to 41% hive-break case from playtests. The boss gains the most: time-out losses there end around 40 to 45% nest damage. Rerun after PR 044 lands.
