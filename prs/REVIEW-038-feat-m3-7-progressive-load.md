# Review: PR 038 feat/m3-7-progressive-load @ 91d52c0 (2026-10-11)

**Verdict: approved, merged (--no-ff) as 020bd46.**

**Change.** `DeferredAssets` runs the GLB load and the Opus cue load once, right after the first `gameplayStart`, and sets the `hs:first-battle` performance mark. `GameScene.applyModels` swaps the GLBs into the running scene. `Sfx.loadCues` no longer fetches on unlock. The battle starts on procedural models and synth audio.

**Checks on main after the merge:**

- Lint passes (main's INDEX was already clean; no fix needed).
- **172 tests** pass.
- Build and size budget pass: initial JS 2.26 KiB gzip, dist 899 KiB.

**Load test re-run.** `node playtests/m3-7/load-test.mjs` against `vite preview`, Fast 4G, 3 fresh runs:

| Run | First battle | Assets before / after battle | Page errors | Result |
| --- | ------------ | ---------------------------- | ----------- | ------ |
| 1   | 871 ms       | 0 / 14                       | 0           | PASS   |
| 2   | 797 ms       | 0 / 14                       | 0           | PASS   |
| 3   | 858 ms       | 0 / 14                       | 0           | PASS   |

- 169.5 KiB is loaded before the battle.
- Committed evidence (848–932 ms) agrees: the same M3 asset set (5 GLB + 9 Opus, per run), none before the battle.

**Fallback (puppeteer on the preview build):**

- `?assets=off`: 0 GLB requests, battle runs, 0 page errors.
- GLBs blocked: 5 requests failed, 5 "procedural fallback" warnings, battle runs, 0 page errors.

**PR 002 fixes and revive rules: intact.** No changes to `resultSession.ts`, `revive.ts`, `adPolicy.ts`, `adPacer.ts` or `vite.config.ts` (three.js still split out via `manualChunks`). The `tryClaim`, `markRewardedShown`, `markReviveGranted` and `disableResultButtons` call sites in `game.ts` are unchanged. No secrets.

**Nit.** `load-test.mjs` fails on a slow first battle, on any M3 asset before the battle, or on page errors. It does **not** fail if fewer than 14 assets load after the battle. Add `late.length === expected` so "all loaded after" is enforced too, as the PR doc claims.
