# PR 094: fix/m2-31c-miss-cue-input

QA recheck of the M2-31 miss cue (PR 087), the pointer-hold report, and review's additions. This PR
changes no gameplay: it does not retune L1, and the escape timing is unchanged.

## 1) "Missed!" readability (fixed)

- **Style:** new `.floater.miss` class: 30 px (1.67× the 18 px floater), weight 900, 5 px dark
  outline (`-webkit-text-stroke`, ink), and a drop shadow. It pops in (scale), holds, then fades
  over 1 s.
- **Layering:** it is drawn above the canvas (units) and other HUD items (z 3) but below
  `#overlay`, so modals stay on top.
- **Position:** still centred on the missed gate row. It is now projected at the gate panel height
  (1.0) instead of 1.5 above it.
- **Screenshots:** `docs/qa/m2-31c-missed-390x844.png` and `docs/qa/m2-31c-missed-1280x800.png`
  (headless, L1 replay, holding the centre). It reads clearly over the bee stream next to the x2
  gate.
- **Test:** `tests/missCueStyle.test.ts` checks the size range, bold, outline, z-index and
  centring, and that the cue uses this style at the gate row.
- **Cap (review note b):** the 3-cue cap is **per battle**. `MissCue` is created in `startBattle`,
  so it resets on Retry and on every new battle.

## 2) Pointer press-and-hold without movement (not reproduced)

- **Headless Chrome, CDP `Input.dispatchMouseEvent` / `Input.dispatchTouchEvent`:**
  - Pressed with no move, held 3 s, at both the screen centre and the lower lane, at 390×844
    (mobile, touch) and 1280×800.
  - All 8 cases fired continuously: 28 bees in 3 s, about one every 0.11 s, which is the full rate.
    `input.firing` stayed true.
  - Events seen: `pointerdown`/`pointerup` (plus `touchstart`/`touchend`). There was no
    `pointercancel` and no `contextmenu`.
- **Code review:**
  - `pointerdown` on the canvas sets `firing` and the 068 tap latch. No `pointermove` is needed.
  - `#app` and `#game` have `touch-action: none`.
  - `#hud`, and the FTUE prompt inside it, have `pointer-events: none`, so a press at the centre
    hits the canvas.
  - `takeFire()` returns true on every sim step while held.
- **Test:** `tests/inputHold.test.ts` covers mouse and touch held with no move (fires on all 180
  steps, stops on release) and a sub-step tap (fires once).
- **Likely cause:** QA's driver (the Computer tool on a loaded box at 5–15 fps) or a long-press
  gesture in their browser. That fits their S1 notes ("early drags fired 1–4 bees").
- **For the M2-19b real-device check:** press and hold at the centre with no movement, on iOS
  Safari and Android Chrome, and check whether a long-press triggers the system callout,
  `pointercancel` or `contextmenu`.

## 3) Centre hold wins L1 (investigate only, not changed; for design, currently inactive)

**Bot win rates on L1 `ftue-meadow`, 200 seeds:**

| bot    | win rate |
| ------ | -------- |
| centre | 100%     |
| aim    | 100%     |
| casual | 100%     |
| idle   | 0%       |

**FTUE centre hold** (fire at x 0 all the time, no aiming):

| FTUE attempt | queen when ready | result         | FTUE state at win                         |
| ------------ | ---------------- | -------------- | ----------------------------------------- |
| 1 (or 2)     | yes (5 queens)   | **won 21.5 s** | stuck in step 2 (only step 1 completed)   |
| 1 (or 2)     | no               | **won 25.2 s** | stuck in step 2                           |
| 3 (escape)   | yes              | won 23.2 s     | step 2 escaped at timeout, steps 3–5 done |
| 3 (escape)   | no               | won 25.2 s     | through step 3                            |

- **The problem:** a first-attempt centre holder breaks the 600 HP nest in about 21–25 s of sim
  time without ever learning to aim. QA's about 14 s is their wall-clock estimate.
- **What the game then does:** `claim()` sets `ftueDone` on any FTUE win, so the FTUE ends there.
  Steps 3–5 (lead, queen) are never taught.
- **Why the escape doesn't help:** the step 2 escape (091) only applies from attempt 3, so a
  player who wins by holding the centre never reaches it.
- **Options for design** (not implemented):
  - make nest damage wait for step 2 (or step 5), like the hive shield;
  - raise the L1 nest HP while the FTUE is unfinished;
  - don't set `ftueDone` on a win before step 5.

## Review addition (a): 091's escape timing (doc corrected)

- **Behaviour is unchanged:** step 2 escapes **6.0 s after the step 2 prompt appears** (the existing
  `TIMEOUTS[Gate]`).
- **Doc fix:** 091's doc said "about 8.5 s of battle time". That is battle time, which also
  includes boot and step 1. It now says "6.0 s after the prompt, about 11.5 s of battle in QA's
  run". 091 is merged, so the fix is in `prs/091-fix-m2-30b-ftue-escape.md` on this branch.
- **Test:** `tests/ftueEscapeM2-30b.test.ts` now also asserts that the gap from prompt to
  completion is 6.0 s.

## Decision 40: FTUE carries into L2 (CEO picked option c)

Review numbered this PR 094. At the CEO's request this change is bundled with the "Missed!" fix.

### Behaviour

- **Winning early doesn't finish the FTUE.** A win before step 5 no longer marks the FTUE done
  (`ftueDoneOnWin` in `src/ftue/ftue.ts`). The furthest learned step stays in `save.ftueStep`
  (from 086).
- **The next battle (L2, `dandelion-drift`) runs the FTUE again.** Steps up to the saved one are
  "learned" (086 rule): they show no prompt and never block. The player gets the prompt for the
  first unlearned step. After an L1 centre-hold win, that is "Drag to the x2 gate".
- **Gates used on L2:** step 2 uses L2's x2 gate (index 0, x 1.3). Aimed hits need cannon x in
  1.5–2.5. Step 3's lead line uses L2's moving x2 gate (index 2).
- **091 still holds on L2:** attempt counting, the ghost demo and the 6.0 s escape all work there.
  An L1 battle that ends in step 2 counts as a failed attempt, even if it was a win. So an L1
  centre-holder sees the ghost demo on their first L2 battle.
- **A full FTUE still marks done,** as before (step 5 complete).
- **L2 is the last FTUE level.** A win on L2 ends the FTUE even before step 5. Otherwise
  `ftueDone` could stay false forever, keeping the G1/G2 ad and offer gating on. This is ENG's
  choice; design can revisit it.
- **Relaunch:** the old rule ("FTUE done on a later launch once a battle was played") now applies
  only when there is no saved FTUE progress (`ftueStep` 0, i.e. old saves). Otherwise the carried
  steps survive a relaunch.

### Hive shield on L2 (checked)

- The FTUE's hive shield before step 5 and the step 3 timeout slow-down now apply **only on L1**.
  L2 keeps its own difficulty.
- The L2 waves have no FTUE triggers.
- **Sim check:** the same bots with and without the FTUE running on L2 give identical results
  (outcome, time, nest HP and hive HP):

  | bot    | result           |
  | ------ | ---------------- |
  | centre | won 50.3 s       |
  | aim    | won 38.0 s       |
  | sweep  | lost at time-out |

- **L2 win rates (200 seeds, the FTUE doesn't change them):** casual 98%, aim 100%, centre 80%,
  sweep 0%.

### Odd findings for design (currently inactive)

- **Centre-holders still get through:** a centre-holder wins L2 80% of the time, and that win ends
  the FTUE. So a player who never aims can still finish the FTUE across L1 and L2 without learning
  to aim. They do see the step 2 prompt and the ghost demo on L2.
- **Relaunch skips the title:** with the FTUE unfinished, the app auto-starts the current FTUE
  level on launch (first-launch rule). After an L1 win, that means a relaunch goes straight into
  an L2 battle.
- **Short prompt gap on L2:** a learned step 1 waits for 1 s of firing or its 4 s timeout, so an
  idle player sees no prompt for the first ~5.5 s of L2.

### Tests and checks

- **Tests:** `tests/ftueCarryDecision40.test.ts` covers:
  - an L1 centre-hold win leaves the FTUE not done, with step 1 saved;
  - L2 resumes at step 2 with its prompt, then step 3;
  - no shield or slow-down on L2;
  - the 091 escape on L2;
  - the 086 learned steps hidden on L2;
  - a full FTUE still marks done, and an L2 win ends it;
  - the game wiring.
- The 086 and 091 source checks were updated for `ftueForLevel`, and the existing FTUE tests stay
  green.
- **Headless (390×844, fresh profile):**
  - Holding the centre on L1 won at 26 s of battle time with the FTUE in step 2. The save then
    had `ftueDone: false`, `ftueStep: 1` and `ftueStep2Fails: 1`.
  - Claim went to the title, then Play started L2 (`dandelion-drift`).
  - From a relaunch with that save, L2 auto-starts. At 8 s it shows "Drag to the x2 gate" with
    the ghost demo sliding to x 1.3, and `hiveShield` is false.
  - Screenshot: `docs/qa/decision40-l2-carried-prompt.png`. No page errors.
