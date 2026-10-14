# PR (number pending from review): fix/m2-30b-ftue-escape

QA FAIL on PR 086 (already merged, at `903639c`): a player who never makes an aimed x2 hit sees
"Drag to the x2 gate" through every retry, about 75 s each. The timeout only pulses the prompt.
This adds an escape. The branch is cut from main `d6d8672` because 086 had already merged.

## Behaviour

- **Counting failed attempts:** the save gets `ftueStep2Fails`. It counts FTUE battles that ended
  with step 2 still not learned, and merges with max.
- **Attempt 1:** unchanged, with the M2-29 rule of 6 aimed hits and a timeout that only pulses.
- **From attempt `FTUE_STEP2_DEMO_ATTEMPT` = 2:** a translucent ghost cannon slides from the centre
  onto the x2 gate (1.2 s slide, 0.6 s hold, looping) while step 2 is up. Step 2 still needs the
  aimed hits.
- **From attempt `FTUE_STEP2_MAX_ATTEMPTS` = 3:** step 2 completes at its 6 s timeout, so the FTUE
  continues. The step is saved as learned (`ftueStep` 2) through PR 086's path, and analytics get
  `timedOut: true`.
- So a player who never aims sits through at most 2 full stuck attempts.
- **Tuning:** all four constants (`FTUE_STEP2_DEMO_ATTEMPT`, `FTUE_STEP2_MAX_ATTEMPTS`,
  `FTUE_DEMO_SLIDE_S`, `FTUE_DEMO_HOLD_S` in `src/ftue/ftue.ts`) are ENG defaults. **Design
  (currently inactive) can tune them.**

## Tests

- `tests/ftueEscapeM2-30b.test.ts` fails 5 of 5 tests on main and passes 5 of 5 with the fix. It
  covers:
  - the constants;
  - attempt 1 unchanged (stuck, no demo);
  - attempt 2: the ghost goes from 0 to x −2.8 and loops, and the step is still gated;
  - attempt 3: escape at the timeout;
  - the save field and the game wiring.
- One 086 source check now also accepts the 4th constructor argument.
- **Headless (dev, fresh profile, 3 attempts holding the centre):**
  - A1: stuck in step 2, no ghost; `ftueStep2Fails` becomes 1.
  - A2: the ghost slides to −2.80 while the prompt stays; fails becomes 2.
  - A3: the ghost shows, step 2 completes at about 8.5 s of battle time, and the FTUE moves through
    "Aim ahead of moving gates" to "Tap the queen!". The saved `ftueStep` reaches 3.
  - No page errors.
