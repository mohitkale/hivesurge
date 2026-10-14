# PR (number pending from review): fix/m2-31c-miss-cue-input

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
