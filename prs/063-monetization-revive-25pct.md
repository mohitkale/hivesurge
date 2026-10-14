# PR 063 — monetization/revive-25pct (base: main @ 0130521)

**Summary:** Two updates. G19/C1 are marked done (`takeGems()`, M2-21c, PR 048 `2a5ad67`). The gem-revive coverage is re-run at the PR 049 revive threshold (25% nest damage, was 50%).

**Changes**

- `monetization/guardrails.md` G19: `takeGems` marked done (PR 048, `2a5ad67`).
- `monetization/revive-m2-21a.md`:
  - C1 marked done;
  - eligibility now uses `revive.minNestDamage` 0.25;
  - sim assumptions and coverage table updated;
  - flag and recommendation on price.
- `monetization/sim/economy_sim.py`:
  - `REVIVE_ELIG_SHARE` default is now 0.95 (the bot check in `revive-m2.md` gives 99% at 25%); flag `--revive-elig`;
  - `WEEKLY_GEMS` now has a flag, `--weekly-gems`, so the no-weekly-gems case is reproducible.
- `monetization/sim/last_run.md`: re-run plus coverage variants.
- No other 50% revive references remain in `monetization/`.

**Results** (seed 42, 200 runs):

- Revive-eligible defeats rise from about 0.8/day to **1.4–1.6/day**.
- Coverage at 10 gems: **49–55%** with weekly gems, **19–21%** without.
- Coverage at 5 gems: 98–100% / 38–43%.
- Progression is unchanged (no hard wall).

**Flag:** 10 gems no longer meets the doc's coverage bar. The recommendation is `revive.gemPrice` = 5 via remote config, pending a MON/DES decision. `revive-gem.json` stays at 10 for now.

**Note for ENG:** `src/platform/revive.ts` on main still has `REVIVE_NEST_DAMAGE = 0.5`. The PR 049 threshold (remote config `revive.minNestDamage`, default 0.25) is not implemented in code yet.

**Test results:**

- `python3 monetization/sim/check_guardrails.py`: PASS.
- `economy_sim.py`: exit 0.

**Sandbox:** no accounts, keys or money.
