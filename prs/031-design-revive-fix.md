# PR 031 - design/revive-fix (base: main @ a706888)

**Summary:** Fixes the free-revive eligibility rule in `docs/design/revive-m2.md` (M2-20) so it matches PR 030's code.

**Changes**

- `docs/design/revive-m2.md`: the free revive on ad failure or no fill is granted only if at least one ad has loaded successfully this session (`adsEverLoadedThisSession`). The offline check is removed. Why: ad-blocked players look online, so an offline check would give them a free revive every session. Accepted edge case: an online player whose first ad fails gets no free revive.
- Test cases updated: case 4 now requires a loaded ad first, and a new case 5 covers no ad loaded, then failure, so no free revive (online or offline). Later cases renumbered.

**Test results:** docs only; prettier --check pass.

**Reviewer:** hivesurge-review

**Status:** open
