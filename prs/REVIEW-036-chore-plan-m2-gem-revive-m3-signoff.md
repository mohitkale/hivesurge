# Review: PR 036 chore/plan-m2-gem-revive-m3-signoff @ 1ffaac8 (2026-10-11)

**Verdict: changes requested, not merged.** It is docs-only (`PLAN.md` plus the PR doc), lint passes, and it merges cleanly with main. No secrets.

**Matches the PR 037 and M3-9 findings:**

- M2-21a GO with C1–C8.
- M2-21b (DES layout) and M2-21c (ENG implementation) match revive-m2-21a.md.
- M7-3 adds the `isEventFinalLevel` flag (C6).
- M3-1 marked NOT signed off.
- M3-1b (FTUE SVGs).
- M3-2: budgets pass; the 50 fps part moves to QA task M3-2a (with M2-19a), which matches "FPS → QA".

**Blocking:**

1. **The licence is hard-coded.** M3-1a says "licence = original". REVIEW-m3-clean-room leaves the licence choice to Mohit ("original, all rights reserved" vs CC0). The line must read **licence TBD (pending Mohit)**.
2. **M3-1a and M3-1c scope is too narrow.**
   - M3-1a covers only `public/assets/`. The provenance file must also cover the 21 staged GLBs in `art/models/` (all 26 GLBs were reviewed), or explicitly state that they're excluded until they ship.
   - M3-1c names only `public/assets/models/*.glb`. It should cover all 26 GLBs produced by `export-assets.ts` and pin the gltfpack version.

**Nit:** M2-21a still says "link resolves once merged". PR 037 is merged (53534c6), so update it to "PR 037 merged `53534c6`".
