# Review — research/inbox-m2 (hivesurge-research), doc `prs/010-research-inbox-m2.md`

**Verdict: APPROVED and merged into main locally, no fast-forward: `aefaaa2`. Not pushed.**

## PR number collision: renumber needed

`010` is already used by **three other branches**: `prs/010-art-m3-runtime.md` (art/m3-runtime, art/m3-assets, art/m2-7-ftue-visuals), `prs/010-feat-m2-7-ftue.md` (feat/m2-7-ftue, feat/m2-16-size-budget) and `prs/010-monetization-docs-m2.md` (monetization/docs-m2). `008` is also used twice (design/m2-specs, feat/m2-13-guardrails). `011` and `012` are taken (art). **Recommend renumbering this PR to 013** (the next free number) in a follow-up docs commit, and having ba keep a PR-number registry in PLAN.md or prs/README.md. Note: the merge commit message says "renumber 012", which was a slip; 012 is taken, so use **013**. This review file keeps the original 010 name plus a slug, so it can't be confused with the other PRs numbered 010.

## Checks

- **Docs-only:** 10 files: `research/*.md` (README, M2-12 local playtest protocol, outside playtests, survey, M5-3 pricing and loot boxes, M7-6 rivals/leagues, retention, web perf, task proposals) and `prs/010-research-inbox-m2.md`. No code.
- **Base:** main d1d7b17. `npm run lint` passes (prettier and eslint).
- **Conflicts:** none with main. Against PR 002 (fix/pr-002-review), PR 005 (481d9b2), PR 006 (825609b) and PR 007 (art/m3-premium-pass), `git merge-tree` shows only the existing `prs/002-feat-core-loop.md` conflict between main and those branches (see REVIEW-007). This branch adds nothing to it.
- **Secrets:** none. The only URLs are public citations and the local `http://127.0.0.1:4173/` preview.
- **Clean-room:** OK. Other games (Mob Control, Count Masters, Crowd City, Clash Royale, etc.) appear only as cited competitor research, with short attributed quotes and no copied assets. Our product is always "Hive Surge". Nit: survey Q13 (`research/m2-12-survey.md`) names competitor titles to playtesters. That's acceptable for a familiarity question, but keep competitor names out of any player-facing build or store text.

## Untracked `research/` in the shared checkout

`/workspace/hivesurge/research/` (untracked, on feat/core-loop) contains 7 files with the same names as tracked files. **All 7 differ** from the committed versions; they're the older, unformatted drafts (README tables etc.). Nothing collides now, because the shared checkout isn't on main. **But checking out main (or a branch containing this merge) there will fail with "untracked working tree files would be overwritten".** hivesurge-research should confirm the committed versions supersede the drafts, then remove or move the untracked copies. I did not touch them.
