# PR 003 — chore/plan-m2-m7 (base: main @ bb45228)

**Summary:** Re-plans M2 onward into numbered milestones M2–M7 with owner bot, description, testable
acceptance criteria and dependencies per task, including dedicated milestones for the Supabase sandbox
backend (M4), Stripe test-mode monetisation (M5) and an admin panel (M6). Records CEO decisions.

**Changes**

- `PLAN.md`: M0 marked done (PR 001 merged `bb45228`); M1 status from code; new M2–M7 (51 tasks); owner key;
  sandbox-only hard rules; resolved questions (Stripe test mode primary, RevenueCat deferred; Supabase free
  tier only with cost check/stop; local/LAN playtests only; dev→eng, test→qa).
- `PLAN.md` (monetization update): doc paths → `monetization/` (`docs/monetization` symlink also works); M2-8 done;
  new M2-13 (ENG guardrail tests G1, G2, G5, G6 incl. gems_small→noAds fix, G13, G17) + M2-14 (QA verify);
  M5-2 provisional until M5-1 (free player falls behind from day 22); M5-6 decided (Stripe Checkout test mode
  now, RevenueCat later) with sub-tasks M5-6a–M5-6j from `monetization/integration-plan.md`; M5-7/M5-8 re-scoped;
  hard gate: any external account (Stripe, AdSense, etc.) needs Mohit's explicit approval in chat first.
- `STATUS.md`: added to main (from `feat/core-loop`) with dated decision 28.
- `CONTRIBUTING.md`: clean-room line now points generically to `/workspace/mob-control-plan/`.

**Test results:** docs only; no code changed.

**Playtest notes:** n/a (no gameplay change).

**Reviewer:** hivesurge-review

**Status:** awaiting review
