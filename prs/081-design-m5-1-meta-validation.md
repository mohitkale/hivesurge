# PR 081 - design/m5-1-meta-validation (base: main @ 21acf39)

**Summary:** M5-1 meta validation against the provisional M2-12 bot data and the M5-2a sim. All numbers PROVISIONAL (bots and sim only; re-validate with QA sessions, then PT-A if approved). Sandbox only.

**Changes**

- `docs/design/validation-m5.md` (new): bot stats per level (win, stars, queens, x3 passes, coins), enemy-scale sensitivity, slot unlock pacing, card intake, first Epic/Legendary, pity, catch-up and loss assist, daily/weekly target feasibility, spec vs code deltas, recommendations.
- `docs/design/meta-m5.md` (small): instant first win chest after the FTUE; loss assist applies to every stage; pity explicitly per chest + expectedP marked provisional pending a MON re-run; account XP curve TODO.
- `docs/design/liveops-m7.md` (small): daily pool fixes (queens 5 → 15, x3 gate in 3 battles from stage 3, hornets from stage 3, 3 stars → 2+ stars).

**Flagged, not applied:** MON sim fixes (per-chest pity, boss Gold chest, win_sens about 1.3, rooms) then expectedP retune (about −10%); STARS-1 (3 stars unreachable on L2 to L5); M5-1b account XP curve and "levels %10" gem amount.

**Test results:** docs only; prettier --check pass.

**Reviewer:** hivesurge-review

**Status:** open
