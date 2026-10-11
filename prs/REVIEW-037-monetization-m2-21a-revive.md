# Review: PR 037 monetization/m2-21a-revive @ 39cf7c2 (2026-10-11)

Numbering: the branch named its doc `prs/036-…`, but ba claimed 036 on main first (fc2c001). I renamed the doc to `prs/037-monetization-m2-21a-revive.md` on main after the merge (53534c6). Branch history is untouched.

**Verdict: approved, merged (--no-ff) as 53534c6.** Recommendation: GO with conditions C1–C8 for ENG.

**Scope.** Docs, data and monetization tooling only: `monetization/*.md|csv|json` and `monetization/sim/*.py`. No game code (`src/`) changes. Gem revive is **not implemented yet**; C1–C8 are the ENG follow-up. No secrets.

**Checks on main after the merge:**

- `check_guardrails.py`: OK. 7 SKUs pass, and G19 passes 10 checks (10 gems ≈ $0.42).
- `economy_sim.py` (seed 42) reproduces the doc's gem-revive table (96% / 100% / 100% coverage) and leaves the committed `last_run.md` unchanged.
- Lint passes, 170 tests pass, build passes.

**Consistency with revive-m2.md and the PR 030 code: good.**

- **One revive per battle:** "1 revive per battle total" matches `world.revive()` / `revives === 0` and `ResultSession.markReviveGranted`.
- **Same eligibility:** it reuses `shouldOfferRevive` (FTUE G2, nest damage ≥ 0.5).
- **Early-close and free fallback:** the early-close (≤ 2) and free-fallback (`adsEverLoadedThisSession`, PR 031) rules are unchanged. C3 hides the gem button while the free one is shown.
- **Interstitial guard:** a gem revive must block the interstitial, as `markRewardedShown` does (G4). ENG must set this explicitly, because no rewarded impression happens.
- **Ad caps:** the ad revive caps match `AdPacer` (revive 3/session, 10/day). The gem caps (2/session, 3/day) are separate.

**Nits (non-blocking):**

1. The `guardrails.md` G19 enforcement point names `ReviveOffer.takeGems`, which does not exist yet. Mark it "pending ENG (C1–C8)".
2. `revive-m2.md` has no gem button yet. Design needs to add the 3-button layout and the disabled-gem copy.
3. The sim now adds `WEEKLY_GEMS` (35/week) to every persona's gem balance. This modelling change affects all gem-sink outputs; note it in the next sim write-up.
4. The C6 event final-level flag is a no-op until M7-3.
