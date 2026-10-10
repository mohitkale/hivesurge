# PR 020 — monetization/sim-866e82b (base: main @ f555c2c)

**Summary:** Re-runs the M5-2a economy sim against design commit `866e82b` (design/m2-specs). That commit defines n as the stage number (+1 per win), retunes `expectedP(n)` to the earlier sim's ad-watcher median (tail +0.17/stage, capped at 112), and corrects the premium track (48 cards: 21C/11R/13E/3L). This reapplies `aa836e1` (cherry-picked from `monetization/docs-m2`; it missed the PR 016 merge).

**Changes**

- `monetization/sim/economy_sim.py`:
  - default `--design-ref 866e82b`;
  - parses the stage-based expectedP table and tail formula from meta-m5.md;
  - reports enemy scale per persona and the premium Epic share;
  - new `--win-sens` flag (win-rate drop per +1% enemies, ASSUMPTION, default 2.0).
- `monetization/sim/last_run.md`: new output plus a sensitivity run (win-sens 0.0 / 1.0).
- `monetization/economy.md`: M5-2a section rewritten with results and issues.

**Test results**

- `python3 monetization/sim/check_guardrails.py`: **PASS** (exit 0); 7 SKUs, fixed-content (M5-11), noAds (G6), ≥ $2.
- `python3 monetization/sim/economy_sim.py` (seed 42, 200 runs, win-sens 2.0), median P/expectedP over days 3–30:

  | Persona                | P/expectedP | Enemy scale  | Stage n at day 30 |
  | ---------------------- | ----------- | ------------ | ----------------- |
  | no-ads free            | 87%         | 0.90 (floor) | 159               |
  | ad-watcher             | 109%        | 1.14         | 94                |
  | payer (starter + pass) | 117%        | 1.15 (cap)   | 81                |
  - **No hard wall** (longest no-ads stall 0 days).
  - Premium cards 5.9% of season cards (4.8% at win-sens 0, about 33.7 cards/day).
  - Premium Epics 24.5% of season Epics (21.3% at win-sens 0).

**Open design issues (DES, design/m2-specs)**

1. **Scaling penalises payers and ad-watchers.** Above expectedP, enemies get up to 15% harder. They win less and clear fewer stages than no-ads players (day 30: 81 / 94 vs 159). Payers also reach only season tier 26. The gap shrinks at win-sens 0.5–1.0 and disappears at 0, so validate win-sens in playtests (M2-12). Options:
   - floor-only scaling (no upward scaling);
   - ease the upward scaling after losses;
   - refit expectedP with the feedback switched on.
2. **The ad-watcher is not exactly 100% of expectedP** (104% even at win-sens 0), because the curve was fitted on a different-difficulty run. Refit after issue 1.
3. **The premium Epic share** (21–25%) is above the design's ~18% estimate. It's fine if the 15% cap applies to all cards (≤6%); it fails if the cap applies per rarity.

**Playtest notes:** n/a (sim/docs only, no game code).

**Sandbox:** no external accounts, keys or real money.
