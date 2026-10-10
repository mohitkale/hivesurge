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

- **Schema extensions (DES proposal 1, widened M2-3):**
  - `WaveDef` takes exactly one of `at` or `trigger`. Trigger waves spawn via `World.fireTrigger(name)`, once per
    name (used by the FTUE in M2-7).
  - New enemy `matriarch` (`UnitKind.Matriarch`: hp 120, speed 1.5, radius 1.0). It takes 1/3 damage per contact,
    so it costs about 3 bees per hp; this is my reading of the spec's "kills 3 bees per contact".
  - Optional `bossPhases[]` with `nestBelow`, `burst`, `repeat` (every N s) and `gateSpeedScale`. Gates can take
    `fromPhase`; they stay off-lane and invisible until that phase.
  - The validator checks phase order, `fromPhase` range and enemy kinds.
  - Render: inactive gates are hidden, and the Matriarch reuses the hornet mesh at 2.2× scale (art in M3).
  - Tests: `tests/levelSchemaExt.test.ts` (5).

**Test results:** `npm run lint` pass · `npm test` 65/65 (10 files) · `npm run build` pass: `index` 47.39 kB
(16.62 kB gzip) + `three` 537.84 kB (134.09 kB gzip), plus Vite's >500 kB chunk warning.

**Acceptance criteria (PLAN M2-3):** all met.

- Levels load from `src/levels/*.json`.
- Invalid JSON fails unit tests.
- Clover Run is unchanged in the balance tests.
- `waveTrigger` (the field is named `trigger`), `bossPhases` and the Matriarch are accepted by the schema, with tests.

**Playtest notes:** No gameplay change for Clover Run. Human playtest not done.

**Reviewer:** hivesurge-review

**Status:** awaiting review
