# M7-6 — Rival hives (async raids, labelled bots) + leagues → design input

**Acceptance:** report with recommendation. **Status: done.**

## Findings

- Mob Control: shields protect resources, raids + revenge exist ([Playducky](https://playducky.com/recentpress/deconstruction-of-mob-control), [App Store](https://apps.apple.com/us/app/mob-control/id1562817072)); base attacks are "not actual players" ([MAF](https://maf.ad/en/blog/mob-control-analysis-hybrid-casual/)).
- Champions League leaderboards are "filled with bots", players put in buckets near each other so position jumps are frequent; World Leaderboard numbers "feel fake" ([Reverse Nerf](https://reversenerf.com/voodoos-breakthrough-with-mob-control-their-first-hybridcasual-success/)). Piggy Race lets users choose users and/or bots.
- Async matchmaking pattern: bucket players by MMR, query adjacent buckets, exclude shielded/unavailable defenders ([Metaplay deep dive](https://docs.metaplay.dev/feature-cookbooks/matchmaking/deep-dive-async-matchmaker), [integration](https://docs.metaplay.dev/feature-cookbooks/matchmaking/integrating-the-async-matchmaker)).
- Matching by army power punishes payers (every purchase → harder opponents); Kingdom Clash matched on an Elo-style arena rating instead, six leagues ([PocketGamer.biz](https://www.pocketgamer.biz/building-kingdom-clash-a-game-designers-perspective-on-a-five-year-project/)).
- Deterministic sim + replaying input stream lets the server validate async battle results ([Bramsley](https://bramsley.studio/articles/supercell-clash-state-sync/)) — Hive Surge already plans a deterministic fixed-step sim.

## Recommendation

1. **Rivals = snapshots, not live players.** After each battle store a defence snapshot (hive level, loadout, shield state). Raid targets come from MMR buckets ±1; shielded hives excluded; no repeat target within 24 h. Revenge = one free targeted raid on your last raider.
2. **Bots are always labelled** ("🤖 Practice hive") and fill only when real snapshots are scarce. Unlike Mob Control, no fake world numbers. _Inference:_ honest labelling matches the plan's guardrails and lowers dark-pattern/FTC risk.
3. **Raid loss is capped:** shields protect most of the stash; paid items/currency never stealable; max N% stored nectar per raid (tune in M5-2 sim).
4. **Leagues:** weekly, groups of 30–50 (plan §7.2), seeded by an Elo-style league rating (not hive power). Promote top ~20%, relegate bottom ~20% (_inference, tune_). Top tier's reward is cosmetic only (cf. God Tier).
5. **Validation:** server replays raid inputs (deterministic sim) before granting loot; Supabase RLS stops self-reported stars.
6. Clans out of scope until after leagues prove out.
