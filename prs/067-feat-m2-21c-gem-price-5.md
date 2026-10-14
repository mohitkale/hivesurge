# PR 067: feat/m2-21c-gem-price-5

Gem revive price 10 → **5 gems** (CEO decision 36; caps unchanged at 2/session and 3/day). Base: main `5329e56` (includes PR 063).

## Commits

1. `df7be27`: **monetization's commit**, cherry-picked unchanged from `monetization/revive-5gems` @ `8c38ed6` (rebased; authored by monetization). It changes config `revive-gem.json`, G19 in `guardrails.md`, `revive-m2-21a.md`, the sim default and `last_run.md`, and adds STATUS decision 36.
2. ENG:
   - `REVIVE_GEM_DEFAULTS.gemPrice = 5` (`src/platform/reviveGems.ts`).
   - T-G19a is renamed "flat price 5 gems (decision 36)". It asserts the default is 5 and matches `revive-gem.json`, two revives debit 10 from 100, and an invalid override falls back to 5.
   - The other gem tests pass an explicit 10-gem price to the offer, so they're unchanged.
   - `docs/design/revive-m2.md`: the price line now says default 5. The worked examples still use 10, so design may want to refresh them.
   - The headless check `playtests/m2-21c/gem-flow.mjs` now runs at price 5 (7 gems and 4 gems).

## Results

- `check_guardrails.py`: OK, "G19 gem revive 5 gems (~$0.21) passes 10 checks".
- Headless gem flow at price 5: 8/8 PASS (`playtests/m2-21c/gem-flow-price5-result.txt`).
  - 7 gems: two early closes, then "Ad limit reached" with the offer open; the gem revive leaves 2.
  - 4 gems: unaffordable, so the button is disabled and the offer closes after the second early close.

## Merge order

Independent of PR 066 (revive threshold): `git merge-tree` shows no conflicts either way.

## Checks

See below (lint, tests, build, size budget).
