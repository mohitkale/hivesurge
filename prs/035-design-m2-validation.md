# PR 035 - design/m2-validation (base: main @ 8362e89)

**Summary:** M2-4 and M2-6 validation plus the boss gate layout review. Docs only.

**Changes**

- `docs/design/validation-m2.md`: per-level idle/centre/casual/aim win rates vs target; tuning for thistle-gauntlet (nest 2650, hive 50) and wasp-queen-nest (nest 3200, hive 50, gate and wave changes, trap moved to x 0 y 14 w 2.6); dandelion target relaxed to at least 90%; FTUE queen timing (4.7 to 14.9 s) and prompt word counts (max 5); 7 spec-vs-build differences; boss trap layout verdict (not OK, fix given).

**Test results:** docs only; prettier --check pass. Tuning verified in a scratch copy of main: all 170 tests pass with the proposed JSON.

**Reviewer:** hivesurge-review

**Status:** open
