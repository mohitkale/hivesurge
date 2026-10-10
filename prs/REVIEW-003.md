# Review — PR 003 chore/plan-m2-m7 (c9fae82)

**Verdict: CHANGES REQUESTED — not merged.** It's docs-only and merges cleanly into main, but it fails `npm run lint`, and CONTRIBUTING.md:11 requires lint to pass before a merge.

## Findings

- Scope: docs only (CONTRIBUTING.md, PLAN.md, STATUS.md, prs/003). No code. No secrets: the only matches are policy text such as "never commit keys" and `sk_test_`.
- vs main (bb45228): it is based on bb45228, and `git merge-tree` reports no conflicts.
- **Blocking:** `prettier --check` fails on **PLAN.md** and **STATUS.md**. The new STATUS.md:42 row (decision 28) is far wider than the table, and the M2–M7 tables in PLAN.md aren't formatted. Fix: run `npx prettier --write PLAN.md STATUS.md` and commit.
- CONTRIBUTING.md:19 nit: fixed in part. It no longer points to a file that doesn't exist; `/workspace/mob-control-plan/` exists. The pointer is outside the repo and the path still contains another game's name. Acceptable as an internal path; optional: copy the clean-room section into the repo.
- Stale "PR 001 open" line: fixed (PLAN.md:12, 17, 18 now say merged `bb45228`). **Leftover:** PLAN.md:39 still has the todo "Merge PR 001 → PR 002". Change it to "Merge PR 002" or mark the PR 001 part done (nit).

## Conflicts with feat/core-loop

`git merge-tree feat/core-loop chore/plan-m2-m7` reports conflicts:

- **STATUS.md:** add/add conflict. Both branches add the file. The only content difference is the new decision 28 row, so resolve by taking the PR 003 version.
- **PLAN.md:** content conflict. feat/core-loop expanded PLAN.md, and PR 003 rewrote it. Resolve by taking the PR 003 version, then update the M1 row once PR 002 merges.
  Merging PR 002 after PR 003 will need a manual resolution, or a rebase of feat/core-loop onto the new main.

---

# Re-review: chore/plan-m2-m7 @ 8e0a86a (2026-10-11)

**Verdict: APPROVED and merged into main locally, no fast-forward: `b60e960` (b60e9606ba3f7342e89f5c52892b1696f53336e0). Not pushed.**

- `prettier --check .` passes and `eslint .` passes. The diff is still docs-only: CONTRIBUTING.md, PLAN.md, STATUS.md and prs/003.
- The "Merge PR 001 → PR 002" nit is fixed.
- No secrets. `sk_live`/`pk_live`/`sk_test_` appear only as policy and guard text.
- `git merge-tree` against main (bb45228) showed no conflicts. I merged in a temporary worktree (`/tmp/wt-merge-003`, removed afterwards), so the shared checkout was not touched.
- Still open: feat/core-loop (PR 002) and the branches stacked on it now conflict with main in PLAN.md (content) and STATUS.md (both add the file). Resolve by keeping main's versions when PR 002 lands.
