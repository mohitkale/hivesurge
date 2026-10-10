# PR 006 — feat/m2-9-code-split (M2-9; base: feat/m2-3-levels-json, PR 005)

_Renumbered from 004 so the number follows merge order (stacked on PR 005)._

**Summary:** The initial bundle drops from one 579.68 kB chunk to a 4.76 kB bootstrap. `src/main.ts` is now a small
entry. It shows "Loading…" and lazily imports the game (`src/game.ts`, formerly the `Game` class in `main.ts`) while
the save loads. Three.js is in its own vendor chunk via `manualChunks` (from PR 002's fix branch).

**Changes**

- `src/main.ts`: bootstrap with loading and error status, `import('./game')` + `SaveStore.load()`.
- `src/game.ts`: the `Game` class moved out of `main.ts` and exported. It carries all PR 002 review fixes
  (`ResultSession` claim guard, rewarded flag, revive at most once, `world.revive()` check).
- `src/style.css`: `.boot-loading` style.

**Test results:** `npm run lint` pass · `npm test` 60/60 (9 files) · `npm run build` pass.

| Build                                   | Entry JS                   | Lazy chunks                                                     |
| --------------------------------------- | -------------------------- | --------------------------------------------------------------- |
| feat/core-loop (before)                 | 579.68 kB (148.63 kB gzip) | none                                                            |
| PR 005 base (three split, eager import) | 44.71 kB (15.75 kB gzip)   | three 537.84 kB (134.09 kB gzip), loaded eagerly                |
| This PR                                 | 4.76 kB (2.14 kB gzip)     | game 42.00 kB (14.71 kB gzip), three 537.84 kB (134.09 kB gzip) |

- CSS is 4.42 kB (1.63 kB gzip). `dist/index.html` has no `modulepreload` for the lazy chunks.
- Vite still warns that the three chunk is over 500 kB. The warning is left visible on purpose (no
  `chunkSizeWarningLimit` override); M2-16 adds a hard budget.
- Total JS is about the same. The gain is a faster first paint and loading UI, plus three.js caching separately.
- M2-9 "initial chunk < 3 MB": met (4.76 kB, 2.14 kB gzip).

**Playtest notes:** Headless Chrome against `vite preview`, using `--dump-dom` after 8 s of virtual time. The title
screen (logo, Clover Run, PLAY) renders through the lazy-load path. Gameplay was not exercised; QA should still click
through `npm run preview`. The smoke script still needs `puppeteer-core`.

**Conflict note (corrected):** the real conflict with PR 002's fixes was `src/main.ts` → `src/game.ts`. It is resolved
by rebuilding `game.ts` from the fixed `main.ts` on top of PR 005. `vite.config.ts` auto-merges.

**Reviewer:** hivesurge-review

**Status:** awaiting review + playtest
