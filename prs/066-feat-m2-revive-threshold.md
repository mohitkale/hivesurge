# PR 066: feat/m2-revive-threshold

Implements design PR 049 (merged, `26851de`; spec docs/design/revive-m2.md). Base: main `5329e56` (includes 048 gem revive).

## Changes

- `revive.minNestDamage`: remote config value, default **0.25** (was 0.5). Read with `reviveMinNestDamage(remote)`. Anything other than a finite number in [0, 1] falls back to 0.25.
- `shouldOfferRevive` takes `minNestDamage`. The rule only reads nest damage, so it applies to every loss type (hive break and time-out).
- `game.ts` passes the configured value. There's no remote-config client yet, so it uses the default.

## Offer rate with PR 044's tuning (casual bot, 200 seeds, share of losses with nest damage >= threshold)

| level            | nest/hive HP | losses | hive-break losses | offer at 50% | offer at 25% | hive breaks offered at 25% |
| ---------------- | ------------ | ------ | ----------------- | ------------ | ------------ | -------------------------- |
| ftue-meadow      | 600/60       | 0      | 0                 | –            | –            | –                          |
| dandelion-drift  | 1200/50      | 2      | 2                 | 2 (100%)     | 2 (100%)     | 2/2                        |
| clover-run       | 2350/50      | 51     | 3                 | 51 (100%)    | 51 (100%)    | 3/3                        |
| thistle-gauntlet | 2650/50      | 75     | 56                | 65 (86.7%)   | 72 (96.0%)   | 53/56                      |
| wasp-queen-nest  | 3200/50      | 87     | 44                | 87 (100%)    | 87 (100%)    | 44/44                      |

The casual bot rarely loses on Dandelion, so this sample still can't show the 30–41% hive-break losses seen in QA. At 25% those would now get the offer (tested). Other eligibility rules are ignored here: FTUE, caps, revives.

## Tests

`tests/reviveThreshold.test.ts`:

- Default is 0.25.
- Boundary checks at 0.25 and 0.2499.
- Hive-break-range damage is offered.
- The override (0.5) is used, and invalid overrides fall back.
- Other eligibility rules still apply.

## Docs

- STATUS.md decision 19: 50% → `revive.minNestDamage` (default 25%), any loss type.
- `monetization/revive-m2-21a.md` and the `economy_sim.py` comment: already updated by monetization in PR 063 (merged `7eeb4c9`). On rebase I kept main's text, so this PR doesn't change them.

## Fit with 048 (gem revive)

The threshold only gates whether an offer opens (`shouldOfferRevive`, plus 047's dev-only `?revive=force`). The gem option, caps and the early-close rule are unchanged, and all gem revive tests pass.

## Not in this PR

The `revive.gemPrice` default goes 10 → 5 (CEO decision 36) in its own PR 067 (`feat/m2-21c-gem-price-5`, with monetization's `8c38ed6`). Merge order: either works. The two PRs share no files after this rebase.

## Checks

npx eslint (v10) + prettier ok · tests 280/280 · build ok · size budget: initial JS 2.36 KiB gzip, dist 909.83 KiB. `tests/sizeBudget.test.ts` (from main) timed out once at 5 s while the box was busy; it passes alone (4/4) and on rerun.
