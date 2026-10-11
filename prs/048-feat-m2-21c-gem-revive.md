# PR 048: feat/m2-21c-gem-revive

M2-21c gem revive, per docs/design/revive-m2.md (PR 039 merged), monetization/revive-m2-21a.md C1–C8 and G19. Base: main `2b40775` (includes 047, 051, 054 claim; 422c10d).

## Final rule implemented

- Gems are **valid** when the player can afford them, they're within caps, and they're not hidden. They're hidden while "Revive (free)" is shown, when caps are reached, and on an event's final level.
- After 2 early closes the ad button shows "Ad limit reached" (disabled, same size). The offer stays open, with gems and No thanks, while gems are valid. Otherwise it closes.
- Second ad failure: "Ad not available" for 3 s with nothing enabled. After that the offer stays open only while gems are valid.
- There's no revive offer in the first 3 battles (`canOfferRewarded`, G2).

## Changes

- `src/platform/reviveGems.ts`:
  - `reviveGemConfig()`: C8 remote-config seam. Defaults are 10 gems, 2 per session, 3 per day. Overrides are clamped to G19.
  - `GemReviveCaps`: session cap in memory, daily cap persisted (C2).
  - `debitGems`: atomic debit.
  - `isEventFinalLevel`: stub that returns false until M7-3 (C6).
- `ReviveOffer`:
  - Optional `GemOption`, with `gemState` (enabled / disabled / hidden), `gemsValid` and `adEnabled`.
  - `openGemConfirm` / `backFromConfirm`: the countdown pauses on confirm (C5).
  - `takeGems(revives)` (C1): grants only after the debit. Refused when `revives > 0`, the offer is closed, the sheet isn't open, or gems aren't valid.
  - `afterNotice()` replaces `decline()` after the 3 s notice.
  - New `limit` button state.
- Save: `reviveGemDay {day, count}`.
- UI (`src/ui/reviveOffer.ts`):
  - Three equal `.btn` buttons in a fixed order (ad, gems, No thanks), with no default. Focus goes to the panel title.
  - Short balance: a disabled, greyed button with a lock, the price and "You have N", plus an aria-label. No buy or shop link (C4).
  - Confirm sheet showing balance before and after, with "Spend 10 gems" / "Back".
- A gem revive blocks the interstitial on that transition (G4). New analytics events:
  - `revive_gem_confirm` and `gems_spent`.
  - `revive_granted` now carries `price`.
  - `revive_declined` now carries `gemBalance`, `gemButtonState` and reason `no_option`.

## Tests

- `tests/gemRevive.test.ts`:
  - `takeGems` acceptance, the early-close / ad-failure rule (stays open while valid; closes for can't afford, caps reached and event final level), C3, C5.
  - T-G19a–g: a flat price that matches revive-gem.json · one revive per battle total · 2/session and 3/day caps with the day count persisted · none in the first 3 battles · no upsell, disabled with price and balance · event final level · confirm pause and no default.
- `tests/revive.test.ts`: case 2 renamed to "no gem option". Case 4 uses `afterNotice()`.
- `check_guardrails.py`: OK, G19 at 10 gems (~$0.42).

## Checks

lint ok · tests 235/235 · build ok · size budget: initial JS 2.92 KiB gzip (was 2.26: the save now imports the gem day counter), dist 905.53 KiB.

## Rebase onto main (after 047 and 051)

- The only textual conflict was the `game.ts` imports (adPolicy `isLevelTransition` from 047 plus the reviveGems imports).
- 047's in-place row hide (`closeReviveRow`) is kept. 048's close paths go through it: ad limit with gems invalid, the 3 s notice ending with `afterNotice()` → closed, No thanks, and timeout. So Retry/Home never move under the finger.
- G4 is kept for both: `ResultSession.afterRevive(prev, source)` marks rewarded-shown for a gem revive or a prior rewarded ad, and 051's `forBattleEnd` carries it to the revived battle's result. Tests: `tests/gemRevive.test.ts` "G4 across a revive".

## Headless check (`playtests/m2-21c/gem-flow.mjs`, result in `playtests/m2-21c/gem-flow-result.txt`)

- 14 gems: close 1 keeps the ad enabled. Close 2 shows "Ad limit reached" (disabled), and the offer stays open with gems and No thanks. The gem revive resumes the battle, balance 4.
- 4 gems: close 2 closes the offer. Both scenarios: 8/8 PASS.
- This answers QA on 047, where "close 2 closes outright" was the PR 030/047 behaviour with no gem option. 048 gives the spec behaviour.

## Follow-ups (separate commits)

- Save merge: gems now take the **lower** balance, so a merge never refunds a spend. The daily gem-revive counter takes the max for the same day and the later day otherwise. Tests are in gemRevive.test.ts; foundations.test.ts is updated (merged gems 9 → 0 in its fixture).
  - Trade-off: gems bought on one device and not yet synced can be lost in a conflict merge. A spend/grant ledger is the proper fix once Supabase sync (M4) exists.
- Initial JS: the entry chunk grew because `save.ts` imported `reviveGems.ts`, which pulled in `adPacer`. The day-counter type now lives in `save.ts`.
  - Initial JS was 7.42 KiB raw / 2.95 KiB gzip; it's now 5.31 KiB raw / 2.34 KiB gzip (main is 5.16 / 2.29).
  - The gem revive UI itself is already in the lazy `game` chunk, so no further lazy-loading is needed.

## Notes

- `monetization/guardrails.md` G19 still says "pending ENG (M2-21c)". That's MON's doc to update.
