# PR (number pending): fix/perf-lowend

Number not claimed yet. `main` is checked out at `/tmp/rev-merge` (the reviewer's merge worktree), so I couldn't add the temporary claim worktree without forcing it, and I didn't force it. Rename this file to `prs/NNN-fix-perf-lowend.md` once a number is claimed. Base: main `5329e56`.

Fixes the low-end perf regression from QA M2-19a (`playtests/m2-19a-2026-10-14.md`): 3-12 fps on software WebGL and input lagging by seconds.

## Root causes (measured, SwiftShader, see `docs/perf/`)

1. **4x MSAA on software GL (main cause).** `antialias: true` is fixed for the life of the context, and the old scaler only lowered the pixel ratio. In one frozen battle frame at pixel ratio 1, the same scene took 670-1050 ms with MSAA and 55-100 ms without (about 8-10x). Main's per-frame CPU cost: 210-252 ms. With the fix on low: 59-64 ms.
2. **Art-pass shading: flat-shaded vertex-colour Lambert everywhere**, lit by a hemisphere light and a sun. Unlit materials alone cut the frame to 82 % of the reference (no MSAA).
3. **Biome props (M3-3): 10 instanced draw calls, about 5.3k triangles at the clover lane.** Backdrop off: 58 % of the reference (noisy). All props off: about 10 fewer draw calls.
4. **Particles drew all 800 instances every frame**, including dead ones scaled to zero (16k triangles). They now draw only up to the highest live particle, within a per-tier budget.
5. **Fog: 81 %** of the reference. **Pixel ratio 1 to 0.75: 57 %.**
6. **Input:** aim was picked in the render loop. The sim ran at most 5 steps per frame and then dropped the remainder, so below 12 fps it ran in slow motion. A tap that started and ended between two frames never fired.
7. Comparison with pre-art `09187e5` on the same box at the same time: preart 10.7-11.1 fps at 212-243 CPU ms/frame. Main 2.2-8.6 fps at 210-252 ms. The "44 fps" on record (`playtests/m1-2026-10-11.md`) came from a quiet box. Today the box runs at a load average of 20-40 on 8 cores (other agents' Chrome GPU processes), which costs about 4x by itself. **Pre-art is also only ~11 fps today.**

There are no shadow maps or post-processing in the game. Draw calls (59-69) were not the bottleneck.

## Changes

- `src/render/quality.ts`: `AutoQuality` replaces `QualityScaler`. It watches a rolling 2 s fps average, with a 2.5 s settle time after each change. Below 28 fps it steps down **high → med → low → low at pixel ratio 0.5**. Above 55 fps it steps up at most once per session. The starting tier comes from the renderer type: software renderers (SwiftShader, llvmpipe, etc., via `WEBGL_debug_renderer_info`) start on low.
  - high: MSAA (hardware only), Lambert lighting, fog, all props, 800 particles, pixel ratio ≤ 2.
  - med: pixel ratio ≤ 1, no fog, no backdrop props, 300 particles.
  - low: unlit MeshBasic twins (vertex colours and the wing-flap shader patch kept), lights off, no biome props, 120 particles, pixel ratio 0.6 (0.5 at the floor).
  - `?quality=low|med|high` pins a tier and turns auto scaling off. It works in all builds and has no economy or ads effect.
- `src/render/scene.ts`: `applyQuality()`, `probeRendererName()`, and an `antialias` option. Backdrop props get their own instanced meshes (clover: same call count; orchard: +2).
- `src/render/particles.ts`: budget, and only live instances are drawn.
- `src/ui/input.ts`: pointer aim is applied in the event handler (`setPicker`). A press is latched until the sim consumes it with `takeFire()`, so taps never get lost.
- `src/sim/fixedStep.ts` + `src/game.ts`: the fixed-step sim runs on real time. It is pumped by rAF and by a 60 Hz timer, catches up to 250 ms, and pauses when the tab is hidden. It no longer slows down at low fps.
- `scripts/perf-bench.mjs`, `scripts/perf-ablate.mjs`: the bench and ablation tools. `docs/perf/*.txt` holds the evidence.

## Results (60 s headless SwiftShader, clover-run, 1280x800; box loadavg 20-29)

| Build / tier          | avg fps   | median fps | CPU ms/frame | pointer → handler, median / p95 | pointer → next frame, median / p95 |
| --------------------- | --------- | ---------- | ------------ | ------------------------------- | ---------------------------------- |
| preart 09187e5        | 10.7-11.1 | 12         | 212-243      | 51-56 / 162-170 ms              | 43-45 / 152-158 ms                 |
| main 7673566          | 2.2-8.6   | 10-12      | 210-252      | 54-115 / 301-1795 ms            | 45-105 / 285-1775 ms               |
| fix ?quality=high     | 13.2      | 15         | 241          | 43 / 116 ms                     | 34 / 109 ms                        |
| fix ?quality=med      | 23.2      | 29.9       | 131          | 23 / 97 ms                      | 15 / 89 ms                         |
| fix ?quality=low      | 21.8-42.3 | 30-59.9    | 64-80        | 13-23 / 38-214 ms               | 8-16 / 32-206 ms                   |
| fix auto (→low@floor) | 11.0-28.6 | 20-30      | 59-78        | 18-42 / 99-347 ms               | 11-32 / 89-331 ms                  |

Target (≥ 30 fps avg over 60 s): **met on low in run 2 (42.3 avg, 59.9 median)**. It is not reliably met on this box under the current co-tenant load: auto reached 28.6 avg / 30 median, and low reached 21.8 in run 1. CPU cost per frame is down 3.3-3.6x against main (210-252 → 59-64 ms). On a quiet box that is well above 30 fps. Note that auto can step to the 0.5 floor during a load spike and only steps back up once.

## Tests

`tests/perfLowend.test.ts` (14): override parsing, software detection and starting tier, tiers strictly cheaper, the step sequence and floor, settle and window, a single hitch doesn't drop, no ping-pong, a pinned tier never changes, the fixed-step sim runs 60 steps/s at 60/12/5/4 fps, the catch-up cap, stop at battle end, aim applied in the pointer handler without any frame, a sub-frame tap fires once, disabled/reset. `tests/foundations.test.ts`: the scaler test now covers AutoQuality.

`npx eslint . && npx prettier --check .` pass. `npm test` 289/289. `npm run build` passes (initial JS 2.36 KiB gzip, dist 914 KiB). The shared checkout has no node_modules (`/usr/bin/eslint` is 6.4.0), so I ran `npm ci` in this worktree. Under box load, `sizeBudget.test.ts` once hit the 5 s timeout. It passes on re-run and in the full run.

## For art

- Flat shading plus vertex colours on every prop and unit is fine on GPUs. On low we drop the lighting, so props and units should still read without it: keep strong albedo contrast in the vertex colours.
- Backdrop hills and bushes (and orchard trees) cost the most per pixel for the least gameplay value. Fewer, larger, lower-poly pieces would help med. Unit meshes: worker 220 tris, queen 270, wasp 130, hornet 142. At 300+ units these dominate, so worker ≤ 150 would help.
- Gate label plates are large, transparent and drawn with depthTest off (overdraw). Keep their size on low, but avoid extra transparent layers.

## Playtest notes

Needs a real device (M2-19b, Mohit) to check high/med on a GPU and that auto doesn't drop tiers on mid-range phones. QA: `?quality=low|med|high` and `?debug` shows fps and pixel ratio (the tier is on `window.__hsGame.qualityTier` in dev).

Reviewer: `hivesurge-review`

Status: awaiting review + playtest
