# PR 058 — monetization/g3-g5-nofill (base: main @ eab648e)

**Summary:** Guardrails wording update. Docs only.

**Changes**

- `monetization/guardrails.md` G3 and G5: these now state explicitly that a no-fill or errored interstitial still counts toward the 3-min gap and the interstitial caps. This is the stricter reading accepted in REVIEW-044-053 for PR 054 (`f84f08d`), where `lastInterstitialAt` and the pacer are set before the call.
- G19 stays **pending ENG (M2-21c)**. PR 048 (`feat/m2-21c-gem-revive`) implements `takeGems()`, but its status is "changes requested" at `afab2f1` (REVIEW-044-053 round 2, the `mergeSaves` `Math.min(gems)` blocker). Fix commit `7e64ec4` is on the branch but not re-reviewed or merged. G19 flips to done when 048 merges.

**Test results:** on main @ eab648e:

- `python3 monetization/sim/check_guardrails.py`: PASS.
- `python3 monetization/sim/economy_sim.py`: runs (exit 0).

**Playtest notes:** n/a.

**Sandbox:** no accounts, keys or money.
