# Review: PR 041 chore/plan-m2-validation-retune @ a3e3d20 (2026-10-11)

**Verdict: changes requested, not merged.** Docs only (`PLAN.md` and the PR doc). Number claimed on main (a2b9846). Lint passes on the branch.

**Fine:**

- **M2-4:** casual 100 / 98.5 / 74 / 16 / 0; stage 2 target ≥ 90%.
- **M2-6:** queen launch 5–15 s; prompts ≤ 5 words.
- **M2-26** retune values match `validation-m2.md` (thistle 2650/50; wasp-queen-nest 3200/50, +5 gate, ×3 width 3.4 at speed 0.6, waves about 20% lower, trap x0 y14 w2.6, which I measured at ≥ 18.55 px in REVIEW-035).
- **M2-27** matches the FTUE polish notes.
- **M2-21c** correctly states that it changes PR 030 and puts `takeGems()` in scope.

**ba's reading that "gems not valid" = can't afford, caps reached, first 3 battles, event final level:**

| Condition                                                  | Source                                                                         | Status                                                                                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Can't afford                                               | 039 line 24 ("unaffordable"), table "disabled if balance < price"; 037 C4      | sourced                                                                                                                                                                 |
| Caps reached (2/session, 3/day)                            | 039 table "Gem caps hit → hidden", test 13; 037 `revive-gem.json`, G19         | sourced                                                                                                                                                                 |
| Event final level                                          | 039 table, test 14; 037 C6, `offer_on_event_final_level: false`, G19           | sourced                                                                                                                                                                 |
| First 3 battles                                            | 039 table "FTUE: no offer at all"; 037 `ftue_battles_without_offer: 3`, G2/G19 | sourced, **but not a gem-validity case.** In FTUE there is no offer at all, so nothing "stays open" or "closes". Listing it as a reason for closing the offer is wrong. |
| (missing) Gem button hidden while the free revive is shown | 039 table, test 11; 037 C3                                                     | in 039's definition ("not hidden"); doesn't close the offer because the free button is shown                                                                            |

**Blocking:**

1. **The M2-21b text says "if gems aren't valid (caps, FTUE, event final level, etc.)"** That list omits "can't afford", lists FTUE (no offer exists there), and "etc." is unsourced. Use 039's exact definition: _valid = affordable, within caps, not hidden (hidden: caps hit, event final level, free revive shown)_. Keep FTUE as a separate "no offer" rule.
2. **"MON confirmed `cc600b4` against G19 and C1–C8" is unsourced.** No committed MON doc or review records it. Link the source or drop the claim.
3. **The PR doc is stale.** It still says "M2-21c may start from `cc600b4`" and "pending MON confirmation", while PLAN says `76f2960`. Also, 039 @ 76f2960 is **changes requested** (REVIEW-039: the offer-open formula omits the free-revive button). So "M2-21c can start from 76f2960" should wait for 039's fix, or note it.
