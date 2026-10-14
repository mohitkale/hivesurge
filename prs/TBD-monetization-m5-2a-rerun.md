# PR TBD — monetization/m5-2a-rerun (base: main @ 7229e05)

**Summary:** M5-2a re-run requested by design after M5-1 validation (PR 081, `126a7bc`, `docs/design/validation-m5.md`, PROVISIONAL). The sim now matches the spec:

- pity per chest;
- guaranteed Gold chest on boss wins;
- win-sens 1.3;
- hive rooms;
- the 126a7bc daily target pool (stage-gated, 2+ stars, queens 15, day-1 bonus 20%).

**Changes**

- `monetization/sim/economy_sim.py`:
  - default `--design-ref 126a7bc`, `--win-sens 1.3`;
  - per-chest pity; boss Gold chest (`--no-boss-gold`, `--boss-win-delta`); hive rooms with an assumed account XP curve (`--no-rooms`); stage-gated daily targets;
  - reports pity hits, rooms and account level;
  - prints an expectedP refit table.
- `monetization/sim/last_run.md`: full run plus variants.
- `monetization/economy.md`: M5-2a section rewritten (results, reconciliation, retune proposal).

**Test results**

- `python3 monetization/sim/check_guardrails.py`: PASS.
- `economy_sim.py` (seed 42, 200 runs):
  - median P/expectedP: no-ads 94%, ad-watcher 100%, payer 103%;
  - day-30 stage 125 / 126 / 128;
  - no hard wall;
  - pity Legendaries 0–1 per month;
  - premium share 3.3%, premium Epics 13.0%, Epic gap +0.67;
  - revive coverage at 5 gems 100% (55–59% without weekly gems).

**For design**

- The ad-watcher ~87% figure reproduces only without the boss Gold chest and rooms (86%). With both, it's about 100%.
- So **don't cut expectedP by ~10%**. Refit early points upward: 3:5, 5:7, 10:18, 14:24, 25:34, 36:42, 52:46, 74:54, 111:61; keep 160:71 (not reached in 30 days).
- Needed from DES (M5-1b) for the next run: the account XP curve, the gem amount for "levels %10", and Wax Walls / Brood Cell effects on win rate.

**PR number:** not claimed (decision 37); requested via hivesurge-review.

**Sandbox:** no accounts, keys or money.
