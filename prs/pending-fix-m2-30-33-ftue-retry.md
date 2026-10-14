# PR (number pending from review): fix/m2-30-33-ftue-retry

Fixes QA M2-12 box-session bugs M2-30 (major) and M2-33 (minor), logged in
`playtests/m2-12/qa/2026-10-15-box-sessions.md` (branch `qa/m2-12-box-sessions` @ 03e76fe).

## Root cause

- **M2-30, stuck "Drag to the x2 gate".** Retry does reset correctly: each battle gets a new `World`
  and a new `Ftue`. I confirmed this headless; 3 retries that aim at the x2 gate advance every time.
  The stuck hint happens because:
  - In S2 attempts 2 and 3, the tester held the cannon in the centre (their "charge" habit).
  - Under M2-29 (PR 060, `ftue-m2.md` step 2), only aimed, off-centre x2 hits count, and step 2
    "never auto-completes". The design table row "never aims (fires from centre) → stays in step 2"
    describes exactly this.
  - So a retrying player who had already learned the step was hard-gated again for the whole
    battle. The hive stays shielded and the step 5 wave never spawns.
- **M2-33, the hold hint repeats every retry.** The FTUE restarts from step 1 on every attempt.
  Separately, the HUD's "Hold & drag to launch bees" hint is created fresh in every battle.

## Fix

- The save gets two new fields:
  - `ftueStep`: the highest FTUE step completed in any attempt. It is written as each step
    completes.
  - `holdUsed`: set on the first fire.
  - Both get parse defaults and a max/or merge.
- `new Ftue(0, 1, save.ftueStep)` on a retry: learned steps show no prompt and never block.
  - Each still completes on its own exit condition, or at its existing timeout (4/6/6/5 s)
    instead of pulsing.
  - Unlearned steps teach exactly as before.
  - A first attempt is unchanged, so M2-29's 6-aimed-hit rule still applies the first time.
- The generic HUD hold hint is hidden once `holdUsed` is set.

## Tests

`tests/ftueRetryM2-30.test.ts` fails 6 of 7 tests on main and passes 7 of 7 with the fix. It covers:

- centre-firer first attempt (unchanged);
- centre-firer retry with step 2 learned (advances, no step 1/2 prompt, step 3 still prompts);
- all steps learned (no prompts);
- step 1 not shown again;
- save parse, defaults and merge;
- game wiring.

**Headless (dev, fresh profile):**

- Attempt 1 aims, so step 2 completes and the save stores `ftueStep: 3, holdUsed: true`.
- On attempts 2 and 3, firing from the centre (cannon x 0) reaches step 4 by 15 s instead of
  sticking in step 2.
- No page errors.

## For design

- Please confirm the retry rule: learned steps don't block, and they complete at their timeout.
- The queen-button focus during a learned step 4 is unchanged. Design owns the queen button state.
