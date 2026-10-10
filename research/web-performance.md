# Web-game performance best practices (Three.js, mobile)

## Current Hive Surge state (measured 2026-10-11)

`dist/` = 588 KB total (main JS 568 KB uncompressed); `InstancedMesh` used in `src/render/scene.ts` and `particles.ts`; pixel ratio already capped at 2.

## Load size

- Poki: target initial download < 8 MB ([Poki requirements](https://sdk.poki.com/new-requirements)); engine guide says ≤ 5 MB initial, ≤ 8 MB total, notes Three.js' very small file size ([Poki engine guide](https://developers.poki.com/guide/web-engine)).
- CrazyGames: initial ≤ 50 MB, **≤ 20 MB for mobile homepage**, total ≤ 250 MB / 1,500 files; measured up to SDK `gameplayStart` ([CrazyGames technical](https://docs.crazygames.com/requirements/technical/)).
- Progressive loading (essentials first, rest in background) is "one of the most important techniques"; "drop-off during loading is brutally underestimated" ([Poki onboarding](https://developers.poki.com/guide/easy-access)). Serve Brotli ([CrazyGames loading tips](https://docs.crazygames.com/resources/getting-to-the-first-frame/)).

## Draw calls & instancing

- Benchmark: 10,000 Meshes = 10,001 draw calls, 10.3 ms CPU/frame; one InstancedMesh = 2 calls, 0.16 ms ([spareilleux benchmark](https://spareilleux.github.io/learn/threejs/08-performance-instancing-batching-lod/)).
- Budget guidance: < 100 draw calls mobile, < 500 desktop; ~200k triangles low-end mobile; cap DPR at 2 ([MasterAllArts](https://masterallarts.com/learn/threejs-from-zero/09-performance-instancing-lod/)) — tutorial heuristics, verify on device.
- Recompute bounding sphere after `setMatrixAt` or frustum culling can drop the whole mesh ([three.js InstancedMesh docs](https://three.needle.tools/docs/pages/InstancedMesh.html)); set `instanceMatrix.needsUpdate`.
- One geometry → InstancedMesh; many geometries → BatchedMesh; InstancedMesh better above ~100k instances ([three.js forum](https://discourse.threejs.org/t/how-to-choose-between-instancedmesh-and-batchedmesh/81221)). LOD for many tiny objects can cost more CPU than it saves (spareilleux).
- Measure with `renderer.info.render.calls`/`triangles` before optimizing.

## Textures (mobile)

- KTX2/Basis: GPU-compressed, 4–8× less VRAM than PNG/JPEG; a 4096² RGBA texture with mips ≈ 90 MB ([Don McCurdy](https://www.donmccurdy.com/2024/02/11/web-texture-formats/)). Use `KTX2Loader.detectSupport(renderer)` ([three.js docs](https://github.com/mrdoob/three.js/blob/dev/docs/pages/KTX2Loader.html)).
