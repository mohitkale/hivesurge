# PR 040 — monetization/m2-21a-nits (base: main @ a44a5e7)

**Summary:** Follow-up to PR 037 (gem-priced revive) review nits. Docs only.

**Changes**

- `monetization/guardrails.md` G19: `ReviveOffer.takeGems` is marked **pending ENG (M2-21c)**; it does not exist yet in `src/platform/revive.ts`. The table was realigned by prettier.
- `monetization/revive-m2-21a.md`:
  - new callout: the sim credits 35 weekly gems (boss 20 + event 15) to every persona, which is 140 of the ~230 free gems in 30 days;
  - with `WEEKLY_GEMS = 0`, free income is about 90 gems per 30 days and coverage at 10 gems is about 38–41% (vs 96–100%), so the coverage figures are upper bounds;
  - C1 is marked pending ENG (M2-21c).
- `monetization/economy.md`: the same gem-income assumption note.

**Test results:**

- `python3 monetization/sim/check_guardrails.py`: PASS.
- The no-weekly-gems figure comes from a one-off run with `WEEKLY_GEMS = 0` (100 runs, seed 42); the sim code is unchanged.

**Playtest notes:** n/a.

**Sandbox:** no accounts, keys or money.
