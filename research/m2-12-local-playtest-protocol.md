# M2-12 — Local-only playtest protocol (localhost on the box)

Hosting decision (BA): **local on the box**. No preview URL, tunnel, or public deploy. No outside
contact; testers are only people Mohit provides and seats at the box (or at its desktop view).
Run against the M2-7 (FTUE) build once merged. Until then, use bot sessions (§4) to dry-run the pipeline.

## 1. Setup (box)
```bash
cd <worktree with the build under test>   # e.g. /workspace/hivesurge-wt/eng-feat-m2-7-ftue
npm ci && npm run build && npx vite preview --host 127.0.0.1 --port 4173
```
- Open `http://127.0.0.1:4173/` in the box browser. Use mobile emulation (390×844, touch) for the phone case,
  and plain desktop for mouse.
- Start each tester from a **fresh profile** (or clear `localStorage`) so FTUE and analytics start clean.
- Note build commit, browser, viewport, and DevTools throttling ("Fast 4G" for the load-time criterion).

## 2. Session script (moderator)
1. Read out: "This is an early game. Play as long as you like and stop whenever you want. I can't help
   while you play. Please think out loud." Nothing else; no explanation of controls.
2. Start timer, tester presses PLAY. Moderator stays silent and notes confusion points and quotes.
3. The session ends when the tester stops, or at **20 min** (covers the 15-min stability criterion).
4. Before closing the tab, export analytics: DevTools console →
   `copy(localStorage.getItem('hivesurge.analytics.v1'))` → save to
   `playtests/m2-12/<tester-id>-events.json`.
5. Give the survey (`research/m2-12-survey.md`) and save answers to `playtests/m2-12/<tester-id>-survey.md`.
6. Clear storage before the next tester.

## 3. Metrics (derived from the `level_start` / `level_win` / `level_fail` events)
| Metric | Definition | §7.1 / target |
|---|---|---|
| Time to first battle | page load → first `level_start` (stopwatch + Performance panel) | ≤ ~3 s on Fast 4G |
| Battles played | count of `level_start` | ≥ 10 voluntarily |
| Completion rate | `level_win` / `level_start` | report (design target margin 10–30%) |
| Retry after loss | share of `level_fail` followed by a `level_start` within 60 s | report; higher is better |
| Time to first win | first `level_start` → first `level_win` (s) | report |
| Drop-off level | level id of the last `level_start` before the tester quit, and whether it was a loss | top 5 issues input |
| Session length | first → last event (min) | report |
| fps stability | min/avg fps over the session (dev overlay / Performance panel, PERF-A) | stable over 15 min |
| Asked to keep playing | moderator yes/no | qualitative |

If an event lacks a level id prop, the moderator writes the level number down by hand.

## 4. Bot / simulated sessions (runnable now)
Goal: test the pipeline and get a baseline. **Bot data is never reported as player data.**
- Base it on the existing `playtests/smoke-playtest.mjs` (puppeteer-core + `/usr/bin/google-chrome`, headless
  swiftshader, 390×844 touch). Point it at `http://127.0.0.1:4173/`.
- Three bot profiles, each run 5×:
  - **idle**: presses PLAY then does nothing (floor: should lose and show the defeat screen).
  - **sweeper**: holds and sweeps sinusoidally across the lane (as in the smoke script).
  - **gate-seeker**: sweeps toward the x of the highest-value gate (if exposed), otherwise sweeper.
- Loop: click `[data-a=play]`; on the defeat screen click `[data-a=retry]` up to 3×, on win click
  `[data-a=claim]`; stop after 10 battles or 15 min.
- After each run dump `localStorage['hivesurge.analytics.v1']` to `playtests/m2-12/bot-<profile>-<n>.json`
  and compute the same metrics with a small script (`node playtests/m2-12/metrics.mjs <files>`: TODO, ENG/QA).
- Use: idle must never win (difficulty floor); if sweeper wins level 1 < 50% of the time, FTUE may be too hard
  (inference, tune). Headless swiftshader fps is not representative; skip the fps criterion for bots.
- Note: puppeteer-core isn't installed in every worktree (see REVIEW-eng-004); `npm i -D puppeteer-core`
  locally or run from a worktree that has it.

## 5. Instructions for Mohit-provided testers (later)
- Mohit picks and invites 5–10 people himself; research does not contact anyone.
- Ideal mix: has never seen Hive Surge; ≥ 3 who play casual mobile games; ≥ 1 who doesn't.
- They play at the box (in person or via screen share of the box desktop) at `http://127.0.0.1:4173/`.
  Nothing is exposed outside the box.
- Consent line read aloud: "We'll record anonymous gameplay events and your survey answers to improve
  the game. No name or contact details are stored." Tester ids are `T01…T10`.
- Physical phone testing would need LAN exposure (`--host 0.0.0.0`). That goes beyond "local on the box",
  so it needs the BA/Mohit's OK first.

## 6. Report
Fill in the table in `research/m2-12-outside-playtests.md`, mark §7.1 criteria pass/fail, list the top 5 issues
ranked by number of testers affected, and keep bot baselines in a separate section.
