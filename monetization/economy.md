# M5-2 — Economy sources/sinks + 30-day sim

**Status: provisional.** M5-1 (meta design) is not yet written, so card/building costs below are ASSUMPTIONS. Re-run when M5-1 lands.

## Currencies

| Currency     | Sources                                                                          | Sinks                                                                                         |
| ------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Coins (soft) | battle wins, win multiplier ad, chests, daily login, away earnings, starter pack | card upgrades, global fire-rate buff, hive building upgrades                                  |
| Gems (hard)  | IAP, small drips (daily login 5, season free track, achievements)                | chest timer skip, rewarded-alternative (G8), cosmetics, season pass not purchasable with gems |
| Skip tickets | IAP, season track                                                                | claim a rewarded reward without watching                                                      |
| Cards        | chests (odds shown), season, rewarded pack (cap 1/day)                           | upgrades                                                                                      |

## Sources/sinks sheet

Full sheet: [`economy-sources-sinks.csv`](economy-sources-sinks.csv) (CODE = `src/sim/rewards.ts` / `platform.ts` on `fix/pr-002-review`; META/LIVE = `docs/design/meta-m5.md` / `liveops-m7.md` on `design/m2-specs`; ASSUMPTION marked).

## 30-day sim (M5-2a) — reproducible, reads design @ 866e82b

`python3 monetization/sim/economy_sim.py [--seed 42] [--runs 200] [--design-ref 866e82b] [--win-sens 2.0]`. Output, including a sensitivity run, is saved in [`sim/last_run.md`](sim/last_run.md).
The script reads its tables from git at `--design-ref`:

- `meta-m5.md`: bee roster, the `expectedP(n)` points and tail formula (n = stage, +1 per win; = remote config `difficulty.expectedP`), and the enemy scaling `clamp(1 + 0.03(P − expectedP(n)), 0.90, 1.15)`.
- `liveops-m7.md`: season pass tracks and XP.
- CODE `rewards.ts`: win/loss coins.

P = equipped loadout, worker excluded.
ASSUMPTIONS (unchanged):

- 6 battles/day.
- Win rate is 70% at enemy scale 1.0, minus `--win-sens` points per +1% enemies (default 2.0). This feedback is the key unknown and needs playtest data.
- One chest unlocks per gap between sessions; the daily pack is a Wood chest; 3 of 5 weekly targets are completed.
- C/R upgrade costs for L7–10 are extrapolated; hive rooms and events are not simulated.

**Headlines (seed 42, 200 runs, win-sens 2.0), median P/expectedP over days 3–30:**

| Persona                | P/expectedP  | Enemy scale  | Stage n at day 30 |
| ---------------------- | ------------ | ------------ | ----------------- |
| no-ads free            | 87% (74–93%) | 0.90 (floor) | 159               |
| ad-watcher free        | 109%         | 1.14         | 94                |
| payer (starter + pass) | 117%         | 1.15 (cap)   | 81                |

- **Hard wall: none.** The longest stall for the no-ads player is 0 days. They sit at about 85%, as the design expected.
- **Scaling now gets harder for payers:** yes, at the +15% cap every day from day 3.
- **Premium cards:** 48 of 812 = 5.9% (27 cards/day, because payers win less). With win-sens 0: 4.8% of about 1,010 (33.7/day, which matches the design's ~33/day).
- **Premium Epic share of season Epics:** 24.5% (21.3% at win-sens 0), vs the design's ~18%.

**Issues for DES:**

1. **Progression inversion (feedback loop).** expectedP was fitted to the ad-watcher's power when everyone sat on the 0.90 floor (old curve). Now ad-watchers and payers sit above expectedP, so enemies get +14–15% harder. With win-sens 2.0 they then win less and clear **fewer stages than no-ads players** (day 30: no-ads 159, ads 94, payer 81). Paying or watching ads slows campaign progress, and the payer also reaches only season tier 26, not 30.
   - At win-sens 0.5–1.0 the gap shrinks (payer 108–118 vs no-ads 133–140) but still points the wrong way. At win-sens 0 all three are about equal (~127).
   - Not a wall, but a fairness/UX risk: it reads as "paying makes the game harder".
   - Options: scale only downward (floor only, no +15% upward), cap the upward scaling with an ease-off after losses, or refit expectedP iteratively with feedback on, and validate win-sens in playtests (QA M2-12).
2. **Ad-watcher is not exactly 100%** even without feedback (104% at win-sens 0), because the fit came from a run with different win rates. It's minor; refit after fixing issue 1.
3. **The premium Epic share** (21–25%) is above the design's 18% estimate. The total premium share is fine (≤6%), but if the cap applies per rarity, it fails.

## M5-11 guardrail check (no paid random items)

`python3 monetization/sim/check_guardrails.py` (exits 1 on violation) runs over [`skus.json`](skus.json). Every paid SKU must:

- have `random:false`;
- grant no chests, cards, packs or spins;
- have every season-pass `contents` tier set to `random:false`;
- grant noAds (G6);
- cost at least $2.

**Current result: PASS (exit 0).** `season_pass.contents` is generated from the 209606b premium track: named bee cards, coins, gems and cosmetics only. Free-track chests are earned in play and their odds are shown, so they are out of scope. Gem chest skips only speed up chests earned in play; REV should confirm this in M5-10.
