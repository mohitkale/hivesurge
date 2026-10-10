# Revive ad rules (M2-20)

Fixes PR 002 QA bug 1: closing the revive ad early burns the battle's only revive. Applies to rewarded placement `revive`. Checked against `monetization/guardrails.md` (G2, G4, G5, G8, G9, G10, G18) and `ad-placements.md` (revive: 1 per battle, hidden in FTUE).

## Decision

**A revive is consumed only when it is granted.** Closing the ad early gives no reward, and the revive is NOT used up. The player goes back to the revive offer with the countdown still running, and can tap Revive again or "No thanks".

## Revive offer state

- Shown on defeat when: not in FTUE (G2, first 3 battles), `revives === 0` this battle, nest damage at least 50% (current rule), and rewarded caps not hit (G5: 12/session, 30/day, revive 10/day per ad-placements).
- The offer has a **10 s countdown** (ring around the button). When it reaches 0, the offer closes and the normal defeat screen remains (Retry / Home). The countdown pauses while an ad is on screen and resumes when the ad returns.
- Buttons: "Revive (watch ad)" and "No thanks", same size and style (G9).

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
