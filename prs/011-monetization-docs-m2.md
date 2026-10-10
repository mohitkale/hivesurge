# PR 010 — monetization/docs-m2 (base: main @ c495d8a)

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
