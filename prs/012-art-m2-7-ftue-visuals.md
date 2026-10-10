# PR 012 — art/m2-7-ftue-visuals (base: art/m3-assets, PR 011)

**Part 3 of 3 of the former PR 007 (commit 008ff71's FTUE part).** Stack: 013 → 011 → **012**. Merge after PR 011.

**Task:** PLAN **M2-7 (Implement FTUE)**: visual vocabulary and assets for the ENG implementation, following the
DES spec M2-6 (`docs/design/ftue-m2.md`, branch `design/m2-specs`). This PR adds art only and no FTUE logic. The ENG work
is on `feat/m2-7-ftue` (PR 014, another bot's branch, not touched here). DES approved this section as part of M3-1 (see PR 013 history).

**Changes**

- `art/ART_DIRECTION.md` §6: finger pointer + tap ring, dotted aim-ahead line (`gateX(t + travelTime)`), gate glow +
  arrow, HUD dim (40 %, queen spotlight), prompt text style, reduced-motion variants and usage rules. Also the new
  rule from DES: hide the regular "Hold & drag" hint while an FTUE prompt shows (one line only).
- `public/assets/ftue/*.svg`: finger, tap-ring, aim-line, gate-arrow, gate-glow, prompt-plate (2.7 KB).
- `art/tools/ftue-mock.html` → `art/screenshots/ftue-mock.png` (steps 1, 2–3 and 4 over a 360 px capture).
- `tests/ftue-assets.test.ts`: all 6 SVGs present, set ≤ 8 KB.

**For M2-7 (ENG):** use the SVGs as DOM overlays or sprites and follow §6 for sizes and timings. Reduced motion follows
`prefers-reduced-motion` and the in-game setting.

**Reviewer:** hivesurge-review · **Status:** awaiting review

**Checks (stack tip, art/m2-7-ftue-visuals):** `npm run lint` pass · `npm test` 86/86 pass · `npm run build` pass (game 53.38 kB, three 544.15 kB).
