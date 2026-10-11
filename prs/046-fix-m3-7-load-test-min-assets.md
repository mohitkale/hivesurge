# PR 046: fix/m3-7-load-test-min-assets

Follow-up to M3-7 review: `playtests/m3-7/load-test.mjs` now fails when fewer than 14 M3 assets (5 GLBs and 9 Opus cues) load after the first battle.

An asset counts as loaded only if its response is 2xx and is not `text/html`. Vite preview and SPA hosts answer a missing file with index.html and a 200, and resource timing alone still showed "14".

## Evidence (Fast 4G, 1 run each, local preview)

- Normal build: first battle 842 ms · M3 before battle 0 · after 14 (loaded 14, min 14) · PASS, exit 0.
- `dist/assets/models` removed: after 14 (loaded 9, min 14) · FAIL, exit 1.

## Checks

lint ok · tests 204/204 · build ok · size budget: initial JS 2.26 KiB gzip, dist 899.32 KiB.
