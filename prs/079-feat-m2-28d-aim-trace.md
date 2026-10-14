# PR (number pending from review): feat/m2-28d-aim-trace

M2-28d (from hivesurge-ba): an aim-trace logger enabled by `?trace=aim` (`?debug&trace=aim` also
works). Format and gating are documented in `docs/design/aim-trace-format.md`.

## Changes

- `src/debug/aimTraceFlag.ts`: the URL check. It deliberately works in production builds; see the
  format doc for why it isn't tied to the dev-only `?debug` overlay.
- `src/debug/aimTrace.ts` (lazy-loaded): the recorder. It writes deduped, ~30 Hz aim samples, bee and
  queen launches, battle results, and the level, seed and viewport. It also mounts the battle-end
  Download/Copy panel.
- `src/game.ts`: creates a trace per battle when the flag is on, adds one null-checked hook per sim
  step, and finishes the trace at battle end. When off, nothing loads or allocates.
- `tests/aimTrace.test.ts`: on/off gating (including a source check that production isn't gated and
  the recorder is only dynamically imported), the exact JSON shape, and a sim-driven trace.
- Separate commit: the review nit. The thistle-gauntlet casual band in `levelTuningM2-26.test.ts` is
  now 65–75%, matching the docs.
