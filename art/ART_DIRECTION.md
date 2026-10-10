# Hive Surge: art direction (M3-1)

Owner: hivesurge-art · Status: **draft, needs DES + REV sign-off** (PLAN M3-1)
Clean-room: every shape, colour, icon and sound here is original and made from code in this repo
(`src/art/*`, `art/tools/*`). No third-party IP, assets or reference images were used.

## 1. Pillars

1. **Readable at a glance.** You must be able to tell bee from wasp at 12–16 px, in motion, in a crowd.
2. **Toy-like, warm, chunky.** Low-poly with flat shading and soft vertex colours. No textures, no realism.
3. **Juice over detail.** Motion (wing flap, bob, squash, particles) does the work, not polygon count.
4. **Cheap.** Built for low-end Android: instanced meshes, one material per unit type, no texture memory.

## 2. Palette (`src/art/palette.ts`)

| Role                      | Hex                               | Use                                                  |
| ------------------------- | --------------------------------- | ---------------------------------------------------- |
| Bee body                  | `#ffcf3a`                         | Worker abdomen (dominant colour, ≥ 60 % of the body) |
| Bee stripe / head         | `#3a2412`                         | Thin stripes (≤ 35 % of each band period), head      |
| Bee wing                  | `#dff7ff`                         | Round pale wings                                     |
| Team accent               | `#2ec4b6`                         | Antenna tips, cannon, crown gems. Teal means "ours"  |
| Queen body / stripe       | `#ffb21e` / `#7a3a12`             | Warmer amber + gold crown `#ffe066`                  |
| Wasp body                 | `#2b1636`                         | Very dark plum-black (dominant)                      |
| Wasp band                 | `#ff7a1a`                         | Hot orange warning bands on the abdomen only         |
| Wasp head / eye           | `#4a1d63` / `#ff3d3d`             | Angular head, red slanted eyes                       |
| Wasp wing                 | `#b9a3d9`                         | Narrow lilac wings, swept back                       |
| Hornet body / band / head | `#1c0d26` / `#e2304a` / `#8a1f3c` | Elite wasp: crimson + horns                          |
| Nest paper                | `#7d6a8f` `#a593b8` `#4f3f63`     | Papery tiers, orange warning tiers, dark spikes      |
| UI ink                    | `#2a1838`                         | All icon outlines (4 px on a 64 grid)                |

Biome palettes live in `src/art/biomes.ts` (sky, fog, lane, soil, rail).

## 3. Silhouettes

| Unit       | Silhouette                           | Key shapes                                                                    |
| ---------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| Worker bee | **Round blob**, roughly 1:1.2        | Sphere abdomen, round head, two round "paddle" wings, antennae with teal tips |
| Queen      | Bigger round blob + **crown**        | Bee body in amber, 5-spike gold crown with teal gem. ~2.3× worker             |
| Wasp       | **Long, pinched, pointy**, about 1:3 | Cone abdomen to a stinger, thin waist, diamond head, narrow swept wings       |
| Hornet     | Wasp + **horns**, about 1.7× wasp    | Crimson bands/head, two horn spikes                                           |
| Cannon     | Squat teal hex turret + honey barrel | Wooden wheels, dark muzzle ring. Teal = ours                                  |
| Wasp nest  | Tiered paper cone with spikes        | Orange warning tiers, dark round entry facing the lane                        |

## 4. Readability rules (bees vs wasps)

1. **Value first.** Bees are LIGHT bodies, wasps are DARK bodies. Luminance ratio ≥ 10:1 (enforced in
   `tests/art.test.ts`). This is the cue that still works at 12 px and for colour-blind players.
2. **Shape second.** Bees are round with round wings. Wasps are long and pointed with a pinched waist
   and swept wings. Never give a wasp a round body or a bee a pointed one.
3. **Hue third.** Warm yellow/amber + teal = player. Plum/black + orange/red = enemy. Orange may appear
   on wasps only as thin bands, never as the dominant body colour (that was the old readability bug:
   honey-on-brown bees and orange-on-plum wasps were both "striped warm blobs").
4. **Stripes stay thin.** Bee stripes ≤ 35 % of each band period, so the body reads yellow, not brown.
5. **Size tiers.** Worker < wasp < hornet < queen. Elite units get one extra silhouette feature
   (crown, horns), not just scale.
6. **Skins keep the contract.** Bee skins may retint (body luminance > 0.35 linear, stripe < 0.06) and add
   ONE small accessory. They never make a bee dark or angular. Enforced in tests.
7. **Gates are never colour-only.** They also use symbols (×, +, −), as already done in the CB palette.
8. Check: `art/screenshots/after-model-sheet.png`, bottom two rows (bees vs wasps at 24 px and 16 px).

## 5. Style and technique

- Flat-shaded `MeshLambertMaterial`, vertex colours, faceted normals. No textures, no PBR, no outlines.
- Each unit is ONE merged geometry with an `aWing` attribute (−1/0/+1). Wings flap in the vertex shader
  (`uTime` + `gl_InstanceID` phase), so the old separate wing InstancedMesh (2 instances per unit) is gone.
- Units face +Z, up is +Y. Model scale is 1 unit ≈ bee length, and the renderer scales per type.
- Icons: 64×64 grid, 4 px ink outline, rounded joins, palette fills, readable at 24 px.
- Audio: synthesised from math expressions (`art/tools/make-audio.sh`), Ogg/Opus mono 48 kHz.

## 6. Load budget (PLAN M3-2/M3-3/M3-4, kept for M7-5)

| Budget                                             | Limit       | Current                                                              |
| -------------------------------------------------- | ----------- | -------------------------------------------------------------------- |
| Triangles per unit (incl. skins)                   | ≤ 300       | bee 220 · queen 270 · wasp 130 · hornet 142 · skins 220–268          |
| Model assets (`public/assets/models`, meshopt GLB) | ≤ 1.5 MB    | **116.6 KB** (26 files)                                              |
| Audio (`public/assets/audio`, Opus)                | ≤ 1 MB      | **133.9 KB** (9 cues incl. 16 s music loop)                          |
| Icons (`public/assets/icons`, SVG)                 | ≥ 30 icons  | 41 icons, 19.3 KB                                                    |
| Textures                                           | KTX2 if any | **none** (vertex colours only, 0 bytes GPU texture memory for units) |
| Initial JS (M2-9)                                  | < 3 MB      | 593.6 kB (153.1 kB gzip). Art adds about 14 kB to the bundle         |

Non-unit props (cannon 264, nest 382 tris) have one instance each, so the per-unit budget does not apply.
Re-check with `npx vitest run tests/art.test.ts`.

## 7. Pipeline

- Source of truth: `src/art/models.ts`, `biomes.ts`, `skins.ts`, `palette.ts` (used at runtime too).
- `npx tsx art/tools/export-assets.ts` (needs `gltfpack`; set `GLTFPACK=`) writes meshopt-compressed GLBs.
  Load them with `GLTFLoader().setMeshoptDecoder(MeshoptDecoder)` (verified in `art/tools/verify.html`).
- `python3 art/tools/make-icons.py` writes the icons. `art/tools/make-audio.sh` (ffmpeg + libopus) writes the audio.
- Screenshots: `art/tools/screenshots.mjs` (battle), `art/tools/sheet.html` + `sheet-shot.mjs` (model sheet).
