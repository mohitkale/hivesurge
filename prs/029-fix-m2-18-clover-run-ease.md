# PR 029 — fix/m2-18-clover-run-ease (M2-18; base: fix/m2-23-webgl-warnings-stars, PR 027)

**Summary:** Applies the M2-17 tuning note (`docs/design/levels-m2.md`, `e35bd48`) to Clover Run. Only two knobs
change: `nestHp` goes from 2600 to **2350**, and `hiveHp` from 40 to **50**.

**Changes**

- `src/levels/clover-run.json`: the two knobs. Gates, waves, time limit, queen charge and trickle are unchanged.
- `tests/bots.ts`: new `casualBot(seed)` and `casualWinRate(level, n)`, per the note's casual-bot definition.
  - Picks every 1.5 s. Takes the best visible non-trap gate (mul scores 3×), or a random non-trap gate 35% of the time.
  - No lead. Aim noise is a sum of 3 uniforms (sd 1.2).
  - Holds fire for 15% of picks.
  - Launches the queen 1 s after it is ready.
  - Uses its own mulberry32 RNG.
- `tests/cloverRunEase.test.ts`: checks the knobs, casual 65–75% over 200 seeds, idle at 0%, and centre below casual.
- `tests/levels.test.ts`: updated to the new Clover Run values.

**Real win rates** (seeds `level.seed + s×7919`; same seed counts as the note)

| Variant                 | Idle (20) | Centre (200) | Casual (200) | Aim (40) |
| ----------------------- | --------- | ------------ | ------------ | -------- |
| shipped 2600 / 40       | 0%        | 0%           | 46.0%        | 75%      |
| **2350 / 50 (this PR)** | **0%**    | **0%**       | **74.0%**    | **100%** |

DES's note reported 41.5% → 69%. My casual bot is a re-implementation of the prose definition (DES's code was not
committed), so it differs a little.

**Bot-interpretation note:** The definition says "aims at the gate's current x". I measured two readings:

- **Tracking reading:** the bot follows the moving gate between picks. This gives 68.5% at the shipped values and 88.5%
  at 2350/50, which does not match DES's baseline at all.
- **Pick-time reading:** the bot aims at the gate's x when it picks and holds that for 1.5 s. This gives 46% → 74%,
  which matches DES's baseline (41.5%, QA's 1 in 4).

This PR uses the pick-time reading. 74% is inside the band but close to the top. If DES wants about 70%, the note's
sensitivity (about 6–7 points per 100 HP) suggests `nestHp` 2400. That is a 50 HP move, so it would need a bot rerun.
I did not make that change, because the spec said 2350.

**Test results:** lint pass · `npm test` 131/131 · build pass (game 56.80 kB / 19.28 kB gzip).

**Acceptance (M2-18, as clarified by DES):**

- Casual 65–75%: met (74.0%).
- Idle loses: met (0%).
- Centre below casual: met (0%).

**Reviewer:** hivesurge-review

**Status:** awaiting review
