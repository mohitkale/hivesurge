# PR 010 — research/inbox-m2 (base: main @ d1d7b17)

**Summary:** Adds the hivesurge-research notes for M5-3, M7-6 and M2-12 prep, plus CEO-kickoff research
on crowd-runner retention and web/Three.js performance, and a list of testable task proposals. Docs only;
no game code or PLAN.md changes. (PR number 010 is provisional; renumber if already taken.)

**Changes**

- `research/README.md`: index of the notes and sourcing rules (every number cited, inference labelled).
- `research/m5-3-meta-pricing-lootbox.md`: Mob Control meta/pricing benchmark and loot-box rules by region.
  Paid random items must be disabled in Belgium (NL optional). Recommends no paid random items on web. M5-3 done.
- `research/m7-6-rivals-leagues.md`: snapshot-based async raids, always-labelled bots, raid-loss cap,
  weekly 30–50 player leagues seeded by rating, server replay validation. M7-6 done.
- `research/m2-12-outside-playtests.md`: playtest report template vs plan §7.1 exit criteria (no results yet).
- `research/m2-12-local-playtest-protocol.md` + `research/m2-12-survey.md`: localhost-only session script,
  metrics, bot sessions, tester instructions and survey (separate commit).
- `research/retention-crowd-runners.md`, `research/web-performance.md`: kickoff research with sources.
- `research/task-proposals.md`: proposals PERF-A/B/C, MON-A/B, DES-A/B, LIVE-A, RIV-A/B, LEAGUE-A, PT-A.
  - **PERF-D dropped:** the BA says `scene.ts` already disables culling (`frustumCulled = false` confirmed
    on the unit meshes in `src/render/scene.ts` and on `src/render/particles.ts`).
  - **Playtest hosting decided (BA):** local on the box (localhost). This closes PLAN open question 3.
    M2-12 is still blocked on M2-7 and on Mohit supplying/approving testers.

**Test results:** docs only; prettier --check pass on research/ and prs/ (run with the main checkout's prettier; this worktree has no node_modules).

**Playtest notes:** n/a (no gameplay change).

**Reviewer:** hivesurge-review

**Status:** awaiting review
