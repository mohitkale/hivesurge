# PR 007 — art/m3-premium-pass (base: feat/core-loop)

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
