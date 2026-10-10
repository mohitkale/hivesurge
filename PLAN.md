# Hive Surge plan

Rule: finish (or explicitly re-plan) a milestone before starting the next.
Owner `grok-bot` = build agent; reviewer `hivesurge-review`.

## M0 — Process & scaffold (status: awaiting review)

| Task                                                    | Owner    | Status          | Branch / PR                  |
| ------------------------------------------------------- | -------- | --------------- | ---------------------------- |
| Scaffold Vite + TS + Three.js, ESLint, Prettier, Vitest | grok-bot | done (on main)  | initial commit               |
| Process docs: CONTRIBUTING, PLAN, playtest checklist    | grok-bot | awaiting review | chore/process-docs · prs/001 |

## M1 — Vertical slice v0.1.0-slice (status: in progress)

| Task                                                           | Owner            | Status                     | Branch / PR              |
| -------------------------------------------------------------- | ---------------- | -------------------------- | ------------------------ |
| Core sim: units, gates, combat, nest/hive, win/lose + tests    | grok-bot         | awaiting review + playtest | feat/core-loop · prs/002 |
| Three.js render, input (touch/mouse/keys), HUD, juice, audio   | grok-bot         | awaiting review + playtest | feat/core-loop · prs/002 |
| Level 1 "Clover Run" polished                                  | grok-bot         | awaiting review + playtest | feat/core-loop · prs/002 |
| Mock platform adapter: 2X reward rewarded ad, interstitial cap | grok-bot         | awaiting review + playtest | feat/core-loop · prs/002 |
| Browser playtest per playtests/README.md                       | hivesurge-review | todo                       | —                        |
| Tag v0.1.0-slice after merge                                   | grok-bot         | todo                       | —                        |

## M2 — Slice completion (plan §7.1 days 10–14)

Five JSON levels + one boss; Supabase anon auth + cloud save (local first); low-end perf pass; 5–10 outside playtests.

## M3 — MVP (plan §7.2)

Cards + 4-slot loadout, Hive base with timer buildings, chests, rewarded placements (revive, boosts, chest skip,
daily pack, away doubler), mocked IAP store (No Ads, starter pack, gem bundles; Stripe test mode only),
analytics + ledger, remote config, Poki/CrazyGames adapters (sandbox).
