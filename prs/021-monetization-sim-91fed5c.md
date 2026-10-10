# PR 021 — monetization/sim-91fed5c (base: monetization/sim-866e82b @ aabb84d, PR 020)

**Summary:** Re-runs the M5-2a sim against design `91fed5c` (design/m2-specs):

- easier-only scaling (catch-up ≤ 5%);
- loss-streak assist (×0.95 after 2 losses, ×0.90 after 3, floor 0.85);
- 270 pass XP per tier;
- the DES-proposed direct power term `win + k × (P/expectedP − 1)`, tested at k = 0.3 and 0.5.

**Changes**

- `monetization/sim/economy_sim.py`:
  - default `--design-ref 91fed5c`;
  - parses `difficulty.lossAssist` and `difficulty.scaleFloor`;
  - tracks the consecutive-loss streak;
  - `--power-k` (default 0.5, ASSUMPTION);
  - reports the Epic level gap (tier-18 trigger) and season tier per persona.
- `monetization/sim/last_run.md`: k = 0.5 and k = 0.3 runs plus sensitivity runs.
- `monetization/economy.md`: M5-2a section rewritten.

**Test results**

- `python3 monetization/sim/check_guardrails.py`: PASS (exit 0).
- `economy_sim.py` (seed 42, 200 runs):

  |                                                | k = 0.3           | k = 0.5           |
  | ---------------------------------------------- | ----------------- | ----------------- |
  | Day-30 stage, no-ads / ads / payer             | 135.5 / 132 / 134 | 132 / 134 / 135   |
  | Median P/expectedP d3–30, no-ads / ads / payer | 92% / 104% / 105% | 93% / 104% / 106% |
  | Payer season tier                              | 33                | 33                |
  | Hard wall                                      | no                | no                |
  - Premium share: 4.5% of all cards (cap 15%).
  - Premium Epics: about 19.5% of season Epics.
  - Epic gap, payer vs no-ads: +0.67 levels, so the tier-18 trigger is not hit.

**Recommendation:** k = 0.5. It is the only tested value where payer ≥ ad-watcher ≥ no-ads holds across seeds and win-sens values, and the spread stays small (1–4 stages). Validate k and win-sens in playtests (M2-12).

**Fix vs DES scratch:** `/tmp/sim_powerterm.py` used `P/max(1, expectedP)`. That gives a ratio of −1 at stages 1–2 and penalises new players. Here the ratio is neutral (1) where expectedP = 0.

**Playtest notes:** n/a (sim/docs only).

**Sandbox:** no accounts, keys or money.
