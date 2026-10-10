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

## Review fixes (REVIEW-002) — branch `fix/pr-002-review`, rebased onto `main` b60e960 (main's PLAN.md/STATUS.md kept)

1. **Double claim (blocking #1):** `src/platform/resultSession.ts` (`ResultSession`, one per battle end). `claim()`
   returns early unless `tryClaim()` succeeds; all result buttons are disabled on first click.
2. **Interstitial after rewarded (blocking #2):** `watchRewarded()` marks the session before showing the ad, so any
   rewarded ad shown (completed or closed early) passes `rewardedShown = true` to `canShowInterstitial`.
3. **Revive once per battle:** an early-closed revive ad no longer re-offers revive (`canOfferRevive` /
   `markReviveAttempted`); revive only resumes if `world.revive()` returns true.
4. **Bundle:** `manualChunks` puts three.js in its own chunk. The 800 kB `chunkSizeWarningLimit` override is removed,
   so Vite's default 500 kB warning now shows for the three chunk (537.84 kB) — intentionally visible until M2-9.

Tests: `tests/resultSession.test.ts` (6 tests) cover 1–3.

**Test results after fixes:** `npm run lint` pass · `npm test` 54/54 (8 files) · `npm run build` pass:
`index-*.js` 42.56 kB (14.96 kB gzip) + `three-*.js` 537.84 kB (134.09 kB gzip), with the >500 kB chunk warning.
Before: single 579.68 kB (148.63 kB gzip) chunk.

**Still open:** blocking #3 (human playtest, QA). `feat/core-loop` itself was not rebased (it is checked out in the
shared checkout); this branch replaces it for merging, or `feat/core-loop` should be reset to it by the owner.
