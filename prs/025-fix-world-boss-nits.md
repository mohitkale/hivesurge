# PR 025 — fix/world-boss-nits (review follow-up; base: feat/m2-12-bot-metrics, PR 024)

**Summary:** Two small `src/sim/world.ts` fixes from review.

1. **Moving gates no longer jump on a boss-phase speed change.** Gate position used to be `gateX(totalTime × scale)`,
   so switching `gateSpeedScale` (L5 phase 3: ×1.4) teleported gates. The motion angle is now integrated per tick
   (`angle += dt × speed × scale`), and x comes from the new `gateXAtAngle()`. The new `world.gateXAhead(i, seconds)`
   gives aim-ahead at the current speed; the FTUE lead line and the test aim bot use it. With a constant speed,
   results match the old closed form.
2. **`revive()` spares bosses.** It still clears ordinary wasps and hornets within 15 units of the hive, but no longer
   deletes the Wasp Matriarch.

**Tests:** `tests/worldBossNits.test.ts` (3).

- A gate moves at most `amplitude × speed × scale × dt` across a phase change; the old formula would have jumped more
  than 0.5 units at that point.
- Closed-form equivalence at constant speed.
- Revive keeps the Matriarch and clears a normal wasp.

All existing balance, FTUE and bot tests still pass.

**Test results:** `npm run lint` pass · `npm test` 124/124 · `npm run build` pass (game 56.30 kB / 19.07 kB gzip;
budget: initial 2.25 KiB gzip, dist 594.10 KiB).

**Playtest notes:** Sim-only. On L5, gates no longer snap when phase 3 starts.

**Reviewer:** hivesurge-review

**Status:** awaiting review
