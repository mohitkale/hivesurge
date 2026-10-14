# PR 088: design/m5-1b-expectedp-refit

**Summary:** M5-1b specs plus the expectedP refit from the M5-2a rerun (`monetization/m5-2a-rerun` @ `4db39df`).

**Changes**

- `docs/design/meta-m5.md`:
  - expectedP(n) refit to the ad-watcher median: 3:5, 5:7, 10:18, 14:24, 25:34, 36:42, 52:46, 74:54, 111:61, 160:71 (160 unverified). The planned ~10% cut is cancelled; early points raised. Interpolation and tail unchanged. Pace text updated to about 4.2 stages/day.
  - New section "Account XP and level rewards (M5-1b)":
    - (a) XP to next level = 150 + 20 x L (level 10 at about day 7, level 25 at about day 29).
    - (b) 25 gems at each level multiple of 10.
    - (c) Sim inputs: Wax Walls +1.0 P per level, Brood Cell +1.5 P per level, win term only (k = 0.5), not in catch-up or expectedP.
- `docs/design/validation-m5.md`: addendum noting the cut is cancelled and the refit values.

**Code/config:** no expectedP constant exists in `src/` (remote config `difficulty.expectedP` not built yet). `monetization/sim/economy_sim.py` parses the table from meta-m5.md, so it picks up the refit automatically.

**For MON (next run):** use the account XP curve above (replaces the `100 x L` assumption), add 25 gems at levels 10/20/30, add room P_eff bonuses to the win term.

**Tests:** see commit message / report.
