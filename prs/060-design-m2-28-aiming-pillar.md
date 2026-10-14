# PR 060 - design/m2-28-aiming-pillar (base: main @ 078da58)

**Summary:** M2-28 (aiming beats sweeping) and M2-29 (FTUE aiming step) specs, verified with the repo bots in a scratch copy. Docs only; ENG implements the JSON, FTUE and test changes.

**Changes**

- `docs/design/levels-m2.md`: new "M2-28: aiming pillar" section. Edge `sub 600` traps at x ±3.8 on the sweep turn points, best gates in one column at x 1.3, short-swing moving gates, left decoy, nest HP re-centred (L2 1500, L3 3050, L4 3900, L5 2500). Before/after table, sweep-shape robustness table (narrow sweeps still win: flagged), CI check spec (aim − sweeper ≥ 15 points on L2–L5), exact JSON for ENG. L1 exempt (proposal, per CEO note). Casual-target discrepancy flagged (old table L3 80 / L4 70 vs current 65–75).
- `docs/design/ftue-m2.md`: step 2 becomes "Drag to the x2 gate"; x2 gate moves to x -2.8 w 2.4; "aimed, off-centre hit" defined in sim terms (cannon inside the gate span and ≥ 1.5 from centre continuously for one bee travel time, 6 hits); prompt cap 5 words; scripted fast/slow player timings (first queen 5.1–16.1 s).
- `docs/design/m2-28-29-eng-reference.patch`: scratch diff of level JSON, `src/ftue/ftue.ts`, `tests/bots.ts` (`sweepBot`) and tests (reference only).

**Results (200 seeds, win %):** sweep before → after: L2 100 → 0, L3 100 → 0, L4 100 → 0, L5 100 → 54.5. Casual: 98 / 71 / 68.5 / 54.5. Aim: 100 / 100 / 84.5 / 100. Idle loses everywhere.

**Test results:** scratch copy with the patch: `vitest run` 245/245 pass (38 files), `tsc --noEmit` and `eslint` pass. This branch: `prettier --check` pass.

**Reviewer:** hivesurge-review

**Status:** open
