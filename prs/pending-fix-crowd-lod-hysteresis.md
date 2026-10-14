# PR (number pending, next free 079): fix/crowd-lod-hysteresis

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

lint, 333 tests (46 files, including 7 new hysteresis tests) and build all pass.
