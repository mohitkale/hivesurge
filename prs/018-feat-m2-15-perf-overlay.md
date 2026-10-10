# PR 018 — feat/m2-15-perf-overlay (M2-15; base: feat/m2-13-guardrails, PR 017)

_Number claimed in `prs/INDEX.md` on main (commit `24aabd7`)._

**Summary:** Adds a dev perf overlay showing median fps, 1% low fps, draw calls (`renderer.info.render.calls`) with the
peak, triangles with the peak, unit count and DPR (research PERF-A). It is off by default: open it with `?perf` or
toggle it with F3. `?stress=N` keeps about N units alive for perf runs. The lane-edge flowers are now one instanced
mesh, which cuts static draw calls from about 109 to 63.

**Changes**

- `src/ui/perfStats.ts`: pure `PerfStats` (rolling window, median and 1% low fps, last and peak calls and triangles),
  plus the `?perf` and `?stress` URL parsing (stress clamped to 1000).
- `src/ui/perfOverlay.ts` + `style.css`: overlay updated 4×/s. It exposes `data-calls`, `data-peak-calls`,
  `data-fps` and `data-units` for automated QA (M2-10).
- `src/game.ts`: samples `renderer.info` after each render while visible. With `?stress=N` it tops up units every
  frame: bees from the hive, wasps from the nest.
- `src/render/scene.ts`: the 52 flower meshes become one `InstancedMesh` with `setColorAt`, so the look is unchanged.
- `tests/perfStats.test.ts`: 3 tests.

**Measurements** (puppeteer-core in `/tmp`, Chrome headless with SwiftShader software GL, Pixel-7-like mobile
emulation 390×844 at DPR 3, `vite preview`, Clover Run, holding fire):

| Run                                      | Max units seen | Peak draw calls | Notes                                 |
| ---------------------------------------- | -------------- | --------------- | ------------------------------------- |
| Before flower instancing, `?stress=500`* | 89             | 109             | *stress not yet sustained (see below) |
| After, `?stress=0` (normal play)         | 92             | 64              | tris peak 51.2k                       |
| After, sustained `?stress=500`           | 853            | 63              | tris peak 278.0k                      |

\* The first stress version spawned units once, so they mostly destroyed each other within a second.

Draw calls don't depend on unit count, because units are instanced. The fps numbers (9–30) come from CPU software
rendering in a container and say nothing about phones. Real-device fps belongs to QA in M2-10.

**Test results:** `npm run lint` pass · `npm test` 117/117 · `npm run build` pass, live-key guard clean. Entry 5.17 kB
(2.28 kB gzip), game 55.96 kB (18.97 kB gzip), three 540.94 kB (134.79 kB gzip). Size budget: initial 2.25 KiB gzip,
dist 593.7 KiB (approximately; see the build log).

**Acceptance (PLAN M2-15):**

- Peak swarm (500 units) on mobile emulation ≤ 100 draw calls: met (63 at 500–853 units).
- The value is logged by QA in the M2-10 report: still for QA to do.

**Reviewer:** hivesurge-review

**Status:** awaiting review
