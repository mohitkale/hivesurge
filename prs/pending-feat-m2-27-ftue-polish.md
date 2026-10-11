# PR (number pending): feat/m2-27-ftue-polish

Task: M2-27 (validation-m2.md #1 and #3). Base: main `58f7c72`.

## Changes

- `MIN_PROMPT_DWELL_S = 1.5`: steps 1 to 4 advance only after their prompt has been on screen for at least 1.5 s.
- Step 4: if the queen is launched before its prompt appears, the step completes at once, because no prompt was shown. Once shown, the prompt stays up for 1.5 s.
- Step 3 timeout (6 s): sets the moving gate's speed multiplier to 0.5 (`World.gateSpeedMul`, used by the sim and by `gateXAhead`, so the lead line stays correct). It goes back to 1 when step 3 ends.
- Fix: the unused `queenReady` field was replaced by `queenPromptShown`.

## Tests

`tests/ftuePolish.test.ts`:

- An instant player still sees every prompt for at least 1.5 s.
- The queen prompt dwell.
- Step 3 timeout gives 0.5x speed, which goes back to 1x when the step completes (timedOut recorded).
- Half speed gives half the angle, and aim-ahead agrees.

The existing M2-7 test (first queen under 30 s, win) passes.

## Checks

lint ok · tests 208/208 · build ok · size budget: initial JS 2.26 KiB gzip, dist 899.70 KiB.
