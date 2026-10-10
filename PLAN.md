# Hive Surge plan

Rules: finish (or explicitly re-plan) a milestone before starting the next. Every task has an owner,
a status and a branch/PR. Owners: `hivesurge-research`, `hivesurge-art`, `hivesurge-dev`,
`hivesurge-test`, `hivesurge-review`. Status: todo · in progress · awaiting review + playtest · done · re-planned.

Standing rituals: weekly design review (owner: hivesurge-review); hivesurge-research continuously
appends gameplay findings to the **Research inbox** at the bottom, triaged at each design review.

## M0 — Process & scaffold (status: awaiting review)

| Task                                                    | Owner            | Status          | Branch / PR                 |
| ------------------------------------------------------- | ---------------- | --------------- | --------------------------- |
| Scaffold Vite + TS + Three.js, ESLint, Prettier, Vitest | hivesurge-dev    | done (main)     | initial commit `e8f14a7`    |
| Process docs: CONTRIBUTING, PLAN, playtest checklist    | hivesurge-dev    | awaiting review | chore/process-docs · PR 001 |
| Review M0                                               | hivesurge-review | todo            | PR 001                      |

## M1 — Vertical slice `v0.1.0-slice` (status: awaiting review + playtest)

| Task                                                                                                     | Owner            | Status                     | Branch / PR             |
| -------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------- | ----------------------- |
| Core sim: typed-array units, spatial hash, gates (+k/×k/−k, moving), attrition, win/lose, revive + tests | hivesurge-dev    | awaiting review + playtest | feat/core-loop · PR 002 |
| Queen (champion-equivalent) charge + launch                                                              | hivesurge-dev    | awaiting review + playtest | feat/core-loop · PR 002 |
| Three.js instanced render, procedural placeholder art, particles, shake, number pops                     | hivesurge-dev    | awaiting review + playtest | feat/core-loop · PR 002 |
| Responsive layout (phone/iPad/laptop/desktop), safe areas, portrait-first, landscape OK                  | hivesurge-dev    | awaiting review + playtest | feat/core-loop · PR 002 |
| Input: touch + mouse + keyboard                                                                          | hivesurge-dev    | awaiting review + playtest | feat/core-loop · PR 002 |
| 60fps target with adaptive pixel-ratio quality scaling                                                   | hivesurge-dev    | awaiting review + playtest | feat/core-loop · PR 002 |
| Design system (`src/ui/theme.ts`): palette + colour-blind palette, type scale, spacing                   | hivesurge-art    | awaiting review            | feat/core-loop · PR 002 |
| Juice hooks: synth SFX + mute, haptics toggle                                                            | hivesurge-dev    | awaiting review + playtest | feat/core-loop · PR 002 |
| Local analytics module (level_start/fail/win, ad_offered/watched, purchase)                              | hivesurge-dev    | awaiting review            | feat/core-loop · PR 002 |
| Local save module with revision/merge seam for cloud sync                                                | hivesurge-dev    | awaiting review            | feat/core-loop · PR 002 |
| Sandbox platform adapter: 2X reward, revive, interstitial pacing, mock IAP                               | hivesurge-dev    | awaiting review + playtest | feat/core-loop · PR 002 |
| Level 1 "Clover Run" authored + balance tests                                                            | hivesurge-dev    | awaiting review + playtest | feat/core-loop · PR 002 |
| Automated headless smoke playtest + screenshots                                                          | hivesurge-test   | done (see playtests/)      | feat/core-loop · PR 002 |
| Human browser playtest per checklist (real phone + desktop)                                              | hivesurge-test   | todo                       | —                       |
| Code review                                                                                              | hivesurge-review | todo                       | PR 002                  |
| Merge PR 001 → PR 002, tag `v0.1.0-slice`                                                                | hivesurge-review | todo                       | —                       |

## M2 — Slice completion (plan §7.1 days 10–14)

| Task                                                                                 | Owner            | Status |
| ------------------------------------------------------------------------------------ | ---------------- | ------ |
| Level data as JSON modules + 4 more handmade levels + 1 boss nest                    | hivesurge-dev    | todo   |
| FTUE: teach aim → gate → queen in < 30 s with no text walls                          | hivesurge-dev    | todo   |
| Ethical guardrails codified: no ads in first levels, caps, clear prices              | hivesurge-review | todo   |
| Low-end Android perf pass (500 units, 15-min session), bundle < 3 MB initial         | hivesurge-test   | todo   |
| Code-split Three.js / asset streaming plan                                           | hivesurge-dev    | todo   |
| Accessibility pass: reduced motion, contrast, keyboard-only, captions for audio cues | hivesurge-test   | todo   |
| 5–10 outside playtests; exit criteria from plan §7.1                                 | hivesurge-test   | todo   |

## M3 — Premium art pass

| Task                                                                     | Owner         | Status |
| ------------------------------------------------------------------------ | ------------- | ------ |
| Original 2.5D/3D style guide (bees/wasps/garden), clean-room sign-off    | hivesurge-art | todo   |
| Low-poly bee/wasp/queen models, KTX2/meshopt compressed, animation atlas | hivesurge-art | todo   |
| Environment kits per biome; UI icon set                                  | hivesurge-art | todo   |
| Original SFX/music set (Opus)                                            | hivesurge-art | todo   |

## M4 — Meta & monetisation MVP (plan §7.2, sandbox only)

| Task                                                                                                                      | Owner              | Status |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------ |
| Adorable collectible bee variants via chests + collection screen (odds shown; no paid random items in restricted regions) | hivesurge-dev      | todo   |
| Cards + 4-slot loadout (Cannon / Bee / Queen / Nectar Burst), coin upgrades                                               | hivesurge-dev      | todo   |
| Hive base: storage, shields, 3 timer buildings, "while you were away"                                                     | hivesurge-dev      | todo   |
| Rewarded placements: boosts (pre-battle), chest skip, daily pack, away doubler                                            | hivesurge-dev      | todo   |
| Mock IAP store → Stripe test mode on own site (No Ads, starter pack, gems)                                                | hivesurge-dev      | todo   |
| Economy sources/sinks sheet + 30-day sim                                                                                  | hivesurge-research | todo   |
| Platform adapters: Poki / CrazyGames / own-site (sandbox SDK modes)                                                       | hivesurge-dev      | todo   |
| Supabase anon auth + cloud save via `SaveBackend` + `mergeSaves`                                                          | hivesurge-dev      | todo   |

## M5 — Content scale & live ops

| Task                                                                        | Owner         | Status |
| --------------------------------------------------------------------------- | ------------- | ------ |
| Procedural/templated level generator with difficulty bands + validator bots | hivesurge-dev | todo   |
| Rotating events, daily/weekly targets, streaks                              | hivesurge-dev | todo   |
| Season pass (free + premium track)                                          | hivesurge-dev | todo   |
| Live-ops calendar via remote config                                         | hivesurge-dev | todo   |
| Analytics dashboard for difficulty + ad pacing tuning                       | hivesurge-dev | todo   |
| Rival hives (async raids from snapshots + labelled bots), leagues           | hivesurge-dev | todo   |

## Research inbox (hivesurge-research → triaged weekly)

- Lead moving ×3 gates rather than aiming at their current position — consider a subtle aim-lead hint in FTUE.
- Near-miss defeat screen (nest % left) is implemented; test whether it lifts retries.
