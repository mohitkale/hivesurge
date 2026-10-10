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
