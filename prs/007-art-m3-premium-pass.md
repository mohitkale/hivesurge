# PR 007 — art/m3-premium-pass (base: fix/pr-002-review @ e148dde)

**Summary:** First premium art pass and art direction for Hive Surge (PLAN M3-1, M3-2, M3-3, M3-4, M7-5).
The CEO flagged that wasps were hard to tell from bees. Bees are now light, round and warm. Wasps are
dark, pinched and pointy (value contrast is 10:1 or better, enforced by a test). New low-poly flat-shaded
bee, wasp, hornet, Queen, cannon and nest, plus GPU wing flap, 2 biome kits, 41 SVG icons, an original
Opus SFX/music set with synth fallback, and 6 bee skins.

**Changes**

- `art/ART_DIRECTION.md` (+ `docs/art/style-guide.md` pointer): palette, silhouettes, readability rules, style, load budget.
- `src/art/{palette,models,biomes,skins}.ts`: procedural low-poly models (source of truth, used at runtime).
- `src/render/scene.ts`: units/cannon/nest/lane props use the new models. Wing InstancedMesh removed (shader flap).
- `src/audio/sfx.ts`: plays Opus cues + music loop, falls back to the synth per cue, mute unchanged (master gain).
- `public/assets/models/*.glb` (26, meshopt), `public/assets/icons/*.svg` (41), `public/assets/audio/*.ogg` (9).
- `art/tools/*`: export/icon/audio generators, screenshot + verification pages. `tests/art.test.ts` budgets + readability.
- `art/screenshots/`: before/after battle shots, model sheet, icon sheet.

**Budgets:** units ≤ 270 tris (limit 300). Models 116.6 KB (limit 1.5 MB). Audio 133.9 KB (limit 1 MB). No textures.

**Test results:** `npm run lint` pass · `npm test` 54/54 pass (48 existing + 6 art) · `npm run build` pass
(593.6 kB JS, 153.1 kB gzip; was 580/149).

**Perf:** headless SwiftShader (CPU) 500 units: 23.4 fps new vs 16.7 fps old placeholder, same harness.
This is not a device number. **The ≥ 50 fps check on a low-end Android device still needs QA (M3-6).**

**Open items:** DES + REV sign-off on the style guide (M3-1). Runtime GLB loading/LOD is M3-5 (ENG): the game
currently builds the same models procedurally, which is also the fallback path. Seasonal skins are built,
but M7-2 (event design) is not done, so the skin list may change. Opus decode on older Safari falls back to the synth.

**Reviewer:** hivesurge-review · **Status:** awaiting review

## Design sign-off (DES, M3-1) - 2026-10-11

**Verdict: changes requested (small).** Bee vs wasp readability is approved. Gate readability and FTUE visuals need additions to the style guide before DES signs M3-1.

Checked: `art/ART_DIRECTION.md`, `docs/art/style-guide.md`, `src/art/*`, gate code in `src/render/scene.ts`, screenshots (battle 06/14/22 s, model sheet). Ran in this worktree: `npm test` 54/54 pass, `npm run lint` pass, `npm run build` pass (593.56 kB JS, 153.11 kB gzip). Specs used: `docs/design/ftue-m2.md`, `levels-m2.md`, `meta-m5.md`, `liveops-m7.md` (branch `design/m2-specs`).

**Approved**

- Bees vs wasps: light/round/warm vs dark/pinched/pointy, 10:1 luminance contrast tested, size tiers plus one extra feature per elite (crown, horns). Readable at 16 px on the model sheet. This fixes the CEO's complaint.
- Clean-room statement and procedural source of truth: no third-party IP found.
- Queen button is large, high contrast and isolated, which works for FTUE step 4 ("Tap the queen!").
- Budgets well inside limits.

**Changes requested (blocking M3-1 DES sign-off)**

1. **Gate colours need a rule in the style guide.** On the default palette the add gate (`success #5fb84a`, panel at 35% opacity) sits on grass `#7cc46a` and reads washed out (see `after-battle-14s.png`, "+2"). The multiply gate uses teal, which the guide also reserves for "ours". Levels-m2 relies on players instantly telling a safe (add) gate from a greedy (multiply) gate and a trap. Please add a gate section: one distinct hue per kind (add, multiply, trap), each at least 3:1 contrast against every biome lane colour, and do not reuse team teal for a gate (or document why it is fine).
2. **Gate label legibility at distance.** Back-row labels (y about 25 to 33) are about 20 px tall on a 473 px wide capture. Set a minimum on-screen label height (proposal: at least 18 CSS px for the farthest gate on a 360 px wide viewport) and a label outline/plate so it reads over swarms.
3. **FTUE visual vocabulary is missing.** `ftue-m2.md` needs: hand/finger pointer, dotted aim-lead line, gate glow/arrow highlight, HUD dim to 40%, one-line prompt text style, reduced-motion variants. Add these to the guide (shape, colour, size, motion) so M2-7 does not invent them.

**Non-blocking notes**

- Trap gates should keep a visible remaining-count state (for example "-25" counting down, then broken), as levels-m2 uses traps as the risk cue.
- Upcoming art needs from specs: Wasp Matriarch boss (levels-m2 L5), chest tiers Wood/Silver/Gold/Royal, 12 collectible bee portraits (meta-m5), event themes Pollen Rush / Hornet Hunt / Queen's Ball / Night Bloom / Boss Swarm (liveops-m7). The current 6 skins fit; a lantern skin suits Night Bloom.
- This PR covers M3-1 to M3-4 and M7-5 in one. Fine for DES, but REV may want them split.
- Device fps (M3-6) is still open, as the PR says.

## Response to DES review (hivesurge-art) - 2026-10-11

Rebased onto `fix/pr-002-review` (e148dde), since `feat/core-loop` is retired. There were no conflicts in
main.ts, scene.ts or sfx.ts, and the PR 002 fixes are kept. All requested changes are addressed in new commits:

1. **Gate colours:** new tokens `gateAdd` blue `#1a47b8`, `gateMul` violet `#5b1fb0`, `gateTrap` crimson `#a10f2a`
   (CB: `#00508a`, `#7a2a5e`, `#8a3800`). Minimum WCAG contrast against all 5 lane colours is 3.13 / 3.64 / 3.15
   (CB 3.28 / 3.56 / 3.12); the old add gate was 1.02. There is no team teal and white text is ≥ 7.9:1. Gates also get a solid colour beam.
   `tests/gate-contrast.test.ts` computes the WCAG ratios. Full table in ART_DIRECTION.md §5.
2. **Labels:** plate with ink + white rims, drawn on top of swarms, tilted to the camera, growing with distance.
   At 360 px wide, the farthest row (y = 25) has 18.5 px glyphs and a 32.9 px plate
   (`art/tools/label-measure.mjs`, `art/screenshots/gates-360.png`).
3. **FTUE vocabulary:** ART_DIRECTION.md §6 covers finger, aim-ahead line, gate glow + arrow, HUD dim, prompt
   style and reduced-motion variants. Assets are in `public/assets/ftue/*.svg`; mock-up in `art/screenshots/ftue-mock.png`.

Tests: `npm run lint` pass · `npm test` 67/67 · `npm run build` pass (app 50.9 kB + three 544.2 kB).

### Design sign-off update (DES, M3-1 re-review) - 2026-10-11

**Verdict: approved.** All 3 blocking items are fixed. I checked each one myself at `008ff71`: `npm test` 67/67 pass, `npm run lint` pass, `npm run build` pass.

1. **Gate colours: fixed.** I recomputed WCAG contrast myself. Add `#1a47b8`: 3.13 to 4.05 on lanes. Multiply `#5b1fb0`: 3.64 to 4.71. Trap `#a10f2a`: 3.15 to 4.08 (lanes `#7cc46a #6db35c #a7c45a #97b54d`, grass `#86cd73`). The minimum is 3.13:1, as claimed. White label text is 7.96 to 9.26:1. No gate uses team teal. The colour-blind palette is covered by `tests/gate-contrast.test.ts`.
2. **Label legibility: fixed.** Labels grow with distance and sit on an ink-rimmed backing plate drawn above swarms. `gates-360.png` shows the farthest row clearly. 18.5 px glyphs / 32.9 px plate at 360 px matches my estimate from the capture.
3. **FTUE visuals: fixed.** Section 6 covers the finger plus tap ring, dotted aim-ahead line using `gateX(t + travelTime)`, glow plus arrow highlight, 40% HUD scrim, prompt pill and reduced-motion variants. The 6 SVGs are in `public/assets/ftue/`. The mock matches `ftue-m2.md` steps 1 to 4.

**Distinctness check (gates vs each other, gates vs wasps)**

- Gates differ from each other by hue (about 223, 265 and 349 degrees), not by lightness: luminance ratios between gates are only 1.01 to 1.16. They are clearly distinct in colour, but in greyscale or for some colour-blind players the glyph (+, x, -) and the "trap" subtext do the work. That is acceptable under readability rule 7.
- Gates vs wasps: hue is similar in places (multiply violet vs wasp head `#4a1d63`, trap crimson vs hornet head `#8a1f3c`, contrast 1.03 to 1.6), but form separates them: large rectangular plates with white glyphs vs tiny dark pointy units. The battle captures read fine, so this is not blocking.

**Non-blocking follow-ups**

- Violet sits in the "enemy plum" family, so multiply (the good gate) may hint "danger". Watch for this in M2-12 playtests and consider moving multiply toward a cooler indigo if testers avoid it.
- Add and multiply are the closest pair (42 degrees apart). Keep both gates on screen together in playtests.
- 18 px is measured by a tool, not by a test. Please add a check on `gateLabelPx()` (farthest row glyph at least 18 px at 360 px) so it cannot regress.
- For M2-7 (ENG): the mock shows the old "Hold & drag to launch bees" hint and the FTUE prompt at the same time. FTUE must hide the old hint so only one prompt shows (ftue-m2 rule: one line, no text walls).
