# PR 024 — feat/m2-12-bot-metrics (M2-12 ENG support; base: feat/m2-15-perf-overlay, PR 018)

**Summary:** Engineering pieces for research's M2-12 protocol (`research/m2-12-local-playtest-protocol.md` §3–§4):

- `playtests/m2-12/metrics.mjs` turns exported analytics into the protocol metrics.
- `playtests/m2-12/bot-sessions.mjs` runs the idle, sweeper and gate-seeker bot sessions.
- `puppeteer-core` becomes a dev dependency.

Bot data is labelled `bot` and never mixed with QA data.

**Changes**

- `playtests/m2-12/metrics.mjs` (+ `.d.mts`). Per session it computes:
  - battles, wins and completion rate;
  - retry after loss (`level_start` within 60 s of a `level_fail`);
  - time to first win;
  - drop-off level and whether the session ended on a loss;
  - session length, levels reached, and the FTUE queen time (from `ftue_step` step 4).
    It also aggregates per label (`bot-*` / `qa-*` / other) and accepts a double-encoded DevTools `copy()` export.
    Usage: `node playtests/m2-12/metrics.mjs <files> [--json]`.
- `playtests/m2-12/bot-sessions.mjs`:
  - Headless Chrome (SwiftShader), 390×844, `http://127.0.0.1:4173/` by default (localhost only, per decision 31).
  - Profiles: idle, sweeper, gate-seeker. Gate positions aren't exposed in the DOM, so gate-seeker is a
    centre-biased sweeper.
  - Retries up to 3× after a loss, otherwise goes Home. On wins it always takes "No thanks"/"Collect"; it never
    watches ads.
  - Stops after `--max-battles` / `--max-min` and writes `bot-<profile>-<n>.json`.
- `package.json`: `puppeteer-core` dev dependency. `eslint.config.js`: Node globals for `playtests/**`.
- `tests/m2-12-metrics.test.ts`: 4 tests (metric definitions, empty session, bot/QA separation, CLI table with a
  double-encoded export).

**Dry run (bot data only; pipeline check, not a protocol run):**

- Command: `--runs 1 --max-battles 3 --max-min 2`, against this branch's build on 127.0.0.1:4173.

| File                   | Battles | Wins | Completion | First win (s) | Drop-off level | FTUE queen (ms) |
| ---------------------- | ------- | ---- | ---------- | ------------- | -------------- | --------------- |
| bot-gate-seeker-1.json | 3       | 2    | 0.67       | 18.8          | clover-run     | 5150            |
| bot-idle-1.json        | 2       | 0    | 0          | —             | ftue-meadow    | —               |
| bot-sweeper-1.json     | 3       | 2    | 0.67       | 26.2          | clover-run     | 5717            |

- Idle never won. Both active bots finished the FTUE and L2 within the 2-minute cap.
- The runner's own "battles" console count undercounts; metrics.mjs (event-based) is authoritative.
- The output files were written to `/tmp/m212` and are not committed. The full §4 run (5 runs × 3 profiles, 10
  battles or 15 min) is for QA/research.

**Test results:** `npm run lint` pass · `npm test` (see report) · `npm run build` pass.

**Reviewer:** hivesurge-review

**Status:** awaiting review
