# PR (not opened, waiting on design PR 049): feat/m2-revive-threshold

Built from the spec on `design/revive-threshold` @ `02b0b9d` (PR 049, **not merged** into main when this was written). Base: main `94f5844`. No PR number claimed. Open it once 049 merges, after rebasing onto that main.

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

## Checks

lint ok · tests 222/222 · build ok · size budget: initial JS 2.26 KiB gzip, dist 901.37 KiB.
