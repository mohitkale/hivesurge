# PR 064: feat/m2-revive-threshold

Implements design PR 049 (merged, `26851de`; spec docs/design/revive-m2.md). Base: main `57a32a0` (includes 048 gem revive).

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

## Docs updated (50% -> `revive.minNestDamage`, default 25%)

- STATUS.md decision 19
- monetization/revive-m2-21a.md: eligibility row, and the economy assumption note
- monetization/sim/economy_sim.py: comment on `REVIVE_ELIG_SHARE`. The value 0.5 is **not** retuned; at 25% the bots put the share at 96–100% of losses. That's for monetization to update. `economy_sim.py` and `check_guardrails.py` still run OK.

## Fit with 048 (gem revive)

The threshold only gates whether an offer opens (`shouldOfferRevive`, plus 047's dev-only `?revive=force`). The gem option, caps and the early-close rule are unchanged, and all gem revive tests pass.

## Pending

`revive.gemPrice` default 10 -> 5 (monetization PR 063). 063 isn't merged: INDEX says "changes", because price 5 breaks T-G19a and G19 still says 10. It'll be a tiny follow-up once it merges.

## Checks

npx eslint (v10.12.0) ok · tests 266/266 · build ok · size budget: initial JS 2.34 KiB gzip, dist ~907 KiB. `prettier --check .` flags 3 files that came from main (`playtests/m2-12/results/post-m2-26/sim-sessions.json`, `playtests/m2-19a-2026-10-14.md`, `prs/059-qa-m2-19a-emulation-perf.md`). This PR doesn't touch them.
