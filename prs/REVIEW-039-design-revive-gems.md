# Review: PR 039 design/revive-gems @ cc600b4 (2026-10-11)

**Verdict: changes requested, not merged.** Docs only (`revive-m2.md` and the PR doc). Lint passes.

**Matches merged PR 037 and G19:**

- 10 gems flat (live config price).
- Caps 2 per session and 3 per day (button hidden when hit).
- One revive per battle total (`world.revive()`).
- A gem revive blocks the interstitial (like `markRewardedShown`, G4).
- No buy-gems link or shop redirect.
- Gem button hidden while "Revive (free)" is shown.
- Disabled state shows price and balance.
- Equal buttons, no default or focus.
- Countdown pauses on the confirm sheet.
- `isEventFinalLevel` stub until M7-3.

**Blocking: contradiction with the retry-limit rule and the PR 030 code.**

- The new "Fit with the other rules" table says that **after 2 early ad closes** the ad button is removed and the **gem button is still shown**, with the offer still open.
- But the same doc's line 24 ("After the second early close, the Revive button is replaced by 'No thanks' plus the normal defeat screen") and test case 2 ("Close early twice, then the offer is gone") say the offer closes.
- PR 030 code (`ReviveOffer.onAdResult`: `closes >= MAX_EARLY_CLOSES → close()`) also closes it.

**Fix:** pick one rule.

- Either keep the offer closing after the second early close (change the table row to "offer closed"),
- or deliberately keep it open for gems, update line 24 and test 2, and add it to M2-21c as a code change.

If the offer stays open, check with MON whether keeping it open for gems after an ad was closed twice is OK under G19.

## Re-review @ 76f2960 (2026-10-11)

**Verdict: changes requested (one formula), not merged.** Docs only. Lint passes. No secrets.

**Now consistent:**

- Line 24 (retry limit): after the second early close the offer stays open with the ad button disabled ("Ad limit reached", same size), the gem button active if valid, and "No thanks". It closes if the gem option is not valid.
- Line 26 says explicitly: **"Code change required in M2-21c: PR 030 currently closes the offer after 2 early closes."**
- Line 31: a second ad failure follows the same rule, closing after 3 s if there are no gems.
- The state table rows (2 closes, ad fails / free used).
- Test 2 (both branches) and test 4.
- The analytics event `revive_declined` has reason `button | timeout | no_option` and `gemButtonState`.

**Matches merged 037 and 040:**

- 10 gems; caps 2 per session and 3 per day (button hidden when hit).
- One revive per battle total (`world.revive()`).
- A gem revive blocks the interstitial (`markRewardedShown`, G4).
- No buy-gems link.
- Gem button hidden while the free revive is shown.

**Blocking (anti-exploit item 5, edited in this PR).** The normative formula reads:

    Offer open = !revived && !claimed && countdown > 0 && (adButtonEnabled || gemButtonEnabled)

It has no term for the **free-revive button**. In the table row "Ad fails and free revive available" the gem button is hidden and the ad slot shows "Revive (free)", so an implementation of this formula would close the offer exactly when the free revive is offered. That contradicts the PR 031 rule and tests 4 and 11.

**Fix:** add `|| freeButtonShown`, or say "any enabled revive button (ad, free, gems)". Also cover the 3 s "Ad not available" window, during which the offer stays open even if no button is enabled.

**Nit (pre-existing wording in the same item):** `markReviveAttempted()` was renamed `markReviveGranted()` in PR 030. The early-close counter lives in `ReviveOffer.closes`, not in `ResultSession`. Update item 5 so ENG has the right names.

## Re-review @ 01ae7bc (2026-10-11)

**Verdict: approved, merged (--no-ff) as 8f24797.** Docs only (`revive-m2.md` and the PR doc). Lint passes. No secrets.

**Checked against the code on main (`src/platform/revive.ts`, `resultSession.ts`):**

- The early-close counter is `ReviveOffer.closes` (one `ReviveOffer` per defeat). ✔
- `freeReviveUsed` and `adsEverLoadedThisSession` are on `ReviveSession`. ✔
- `ResultSession` has `markRewardedShown()` and `markReviveGranted()`. ✔
- `UNAVAILABLE_MS = 3000`. ✔
- `button` values `ad | free | unavailable | none` match the formula's terms. ✔

**Offer-open formula:**

    offerOpen = !granted && !closed && countdown > 0 && (adEnabled || gemsEnabled || freeShown || adUnavailableNoticeActive)

- It now keeps the offer open while the free revive is shown.
- `gemsEnabled` requires `!freeShown`, so gems are hidden while the free revive is shown. This matches the PR 031 rule and tests 4 and 11.
- During the 3 s notice the offer is open with the countdown running. After the notice it stays open only if gems are valid, which matches line 31 and test 4.
- `adEnabled = closes < 2 …` and the stay-open-after-2-closes rule are a deliberate change to PR 030 (`closes >= MAX_EARLY_CLOSES → close()`). The doc flags this for M2-21c. ✔

**Other consistency.** No contradictions found among: line 24, test 2, the state table, the `revive_declined` reason `no_option`, the 037/040 caps (2/session, 3/day, hidden when hit), one revive per battle, gem revive blocking the interstitial, and no buy-gems link.
