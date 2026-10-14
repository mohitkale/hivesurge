# PR 070 — art/perf-audit (base: main @ db68b38)

Number 070 was assigned by review, which is fixing INDEX; this branch does not touch INDEX. It was
rebased onto main after eng's PR 068 (`fix/perf-lowend` 6a0cc28, merged as db68b38). The
pre-rebase history is kept at `backup/art-perf-audit-pre-rebase-070`.

Commits, in order:

1. the vertex-sharing fix (code + tests only);
2. the audit doc, tools and data;
3. the doc update after 068 (eng items done or taken), low-tier art notes and readability shots;
4. **PROPOSED** worker crowd LOD model (124 tris), **needs DES sign-off**; eng owns the switch.

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
- Engine side: particles and AA/DPR were done by eng in 068; eng is taking the crowd-LOD switch and overlay vertex counts.
