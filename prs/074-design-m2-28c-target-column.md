# PR 074 - design/m2-28c-target-column (base: main @ ff371fc)

**Summary:** M2-28c. The difficulty-curve table in `docs/design/levels-m2.md` now shows the current casual bands instead of the stale first-try targets, and the M2-28 discrepancy flag is removed.

**Changes**

- Difficulty curve, "Target 1st-try win" for L1 to L5: 98% / 92% / 80% / 70% / 55% → casual ≥ 95% / ≥ 90% / 65 to 75% / 65 to 75% / 55 ± 5% (per `validation-m2.md`, M2-17 and M2-26).
- Stage table (validator section): stage 1 and 2 targets read casual ≥ 95% and ≥ 90%, and the note below it now says ≥ 95% instead of 98%.
- Removed "Casual targets: discrepancy (flagged)" from the M2-28 section.

**Not changed (noted):** the same table's nest HP and hive HP columns still show the original M2-4 values, not the shipped ones. Out of scope here.

**Test results:** docs only; prettier --check pass.

**Reviewer:** hivesurge-review

**Status:** open
