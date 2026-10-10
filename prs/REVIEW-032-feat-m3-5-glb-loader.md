# Review: PR 032 feat/m3-5-glb-loader @ b315f66 (2026-10-11)

**Verdict: approved, merged (--no-ff) as 84d25d3.**

- **Fallback.** `loadModelLibrary` never rejects. Loader import, fetch, parse and timeout (8 s) failures all leave the model missing, and `GameScene.model()` falls back to the procedural geometry. `?assets=off` forces the fallback. Logs in `/workspace/hivesurge-artifacts/m3-5/glbcheck-2fca17f.log` show three runs (on: all 5 models 200; block: all 5 failed, procedural fallback warnings; off: no fetch). Each run reached "Nest broken!" with 0 page errors.
- **Asset paths.** The 5 runtime GLBs moved from `art/models` to `public/assets/models`, which yields `dist/assets/models/*.glb`. The URL uses `import.meta.env.BASE_URL`, so subpath deploys work. The export tool writes runtime models to `public/`.
- **Bundle.** GLTFLoader (44.3 kB / 13.2 kB gz) and the meshopt decoder (26.5 kB / 7.3 kB gz) are lazy chunks, kept out of `three` by `manualChunks`. Initial JS is 2.26 KiB gzip. The game chunk is 77.8 kB (26.3 kB gz, +7.7 kB), three is 577.3 kB (143.7 kB gz, +30 kB raw, because GLTFLoader references more core classes). dist is 898 KiB, within the 5 MiB budget.
- **Checks.** Lint passes, 170 tests pass, build and size budget pass, no secrets.
- **Nits:**
  - The first scene is always procedural, and GLBs apply from the next battle onward. This is intentional (no wait on assets) but should be noted for art QA.
  - Watch the three chunk growth.
