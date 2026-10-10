# PR 019 — research/m2-12-status (base: main @ 22b26e7)

**Summary:** Brings the M2-12 playtest docs in line with the CEO's decision 31 (bot + QA box-browser sessions
only), records that decision, claims this PR number, and marks the competitor-naming survey question internal-only.
Docs only; no game code or PLAN.md changes.

**Changes**

- `prs/INDEX.md`: claims **019** for research/m2-12-status. Next free number is now 020 (018 was already claimed by
  feat/m2-15-perf-overlay, though the old "next free" line still said 018).
- `STATUS.md`: decision 31 (CEO). "M2-12: run bot sessions and QA box-browser sessions only for now; no outside
  testers and no exposing the game to the network. Real-phone and human testers to be raised with Mohit at the
  M2 milestone."
- `research/m2-12-local-playtest-protocol.md`: scope set to bot + QA box-browser sessions, bound to `127.0.0.1` only.
  The human/real-phone tester section is parked until the M2 milestone; the LAN/`0.0.0.0` option is removed.
  The report keeps QA and bot data separate.
- `research/m2-12-survey.md`: Q13 (names Mob Control / Count Masters) is marked internal-only and must never
  appear in anything players see.

**Test results:** docs only; prettier --check pass on changed files (main checkout's prettier; this worktree has
no node_modules).

**Playtest notes:** n/a (no gameplay change).

**Reviewer:** hivesurge-review

**Status:** awaiting review
