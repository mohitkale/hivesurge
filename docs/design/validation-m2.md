# M2 design validation (M2-4 levels, M2-6 FTUE, boss gate layout)

Owner: DES. Build checked: `main` @ `8362e89` (branch base). Bots: `tests/bots.ts` (idle, centre, casual, aim). Bot data only, never player data.

## Method

The browser runner `playtests/m2-12/bot-sessions.mjs` plays the campaign in order with sweeper/gate-seeker profiles through the UI. It does not give per-level idle/centre/casual rates, and it has no stored data on main. So I used the same sim the balance tests use: `run`/`winRate`/`casualWinRate` from `tests/bots.ts`, in a scratch copy of main (no repo code changed). Seeds `level.seed + s x 7919`. Idle 20 seeds, centre 200, casual 200, aim 40.

## M2-4 win rates vs target (current main)

Target = levels-m2 first-try target, applied to the casual bot (M2-17 convention). Idle must lose.

| Stage | Level            | Idle | Centre | Casual  | Aim  | Target (casual) | Status                          |
| ----- | ---------------- | ---- | ------ | ------- | ---- | --------------- | ------------------------------- |
| 1     | ftue-meadow      | 0%   | 100%   | 100%    | 100% | 98%             | OK                              |
| 2     | dandelion-drift  | 0%   | 37%    | 98.5%   | 100% | 92%             | above target (easier), accepted |
| 3     | clover-run       | 0%   | 0%     | 74%     | 100% | 65 to 75%       | OK                              |
| 4     | thistle-gauntlet | 0%   | 0%     | **16%** | 100% | 70%             | **too hard**                    |
| 5     | wasp-queen-nest  | 0%   | 0%     | **0%**  | 100% | 55%             | **too hard**                    |

Idle loses everywhere and aim wins everywhere, so the validator rules hold. Two levels are far from their target.

## Tuning notes for ENG (verified in a scratch copy; all 170 repo tests still pass with these values)

### thistle-gauntlet: nestHp 3400 to 2650, hiveHp 40 to 50

| Variant                | Casual  | Aim      |
| ---------------------- | ------- | -------- |
| shipped 3400 / 40      | 16%     | 100%     |
| 3000 / 50              | 43%     | 100%     |
| 2800 / 40              | 53.5%   | 100%     |
| 2700 / 50              | 63.5%   | 100%     |
| **2650 / 50 (chosen)** | **65%** | **100%** |

Gates and waves unchanged. 65% is the low edge of plus or minus 5 around 70. Use 2600 if QA finds it hard (about plus 3 points per 50 HP, from the clover-run slope).

### wasp-queen-nest: a DPS problem, not a hive problem

Diagnosis: casual runs time out at 110 s with the hive almost full (hive 44 to 45/45, nest about 3300 to 3700/6000 left). Lowering nestHp alone does not help, because the phase thresholds are fractions, so phases and bursts arrive sooner (nest 2300 gives only 17%). The fix is easier gates for casual aim plus a lower nest and lighter repeat waves:

| Field                         | Old                              | New                                       |
| ----------------------------- | -------------------------------- | ----------------------------------------- |
| nestHp                        | 6000                             | **3200**                                  |
| hiveHp                        | 45                               | **50**                                    |
| gate 1 (add, x 2.5, y 10)     | +3                               | **+5**                                    |
| gate 2 (mul x3, y 18, moving) | width 2.4, speed 1.0             | **width 3.4, speed 0.6**                  |
| gate 3 (trap, phase 2)        | x 0, y 19, w 4                   | **x 0, y 14, w 2.6** (see layout verdict) |
| phase 1 repeat wasps          | 25 / 10 s                        | **20** / 10 s                             |
| phase 2 repeat                | wasps 35 / 9 s, hornets 3 / 15 s | **28** / 9 s, **2** / 15 s                |
| phase 3 repeat wasps          | 45 / 8 s                         | **36** / 8 s                              |

Bursts (8 hornets; 60 wasps + Matriarch), gateSpeedScale 1.4, timeLimit 110, queenCharge 6 unchanged.

| Variant                                           | Casual    | Aim      |
| ------------------------------------------------- | --------- | -------- |
| shipped                                           | 0%        | 100%     |
| nest 2300 only                                    | 17%       | 100%     |
| new gates, nest 3600, repeats x1.0                | 26.5%     | 100%     |
| new gates, nest 3200, repeats x0.8 (trap at y 19) | 55%       | 100%     |
| **full set above (trap at y 14)**                 | **59.5%** | **100%** |

Idle still loses, and the unit caps and 18 px label tests pass. Update `levelsBalance` if it pins old numbers.

### dandelion-drift: no change

98.5% vs 92% means it is easier than planned. As stage 2 right after the tutorial, that is fine. I am lowering the target to "at least 90%" instead of making it harder.

## M2-6 FTUE vs merged build

### First queen launch (scripted runs on ftue-meadow, `src/ftue/ftue.ts` driver, same harness as `tests/ftue.test.ts`)

| Scripted player                | First queen (from first input) | Battle end | Timeouts hit |
| ------------------------------ | ------------------------------ | ---------- | ------------ |
| reacts 0.6 s                   | 4.7 s                          | won 16.1 s | none         |
| reacts 1.5 s                   | 5.6 s                          | won 16.8 s | none         |
| reacts 3 s                     | 7.1 s                          | won 19.0 s | aim          |
| reacts 1.5 s, misses gates 6 s | 10.6 s                         | won 23.4 s | gate         |
| reacts 3 s, misses 8 s         | 14.9 s                         | won 27.5 s | aim, gate    |

All are far under 30 s. **PASS.**

### Prompt word counts (all strings in `FTUE_PROMPTS`)

| Prompt                    | Words |
| ------------------------- | ----- |
| Hold and drag to aim      | 5     |
| Shoot through the x2 gate | 5     |
| Aim ahead of moving gates | 5     |
| Tap the queen!            | 3     |
| Smash the nest!           | 3     |

The generic HUD hint "Hold & drag to launch bees" (5 words) is hidden during FTUE (`hud.hideHint()`), so only one prompt shows. `tests/ftue.test.ts` asserts the 8-word limit. **PASS.**

### Spec vs build differences

| #   | Spec (ftue-m2.md)                                             | Build                                                  | Action                                                                                                                                                        |
| --- | ------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Queen at 14 to 18 s, win at 30 to 40 s                        | Queen at 5 to 15 s, win at 16 to 28 s                  | Faster is fine for the budget. Risk: fast players see prompts 2 to 4 for under 1 s. **ENG:** minimum prompt dwell of 1.5 s before advancing to the next step. |
| 2   | Step 2 timeout: x2 gate slides 1 unit toward the cannon line  | Timeout only sets `emphasis` (prompt pulse)            | **ENG:** implement the slide, or DES accepts pulse-only. Recommend implementing it, because the gate sits at x 0 so the slide rarely matters. Low priority.   |
| 3   | Step 3 timeout: moving gate speed halves                      | Pulse only                                             | **ENG:** halve `motion.speed` for the moving gate after the 6 s timeout. Medium priority (it helps players who miss the lead).                                |
| 4   | Step 2 entry trigger "15 bees fired"                          | Enters after 1.0 s of cumulative firing (about 9 bees) | Accept the build. Spec updated by this note.                                                                                                                  |
| 5   | Aim-lead hint replays on later levels after 3 misses in a row | Lead line only in FTUE step 3                          | **ENG** follow-up (M2-7b). Not needed for the FTUE pass.                                                                                                      |
| 6   | ftueDone on first win OR second launch                        | Same (`game.ts` lines 83 and 493)                      | OK                                                                                                                                                            |
| 7   | Hive invulnerable until step 5                                | `hiveShield` until Finish                              | OK                                                                                                                                                            |

## Boss gate layout review (wasp-queen-nest, a00b606): trap at y 19 behind moving x3 at y 18

**Verdict: not OK. Move the trap to (x 0, y 14, width 2.6).**

Why the current layout is wrong:

1. **Hidden.** The trap's label plate sits 1 unit behind the x3 plate on the same centre line. From the cannon camera the x3 plate covers it whenever x3 is near centre, which is about half the time (|3 sin| < 2 for about 46% of the cycle). The trap also appears only in phase 2, so it pops in behind a gate the player is already tracking.
2. **Forced, not a choice.** Bees through x3 inherit its x, and the trap spans x from -2 to 2, so 46% of tripled bees run straight into it with no way to aim around it. The player cannot see the risk while choosing the x3 timing.
3. **Mechanically pointless.** The trap absorbs 30 bees once, then breaks. Placed after a x3 it eats 30 of a tripled stream in under a second: a hidden, tiny penalty, which is the worst combination.

Fix: trap at **x 0, y 14, width 2.6, fromPhase 2, value 30**.

- It is in front of the x3 row, so its label is nearer the camera and larger than 18 px (the farthest row is still x3 at y 18, unchanged). The label test passes.
- It is 4 units from row 1 (y 10) and 4 from x3 (y 18), so plates do not overlap. It covers only x from -1.3 to 1.3.
- It creates a readable timing choice: shoot at x3 when it swings to either side (|x| > 1.3 plus half the bee spread) and you dodge the trap, or shoot through the centre and pay 30 bees before multiplying. That is a fair, visible risk.
- Verified in the tuning run above (casual 59.5%, aim 100%, idle loses).
