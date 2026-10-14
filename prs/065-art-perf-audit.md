# PR 065 — art/perf-audit (base: main @ 1527478)

Number claimed on main in `fa3e596` (a one-line INDEX commit, decision 37).

**What:** the audit of the fps drop after the M3 art pass (`art/PERF-AUDIT.md`) plus fix #1, the
safe art-side one.

- Root cause: the faceted unit models are non-indexed (3 vertices per triangle plus normals), about 3× the vertex work of the
  pre-art spheres. The scene is vertex-bound at 500 units. Props, biomes, GLB vs procedural, shadows (none) and
  transparency are not the cause.
- Fix: `gpuCompact()` in `src/art/models.ts` (index plus no normals, flat shading unchanged), applied in `bake()` and in
  `src/art/glbLoader.ts`. Bee 660→167 verts. Triangles and image unchanged. Render time −28% in the headless A/B
  (on a noisy box).
- GLBs are byte-identical (export uses `setBakeCompaction(false)`). Provenance is unchanged.
- Tests: `tests/perfCompact.test.ts` (new); `tests/glbLoader.test.ts` updated for the indexed, normal-less layout.
- Tools: `art/tools/perf-audit.mjs`, `art/tools/perf-ablate.mjs`. Data: `art/perf/`.
- Engine-side fixes are listed for eng in PERF-AUDIT.md §"For eng" (particles, AA/DPR, crowd LOD).
