# PR 071: fix/perf-lowend-2

Follow-up to PR 068 (QA and review feedback). Base: main `3c940ee` (claim 071 on `20072fd`).

## 1. `?quality` "did nothing" (QA)

- Reproduced on main headless (`docs/perf/lowend2-quality-pin-repro.txt`). The pin **does** work on main: low/med/high give 34/42/44 draws and pixel ratios 0.6/1/1, both before and after play start.
- Root cause of QA's result: their server (port 5182) runs from `/workspace/hivesurge-wt/qa-main`, a detached worktree at **e7abf40, before PR 068**. That build still has the old `QualityScaler`: no `?quality`, with steps down to 0.75. It drops to dpr 0.75 shortly after play starts. **QA: please update `qa-main` to main and re-test.**
- Hardening:
  - The overlay now shows the tier and `(pinned)`/`(auto)`, so a stale build is obvious at a glance.
  - `AutoQuality.onBattleStart()` resets the window and ignores the first 2.5 s of play (shader compiles, GLB swap, scene rebuild), so play-start hitches can't drop a tier.
  - A pinned tier never changes.

## 2. AutoQuality recovery (review)

- It climbs back from floor → low → med → high once there has been sustained headroom: average above 50 fps, against the 28 fps drop line (hysteresis), for at least 6 s since the last change. That 6 s wait doubles each time a climb is undone right away, up to 60 s.
- Only med → high is capped, at one promotion per session.

## 3. Sim timer teardown (review nit)

`startSimTimer()` returns a stop function. `Game.dispose()` cancels the rAF loop, stops the 60 Hz timer and disposes the scene. Dev HMR calls it (`main.ts`).

## 4. Overlay (QA, art)

- Shows the real fps, i.e. the mean over the window to 1 decimal. The median snapped to vsync steps (60/30/20/15), which is why the old readout looked like steps of 5. The median and 1% low are kept alongside.
- Also shows the tier, dpr, calls, tris, **verts** (visible meshes × instances) and units.
- 14 px on two lines, moved to the top-left under the progress bar, clear of the bottom HUD. Screenshot: `docs/perf/lowend2-med-stress750-overlay.png`.

## 5. Overlapping "+2" (QA)

Cause: under a big swarm, the same gate emits many `gate` spawn events per second. Each one had a 15 % chance to spawn a DOM floater at the gate's position, so several "+2" stacked on the same spot. Fix: `FloaterLimiter` allows one floater per gate per 600 ms and at most 3 on screen.

## 6. Crowd LOD (art suggestion, separate commit `bc2513e`)

- Above a per-tier unit count (high 300, med 120, low 0), workers and wasps in the far 60 % of the lane use a 20-triangle icosahedron in the unit's average vertex colour. It uses the same material, so tier swaps still apply; it has no wing flap.
- Queens and hornets are unchanged. Adds 2 draw calls.

Stress 750 units, clover-run, 45 s, headless SwiftShader (`docs/perf/lowend2-crowd-lod-stress750-2026-10-14.txt`). Box loadavg rose from 11-16 (before runs) to 16-23 (after runs), so compare CPU ms/frame:

| Tier | tris before → after | CPU ms/frame before → after | avg fps before → after | median fps before → after |
| ---- | ------------------- | --------------------------- | ---------------------- | ------------------------- |
| low  | 135.7k → 54.0k      | 193 → 120                   | 23.6 → 35.4            | 29.9 → 59.9               |
| med  | 151.5k → 94.6k      | 265 → 165                   | 19.8 → 15.0            | 20 → 20                   |
| high | 157.2k → 60.9k      | 595 → 308                   | 8.9 → 6.4              | 10 → 7.5                  |

Med and high wall fps fell because box load rose during the after-runs. CPU per frame fell 38-48 % on every tier.

## Tests

`tests/perfLowend.test.ts` (21 → 24 in total, new cases):

- climb back from the floor after a spike
- hysteresis (no climb at 45 fps, no climb before 6 s)
- only med ↔ high is capped
- **a pinned tier survives battle start and auto ticks** (every tier, at dpr 0.75)
- play-start hitches don't drop the tier
- crowd-LOD thresholds get cheaper per tier
- the sim timer stops on teardown
- the floater limiter
- overlay text (real fps 24.0, verts, tris)

`npx eslint . && npx prettier --check .` pass (after `npm ci` in the worktree). `npm test` 301/301. `npm run build` passes (initial JS 2.36 KiB gzip, dist 917 KiB). Logs: `docs/perf/lowend2-{lint,test,build}.txt`.

## For art

- The LOD proxy uses the model's average vertex colour. The wasp average reads grey-brown at distance. A dedicated far-LOD colour (or a 2-tone proxy with an orange band) would read better.
- The worker at 220 tris is still the main near-field cost.

## Playtest notes

QA: re-run M2-19a perf on a server from current main (not `qa-main` at e7abf40), with `?debug&quality=low|med|high&stress=320`. The overlay should read `… · low (pinned)`.

Reviewer: `hivesurge-review`

Status: awaiting review + playtest
