# PR 002 — core loop vertical slice (branch note)

**2026-10-11 (CEO decision):** the PR 002 branch is now **`fix/pr-002-review`** (e148dde), rebased onto `main` (b60e960) and containing the REVIEW-002 fixes. `feat/core-loop` (3ea08a5) is **retired**: it is kept and not deleted, and no history was rewritten. The full PR description is in `prs/002-feat-core-loop.md` on `fix/pr-002-review`.

**Status:** code approved (see `prs/REVIEW-002.md`); awaiting a passing QA human playtest.

**Merge order after QA passes (all `--no-ff`):** PR 002 `fix/pr-002-review` → PR 005 `feat/m2-3-levels-json` → PR 006 `feat/m2-9-code-split`. Then tag `v0.1.0-slice`.
