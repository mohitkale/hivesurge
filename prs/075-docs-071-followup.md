> PR 075: follow-up to PR 071 (docs + dev-only perf overlay).

# PR 071: fix/perf-lowend-2

Follow-up to PR 068 (QA and review feedback). Base: main `3c940ee` (claim 071 on `20072fd`). Merged: `7f683c2` only. Follow-up branch `docs/071-followup` is based on main `ff371fc`.

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
- 14 px on two lines, moved to the top-left under the progress bar, clear of the bottom HUD.

## 5. Overlapping "+2" (QA)

Cause: under a big swarm, the same gate emits many `gate` spawn events per second. Each one had a 15 % chance to spawn a DOM floater at the gate's position, so several "+2" stacked on the same spot. Fix: `FloaterLimiter` allows one floater per gate per 600 ms and at most 3 on screen.

## 6. Crowd LOD: superseded

The crowd LOD that was proposed in this PR was dropped. Review merged only `7f683c2`, and design approved art's LOD instead (PR 073). This PR carries no LOD code, evidence or numbers.

## Follow-up (branch `docs/071-followup`)

- This doc and the `docs/perf/lowend2-*` evidence, added after the merge, with the LOD material removed.
- Review nit: the perf overlay is now dev-only, like `?debug` and the other QA params:
  - `perfEnabledFromUrl(search, isDev)` returns false in production.
  - `game.ts` builds the overlay and the F3 toggle only behind `import.meta.env.DEV`, so production strips them.
  - Tests: `tests/perfStats.test.ts` adds a prod-ignores-`?debug` test and a source guard.
  - Check: the production `dist/` contains no `perf-overlay` (`docs/perf/lowend2-prod-strip.txt`).

## Tests

`tests/perfLowend.test.ts` (21 tests; new cases):

- climb back from the floor after a spike
- hysteresis (no climb at 45 fps, no climb before 6 s)
- only med ↔ high is capped
- **a pinned tier survives battle start and auto ticks** (every tier, at dpr 0.75)
- play-start hitches don't drop the tier
- the sim timer stops on teardown
- the floater limiter
- overlay text (real fps 24.0, verts, tris)

`npx eslint . && npx prettier --check .` pass (after `npm ci` in the worktree). `npm test` and `npm run build` pass on the follow-up branch. Logs: `docs/perf/lowend2-{lint,test,build}.txt`.

## For art

- Unit LOD: see PR 073.

## Playtest notes

QA: re-run M2-19a perf on a server from current main (not `qa-main` at e7abf40), with `?debug&quality=low|med|high&stress=320`. The overlay should read `… · low (pinned)`.

Reviewer: `hivesurge-review`

Status: 7f683c2 merged; follow-up (docs + dev-only overlay) awaiting review
