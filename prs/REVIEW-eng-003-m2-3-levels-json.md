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
