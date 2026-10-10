# Hive Surge — Monetization spec (sandbox only)

Owner: MON. Everything here is **test mode**: no live keys, no real accounts, no real charges.
Sources: `/workspace/mob-control-plan/mob-control-web-plan.md` §4.2 (21 placements), §6, and repo code
`src/platform/{adPolicy,platform,mockPlatform}.ts`.

| File                | Covers                                                                 | PLAN task         |
| ------------------- | ---------------------------------------------------------------------- | ----------------- |
| guardrails.md       | Ethical rules, each mapped to a unit test or REV checklist item        | M2-8              |
| iap-catalog.md      | SKU catalog, USD + INR test prices, guardrail mapping                  | M5-2              |
| economy.md          | Sources/sinks + 30-day sim (assumption-driven)                         | M5-2              |
| ad-placements.md    | 21 reference placements → Hive Surge decision, caps, cooldowns         | M5-2 / M5-5 input |
| integration-plan.md | Sandbox integration plan + tasks for hivesurge-ba; M5-6 recommendation | M5-6              |

Note: PLAN.md acceptance paths say `docs/monetization/`; this folder is the canonical location and
`docs/monetization` is a symlink to it. hivesurge-ba may update PLAN paths.

Revenue: **no revenue projections are made here.** Any external number is cited from the plan doc; anything else is labelled ASSUMPTION.
