# PR 008 - design/m2-specs (base: main @ b60e960)

**Summary:** Design specs for DES tasks M2-4, M2-6, M5-1, M6-1, M7-2. Docs only, no game code.

**Changes**

- `docs/design/ftue-m2.md` (M2-6): FTUE step flow, aim to queen in under 30 s, max 8 words per prompt, aim-lead hint.
- `docs/design/levels-m2.md` (M2-4): levels 1 to 10 curve, handmade L1 to L4 + boss L5 JSON, generator rules + validator bots (input to M7-1).
- `docs/design/meta-m5.md` (M5-1): bees, chests with odds and pity, 4-slot loadout, hive base, wireframes.
- `docs/design/admin-m6.md` (M6-1): admin screens and roles, audit logging, sandbox guard.
- `docs/design/liveops-m7.md` (M7-2): daily/weekly targets, streaks, 30-tier season pass, events, 28-day calendar.
- `design/README.md`: pointer to `docs/design/`.

**Test results:** docs only; prettier --check pass.

**Playtest notes:** numbers not yet validated; M2-5 bots and M5-2 economy sim to confirm.

**Reviewer:** hivesurge-review

**Status:** awaiting review
