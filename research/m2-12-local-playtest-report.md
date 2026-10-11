# M2-12 local playtest report: PROVISIONAL

> **PROVISIONAL. Bot data only, plus pending QA box-browser sessions. No outside or human testers** (STATUS
> decision 31). Bot numbers measure the level tuning against scripted strategies, not how people play.
> Re-validate with QA sessions now, and with human/real-phone testers if Mohit approves them at the M2 review.

- Build under test: main @ `36f9a21` (levels unchanged since `0cbeed9`). **Open PR 044 (M2-26) retunes L4/L5**, so
  re-run §2 after it merges (commands in `playtests/m2-12/README.md`).
- Date: 2026-10-11. Box only. Game served on `127.0.0.1:4317`, never exposed to the network.
- Raw data: `playtests/m2-12/results/sim-sessions.json` (+ `.partial.jsonl`), `playtests/m2-12/results/browser/`.

## Headline (bot data)

| Level                     | Design 1st-try target (levels-m2.md) | Casual bot 1st-try win | Mindless sweeper 1st-try win | Aim bot |
| ------------------------- | ------------------------------------ | ---------------------- | ---------------------------- | ------- |
| L1 ftue-meadow            | 98%                                  | 100%                   | 100%                         | 100%    |
| L2 dandelion-drift        | 92%                                  | 98.5%                  | 100%                         | 100%    |
| L3 clover-run             | 80% (M2-17: casual 65–75%)           | 74.5%                  | 100%                         | 100%    |
| L4 thistle-gauntlet       | 70%                                  | **16%**                | 100%                         | 100%    |
| L5 wasp-queen-nest (boss) | 55%                                  | **0%**                 | **0%**                       | 100%    |

- **Completion (casual, wins/battles):** L1 100%, L2 98.5%, L3 73.9%, L4 15.1%, L5 0%.
- **FTUE time (time to first win):** headless median 12.6–20.3 s across bots that fire. Browser bots took
  17.4–26.2 s (6 runs), under the 30 s FTUE target.
- **Drop-off (campaign, 200 casual sessions from L1):** 60.5% quit at L4, 34% at L5, 5% at L3, 0.5% at L2.
  **0/200 finish.** Sweeper: 200/200 reach the boss, 0 beat it.
- **Retry after loss:** this comes from the bot model (assumed 85% after a near miss, 60% otherwise), so it isn't
  a finding. Casual measured 66.7–85.1% on L2–L4. Real retry rates need QA/human sessions.
- **fps (browser bots, headless software GL on a loaded box):** median 30 fps in battle, 1% low 7.5–10 fps,
  14–22% of frames > 50 ms; idle runs (few units) median 60 fps. That's a lower bound for the box and **not a
  device measurement**. QA's `?debug` overlay on a real GPU browser is needed.

## Method

1. **Headless sessions** (`playtests/m2-12/sim-sessions.ts`): the real deterministic sim (`src/sim/World`, 60 Hz,
   `autoTriggers`) with the bots from `tests/bots.ts`. **200 sessions per level per bot** (6 bots × 5 levels =
   6,000 sessions, 9,010 battles), plus 600 campaign sessions. Each attempt uses a different seed.
   Events are emitted in analytics format and scored with `playtests/m2-12/metrics.mjs`, the same scorer QA uses.
   - Session model (**assumptions, not measurements**): up to 3 retries. After a loss the bot retries with p = 0.85 if
     ≤ 30% nest HP was left (near miss), else p = 0.60. 3 s UI gap between battles. No revives, no boosts, no ads.
2. **Browser sessions** (`playtests/m2-12/bot-sessions.mjs`): headless Chrome (puppeteer-core, swiftshader) on the
   production build via `vite preview --host 127.0.0.1`. 3 profiles × 2 runs, ≤ 6 battles or 6 min each,
   rAF fps sampler. These check that the sim matches what the browser does, and measure FTUE time and fps.
   They match: browser sweeper/gate-seeker won L1–L4 and lost the boss in 4/4 runs, the same as the sim.

### Bot types

| Bot         | Behaviour                                                                                                     | Stands in for                    |
| ----------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| idle        | never fires                                                                                                   | AFK; difficulty floor            |
| centre      | fires straight up, queen when ready                                                                           | player who never aims            |
| sweeper     | holds fire, sweeps ±35% of lane width at 1.3 rad/s (as browser runner)                                        | mindless "wiggle" player         |
| gate-seeker | centre-biased sweep ±20% at 0.9 rad/s (as browser runner; gate x isn't in the DOM)                            | lazy aimer                       |
| casual      | every 1.5 s picks the best visible gate (35% random), no lead, aim noise, lifts finger 15% (M2-17 definition) | typical new player               |
| aim         | best gate plan with lead, searched on the base seed                                                           | expert who has learned the level |

## Per-level results (headless, 200 sessions per bot per level)

\* Retry after loss is driven by the session model (see Method).

### ftue-meadow

| Bot         | Battles | Completion % | 1st-try win % | Cleared in ≤4 tries % | Retry after loss %* | Near-miss losses % | Median time to first win (s) | Quit without clear % |
| ----------- | ------- | ------------ | ------------- | --------------------- | ------------------- | ------------------ | ---------------------------- | -------------------- |
| casual      | 200     | 100          | 100           | 100                   | —                   | —                  | 18.3                         | 0                    |
| aim         | 200     | 100          | 100           | 100                   | —                   | —                  | 12.6                         | 0                    |
| centre      | 200     | 100          | 100           | 100                   | —                   | —                  | 14.6                         | 0                    |
| idle        | 418     | 0            | 0             | 0                     | 52.2                | 0                  | —                            | 100                  |
| sweeper     | 200     | 100          | 100           | 100                   | —                   | —                  | 20.3                         | 0                    |
| gate-seeker | 200     | 100          | 100           | 100                   | —                   | —                  | 13.3                         | 0                    |

### dandelion-drift

| Bot         | Battles | Completion % | 1st-try win % | Cleared in ≤4 tries % | Retry after loss %* | Near-miss losses % | Median time to first win (s) | Quit without clear % |
| ----------- | ------- | ------------ | ------------- | --------------------- | ------------------- | ------------------ | ---------------------------- | -------------------- |
| casual      | 202     | 98.5         | 98.5          | 99.5                  | 66.7                | 100                | 56.8                         | 0.5                  |
| aim         | 200     | 100          | 100           | 100                   | —                   | —                  | 32.4                         | 0                    |
| centre      | 306     | 37.3         | 37.5          | 57                    | 55.2                | 5.7                | 77.7                         | 43                   |
| idle        | 418     | 0            | 0             | 0                     | 52.2                | 0                  | —                            | 100                  |
| sweeper     | 200     | 100          | 100           | 100                   | —                   | —                  | 39.9                         | 0                    |
| gate-seeker | 200     | 100          | 100           | 100                   | —                   | —                  | 38.2                         | 0                    |

### clover-run

| Bot         | Battles | Completion % | 1st-try win % | Cleared in ≤4 tries % | Retry after loss %* | Near-miss losses % | Median time to first win (s) | Quit without clear % |
| ----------- | ------- | ------------ | ------------- | --------------------- | ------------------- | ------------------ | ---------------------------- | -------------------- |
| casual      | 257     | 73.9         | 74.5          | 95                    | 85.1                | 100                | 82.7                         | 5                    |
| aim         | 200     | 100          | 100           | 100                   | —                   | —                  | 32.1                         | 0                    |
| centre      | 418     | 0            | 0             | 0                     | 52.2                | 0                  | —                            | 100                  |
| idle        | 418     | 0            | 0             | 0                     | 52.2                | 0                  | —                            | 100                  |
| sweeper     | 200     | 100          | 100           | 100                   | —                   | —                  | 51.2                         | 0                    |
| gate-seeker | 200     | 100          | 100           | 100                   | —                   | —                  | 72.3                         | 0                    |

### thistle-gauntlet

| Bot         | Battles | Completion % | 1st-try win % | Cleared in ≤4 tries % | Retry after loss %* | Near-miss losses % | Median time to first win (s) | Quit without clear % |
| ----------- | ------- | ------------ | ------------- | --------------------- | ------------------- | ------------------ | ---------------------------- | -------------------- |
| casual      | 482     | 15.1         | 16            | 36.5                  | 68.9                | 68                 | 140.0                        | 63.5                 |
| aim         | 200     | 100          | 100           | 100                   | —                   | —                  | 31.5                         | 0                    |
| centre      | 418     | 0            | 0             | 0                     | 52.2                | 0                  | —                            | 100                  |
| idle        | 418     | 0            | 0             | 0                     | 52.2                | 0                  | —                            | 100                  |
| sweeper     | 200     | 100          | 100           | 100                   | —                   | —                  | 55.7                         | 0                    |
| gate-seeker | 200     | 100          | 100           | 100                   | —                   | —                  | 71.8                         | 0                    |

### wasp-queen-nest

| Bot         | Battles | Completion % | 1st-try win % | Cleared in ≤4 tries % | Retry after loss %* | Near-miss losses % | Median time to first win (s) | Quit without clear % |
| ----------- | ------- | ------------ | ------------- | --------------------- | ------------------- | ------------------ | ---------------------------- | -------------------- |
| casual      | 418     | 0            | 0             | 0                     | 52.2                | 0                  | —                            | 100                  |
| aim         | 200     | 100          | 100           | 100                   | —                   | —                  | 103.7                        | 0                    |
| centre      | 418     | 0            | 0             | 0                     | 52.2                | 0                  | —                            | 100                  |
| idle        | 418     | 0            | 0             | 0                     | 52.2                | 0                  | —                            | 100                  |
| sweeper     | 418     | 0            | 0             | 0                     | 52.2                | 0                  | —                            | 100                  |
| gate-seeker | 583     | 0            | 0             | 0                     | 65.7                | 70.7               | —                            | 100                  |

### Campaign sessions (200 per bot, start at L1, play on after each win)

| Bot     | Drop-off level (sessions)                                                | Median FTUE first win (s) | Median battles | Median session (min) |
| ------- | ------------------------------------------------------------------------ | ------------------------- | -------------- | -------------------- |
| casual  | L4 thistle 121 · L5 boss 68 · L3 clover 10 · L2 dandelion 1 · finished 0 | 17.8                      | 7              | 7.6                  |
| sweeper | L5 boss 200 · finished 0                                                 | 20.2                      | 6              | 6.7                  |
| aim     | finished all 5: 200                                                      | 12.6                      | 5              | 3.7                  |

### Browser bot runs (main @ 36f9a21, 127.0.0.1:4317)

| Run           | Battles | Results (level: s)                              | First win (s) | Median fps | 1% low fps |
| ------------- | ------- | ----------------------------------------------- | ------------- | ---------- | ---------- |
| idle-1        | 5       | L1 lost ×4 (75 s each)                          | —             | 59.9       | 6.7        |
| idle-2        | 5       | L1 lost ×4                                      | —             | 59.9       | 15         |
| sweeper-1     | 6       | L1 25, L2 52, L3 74, L4 69 won; boss lost (110) | 26.2          | 29.9       | 7.5        |
| sweeper-2     | 5       | L1 26, L2 54, L3 76, L4 74 won; boss lost       | 26.2          | 30         | 10         |
| gate-seeker-1 | 6       | L1 17, L2 41, L3 62, L4 59 won; boss lost       | 17.4          | 30         | 10         |
| gate-seeker-2 | 6       | L1 17, L2 39, L3 84, L4 59 won; boss lost       | 17.8          | 30         | 10         |

## Top 5 issues (evidence)

1. **Boss (L5) can't be beaten without a learned plan.** 0 wins across casual, centre, sweeper, gate-seeker and idle
   (1,000 headless sessions, 2,255 battles) and in 4/4 browser runs, against a 55% target. Only the aim bot wins
   (median 103.7 s of 110). The gate-seeker loses close (70.7% of its losses are near misses); the others don't
   get close. Revives aren't modelled, but one revive can't close a 0% gap. PR 044 says it moves casual to 59.5%,
   so re-verify after merge.
2. **Mindless sweeping beats L1–L4 every time.** Sweeper and gate-seeker: 100% first try on L1–L4 (800 sessions each),
   confirmed in the browser. They beat the casual gate-picking bot by a wide margin (L4: 100% vs 16%). This undercuts
   the "aiming matters" pillar (STATUS decision 25). Existing tests only check that centre < casual/aim, not sweeping.
3. **L4 thistle-gauntlet difficulty cliff for gate-choosing players.** Casual 16% first try (target 70%), 36.5% clear
   within 4 tries, 63.5% of sessions quit without clearing. 68% of its losses are near misses, so the tuning is
   close. PR 044 targets 65%.
4. **Campaign drop-off is concentrated at L4/L5.** In casual campaign sessions, 94.5% end at L4 or L5 and none
   finish. Every sweeper session ends at the boss. With today's main, a typical player's first session ends after
   about 7 battles (median), on a loss.
5. **FTUE doesn't teach aiming, then the skill step is steep.** Centre (never aims) wins L1 100%, then 37.5% on L2 and
   0% from L3. FTUE time itself is fine (median 12.6–20.3 s headless, ≤ 26.2 s browser, target < 30 s). The aim-lead
   hint from the research inbox, or an L1 beat that requires a side gate, would bridge it.

Also noted: fps under software GL on a loaded box (median 30, 1% low 7.5–10) needs a real-GPU check by QA before
any perf conclusion.

## QA box-browser sessions (≥ 3): PENDING

hivesurge-qa is running these. **No QA logs are in the repo yet.** Save them to `playtests/m2-12/qa/`
(file names in `playtests/m2-12/README.md`): `qa-session-N-events.json`, `qa-session-N.md`, `screenshots/`.

| Session | Tester  | Build | Browser / viewport | Battles | Completion | Retry after loss | Time to first win (s) | Drop-off level | fps median / 1% low |
| ------- | ------- | ----- | ------------------ | ------- | ---------- | ---------------- | --------------------- | -------------- | ------------------- |
| QA-1    | PENDING |       |                    |         |            |                  |                       |                |                     |
| QA-2    | PENDING |       |                    |         |            |                  |                       |                |                     |
| QA-3    | PENDING |       |                    |         |            |                  |                       |                |                     |

Fill in with `node playtests/m2-12/metrics.mjs playtests/m2-12/qa/qa-*-events.json`. Keep QA data apart from bot data.

## Limitations

- Bots aren't people. Retry and quit behaviour is an assumed model, the aim bot "knows" the level, and the casual bot
  is the M2-17 approximation.
- No revives, boosts or ads in the headless sessions. The FTUE driver uses `autoTriggers`, not the in-game FTUE.
- Browser fps comes from headless swiftshader on a shared box (load average ~16–35 during runs).
- §7.1 exit criteria (≥ 10 voluntary battles, 15-min stability, ≤ 3 s to first battle) can't be judged from bots.
