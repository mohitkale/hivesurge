# PR 016 — monetization/docs-m2 (base: main @ c495d8a)

**Summary:** Adds the MON spec docs referenced by PLAN.md (`monetization/`): guardrails (M2-8), IAP catalog with USD/INR test prices and economy (M5-2), 21-placement ad decisions with caps/cooldowns, and the sandbox integration plan with the M5-6 decision (Stripe Checkout test mode now, RevenueCat later).

**Changes**

- `monetization/README.md`, `guardrails.md`, `iap-catalog.md`, `economy.md`, `ad-placements.md`, `integration-plan.md` (new).

**Test results:** docs only; no game code changed.

**Playtest notes:** n/a.

**Sandbox:** no external accounts, no keys, no real money.

## Update 2 — M5-2 / M5-2a sheet + sim, M5-11 check

- `monetization/economy-sources-sinks.csv` (new): every currency source/sink with its ref (CODE/META/LIVE/ASSUMPTION).
- `monetization/sim/economy_sim.py` (new): seeded 30-day sim, 3 personas, uses actual rewards.ts + meta-m5 + liveops-m7 tables; `sim/last_run.md` output.
- `monetization/skus.json` (new, seeds M5-6a) + `monetization/sim/check_guardrails.py` (new): M5-11/G6 catalog check.
- `monetization/economy.md`: replaced provisional sim with results.

**Test results:** `python3 monetization/sim/economy_sim.py` → no hard wall (longest free-player stall: 0 days); free no-ads player is below target only on days 1–6; day-30 payer/F2P power ratio 1.08. `python3 monetization/sim/check_guardrails.py` → **FAILS by design**: season pass premium tiers 1/5/12/18/20/25 grant random content (chests / un-named cards), which violates M5-11. DES needs to fix this in liveops-m7.md.

## Update 3: review fixes (REVIEW-016) + design 209606b re-run

- Renamed the PR doc from `011` to `016` (per prs/INDEX.md on main); fixed the heading.
- `monetization/skus.json`: `season_pass.contents` is regenerated from the liveops-m7.md premium track @ 209606b. All tiers are fixed-content (named bees, coins, gems, cosmetics), plus a post-tier-30 bonus of 150 coins + 15 gems.
- `monetization/sim/economy_sim.py`: rewritten to read the design tables from git (`--design-ref`).
  - Target = expectedP(n).
  - Two-sided enemy scaling (0.90–1.15) feeds back into win rate.
  - Season pass is modelled (free + premium tracks, XP).
  - Power counts the equipped loadout only.
- `monetization/economy.md`, `sim/last_run.md`: results and new issues.

**Test results:**

- `check_guardrails.py`: **PASS** (exit 0).
- `economy_sim.py`:
  - no hard wall (longest no-ads stall 0 days);
  - the no-ads free player is at a median of 50% of expectedP (minimum 45%), on the 0.90 floor;
  - premium card share is 4.1% (48 of about 1,160 cards).
- New DES issues are listed in economy.md: the expectedP curve is too steep even for the baseline, card intake is about 1,100 vs the 280 assumed, and the premium card count is 48 / 13 Epic, not 40 / 9.

## Update 4: re-run against design 866e82b

- `economy_sim.py`:
  - default `--design-ref 866e82b`;
  - parses the new expectedP table (stage n) and tail formula;
  - reports enemy scale per persona and the premium Epic share;
  - new `--win-sens` flag for the win-rate feedback assumption.
- `economy.md` and `sim/last_run.md` are updated, including a sensitivity run.

**Test results:**

- `check_guardrails.py`: PASS (exit 0).
- `economy_sim.py`:
  - no hard wall;
  - median P/expectedP: no-ads 87% (enemy scale 0.90), ad-watcher 109% (1.14), payer 117% (1.15 cap);
  - premium cards 5.9% (4.8% with no feedback), premium Epics 24.5% (21.3%).
- **New issue for DES:** the scaling feedback loop makes ad-watchers and payers clear fewer stages than no-ads players (day 30: 81–94 vs 159 at win-sens 2.0). See economy.md.
