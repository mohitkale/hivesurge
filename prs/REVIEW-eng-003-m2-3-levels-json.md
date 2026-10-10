# Review — eng "PR 003" feat/m2-3-levels-json @ 9f6d347 (M2-3)

> Number clash: hivesurge-ba's PR 003 is chore/plan-m2-m7. Renumber this PR (e.g. 005) before merging; its doc is prs/003-feat-m2-3-levels-json.md.

**Verdict: APPROVE in principle, not merged.** It's stacked on feat/core-loop, so it merges after PR 002.

Checks: lint pass · tests 51/51 (8 files) · build pass (581.57 kB / 149.29 kB gzip, single chunk).

Good: the JSON values match the old constant, and the round-trip test is exact. The validator rejects bad kinds and ranges.

Nits:

- src/levels/parse.ts: there's no cap of 32 gates; `World` throws at runtime instead. Validate it here.
- parse.ts doesn't require whole numbers for gate `value` or wave `count`, or check that gate x/width fit inside the lane. Non-integer values are silently floored.
- `CLOVER_RUN` is still hard-coded in main.ts; a level-select seam can come later.

Conflicts:

- vs fix/pr-002-review: merges cleanly.
- vs ba's chore/plan-m2-m7: PLAN.md and STATUS.md conflict, inherited from feat/core-loop. This PR doesn't touch those files itself.

---

# Re-review: PR 005 @ 7757ea9 (delta vs approved 481d9b2) (2026-10-11)

**Verdict: APPROVED (code), not merged.** It's stacked on PR 002, so it merges after QA passes, in the order 002 → 005 → 006.

Delta (1 commit): trigger waves, boss phases (`bossPhases`, `fromPhase` gates, `gateSpeedScale`) and the Wasp Matriarch (hp 120, takes 1/3 damage), with schema validation and 4 new tests. Checks: lint pass · tests 65/65 (10 files) · build pass (index 47.39 kB + three 537.84 kB).

Nits (non-blocking):

- src/sim/world.ts `step()`: `gateX(g, time * speedScale)` makes moving gates **jump** when a phase changes `gateSpeedScale`, because the phase is computed from absolute time. Accumulate a per-gate phase instead.
- `World.revive()` kills every wasp with y < 15, **including a Matriarch**. A revive near the hive deletes the boss; exclude bosses.
- `import { UnitPool }` now sits below the new consts in world.ts. Cosmetic.
- When the nest drops through several phase thresholds in one step, all bursts fire but only the last phase's repeat timers are kept. That's fine, but document it.
