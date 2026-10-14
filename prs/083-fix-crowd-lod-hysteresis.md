# PR 083: fix/crowd-lod-hysteresis

Branch `fix/crowd-lod-hysteresis` from main `21acf39`. Owner: hivesurge-art. Not pushed.

## Root cause

Main has **no crowd LOD switch**. Eng's 20-tri proxy LOD (`bc2513e`) was dropped from PR 071 (`8f86911`, "superseded by PR 073"). PR 073 shipped only the 148-tri `beeCrowdGeometry` model, not the switch, so nothing used it. Every unit renders full-poly, and 073 added 24 tris to each wasp and hornet. The 64k to 165k "swing" QA saw is the live unit count (stress refills to 320, gates push it to about 600, `unitsMax`). It is not LOD flapping: there was no LOD to flap. Draw calls were also higher than needed: empty instanced meshes (queen, hornet, particles at count 0) still issued draws, and the hive was 9 separate meshes.

## Fix

- `src/render/crowdLod.ts` (pure, tested):
  - `CrowdLodSwitch`: per side, enter at >= `enterAt` units and exit at <= `exitAt`, with a minimum hold of 1500 ms between changes.
  - `nextBand`: per-unit distance bands with a ±0.03 L dead zone at each edge.
- 3 tiers for workers: full (<0.3 L), mid 148-tri crowd bee (0.3 to 0.6 L), far 20-tri stand-in (>0.6 L). Wasps use full, then the far stand-in (there is no mid wasp model).
  - Skins: the mid bee uses the skin's colours plus its accessory; the far stand-in uses the skin's colours.
  - Queen, hornet and matriarch are unchanged.
- `TierSettings.crowdLod`: high 160/110, med 140/95, low 110/70.
- `UnitPool.lod` stores the band per unit, so swap-remove carries it.
- Draw calls:
  - Meshes with 0 instances are hidden (units, LOD meshes, particles).
  - The hive is one InstancedMesh (9 draws become 1).
- `scripts/perf-bench.mjs` now samples tris/calls every ~100 ms. It reports `trisMin/Max`, `callsMin/Max`, `trisFlips300ms` (a >1.5x swing that reverses within 300 ms) and `unitsMax`.

## Evidence

`docs/perf/crowd-lod/ab-stress320.txt`. Base (21acf39) and fix were run interleaved on the same box: headless SwiftShader, 1280x800, 25 s, 2 rounds per config. Load average was 10 to 22 (other agents), so the fps values are noisy. Triangles and calls are reliable.

| tier      | tris base → fix  | calls base → fix | flips | avgFps base → fix (r1 / r2) |
| --------- | ---------------- | ---------------- | ----- | --------------------------- |
| auto(low) | 61–130k → 16–78k | 33–58 → 27–37    | 0 → 0 | 38.2/27.0 → 37.1/33.1       |
| low       | 61–130k → 16–76k | 33–57 → 27–50    | 0 → 0 | 46.5/28.6 → 47.1/36.3       |
| med       | 66–140k → 21–90k | 41–42 → 34–57    | 0 → 0 | 22.0/22.4 → 12.2*/25.9      |
| high      | 68–144k → 25–98k | 44–68 → 37–60    | 0 → 0 | 4.6/12.4 → 9.1/7.9          |

\* fix-med-r1 ran during a load spike (19.6). QA should re-measure fps in a normal Chrome window with the same method as /tmp/qa-main-perf.

## Checks

Lint and build pass. Tests: see the follow-up section (the hysteresis tests first sat in `src/render/`, which vitest's `tests/**` include never ran; 333 at `b759d2f` did not include them).

## Follow-up (review of 083)

- `src/render/crowdLod.test.ts` is now `tests/crowdLodHysteresis.test.ts`, so `npm test` runs it. That adds 7 tests: 333 → 340.
- **Design condition, far wasp:** `waspFarGeometry` (16 tris) replaces the bee-shaped far wasp (the 20-tri icosahedron in wasp colours).
  - Shape: two octahedra with a pinched waist; the abdomen is scaled (0.8, 0.8, 1.5).
  - Colour: all dark (body `waspBody`, thorax `waspHead`).
  - I first tried an orange band on the upper front faces. From the battle camera that face reads as bee yellow under deuteranopia, so I removed it. Wasps now read apart from bees by silhouette and value, not hue.
  - `tests/crowdLodFarShapes.test.ts` (3 tests) checks: ≤ 20 tris each; the wasp has a different tri count, is slimmer, and is > 1.3× more elongated than the far bee; its mean luminance is < 0.5× the far bee's. Total is now 343.
- **Screenshots** are in `art/screenshots/crowd-lod-far/`. They come from `art/tools/crowd-lod-far-shots.mjs` (puppeteer, dev server) and `art/tools/crowd-lod-far-post.py` (x4 crops and the deuteranopia filter).
  - Deuteranopia uses the Machado 2009 matrix at severity 1.0 in linear RGB.
  - `model-sheet.png` (and `-deuteranopia`): full / mid 148 / far for all 7 skins and the wasp (before and after), plus the far model at real 24 px and 16 px, shown at 1× and ×6.
  - `clash-{high,low}-wasp-before-after.png`: ?stress=320, phone portrait 540×960. A mixed clash is spawned beyond 0.6 L (bees 0.62–0.71 L, wasps 0.73–0.82 L), the sim is frozen, the crowd switch is forced on, and the crop is shown ×4 normal | deuteranopia. "Before" swaps in the old far wasp mesh.
  - `clash-{high,low}-skins.png`: the same clash for every skin. Raw shots are `battle-<q>-<skin>-wasp-<before|after>-{full,farcrop,farcrop-x4,farcrop-x4-deuteranopia}.png`, with metadata in `shots.json`.
  - Far units are about 10 CSS px on screen at 540×960 (20–30 device px on 2–3× phones). The 16/24 px reads are on the model sheet.
- **Readability findings:**
  - Far bees read as light, round, warm blobs and far wasps as dark, slim, pointed shapes. They stay apart in normal and deuteranopia, on high and low.
  - The old far wasp was already separable by value, but it was a same-shape dark blob.
  - Skin body colours carry through to the far tier (Starter orange, Frost pale cream, Lantern and Maple amber).
  - The far tier drops accessories. Starter's teal star shows at mid (172 tris, on the model sheet) but not at far.
  - The far bee's stripes are mostly lost at 16 px; colour and silhouette carry it.
