# PR 078 — art/bee-antenna-fix (base: main @ ff371fc)

DES-approved. The full-size worker bee's antenna tips floated: each stalk was aimed away from its
teal tip (largest tip-to-stalk gap 0.26 units).

- **Fix (`src/art/models.ts`):** `stalkBetween(a, b)` builds each 3-sided stalk from inside the head
  straight to the tip. Tip positions, sizes and colours are unchanged, and so is the triangle count
  (worker still **220 tris**), so the silhouette and colours of Classic stay the same; only the
  stalk direction changes.
- **Shared bodies:** the queen and every skin (Starter Gold, Blossom, Sunny, Maple, Frost, Lantern)
  build on `beeGeometry`, so they get the fix automatically. No skin accessory sits on the antennae,
  so none needs its own change. All stay ≤ 300 tris.
- **Test:** `tests/beeAntenna.test.ts` checks the worker, the queen and every skin with the shared
  helper `tests/helpers/antenna.ts`. That helper is the same tips-on-stalks check as the crowd-LOD
  test in PR 073, which can switch to it once both are merged. It fails on main (gap 0.26) and passes
  here.
- **Assets:** re-exported unit-bee, unit-queen and all 7 `skin-bee-*` GLBs. All 33 GLBs rebuild
  byte-identical (`art/models/REBUILD-LOG.md`). Picker previews `public/assets/skins/{classic,starter}.png`
  re-rendered. `art/PROVENANCE.md` regenerated.
- **Screenshots:** `art/screenshots/antenna/antenna-before-after.png` (every skin, before | after, each with
  Classic alongside) and the individual `before-<skin>.png` / `after-<skin>.png`.
