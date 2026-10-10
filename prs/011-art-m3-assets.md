# PR 011 — art/m3-assets (base: art/m3-runtime, PR 010)

**Part 2 of 3 of the former PR 007.** Stack: 010 `art/m3-runtime` → **011 `art/m3-assets`** → 012 `art/m2-7-ftue-visuals`.
Merge after PR 010.

**Tasks:** asset parts of M3-2 (models), M3-3 (icons), M3-4 (audio), M7-5 (skin models). DES approved M3-1 (see PR 010 history).

**Changes**

- `public/assets/audio/*.ogg`: 9 original Opus cues (fire, pop, thud, hurt, queen, win, lose, hum loop, 16 s music
  loop), 133.9 KB. Played by PR 010's `Sfx`; each cue falls back to the synth if it is missing or cannot be decoded.
- `public/assets/icons/*.svg`: 41 original UI icons, 19.3 KB.
- `art/models/*.glb`: 26 meshopt GLBs (units, cannon, nest, 6 skins, 2 biome kits), 116.6 KB. **They are kept out
  of `public/` until M3-5 adds runtime GLB loading** (per REVIEW-007), so nothing unused ships. The game builds the
  same models in code. `art/tools/export-assets.ts` regenerates them into `art/models/`.
- `art/tools/`: export-assets.ts (needs `gltfpack` + `tsx`), make-icons.py, make-audio.sh (ffmpeg + libopus),
  screenshots.mjs / sheet-shot.mjs / label-measure.mjs (puppeteer-core, set `PUPPETEER_MODULE`), and the sheet, icons and verify
  HTML pages (open them through `npm run dev`). These dev-only tools are not part of package.json, which stays unchanged.
- `art/screenshots/`: before/after battle captures, model sheet, icon sheet, `gates-360.png`.
- `tests/art-assets.test.ts`: models ≤ 1.5 MB in `art/models` and **no `public/assets/models`**, audio ≤ 1 MB with a
  file for every cue, ≥ 30 icons.

**Budgets:** models 116.6 KB / 1.5 MB · audio 133.9 KB / 1 MB · icons 41 (≥ 30). `public/assets` ships 153 KB.

**Open:** check Opus on older Safari (falls back to synth) in QA. The ≥ 50 fps check on a low-end device is M3-6.

**Reviewer:** hivesurge-review · **Status:** awaiting review

**Checks (art/m3-assets on its own):** `npm run lint` pass · `npm test` 85/85 pass · `npm run build` pass (game 53.38 kB, three 544.15 kB; dist ships 153 KB of `public/assets`). Note: the `after-battle-*` captures predate the gate recolour; `gates-360.png` shows the current gates.
