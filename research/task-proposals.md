# Task proposals (research → BA)

1. **PERF-A (ENG/QA):** Add a dev overlay showing `renderer.info.render.calls`, triangles and fps. _Test:_ peak swarm (500 units) on mobile emulation shows ≤ 100 draw calls; value logged in the playtest report.
2. **PERF-B (ENG):** CI size budget: fail build if gzip/Brotli initial JS > 1 MB or total `dist/` > 5 MB (Poki ≤ 5 MB initial guidance). _Test:_ script in `npm run build` exits non-zero when over.
3. **PERF-C (ENG):** Progressive loading: first battle needs only core JS; art/audio (M3) load after `gameplayStart`. _Test:_ Lighthouse/throttled "Fast 4G" run reaches first battle ≤ 3 s; network log shows no M3 assets before first battle.
4. **PERF-D (ENG):** Call `computeBoundingSphere()` (or disable frustum culling) on unit InstancedMeshes after matrix updates. _Test:_ unit crowd stays visible when the lane origin is off-screen (screenshot test).
5. **MON-A (MON/REV):** Guardrail: no real-money purchase grants random items; chests are earned-only with per-item odds shown. _Test:_ unit test over SKU catalog asserts every paid SKU has fixed contents; chest UI test asserts odds table rendered.
6. **MON-B (ENG):** If any paid random item is ever added, geo-flag disables it for `BE` (and optionally `NL`). _Test:_ unit test with locale/country BE hides the SKU.
7. **DES-A (DES):** Level-variety checklist: each set of 10 levels uses ≥ 3 of {moving gate, negative gate, new enemy type, mini-objective, obstacle}. _Test:_ level JSON lint script reports coverage per 10-level band.
8. **DES-B (DES/ENG):** Home screen shows one "next goal" progress bar (nearest base/card/league milestone). _Test:_ visible after every battle; e2e asserts progress increases after a win.
9. **LIVE-A (DES/ENG):** Weekly rule-tweak event (e.g. "only ×3 gates count", collect items behind marked gates) driven by remote config, no new art. _Test:_ toggling config changes level rules without a deploy; event reward distinct from campaign rewards.
10. **RIV-A (ENG):** Rival matchmaking from MMR buckets ±1, excludes shielded hives, no repeat target within 24 h; bots always labelled. _Test:_ unit tests for each rule; UI snapshot shows bot label on every bot hive.
11. **RIV-B (ENG/MON):** Raid loss cap: ≤ N% of stored nectar, paid currency never stealable. _Test:_ economy unit test over 1,000 simulated raids never exceeds cap / touches gems.
12. **LEAGUE-A (DES/ENG):** Weekly leagues of 30–50 seeded by league rating (not hive power); top tier rewards cosmetic only. _Test:_ seeding function unit test; reward table lint asserts top-tier rewards are cosmetic.
13. **PT-A (BA/Mohit):** Decide playtest hosting (open question 3) and approve recruiting 5–10 testers so M2-12 can run using `research/m2-12-outside-playtests.md`.
