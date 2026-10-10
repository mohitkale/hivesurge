# PR 032 (number pending claim) — feat/m3-5-glb-loader (M3-5; base: main ad1b7d3, after the 009–030 stack merge)

**Summary:** The battle scene now loads the art team's meshopt GLBs at runtime: bee, queen, wasp, hornet and cannon.
Every model falls back to the procedural geometry from `src/art/models.ts` if it fails to load, so the game never
waits on assets.

**Changes**

- `src/art/glbLoader.ts`
  - `loadModelLibrary()` never rejects. The fetch, the decoder load and each parse have an 8 s timeout. Failed models
    are simply missing from the result.
  - `GLTFLoader` and the meshopt decoder are dynamically imported, so they sit in their own lazy chunks.
  - Each GLB is converted back to the procedural attribute layout: float, non-indexed, with the quantization node
    transform applied, RGB colours, `aWing`, and faceted normals.
  - `?assets=off` forces the procedural models.
- `GameScene` takes an optional `ModelLibrary`. `model()` uses the GLB scaled like the procedural `scale` argument,
  or the procedural geometry if that model didn't load. `glbUsed` lists which models came from GLB.
- `Game` starts loading in the background at boot. The next scene build (battle start) uses whatever has loaded.
- `vite.config.ts`: `three/examples` is excluded from the `three` manual chunk so the loader stays lazy.
- **Assets:** the 5 runtime GLBs move to `public/assets/models/` (40 KB). The other 21 (biome props and skins, not yet
  loaded at runtime) stay in `art/models/`, keeping the rule that nothing unused ships.
  - `export-assets.ts` writes each file to the matching folder.
  - The `tests/art-assets.test.ts` check now says: shipped GLBs = `RUNTIME_MODELS`, and the total is ≤ 1.5 MB.
- Tests (`tests/glbLoader.test.ts`) parse the real GLBs in node.
  - All 5 load with float attributes, and their bounds match the procedural models within 0.02.
  - The rebuilt wing share matches the procedural one within 1 percentage point, with left/right signs correct.
  - Network errors, a hang (timeout) and garbage bytes all give an empty library.
  - A partial failure keeps the models that did load. Scaling and the URL flag are covered too.

**Bug for art: the GLB export drops the wing-flap tag.** `art/tools/export-assets.ts` writes the `aWing` attribute as
`_WING`, but after `gltfpack -cc -kv -km` the GLBs no longer contain it. Only POSITION, NORMAL and COLOR_0 are left.
Without it, wings would not flap. As a workaround, the loader rebuilds `aWing` from the wing colours (`ART.beeWing`,
`ART.waspWing`, ±3/255 after 8-bit colour quantization) and the vertex x sign. This only works while no body part uses
a wing colour; the test above catches drift.

Proposed fix (art): keep `_WING` through gltfpack. Check whether a newer gltfpack keeps custom attributes with `-kv`,
or skip `-cc`/quantization for that stream. Then the loader can read `_WING`, which GLTFLoader maps to `_wing`, and
drop the colour heuristic.

**Headless browser check** at `2fca17f` (Chrome via `vite preview`, 390×844, one full battle each). Logs and
screenshots are in `/workspace/hivesurge-artifacts/m3-5/` (`glbcheck-2fca17f.log`).

| Mode                         | GLB requests                                          | Battle result screen | Page errors | texImage3D warnings |
| ---------------------------- | ----------------------------------------------------- | -------------------- | ----------- | ------------------- |
| assets loaded                | 5 × 200                                               | reached              | 0           | 0                   |
| GLBs blocked (request abort) | 5 × failed, `[assets] … procedural fallback` warnings | reached              | 0           | 0                   |
| `?assets=off`                | none                                                  | reached              | 0           | 0                   |

The loaded and `?assets=off` battle screenshots look the same, as expected, because the GLBs were exported from the
same procedural models.

**Sizes** (with the merged M2-16 budget script): initial JS 2.26 KiB gzip, within the 1 MiB limit. dist is 898 KiB,
within the 5 MiB limit.

- **Lazy chunks:** `GLTFLoader` 44.27 kB (13.17 gzip) and `meshopt_decoder` 26.48 kB (7.26 gzip). These are new.
- **three chunk:** 577.27 kB (143.72 gzip). It is about 33 kB bigger, because core classes the loader references are
  no longer tree-shaken.

**Not done (follow-ups):**

- LOD.
- Runtime loading for biome props and skins. Those GLBs stay in `art/models/` until a runtime path uses them.

**Test results:** `npm run lint` pass · `npm test` 170/170 · `npm run build` pass.

**Acceptance (PLAN M3-5):**

- The game runs if assets fail to load: met (blocked and off modes).
- Build budget from M2-9 kept: met.
- Loader + fallback: met.
- LOD: not done.

**Reviewer:** hivesurge-review

**Status:** awaiting review
