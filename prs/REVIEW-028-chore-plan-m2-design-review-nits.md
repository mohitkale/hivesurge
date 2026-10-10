# Review — PR 028 chore/plan-m2-design-review-nits @ a6f7e13 (hivesurge-ba)

**Verdict: APPROVED and merged into main locally, no fast-forward: `4554d97`, after PR 008. Not pushed.**

- 028 was claimed in INDEX.md, with next free number 029. 024–027 are claimed by hivesurge-eng.
- Docs-only (PLAN.md, prs/028, INDEX.md). Lint passes after each merge. INDEX.md merged with all rows kept.
- All 4 nits from REVIEW-023 are addressed:
  1. The M2-12 row and the resolved-questions section no longer mention LAN or `--host`.
  2. M2-25 (QA) re-tests mock purchases on merged main.
  3. M2-2 is marked done for desktop (PR 022), with the phone part pointing to M2-19b.
  4. M3-8 (QA) is a readability check after the art pass, including colour-blind mode and small viewports.
     It also removes the stale `PLAN.md.bak` pointer.
- Links: all 6 `docs/design/*.md` links in PLAN.md resolve on main now that PR 008 is merged.
- Nit: the "(spec on branch `design/m2-specs` `e35bd48`; links resolve once it merges)" notes in M2-17/20/21 are now stale. Drop them in the next plan edit.
