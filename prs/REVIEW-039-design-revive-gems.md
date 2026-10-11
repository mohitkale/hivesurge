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
