# Review — PR 007 art/m3-premium-pass @ 45bf57b (worktree /workspace/hivesurge-art)

**Verdict: CHANGES REQUESTED (rebase needed). Not merged.**

Checks: `npm run lint` pass · `npm test` 54/54 (8 files) · `npm run build` pass. It builds as a single 593.56 kB JS chunk (153.11 kB gzip). The PR is based on the old feat/core-loop, so it predates the three.js split. No secrets were found in src/ or art/, and the art code makes no external network calls.

Blocking:

1. **It's based on the pre-rebase `feat/core-loop` (3ea08a5).** Merging it into main would also bring in all of PR 002, which is unmerged and waiting for QA, in its old form without the REVIEW-002 fixes.
2. **It conflicts with main** in PLAN.md and STATUS.md. It conflicts heavily with the rebased fix/pr-002-review (e148dde): add/add conflicts in src/main.ts, src/render/scene.ts, src/audio/sfx.ts, PLAN.md, STATUS.md and prs/002. Rebase onto fix/pr-002-review, or onto main once PR 002 lands. Keep ResultSession and the three.js chunk split.
3. M3-1 sign-off needs DES and REV approval of the style guide, plus the low-end device ≥ 50 fps check by QA (M3-6). Neither has been done yet; the PR doc says so too.

Non-blocking:

- Wasp/bee contrast is enforced by tests/art.test.ts, which is good. The budgets are met: 116.6 KB models and 133.9 KB audio.
- The GLB files in public/assets/models are not loaded at runtime yet (the game builds the models in code). That's 26 shipped-but-unused files until M3-5; consider keeping them out of `public/` until then.
- art/tools/*.mjs and the .py script are dev-only. Make sure their dependencies are documented.
- Opus playback falls back to the synth on older Safari. QA should verify this.

---

# Re-review: art/m3-premium-pass rebased onto fix/pr-002-review e148dde (2deae6b, b3aa5cb, 7181cc4, 008ff71) (2026-10-11)

**Verdict: APPROVED for code, NOT merged.** It must land after PR 002 → 005 → 006, and M3-1 still needs design sign-off (b3aa5cb records "changes requested"; 7181cc4/008ff71 respond) plus QA's low-end device fps check.

- **PR 002 fixes are intact.** src/main.ts keeps `ResultSession` (l.33, 193, 244), `tryClaim` and `disableResultButtons` (l.258-259), `markRewardedShown` in `watchRewarded` (l.290) and the `canOfferRevive` revive cap (l.230, 240). The vite.config.ts `manualChunks` three.js split is unchanged. Only change to main.ts: a 2-line dev-only `window.__hsScene` hook (stripped from prod; verified absent from dist).
- **Checks:** lint pass · tests 67/67 (10 files, incl. art budgets and WCAG gate contrast) · build: index 50.90 kB (18.30 kB gzip) + three 544.15 kB (135.64 kB gzip). The chunk-size warning is shown, as intended.
- **Secrets:** none in the diff vs e148dde.
- **Conflicts:**
  - vs **PR 005** (481d9b2): none.
  - vs **PR 006** (825609b): **src/main.ts**, because 006 moves `Game` into src/game.ts. The only art change there is the dev hook in `makeScene()`. Resolve by taking 006's main.ts and adding the 2 lines to `makeScene()` in src/game.ts. Rebase PR 007 onto 006 before merge.
  - vs **main**: **prs/002-feat-core-loop.md** add/add. Main (2481ec4) has the short CEO-decision note, and the branch carries the full PR 002 doc. **The same conflict hits PR 002 itself and PR 006.** When merging PR 002, keep the full doc and append the CEO note (branch, retirement, merge order). Then 005/006/007 inherit the resolution.
- **Split?** Recommended but not required. 118 files and 2.1k lines: ~92 binary/SVG assets, art tooling and docs, plus ~940 lines of runtime src/tests. Suggested split: (a) runtime art (src/art, scene.ts, theme/textures, sfx, tests) as the reviewable PR; (b) assets + art/tools + screenshots; (c) FTUE vocabulary (008ff71), which belongs to the FTUE task. At minimum, keep the unused GLBs out of `public/` until M3-5 loads them.

---

# Closed: superseded by the split (2026-10-11)

PR 007 (art/m3-premium-pass @ 568e617) is **closed**. Its content is split into PR 013 (art/m3-runtime), PR 011 (art/m3-assets) and PR 012 (art/m2-7-ftue-visuals), all stacked on PR 006. See REVIEW-013-011-012-art-split.md.
