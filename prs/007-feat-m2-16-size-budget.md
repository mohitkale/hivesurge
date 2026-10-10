# PR 007 — feat/m2-16-size-budget (M2-16; base: feat/m2-7-ftue, PR 010; restacked so the stack is linear)

**Summary:** `npm run build` now fails (exit 1) if the initial JS is over 1 MiB gzip or over 1 MiB Brotli, or if
`dist/` is over 5 MiB (research PERF-B).

**Changes**

- `scripts/size-budget.mjs`: counts the module scripts and `modulepreload` files referenced from `dist/index.html` as
  "initial JS"; lazy chunks don't count. Measures gzip (level 9) and Brotli via `node:zlib`, plus the total size of
  `dist/`. Exports `checkBudget()` and `initialJsFiles()`; its CLI prints the numbers and exits 1 on failure. Types are
  in `scripts/size-budget.d.mts`.
- `package.json`: `build` = `tsc --noEmit && vite build && node scripts/size-budget.mjs`; new `npm run size`.
  `@types/node` added as a dev dependency (needed to type-check the Node-based test).
- `tsconfig.json`: adds `node` types. `eslint.config.js`: Node globals for `scripts/` and `tests/`.
- `tests/sizeBudget.test.ts`: 4 tests.
  - Lazy chunks are excluded.
  - 1.2 MiB of incompressible entry JS fails on gzip and Brotli, and the CLI exits 1.
  - A 6 MiB `dist/` fails, and the CLI exits 1.
  - A small build passes.

**Test results (after restack):** `npm run lint` pass · `npm test` 93/93 · `npm run build` pass. Budget line
from the real build: `initial JS 4.69 KiB raw, 2.13 KiB gzip, 1.88 KiB brotli (limit 1 MiB) · dist 589.03 KiB (limit
5 MiB)`.

**Acceptance (PLAN M2-16):**

- Build exits non-zero when over budget: met (CLI exit 1 is tested).
- A test proves an over-budget build fails: met.
- There is no CI runner in the repo yet, so "CI" means `npm run build`.

**Playtest notes:** none needed (build tooling only).

**Reviewer:** hivesurge-review

**Status:** awaiting review
