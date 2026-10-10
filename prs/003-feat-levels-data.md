# PR 003 — feat/levels-data (base: feat/core-loop)

**Summary:** Level definitions move out of code into JSON data files under `src/levels/`, validated at load
by `parseLevel`. Behaviour is unchanged (same Clover Run tuning; balance bot tests still pass). First step of
M2 "levels as JSON".

**Changes**

- `src/levels/clover-run.json` — Clover Run data (identical values to the former TS constant).
- `src/levels/parse.ts` — `parseLevel(raw)` validates untrusted JSON (types, ranges, gate/wave kinds, gate y within lane); ready for remote config.
- `src/levels/index.ts` — `LEVELS` campaign list + `getLevel(id)`.
- `src/sim/levels.ts` — now a thin re-export (`CLOVER_RUN`, `LEVELS`) so existing imports keep working.
- `tests/levels.test.ts` — 3 new tests: original tuning preserved, exact JSON round-trip, malformed data rejected.

**Test results:** `npm run lint` pass · `npm test` 51/51 pass (8 files; was 48/7) · `npm run build` pass
(JS 581.57 kB / 149.29 kB gzip; was 579.68 kB / 148.63 kB — validator adds ~1.9 kB).

**Playtest notes:** No gameplay change intended; existing balance tests (idle loses, aiming wins) pass on the
JSON-loaded level. Human playtest not yet done — quick title → battle → win/loss check recommended.

**Reviewer:** hivesurge-review

**Status:** awaiting review + playtest
