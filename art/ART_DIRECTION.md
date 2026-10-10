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
7. **Gates are never colour-only.** They also use symbols (×, +, −). See §5 for gate colours.
8. Check: `art/screenshots/after-model-sheet.png`, bottom two rows (bees vs wasps at 24 px and 16 px).

## 5. Gates (DES change requests 1 and 2)

**Colour rule.** Each gate kind has its own hue, every gate colour is at least **3:1** (WCAG 2.x)
against every lane colour, and no gate reuses team teal (teal always means "ours"). Gate colours are
dark and saturated, and white label text on them is at least 4.5:1. Meaning never depends on colour
alone: symbols `+`, `×`, `−` and the word "trap" stay. Tokens: `gateAdd`, `gateMul`, `gateTrap` in
`src/ui/theme.ts` (default and colour-blind palettes). Enforced by `tests/gate-contrast.test.ts`.

| Kind              | Default           | Colour-blind (Okabe-Ito, darkened) |
| ----------------- | ----------------- | ---------------------------------- |
| Add (safe)        | blue `#1a47b8`    | blue `#00508a`                     |
| Multiply (greedy) | violet `#5b1fb0`  | reddish purple `#7a2a5e`           |
| Trap              | crimson `#a10f2a` | dark vermillion `#8a3800`          |

WCAG contrast against the lane colours (grass base/band, Clover Meadow, Sunset Orchard), with the old
colours for comparison:

| Gate | Hex | #7cc46a | #86cd73 | #6db35c | #a7c45a | #97b54d | min | white text |
| add | `#1a47b8` | 3.78 | 4.17 | 3.13 | 4.05 | 3.42 | **3.13** | 7.96 |
| mul | `#5b1fb0` | 4.39 | 4.85 | 3.64 | 4.71 | 3.98 | **3.64** | 9.26 |
| trap | `#a10f2a` | 3.81 | 4.20 | 3.15 | 4.08 | 3.45 | **3.15** | 8.02 |
| CB add | `#00508a` | 3.96 | 4.37 | 3.28 | 4.25 | 3.59 | **3.28** | 8.35 |
| CB mul | `#7a2a5e` | 4.29 | 4.74 | 3.56 | 4.61 | 3.89 | **3.56** | 9.05 |
| CB trap | `#8a3800` | 3.76 | 4.15 | 3.12 | 4.04 | 3.41 | **3.12** | 7.94 |
| old add | `#5fb84a` | 1.18 | 1.30 | 1.02 | 1.27 | 1.07 | **1.02** | 2.49 |
| old mul | `#2ec4b6` | 1.03 | 1.13 | 1.17 | 1.10 | 1.07 | **1.03** | 2.17 |
| old trap | `#e2557a` | 1.71 | 1.89 | 1.42 | 1.84 | 1.55 | **1.42** | 3.61 |

**Gate build.** Translucent panel (50 %) + a **solid beam** in the gate colour + label plate. The beam
and plate carry the contrast, so the panel can stay see-through.

**Label legibility.** The label plate is filled with the gate colour, with a 12 px ink `#2a1838` rim and
a 5 px white inner rim. The font is 900 weight and the text is white with an ink stroke. Labels render
on top (no depth test) so swarms never hide them. Labels tilt toward the camera (−0.75 rad) and grow
with distance (`h = 1.1 × (1 + 1.5 × y / laneLength)` world units).
**Minimum:** the farthest gate's label glyphs must be **≥ 18 CSS px** tall on a 360 px wide viewport
(the plate is ≥ 32 px). Measured with `art/tools/label-measure.mjs`: farthest row (y = 25) glyphs are
18.5 px and the plate is 32.9 px; the nearest row is 19.6 / 34.8 px. Screenshot: `art/screenshots/gates-360.png`.
**Trap state:** the count goes down (`−25` … `−1`), then the label greys out as "✓ broken" (non-blocking DES note, kept).

## 6. Style and technique

- Flat-shaded `MeshLambertMaterial`, vertex colours, faceted normals. No textures, no PBR, no outlines.
- Each unit is ONE merged geometry with an `aWing` attribute (−1/0/+1). Wings flap in the vertex shader
  (`uTime` + `gl_InstanceID` phase), so the old separate wing InstancedMesh (2 instances per unit) is gone.
- Units face +Z, up is +Y. Model scale is 1 unit ≈ bee length, and the renderer scales per type.
- Icons: 64×64 grid, 4 px ink outline, rounded joins, palette fills, readable at 24 px.
- Audio: synthesised from math expressions (`art/tools/make-audio.sh`), Ogg/Opus mono 48 kHz.

## 7. Load budget (PLAN M3-2/M3-3/M3-4, kept for M7-5)

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

## 8. Pipeline

- Source of truth: `src/art/models.ts`, `biomes.ts`, `skins.ts`, `palette.ts` (used at runtime too).
- `npx tsx art/tools/export-assets.ts` (needs `gltfpack`; set `GLTFPACK=`) writes meshopt-compressed GLBs.
  Load them with `GLTFLoader().setMeshoptDecoder(MeshoptDecoder)` (verified in `art/tools/verify.html`).
- `python3 art/tools/make-icons.py` writes the icons. `art/tools/make-audio.sh` (ffmpeg + libopus) writes the audio.
- Screenshots: `art/tools/screenshots.mjs` (battle), `art/tools/sheet.html` + `sheet-shot.mjs` (model sheet).
