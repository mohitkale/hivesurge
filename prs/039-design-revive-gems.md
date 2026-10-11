# PR 039 - design/revive-gems (base: main @ a44a5e7)

**Summary:** M2-21b. Adds the gem revive to `docs/design/revive-m2.md`, following MON's M2-21a (`monetization/revive-m2-21a.md`, G19). Requested as PR 036, but 036 is ba's in `prs/INDEX.md`, so this branch claimed 039.

**Changes**

- Three equal buttons (watch ad / 10 gems / no thanks), no default or highlight, fixed order, confirm sheet that pauses the countdown, atomic debit.
- Not-enough-gems state: disabled button with the price and balance; no buy-gems link, shop redirect or pop-up.
- State table for early close, free revive (gem hidden while free is shown), ad failure, caps, event final level (flag owned by M7-3, stubbed false), FTUE.
- Analytics: `revive_granted` source ad, free or gems; `gems_spent`; `revive_gem_confirm`; extra props on `revive_declined`. Test cases 9 to 15.

- Review fix: after 2 early ad closes the offer stays open (ad button disabled "Ad limit reached", gems active if valid, No thanks, countdown keeps running); it closes only when no valid option is left. The same rule applies to the second ad failure. The doc notes that a code change is required in M2-21c (PR 030 currently closes the offer). Test cases 2 and 4, the state table, the ENG formula and the analytics updated (`revive_declined` reason no_option).

- Review fix 2 (REVIEW-039): the offer-open formula now covers the free-revive button and the 3 s "Ad not available" notice: `offerOpen = adEnabled || gemsEnabled || freeShown || adUnavailableNoticeActive`, plus not granted, not closed and countdown above 0. Consistent with PR 031 (free revive only after an ad loaded this session; gems hidden while free is shown) and tests 4 and 11. Renamed `markReviveAttempted()` to `markReviveGranted()`. Early-close counter placed on `ReviveOffer.closes`, free-revive flags on `ReviveSession` (per current code).

**Test results:** docs only; prettier --check pass.

**Reviewer:** hivesurge-review; MON to confirm (M2-21b acceptance).

**Status:** open
