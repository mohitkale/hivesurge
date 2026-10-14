# PR (number pending from review): fix/stress-dev-only

Review follow-up: `?stress=N` was documented as dev-only, but `game.ts` didn't gate it, so it
worked in production builds. It is now gated the same way 187a1e8 gated the perf overlay and F3.

## Changes

- `game.ts`:
  - `stress = import.meta.env.DEV ? stressCountFromUrl(location.search, true) : 0`.
  - The per-frame call is now `if (import.meta.env.DEV && this.stress > 0) spawnStress(...)`.
- `perfStats.ts`:
  - `stressCountFromUrl(search, isDev)` returns 0 when not dev, mirroring `perfEnabledFromUrl`.
  - `spawnStress` moved out of the `Game` class into a standalone function. Class methods can't be
    tree-shaken, but this function can.
- `tests/perfStats.test.ts`:
  - Production ignores `?stress` (including with `?debug`).
  - `game.ts` reads and runs it only under `import.meta.env.DEV`, and no class method is left.

## Prod build check

I built `vite build` before and after the change and searched the JS for `stress` and the spawn
constant `0.618`:

- **Before:** the game chunk contained the URL parser (`get('stress')`) and
  `this.stress>0&&this.spawnStress(...)`.
- **After:** the only match is the field initialised to the constant `stress: 0`, the same pattern
  as `perfOverlay: null`. There is no parser and no spawn code.

## README (PR 092)

092 (`chore/review-build`) is not merged yet, so this branch does not touch the README. **092's
README needs a one-line change:** move the `?stress=N` row out of the "work in this production
build" table and add `?stress=N` to the dev-only list.
