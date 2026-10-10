# PR 002 — feat/core-loop (base: chore/process-docs)

**Summary:** Playable vertical slice of Hive Surge: core loop (aim, fire, multiplier gates, Queen, wasp waves,
nest/hive, win/lose), one polished level, procedural original art, touch/mouse/keyboard, plus slice
foundations (design system, juice, analytics, save, quality scaling, sandbox ads/IAP).

**Changes**

- `src/sim/*` deterministic simulation, level "Clover Run", rewards.
- `src/render/*` Three.js instanced scene, particles, adaptive quality.
- `src/ui/*` HUD, input, theme tokens. `src/audio/sfx.ts` synth SFX.
- `src/platform/*` Platform interface, MockPlatform, ad pacing, save store. `src/analytics/*`.
- Docs: STATUS.md, PLAN.md (expanded milestones/owners), CHANGELOG.md, README.md, playtest log + screenshots.

**Test results:** `npm run lint` pass · `npm test` 48/48 pass · `npm run build` pass (580 kB JS, 149 kB gzip).

**Playtest notes:** automated headless smoke only (`playtests/m1-2026-10-11.md`): loads in ~1.6 s, battle,
loss + revive screen verified, screenshots captured. Two bugs found and fixed. **Human playtest on phone +
desktop still required** (checklist items 2, 4–6, 9, 11–13).

**Reviewer:** hivesurge-review

**Status:** awaiting review + playtest

## Review fixes (REVIEW-002) — branch `fix/pr-002-review`, stacked on `feat/core-loop`

1. **Double claim (blocking #1):** new `src/platform/resultSession.ts` (`ResultSession`, one per battle end).
   `claim()` returns early unless `tryClaim()` succeeds; all result buttons are disabled on first click
   (2X, No thanks, Retry, Home, Revive). Tests: `tests/resultSession.test.ts`.
2. **Interstitial after rewarded (blocking #2):** `watchRewarded()` marks the session before showing the ad,
   so any rewarded ad shown — completed or closed early — passes `rewardedShown = true` to
   `canShowInterstitial`. Tests: `tests/resultSession.test.ts`.
3. **Bundle (nit):** `vite.config.ts` `manualChunks` puts three.js in its own chunk.
4. **Nit:** revive only resumes battle if `world.revive()` returns true.

**Test results after fixes:** `npm run lint` pass · `npm test` 52/52 pass (8 files) · `npm run build` pass:
`index-*.js` 42.34 kB (14.90 kB gzip) + `three-*.js` 537.84 kB (134.09 kB gzip); before: single 579.68 kB
(148.63 kB gzip) chunk.

**Still open:** blocking #3 (human playtest) — needs QA. Fix commit should be fast-forwarded into
`feat/core-loop` (that branch is checked out in the shared checkout, so it was not moved here).
