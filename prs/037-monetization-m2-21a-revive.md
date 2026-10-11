# PR 037 — monetization/m2-21a-revive (base: main @ 4cb198c)

**Summary:** M2-21a evaluates a gem-priced revive on top of the merged M2-21 revive rules (PR 030). **Verdict: GO with conditions.** Price is **10 gems flat** (no escalation, about $0.42 at the gems_small rate). There is **1 revive per battle total** across ad, free and gem, with gem revives capped at **2 per session and 3 per day**. There is no offer in FTUE and no buy-gems upsell from the revive offer. New guardrail G19.

**Changes**

- `monetization/revive-m2-21a.md` (new): price, caps, interaction with the ad and free revive, guardrail mapping, sim impact, conditions C1–C8 for ENG.
- `monetization/revive-gem.json` (new): gem revive config (source for the remote config `revive.gemPrice` / `revive.gemCaps`).
- `monetization/guardrails.md`: new rule G19.
- `monetization/sim/check_guardrails.py`: 10 G19 checks over `revive-gem.json` (exit 1 on violation).
- `monetization/sim/economy_sim.py`: free gem income (incl. weekly gem targets) vs revive-eligible defeats; `--revive-gems` flag. `sim/last_run.md` re-run.
- `monetization/economy-sources-sinks.csv`: gem revive sink row.

**Test results**

- `python3 monetization/sim/check_guardrails.py`: PASS (7 SKUs; G19 10/10).
- `python3 monetization/sim/economy_sim.py` (seed 42, 200 runs, design 91fed5c, k = 0.5):
  - free gems about 230 per 30 days (7.7/day);
  - about 0.8 revive-eligible defeats/day;
  - at 10 gems, free income covers 96–100% of gem-reviving every eligible defeat;
  - at 15 gems, only about 65%, so 10 is the ceiling.
  - Progression results are unchanged from PR 021.
- Assumptions: 50% of losses reach ≥ 50% nest damage; weekly boss and event gems are earned.

**ENG / DES actions:** see `revive-m2-21a.md`, "Conditions for ENG" and "Design to act on".

**Playtest notes:** n/a (docs/sim only, no game code).

**Sandbox:** no accounts, keys or money.
