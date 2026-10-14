# M2-12 local playtest report: PROVISIONAL

> **PROVISIONAL. Bot data only, plus pending QA box-browser sessions. No outside or human testers** (STATUS
> decision 31). Bot numbers measure the level tuning against scripted strategies, not how people play.
> Re-validate with QA sessions now, and with human/real-phone testers if Mohit approves them at the M2 review.

- **Main numbers: post-retune.** Build under test: main @ `e7abf40`, after PR 044 (M2-26 L4/L5 retune, `6cbac7d`)
  and PR 055 (wasp-queen band test, `4ba1ea0`). `src/`, `tests/` and `playtests/` are identical on main @ `6e67f2b`
  (checked with `git diff e7abf40 6e67f2b -- src tests playtests`: empty), so these results hold for current main.
- Pre-retune baseline: main @ `36f9a21` (PR 052 report, merged `f990cab`).
- Date: post-retune run finished 2026-10-12 00:30 IST. Box only, never exposed to the network.
- Raw data: `playtests/m2-12/results/post-m2-26/sim-sessions.json` (+ `.partial.jsonl`). Baseline:
  `playtests/m2-12/results/pre-m2-26/` (headless + `browser/`).
- Browser bot runs were **not** re-run post-retune (the headless run alone took ~15 h on the loaded box). The browser
  table below is pre-retune only.

## Headline (bot data, post-retune)

| Level                     | Design 1st-try target (levels-m2.md) | Casual bot 1st-try win | Mindless sweeper 1st-try win | Aim bot |
| ------------------------- | ------------------------------------ | ---------------------- | ---------------------------- | ------- |
| L1 ftue-meadow            | 98%                                  | 100%                   | 100%                         | 100%    |
| L2 dandelion-drift        | 92%                                  | 98.5%                  | 100%                         | 100%    |
| L3 clover-run             | 80% (M2-17: casual 65–75%)           | 74.5%                  | 100%                         | 100%    |
| L4 thistle-gauntlet       | 70% (PR 044 aim: 65%)                | 65.5%                  | 100%                         | 100%    |
| L5 wasp-queen-nest (boss) | 55% (PR 055 band 55 ± 5)             | 59.5%                  | **100%**                     | 100%    |

- **Completion (casual, wins/battles):** L1 100%, L2 98.5%, L3 73.9%, L4 67.9%, L5 59.2%.
- **Drop-off (campaign, 200 casual sessions from L1):** 136/200 (68%) finish all 5. Of the 64 that stop: L4 31
  (15.5% of sessions), L5 22 (11%), L3 10 (5%), L2 1 (0.5%). Drop-off level is still **L4**, but much smaller.
  Sweeper and aim: 200/200 finish.
- **FTUE time (time to first win):** unchanged, headless median 12.6–20.3 s across bots that fire (L1 untouched).
- **Retry after loss:** from the bot model (85% after a near miss, 60% otherwise), so not a finding. Casual measured
  66.7–87.4% on L2–L5.
- **fps:** not re-measured (see pre-retune browser runs below; still needs QA's real-GPU check).

### Before/after M2-26 (casual bot, 200 sessions per level; campaign = 200 casual sessions)

| Level               | Completion % pre → post | 1st-try win % pre → post | Campaign sessions ending here pre → post |
| ------------------- | ----------------------- | ------------------------ | ---------------------------------------- |
| L1 ftue-meadow      | 100 → 100               | 100 → 100                | 0 → 0                                    |
| L2 dandelion-drift  | 98.5 → 98.5             | 98.5 → 98.5              | 1 → 1                                    |
| L3 clover-run       | 73.9 → 73.9             | 74.5 → 74.5              | 10 → 10                                  |
| L4 thistle-gauntlet | 15.1 → **67.9**         | 16 → **65.5**            | 121 → **31**                             |
| L5 wasp-queen-nest  | 0 → **59.2**            | 0 → **59.5**             | 68 → **22**                              |
| Finished all 5      | —                       | —                        | 0 → **136**                              |

- **Drop-off level:** L4 before (60.5% of sessions) and L4 after (15.5%). Median casual campaign: 7 → 6 battles,
  7.6 → 6.8 min.
- Other bots, 1st-try win pre → post: sweeper L5 0 → **100**, gate-seeker L5 0 → **100**; aim, centre, idle unchanged
  in win rate on every level (centre L4 battles 418 → 424). Aim bot boss median time to first win 103.7 → 43.7 s;
  L4 31.5 → 26.5 s. Total battles 9,010 → 8,094 (6,000 sessions each).

### Aiming pillar gap (input for M2-28)

1st-try win %, post-retune. M2-28 acceptance: sweeper ≥ 15 points **below aim** on L1–L4, casual in target range.

| Level | Aim | Sweeper | Gate-seeker | Casual | Sweeper − casual (pre → post) | Aim − sweeper (pre → post) |
| ----- | --- | ------- | ----------- | ------ | ----------------------------- | -------------------------- |
| L1    | 100 | 100     | 100         | 100    | 0 → 0                         | 0 → 0                      |
| L2    | 100 | 100     | 100         | 98.5   | +1.5 → +1.5                   | 0 → 0                      |
| L3    | 100 | 100     | 100         | 74.5   | +25.5 → +25.5                 | 0 → 0                      |
| L4    | 100 | 100     | 100         | 65.5   | +84 → +34.5                   | 0 → 0                      |
| L5    | 100 | 100     | 100         | 59.5   | 0 → +40.5                     | +100 → **0**               |

The sweeper still out-wins the gate-choosing casual bot on every level from L2, and now on the boss too. Aim − sweeper
is 0 on all five levels, so M2-28 has 15 points to find on each of L1–L4 and (new) the boss lost its only
aim-vs-sweep separation.

## Method

1. **Headless sessions** (`playtests/m2-12/sim-sessions.ts`): the real deterministic sim (`src/sim/World`, 60 Hz,
   `autoTriggers`) with the bots from `tests/bots.ts`. **200 sessions per level per bot** (6 bots × 5 levels =
   6,000 sessions, 8,094 battles post-retune; 9,010 pre-retune), plus 600 campaign sessions. Each attempt uses a different seed.
   Events are emitted in analytics format and scored with `playtests/m2-12/metrics.mjs`, the same scorer QA uses.
   - Session model (**assumptions, not measurements**): up to 3 retries. After a loss the bot retries with p = 0.85 if
     ≤ 30% nest HP was left (near miss), else p = 0.60. 3 s UI gap between battles. No revives, no boosts, no ads.
2. **Browser sessions** (`playtests/m2-12/bot-sessions.mjs`): headless Chrome (puppeteer-core, swiftshader) on the
   production build via `vite preview --host 127.0.0.1`. 3 profiles × 2 runs, ≤ 6 battles or 6 min each,
   rAF fps sampler. These check that the sim matches what the browser does, and measure FTUE time and fps.
   They matched (pre-retune; not re-run after M2-26): browser sweeper/gate-seeker won L1–L4 and lost the boss in 4/4 runs, the same as the sim.

### Bot types

| Bot         | Behaviour                                                                                                     | Stands in for                    |
| ----------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| idle        | never fires                                                                                                   | AFK; difficulty floor            |
| centre      | fires straight up, queen when ready                                                                           | player who never aims            |
| sweeper     | holds fire, sweeps ±35% of lane width at 1.3 rad/s (as browser runner)                                        | mindless "wiggle" player         |
| gate-seeker | centre-biased sweep ±20% at 0.9 rad/s (as browser runner; gate x isn't in the DOM)                            | lazy aimer                       |
| casual      | every 1.5 s picks the best visible gate (35% random), no lead, aim noise, lifts finger 15% (M2-17 definition) | typical new player               |
| aim         | best gate plan with lead, searched on the base seed                                                           | expert who has learned the level |

## Per-level results (headless, post-retune, 200 sessions per bot per level)

\* Retry after loss is driven by the session model (see Method). Pre-retune tables: PR 052 version of this file
(`git show f990cab:research/m2-12-local-playtest-report.md`) and `results/pre-m2-26/sim-sessions.json`.

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
| casual      | 268     | 67.9         | 65.5          | 91                    | 79.1                | 61.6               | 80.2                         | 9                    |
| aim         | 200     | 100          | 100           | 100                   | —                   | —                  | 26.5                         | 0                    |
| centre      | 424     | 0            | 0             | 0                     | 52.8                | 4.7                | —                            | 100                  |
| idle        | 418     | 0            | 0             | 0                     | 52.2                | 0                  | —                            | 100                  |
| sweeper     | 200     | 100          | 100           | 100                   | —                   | —                  | 44.7                         | 0                    |
| gate-seeker | 200     | 100          | 100           | 100                   | —                   | —                  | 54.1                         | 0                    |

### wasp-queen-nest

| Bot         | Battles | Completion % | 1st-try win % | Cleared in ≤4 tries % | Retry after loss %* | Near-miss losses % | Median time to first win (s) | Quit without clear % |
| ----------- | ------- | ------------ | ------------- | --------------------- | ------------------- | ------------------ | ---------------------------- | -------------------- |
| casual      | 311     | 59.2         | 59.5          | 92                    | 87.4                | 100                | 105.4                        | 8                    |
| aim         | 200     | 100          | 100           | 100                   | —                   | —                  | 43.7                         | 0                    |
| centre      | 418     | 0            | 0             | 0                     | 52.2                | 0                  | —                            | 100                  |
| idle        | 418     | 0            | 0             | 0                     | 52.2                | 0                  | —                            | 100                  |
| sweeper     | 200     | 100          | 100           | 100                   | —                   | —                  | 67.9                         | 0                    |
| gate-seeker | 200     | 100          | 100           | 100                   | —                   | —                  | 70.5                         | 0                    |

### Campaign sessions (post-retune, 200 per bot, start at L1, play on after each win)

| Bot     | Drop-off level (sessions)                                                 | Median FTUE first win (s) | Median battles | Median session (min) |
| ------- | ------------------------------------------------------------------------- | ------------------------- | -------------- | -------------------- |
| casual  | finished 136 · L4 thistle 31 · L5 boss 22 · L3 clover 10 · L2 dandelion 1 | 17.8                      | 6              | 6.8                  |
| sweeper | finished all 5: 200                                                       | 20.2                      | 5              | 3.9                  |
| aim     | finished all 5: 200                                                       | 12.6                      | 5              | 2.7                  |

### Browser bot runs (PRE-retune only, main @ 36f9a21, 127.0.0.1:4317; data in `results/pre-m2-26/browser/`)

| Run           | Battles | Results (level: s)                              | First win (s) | Median fps | 1% low fps |
| ------------- | ------- | ----------------------------------------------- | ------------- | ---------- | ---------- |
| idle-1        | 5       | L1 lost ×4 (75 s each)                          | —             | 59.9       | 6.7        |
| idle-2        | 5       | L1 lost ×4                                      | —             | 59.9       | 15         |
| sweeper-1     | 6       | L1 25, L2 52, L3 74, L4 69 won; boss lost (110) | 26.2          | 29.9       | 7.5        |
| sweeper-2     | 5       | L1 26, L2 54, L3 76, L4 74 won; boss lost       | 26.2          | 30         | 10         |
| gate-seeker-1 | 6       | L1 17, L2 41, L3 62, L4 59 won; boss lost       | 17.4          | 30         | 10         |
| gate-seeker-2 | 6       | L1 17, L2 39, L3 84, L4 59 won; boss lost       | 17.8          | 30         | 10         |

## Top 5 issues (evidence, post-retune)

1. **Mindless sweeping now beats every level, including the boss.** Sweeper and gate-seeker: 100% first try on L1–L5
   (1,000 sessions each). The boss was the one level where aiming mattered (pre-retune 0% sweeper vs 100% aim); after
   M2-26 the aim − sweeper gap is 0 on all five levels. This is the core of **M2-28 (aiming pillar, PLAN.md, PR 056 merged `6e67f2b`)**; the
   M2-28 acceptance (sweeper ≥ 15 below aim on L1–L4) is unmet on every level, and L5 should be added to its scope.
2. **The gate-choosing casual bot does worse than wiggling.** Sweeper − casual 1st-try gap: L3 +25.5, L4 +34.5,
   L5 +40.5 points. Choosing gates (the intended skill) is punished relative to holding fire and sweeping. Input
   for M2-28: close this gap without pushing casual out of its target range.
3. **L4 thistle-gauntlet is still the drop-off level, now near target.** Casual 65.5% first try (target 70%, PR 044
   aimed for 65%), 67.9% completion, 9% quit without clearing; 31/200 campaign sessions end here (was 121).
   Consider whether 65.5% is acceptable against levels-m2.md's 70%.
4. **Boss (L5) is in band for casual, but the band test can't catch the sweep problem.** Casual 59.5% first try
   (PR 055 band 55 ± 5, at its upper half), 22/200 campaign sessions end here (was 68). 100% of casual losses are near
   misses, so small tuning moves will swing it. Tests check casual only, so a sweep regression passes CI.
5. **FTUE still doesn't teach aiming.** Centre (never aims) wins L1 100%, L2 37.5%, then 0% from L3 (unchanged; L1–L3
   weren't retuned). With sweeping now winning everything, there's no level that forces a player to learn aiming.
   Tracked as **M2-29 (FTUE aiming step, PLAN.md, PR 056)**. FTUE time is fine (median 12.6–20.3 s headless).

Resolved by M2-26 versus the PR 052 list: "boss can't be beaten without a learned plan" (casual 0 → 59.5%) and
"0/200 casual campaigns finish" (now 136/200). Also noted: fps under software GL (pre-retune, median 30, 1% low
7.5–10) still needs a real-GPU check by QA.

## QA box-browser sessions (≥ 3): PENDING

hivesurge-qa is running these. **No QA logs are in the repo or any worktree yet** (checked 2026-10-14: every `playtests/m2-12/qa/` holds only `README.md`). Save them to `playtests/m2-12/qa/`
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
