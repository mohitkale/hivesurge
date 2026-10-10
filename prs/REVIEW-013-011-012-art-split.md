# Review — art split: PR 013 art/m3-runtime @ 1f02903 · PR 011 art/m3-assets @ 3120407 · PR 012 art/m2-7-ftue-visuals @ e5150be (2026-10-11)

Stack: main → 002 (fix/pr-002-review) → 005 → 006 → **013 → 011 → 012**. **None of them are merged**, because PR 002 hasn't passed QA yet. Merge order after QA: 002, 005, 006, 013, 011, 012.

Old to new tips: `git diff -M` shows that c2098e9→1f02903, 2f01fb4→3120407 and 3b43af1→e5150be change **only the PR docs** (renumbered 010→013, plus cross-references). The code is identical, so the checks below, which were run on the old tips (the 012 checks were run on e5150be), still apply.

## PR 013 art/m3-runtime: APPROVED (code)

- Checks: lint pass · tests 81/81 (13 files) · build: entry 4.76 kB, game 53.38 kB (19.04 kB gzip), three 544.15 kB.
- **Label scaling:** `src/render/gateLabel.ts` adds `labelScale(aspect)`, which scales labels ×1.0–1.5 on portrait screens shorter than 360×780 (landscape stays ×1). `tests/gate-label.test.ts` checks that the farthest-row glyphs are ≥ 18 px at 360×640/740/780/800 for **every level**, at the gate x and both lane edges. It's cross-checked against an in-browser measurement (18.5 px at 360×780). The renderer uses the same `labelHeight`/`labelScale`/`frameCamera` as the test (scene.ts:247, 301, 404), so the test mirrors production.
- **Dev hook:** `src/game.ts` `makeScene()` sets `window.__hsScene` only under `import.meta.env.DEV`. It's stripped from prod (the earlier check found no `__hsScene` in dist).
- **PR 002 fixes are intact in src/game.ts:** ResultSession, tryClaim, disableResultButtons, markRewardedShown and canOfferRevive are present, and the `manualChunks` three.js split is unchanged.
- Nits: no test for 320 px-wide screens or landscape. `labelScale` caps at ×1.5, so very short screens (e.g. 360×560) could fall below 18 px; add one more viewport to the test.

## PR 011 art/m3-assets: APPROVED (code)

- Delta vs 013: 97 files, +886 lines. Opus audio, 41 SVG icons, GLBs kept under `art/models` (not shipped until M3-5, as REVIEW-007 asked), art tools, screenshots, and `tests/art-assets.test.ts` budgets. No changes under `src/`.
- Checks: lint pass · tests 85/85 (14 files) · build unchanged from 013.

## PR 012 art/m2-7-ftue-visuals: APPROVED (code)

- Delta vs 011: 11 files. FTUE SVGs under `public/assets/ftue/` plus `tests/ftue-assets.test.ts`. No changes under `src/`, so ENG wires it up in PR 014.
- Checks (on e5150be): lint pass · tests 86/86 (15 files) · build pass (same chunks).

## All three

- No secrets. The only conflict with main is the known `prs/002-feat-core-loop.md` add/add conflict inherited from PR 002.
- Owner: hivesurge-art. Design sign-off for M3-1 was recorded on the pre-split branch (57b33a2).
