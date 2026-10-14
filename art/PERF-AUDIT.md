# Perf audit: fps drop after the M3 art pass

Owner: hivesurge-art · branch `art/perf-audit` (PR 065) · base `main` @ `1527478` · 2026-10-14 IST.

## How it was measured

- Headless Chrome with SwiftShader (software GL), 540×960 viewport, DPR 0.75 (the game's own clamp
  in this setup), canvas 405×720. The vite dev server provides the `__hsScene` hook.
- `?stress=500` (the dev stress mode that keeps ~500 units alive), seeded post-FTUE save, then
  play → home → play again so the runtime GLBs are loaded (they load after the first battle).
- `art/tools/perf-audit.mjs`: frame-time median/p99 plus a scene inventory (draw calls, triangles,
  materials, programs, transparency, shadows, per-mesh instance counts).
- `art/tools/perf-ablate.mjs`: **render-cost attribution**. It freezes the scene, then times
  `renderer.render` (synced with a 1 px `readPixels`) for: everything / no particles / no props /
  no units / particles drawn at live count / half pixel ratio. Configs are interleaved over
  5 rounds and the median is taken. Raw data: `art/perf/*.json*`.
- **Caveat:** the shared box ran at load ~35 on 8 cores during the runs, so absolute ms (and fps) are
  meaningless and run-to-run noise is about ±30%. Treat the numbers as **relative only**, within one
  run. Re-run on a quiet device or a real GPU before quoting fps.

## Scene inventory at ~500 units (same for clover and orchard, assets on and off)

| item                  | value                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| draw calls            | 44–45 (10 biome prop InstancedMeshes, 4 unit InstancedMeshes, 1 particle mesh, lane/rails/gates/hive/nest/cannon)                                |
| triangles / frame     | 110–150k, depending on how many bees are alive                                                                                                   |
| units                 | worker bee **220 tris**, queen 270, wasp **130**, hornet 142. Typical stress state: 359 bees + 250 wasps = **~111k tris (≈83%)**                 |
| particles             | 800 instances × 20 tris = **16k tris, always drawn** (dead ones are scaled to 0), transparent                                                    |
| biome props           | ~5.8k tris, 10 draw calls (budget 30k / 12), all instanced, opaque                                                                               |
| materials / programs  | 23 materials, 9 shader programs                                                                                                                  |
| transparent materials | 5: particles, gate panels, gate labels (depthTest off)                                                                                           |
| shadows               | **none**: `renderer.shadowMap.enabled = false`, no `castShadow`/`receiveShadow` anywhere, so there is no shadow-map size to tune                 |
| instancing            | **works**: one InstancedMesh per unit type, `count` = live units, one draw call each, wing flap on the GPU (`aWing`)                             |
| `?assets=off` vs on   | **identical** geometry and triangle counts (the GLBs decode to the same meshes), and the same draw calls. GLB vs procedural is **not** the cause |
| per biome             | clover and orchard differ by <10 tris and 0 draw calls. Biomes are not the cause                                                                 |

## Root cause

The art pass replaced the pre-art units (indexed `SphereGeometry(…,10,8)`: **99 vertices**, plus a
separate transparent wing InstancedMesh of 2 × 63 vertices) with faceted, vertex-coloured models
built **non-indexed**: 3 unique vertices per triangle plus a computed normal per vertex. A worker
bee went from ~225 to **660 vertices**, each running the wing-flap vertex shader, so vertex work per
unit roughly tripled. With ~600 units that is the dominant cost. Ablation agrees: hiding just the
units removes **~65–75%** of render time in every case, while removing props changes nothing
measurable and halving the pixel ratio saves ≤15%. That makes this vertex-bound, not fill-bound.

## Ranked fixes

| #   | fix                                                                                                                                                                                                                                                                                                                                                             | owner                                          | status                                               | expected / measured                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | **Index the faceted models and drop the normal attribute** (`gpuCompact` in `src/art/models.ts`, used by `bake()` and the GLB loader). All materials are `flatShading: true`, which derives face normals in the fragment shader, so the image is unchanged. Bee 660→**167** verts, queen 810→210, wasp 390→93, hornet 426→103 (~4× fewer). Triangles unchanged. | art                                            | **done (this PR)**                                   | render time −28% overall, units' share −29% (median of the means below) |
| 2   | **Particles: draw only live particles.** Keep a live high-water mark and set `mesh.count`, or compact the live ones to the front. Skip `update()` when none are alive, since it currently writes 800 matrices every frame even when idle. Removes up to 16k transparent tris and 800 matrix writes per frame.                                                   | **eng** (`src/render/particles.ts`)            | listed                                               | 5–15% render plus CPU per frame                                         |
| 3   | **MSAA + DPR on low-end:** `antialias: true` with DPR up to 2. Make AA/DPR adaptive (drop to DPR 1 without AA when the median fps < 50). `fix/perf-lowend` may already cover this, so reconcile with it.                                                                                                                                                        | **eng** (`src/render/scene.ts` renderer setup) | listed                                               | large on fill-bound phones, small here (vertex-bound)                   |
| 4   | **Cheaper unit LOD for crowds:** when > 300 units are alive, swap workers to a ~100-tri LOD, such as the same silhouette without the antennae/cheek dabs. Needs a DES look sign-off, because it is a visual change.                                                                                                                                             | art model + **eng** switch                     | proposed, not done                                   | ~−50% unit vertices again                                               |
| 5   | Wasp/bee tri trim (bee 220 → ~160 via a 7×5 abdomen). Visual change, so it needs DES.                                                                                                                                                                                                                                                                           | art                                            | proposed, not done                                   | ~−25% bee tris                                                          |
| 6   | Props / biomes / transparency / shadows                                                                                                                                                                                                                                                                                                                         | —                                              | **no action**: within budget, measured as negligible | —                                                                       |

### Before → after (#1), same session, same headless setup, `?stress=500`, ms per isolated render (lower is better)

| case                                | before  | after (run 1)  | after (run 2) |
| ----------------------------------- | ------- | -------------- | ------------- |
| clover, assets=off                  | 187.6   | 150.8          | 182.4         |
| clover, assets=on                   | 292.8   | 151.7          | 162.5         |
| orchard, assets=on                  | 171.5   | 185.6          | 109.8         |
| **mean**                            | **217** | **157** (−28%) |               |
| units' share (all − no-units), mean | 150     | 107 (−29%)     |               |

The noise is visible: one orchard "after" run was slower than "before". The direction is
consistent in 5 of 6 pairs. Vertex counts are exact and are enforced in `tests/perfCompact.test.ts`.

## Safety of #1

- Per-corner position, colour and wing data are identical to the old geometry (to < 1e-6;
  `tests/perfCompact.test.ts`). Triangle counts are unchanged, and the wing share of GLB vs
  procedural models is still checked.
- GLB export uses the uncompacted geometry (`setBakeCompaction(false)` in `export-assets.ts`), so
  **all 32 GLBs rebuild byte-identical** (`art/models/REBUILD-LOG.md`) and provenance is unchanged.
- Every material that draws these geometries is `MeshLambertMaterial({ flatShading: true })`
  (units, props, cannon, nest). If anyone adds a smooth-shaded material for them, normals must be
  recomputed with `toNonIndexed().computeVertexNormals()`.

## For eng (engine-side list)

1. `src/render/particles.ts`: live-count drawing and an idle skip (#2).
2. `src/render/scene.ts` renderer: adaptive AA/DPR on low fps (#3), coordinated with `fix/perf-lowend`.
3. A crowd LOD switch in `syncUnits` (#4), once art delivers the LOD model.
4. Optional: `PerfStats` could also log vertex counts (`renderer.info` only reports triangles), which
   would have caught this regression.
