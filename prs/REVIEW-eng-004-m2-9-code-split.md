# Review — eng PR 004 feat/m2-9-code-split @ e1af600 (M2-9; stacked on feat/m2-3-levels-json)

**Verdict: CHANGES REQUESTED, not merged.**

Checks: these pass, but only with an **uncommitted** prettier fix to src/main.ts in the worktree. lint pass · tests 51/51 · build: entry 4.76 kB, game 40.90 kB, three 537.84 kB.

Blocking:

1. **The committed tree fails lint.** At 459e474, src/main.ts (the catch-block innerHTML line) isn't prettier-formatted. The fix sits uncommitted in the worktree, and the code commit is labelled "wip". Commit it and squash or reword the wip commit.
2. **It conflicts with fix/pr-002-review, and not only in vite.config.ts.** vite.config.ts actually auto-merges (both sides are identical). The real conflict is **src/main.ts**: this PR moves the Game class into src/game.ts, while the fix branch edits that class in main.ts (ResultSession, disabled buttons, revive check). A plain merge risks silently dropping the PR 002 fixes. Rebase onto the fixed feat/core-loop and carry the fixes into src/game.ts, then re-run the tests.

Nits:

- The boot path has no retry; the "Failed to load" text is acceptable for now.
- The PR doc says to expect a "trivial vite.config.ts conflict". Correct it to say the src/main.ts → game.ts conflict described above.
- The game still needs a browser check with `npm run preview` (smoke script needs puppeteer-core, which isn't installed).

---

# Re-review: feat/m2-9-code-split @ 825609b (renumbered **PR 006**) (2026-10-11)

**Verdict: APPROVED for code, not merged.** It's stacked on PR 005 (levels, 481d9b2) → fix/pr-002-review (e148dde) → main, so it lands after PR 002 passes QA.

- Both blockers are fixed. The worktree is clean, the wip commit is replaced by 0b8faa0, and it's rebased onto the fixed PR 002. `src/game.ts` matches fix/pr-002-review's `main.ts` exactly apart from the export and the bootstrap lines, so the ResultSession, revive cap and disabled-button fixes are all kept.
- Checks: lint pass · tests 60/60 (9 files) · build: entry 4.76 kB, game 42.00 kB, three 537.84 kB (chunk-size warning shown on purpose).
- `git merge-tree` against main shows no conflicts.
- PR 005 (levels, 481d9b2) fixes the earlier parse.ts nits (32-gate cap, integer values, lane fit) and was renumbered from 003.

---

# Re-review: PR 006 @ 988dd35 (delta vs approved 825609b) (2026-10-11)

**Verdict: APPROVED (code), not merged.** It merges after 005.

`git range-diff` shows both commits (cbd9ef3 = 0b8faa0, 988dd35 = 825609b) are **identical patches**, rebased onto 005 @ 7757ea9. Checks: lint pass · tests 65/65 · build: entry 4.76 kB, game 44.68 kB, three 537.84 kB.
