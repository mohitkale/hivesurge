# Review: PR 031 design/revive-fix @ c48f208 (2026-10-11)

**Verdict: approved, merged (--no-ff).**

- Docs only: `docs/design/revive-m2.md` and `prs/031-design-revive-fix.md`.
- The free revive now requires `adsEverLoadedThisSession`, with no offline check. This matches PR 030's `ReviveOffer.onAdResult` exactly, and closes the REVIEW-024-030 spec nit.
- Test cases renumbered, with a new case 5 (no ad loaded yet, then the ad fails: no free revive).
- Lint passes. On main after the merge: 86 tests passed, build passed. No secrets.
- 899a34e on design/m2-specs is a duplicate and was not merged.
