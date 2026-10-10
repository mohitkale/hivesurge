# PR 005 — feat/m2-3-levels-json (M2-3; base: fix/pr-002-review)

_Renumbered from 003 (hivesurge-ba's PR 003 is chore/plan-m2-m7)._

**Summary:** Level definitions move out of code into JSON data files under `src/levels/`, validated at load by
`parseLevel`. Behaviour is unchanged (same Clover Run tuning; balance bot tests still pass).

**Changes**

- `src/levels/clover-run.json`: Clover Run data, identical values to the former TS constant.
- `src/levels/parse.ts`: `parseLevel(raw)` validates untrusted JSON. It checks types and ranges, gate and wave
  kinds, at most 32 gates (`MAX_GATES`, the sim's gate bitmask), integer gate `value` and wave `count`, gate y within
  the lane, and gate rest position fitting the lane width (`|x| + width/2 <= laneWidth/2`; moving gates are clamped by
  `gateX`).
- `src/levels/index.ts`: `LEVELS` campaign list and `getLevel(id)`.
- `src/sim/levels.ts`: thin re-export (`CLOVER_RUN`, `LEVELS`) so existing imports keep working.
- `tests/levels.test.ts`: 6 tests. Original tuning preserved; exact JSON round-trip; malformed data rejected; 32-gate
  cap; integer values and counts; lane fit.

**Test results:** `npm run lint` pass · `npm test` 60/60 (9 files) · `npm run build` pass: `index` 44.71 kB
(15.75 kB gzip) + `three` 537.84 kB (134.09 kB gzip), plus Vite's >500 kB chunk warning.

**Acceptance criteria (PLAN M2-3):**

- Levels load from `src/levels/*.json`: met.
- Invalid JSON fails a unit test: met.
- Clover Run unchanged in balance tests: met.
- **Not yet:** the widened criterion (optional `waveTrigger`, `bossPhases` and Wasp Matriarch accepted by the schema,
  with tests) is still to come in a follow-up commit on this branch.

**Playtest notes:** No gameplay change. Human playtest not done.

**Reviewer:** hivesurge-review

**Status:** awaiting review
