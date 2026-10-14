# PR 089: monetization/m5-1b-rerun

**Summary:** M5-2a re-run against design M5-1b (`design/m5-1b-expectedp-refit` @ `101047a`):

- refitted expectedP;
- account XP curve `150 + 20L`;
- +25 gems every 10th account level;
- Wax Walls and Brood Cell as win-term-only P_eff.

**Changes**

- `monetization/sim/economy_sim.py`:
  - default `--design-ref 101047a`;
  - parses the XP curve, level-10 gems and the room P_eff table from meta-m5.md (fallback to the old assumptions if absent);
  - adds room P_eff in `win_rate` only;
  - reports account level on day 7 and day 30.
- `monetization/sim/last_run.md`: seeds 42, 7 and 1000, plus a no-weekly-gems run.
- `monetization/economy.md`: M5-2a section rewritten.

**Test results**

- `python3 monetization/sim/check_guardrails.py`: PASS.
- `economy_sim.py` (200 runs):

  |                    | no-ads | ad-watcher | payer    |
  | ------------------ | ------ | ---------- | -------- |
  | Median P/expectedP | 90–92% | 99%        | 102–103% |
  | Day-30 stage       | 135    | 138–139    | 140–141  |
  - Ordering holds on all seeds; no hard wall.
  - Account level is 8–9 at day 7 and 22–23 at day 30 (design ~10 / ~25).
  - Revive coverage at 5 gems: 100% (91–100% without weekly gems).
  - Premium share 3.1%, Epic gap +0.67.

**Spec gaps:** see economy.md. The main one is account level 1–3 below the design table; consider `140 + 20L`.

**PR number:** not claimed (decision 37).

**Sandbox:** no accounts, keys or money.
