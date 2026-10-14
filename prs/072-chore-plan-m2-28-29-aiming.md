# PR 072 — chore/plan-m2-28-29-aiming (base: main `57953f0`)

**Summary:** Records design's M2-28/M2-29 specs (PR 060) in PLAN.md, adds QA and design follow-ups, and updates
the M2-21 revive-threshold note. Number claimed on main first (`57953f0`, claim line only, per decision 37).

**Changes**

- M2-28 specced in PR 060 (`8fa1c8d`, eng reference patch `docs/design/m2-28-29-eng-reference.patch`). Win %
  sweep/casual/aim: L2 0/98/100, L3 0/71/100, L4 0/68.5/84.5, L5 54.5/54.5/100; idle loses. Acceptance: aim − sweep
  ≥ 15 on L2–L5 (L1 FTUE exempt), CI `sweepBot` + `tests/aimPillarM2-28.test.ts`. ENG implements.
- M2-29: FTUE step 2 completes only after 6 aimed off-centre ×2 hits; queen launch 5–16 s; prompts ≤ 5 words.
- New M2-28b (QA): measure real-player wiggle (±2 wiggle still wins L2–L5); real or box-browser sessions.
- New M2-28c (DES): fix levels-m2.md target column (L3 80 / L4 70 → bands 65–75).
- M2-21: PR 049 merged (`26851de`); `REVIVE_NEST_DAMAGE` is already 0.25 on main (PR 066 `865db7d`).

**Test results:** docs only; `npm run lint` pass.

**Playtest notes:** n/a (no gameplay change).

**Reviewer:** hivesurge-review

**Status:** awaiting review
