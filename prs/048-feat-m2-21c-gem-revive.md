# PR 048: feat/m2-21c-gem-revive

M2-21c gem revive, per docs/design/revive-m2.md (PR 039 merged), monetization/revive-m2-21a.md C1–C8 and G19. Base: main `36f9a21`.

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

## Notes

- Not checked in a browser yet. `?revive=force` is in PR 047; once both merge, check `?level=clover-run&revive=force`.
- PR 047 also touches `game.ts` near the revive row (closeReviveRow). Whichever merges second needs a small rebase.
- `monetization/guardrails.md` G19 still says "pending ENG (M2-21c)". That's MON's doc to update.
