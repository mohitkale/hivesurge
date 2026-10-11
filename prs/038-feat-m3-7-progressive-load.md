# PR 038 — feat/m3-7-progressive-load (M3-7; base: main fb29824)

**Summary:** Progressive loading (PLAN M3-7, research PERF-C). The first battle needs only the core JS. M3 art (the M3-5
GLBs) and audio (the Opus cues) are requested only after the first `gameplayStart`. Until they arrive, the battle runs
on procedural models and synth audio, the same fallback M3-5 uses when assets fail. The GLBs are then swapped into the
running scene.

**Changes**

- `src/platform/deferredAssets.ts`
  - `DeferredAssets` runs its tasks once, on the first `onGameplayStart()`. A throwing task does not stop the others.
  - `FIRST_BATTLE_MARK` (`hs:first-battle`) is a `performance.mark` set when the first battle starts.
- `src/game.ts`
  - The M3-5 GLB load at boot is removed. `startBattle()` calls `platform.gameplayStart()`, marks the first battle,
    then starts the deferred tasks.
    - **Models:** `loadModelLibrary()` runs, then `scene.applyModels()`. `?assets=off` still disables it.
    - **Audio:** `sfx.loadCues()` runs.
  - Later scene builds use `this.models` as before.
- `src/render/scene.ts`: `applyModels(lib)` swaps GLB geometry into the live unit InstancedMeshes and the cannon
  barrel. It uses the same scales as the build path; models that failed keep their procedural geometry.
- `src/audio/sfx.ts`: `unlock()` no longer fetches the cues. The new `loadCues()` fetches them, or waits for the
  AudioContext if it doesn't exist yet. Each cue keeps its synth fallback.
- `tests/deferredAssets.test.ts`: covers "not before gameplayStart", "exactly once" and "one failing task doesn't stop
  the others".
- `playtests/m3-7/load-test.mjs`: the acceptance harness.
  - Headless Chrome with puppeteer `PredefinedNetworkConditions['Fast 4G']`, cache disabled, a fresh browser context
    per run, 390×844.
  - Reads the `hs:first-battle` mark and every resource entry, and flags M3 assets (`/assets/{models,audio,icons,ftue}/`).
  - Writes `*-timing.txt` and `*-network.txt`, and exits 1 on failure.

**Evidence** (`vite preview` of this branch, 3 runs): `playtests/m3-7/fast4g-timing.txt` and
`playtests/m3-7/fast4g-network.txt`.

| Run | First battle | DOMContentLoaded | Transferred before battle | M3 assets before / after battle | Page errors |
| --- | ------------ | ---------------- | ------------------------- | ------------------------------- | ----------- |
| 1   | **913 ms**   | 378 ms           | 169.5 KiB                 | 0 / 14                          | 0           |
| 2   | **932 ms**   | 362 ms           | 169.5 KiB                 | 0 / 14                          | 0           |
| 3   | **848 ms**   | 361 ms           | 169.5 KiB                 | 0 / 14                          | 0           |

- **Before the first battle:** only the core JS and CSS load (`index`, `index.css`, `game`, `three`).
- **After the battle starts:** the 9 Opus cues and the GLTFLoader and meshopt decoder chunks start straight away. The
  5 GLBs start about 1.1 s later and are done by about 2.2 s.
- On main before this PR, by code inspection: GLBs were requested at boot from the `Game` constructor, and audio on
  `unlock()` (the Play tap). The baseline harness can't time main because main has no first-battle mark.
- **Returning players:** the first battle starts from the title Play button. Nothing is fetched on the title screen,
  because loading is tied to `gameplayStart`. The harness covers the fresh-profile FTUE path, where the battle
  auto-starts.

**Not measured:** CPU throttling. The headless swiftshader run is not a device, so CPU timing would need a real
phone; that fits with M2-19b.

**Checks:** `npm run lint` pass · `npm test` 172/172 · `npm run build` pass. Size budget: initial JS 2.26 KiB gzip
(limit 1 MiB), dist 899 KiB (limit 5 MiB). The live-key guard is clean.

**Acceptance (PLAN M3-7):**

- First battle in 3 s or less on throttled Fast 4G: met (848–932 ms).
- No M3 assets before the first battle in the network log: met (0 in every run).

**Reviewer:** hivesurge-review

**Status:** awaiting review
