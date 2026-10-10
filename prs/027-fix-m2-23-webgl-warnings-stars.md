# PR 027 — fix/m2-23-webgl-warnings-stars (M2-23; base: fix/m2-22-defeat-headline, PR 026)

**Summary:** Removes the `texImage3D` WebGL warnings (PR 002 bug 3) and shows the star rating as text (bug 4).

**Root cause of the warnings:** Each new `GameScene` reuses the same `<canvas>`, so it gets the same WebGL2 context.
The previous renderer's CanvasTexture uploads leave `UNPACK_FLIP_Y_WEBGL` and `UNPACK_PREMULTIPLY_ALPHA_WEBGL` on.
three's `WebGLState` constructor then creates two empty 3D/array textures with those flags set, and WebGL rejects them
with 2 warnings per new renderer. Four scene rebuilds produced the 8 warnings QA saw. The stack was captured by
wrapping `texImage3D` in headless Chrome.

**Changes**

- `GameScene.dispose()` resets both unpack flags before disposing the renderer.
- New `src/ui/stars.ts` with `starsLabel(n)`, which returns "N of 3 stars", and `starRowHtml(n)`.
  - Star glyphs are `aria-hidden`.
  - The row has `role="img"`, `aria-label`, `title` and a `.sr-only` text span.
- The title-screen "best" stars get the same label.
- `tests/stars.test.ts`: 2 tests (labels, plus the lit-star count matching the rating).

**Verification (headless Chrome, `vite preview`, 60 s session)**

- Fresh profile through FTUE, a win, claim, and the next battle. That covers 3 renderer builds.
- Before: 2 warnings per rebuild. After: **0 WebGL warnings**.
- The win screen star row had `aria-label="3 of 3 stars"` with 3 lit stars.

**Test results:** lint pass · `npm test` 129/129 · build pass (game 56.83 kB / 19.30 kB gzip).

**Acceptance:**

- 0 WebGL warnings in a 60 s session: met.
- The star row exposes the real rating as text: met.

**Reviewer:** hivesurge-review

**Status:** awaiting review
