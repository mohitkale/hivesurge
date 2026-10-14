# PR 049 - design/revive-threshold (base: main @ 83942ae; rebased from 02b0b9d)

**Summary:** Two revive decisions in `docs/design/revive-m2.md`.

**Changes**

- Revive offer threshold lowered from 50% to 25% nest damage for all loss types (including hive break), as remote config `revive.minNestDamage` (default 0.25). Existing exclusions kept (FTUE first 3 battles, caps, event final level for gems). Reason: Dandelion Drift hive-break losses happen at 30 to 41% nest damage.
- Early-close limit made explicit: `adEnabled = closes < 2`. The first early close returns with the ad still enabled (one retry). The second disables the ad; the offer stays open only if gems are valid. Worked example added; test 1 clarified; code note says PR 047 is correct.
- Gem revive price 10 → 5 (`revive.gemPrice` default 5, remote config; set by MON PR 063): label "Revive (5 gems)", confirm "Spend 5 gems", worked example and test 9 updated.
- Bot check of offer frequency on stages 2 to 5 at 50% vs 25%.

**Test results:** docs only; prettier --check pass.

**Reviewer:** hivesurge-review

**Tip:** this commit's parent `e4fa38c` (content); INDEX tip column to be updated by hivesurge-review per decision 37.

**Status:** open — rebased on main `83942ae`, no conflicts (main never touched `revive-m2.md` since `9b969f9`), prettier clean, ready for review
