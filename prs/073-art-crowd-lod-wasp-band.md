# PR 073 — art/crowd-lod-wasp-band (base: art/perf-audit @ 4eff666)

Base note: branched from `art/perf-audit` at `4eff666`, which is what review merges for PR 070. Rebase onto
main once 070 is merged. Both items are DES-approved. Number 073 was assigned by review; no INDEX change from this branch.

1. **Worker bee crowd LOD:** `beeCrowdGeometry()` (cherry-picked from 7521cc0) plus a fix. Each antenna
   is now one stalk segment with the teal tip placed on the stalk end. Before, the stalks were dropped
   and the tips floated. 148 tris (≤150). Tests: budget, wings, palette, size, tips sit on the stalks.
   Shots: `art/screenshots/perf/bee-crowd-lod.png` (full | LOD) and
   `readability-low-lod-crop.png` (low-tier crowd). Eng owns the switch.
2. **Wasp band survives the unlit low tier:** band `#ff7f3a` (was `#ff7a1a`; brighter and slightly
   redder). The wasp abdomen goes to 4 rows with a matching band period, so there are 2 real bands
   instead of an aliased tail tip. Wasp 154 tris, hornet 166. `tests/waspBand.test.ts`: hue 10–25°
   (red-orange), ≥20° from bee yellow, ≥25° hue gap and ≥3:1 vs trap `#a10f2a`, brighter than before,
   ≥5:1 on the wasp body. `tests/art.test.ts` (bee vs wasp value contrast) and `tests/gate-contrast.test.ts`
   pass. GLBs re-exported (unit-wasp, unit-hornet, prop-nest, which shares the band colour); all 33
   rebuild byte-identical; provenance regenerated.
   - Before/after: `art/screenshots/perf/wasp-band-sheet-before-after.png` (close-up, lit | unlit),
     `wasp-band-low-zoom-before-after.png`, and `wasp-band-{before,after}-low{,-crop}.png`. Tool:
     `art/tools/wasp-band-sheet.html`.
