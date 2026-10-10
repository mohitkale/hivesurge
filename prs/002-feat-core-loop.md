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
