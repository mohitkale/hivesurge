# M2-12 local playtests (decision 31: bots + QA box-browser sessions only)

Everything runs on the box. The game is served on `127.0.0.1` only and never exposed to the network.
All `bot-*` data is BOT DATA, never player data. The report is in `research/m2-12-local-playtest-report.md`.

## Files

| File                         | What                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `metrics.mjs` (+ `.d.mts`)   | Scores exported analytics events (`level_start/win/fail`). Labels files `bot-*`, `qa-*`.  |
| `sim-sessions.ts`            | Headless sessions on the real sim (`src/sim`) with `tests/bots.ts` personas; ≥ 200/level. |
| `bot-sessions.mjs`           | Browser bots (puppeteer-core, headless Chrome, swiftshader) + rAF fps sampler.            |
| `results/sim-sessions.json`  | Output of the last headless run (per level × bot, campaign drop-off, assumptions).        |
| `results/browser/bot-*.json` | Raw analytics events from browser bot runs; `fps-bot-*.json` = fps summary per run.       |
| `qa/`                        | **QA box-browser sessions go here** (see below).                                          |

## Run

```bash
npm ci && npm i --no-save puppeteer-core     # puppeteer-core is also a devDependency
# 1. headless sim sessions (~10–15 min on a loaded box)
npx rolldown playtests/m2-12/sim-sessions.ts --platform node --format esm --file /tmp/sim-sessions.mjs
node /tmp/sim-sessions.mjs --n 200 --out playtests/m2-12/results
# 2. browser bots: build, serve on loopback only, run
npm run build && npx vite preview --host 127.0.0.1 --port 4317 --strictPort &
node playtests/m2-12/bot-sessions.mjs --url http://127.0.0.1:4317/ --runs 2 --max-battles 6 --max-min 6 \
  --out playtests/m2-12/results/browser
node playtests/m2-12/metrics.mjs playtests/m2-12/results/browser/bot-*.json
```

Use another port if 4317 is busy. Never use `--host 0.0.0.0`.

## QA box-browser sessions (hivesurge-qa)

Follow §2 of `research/m2-12-local-playtest-protocol.md`, at least 3 sessions, each from a fresh browser profile.
For each session N, save:

- `playtests/m2-12/qa/qa-session-N-events.json`: `copy(localStorage.getItem('hivesurge.analytics.v1'))`
- `playtests/m2-12/qa/qa-session-N.md`: tester (QA bot/human), build commit, browser, viewport, fps (`?debug`
  overlay median / 1% low), time to first battle, notes, survey answers (`research/m2-12-survey.md`)
- screenshots in `playtests/m2-12/qa/screenshots/`

Then run `node playtests/m2-12/metrics.mjs playtests/m2-12/qa/qa-*-events.json`. The `qa-` prefix keeps the
QA data apart from bot data.
