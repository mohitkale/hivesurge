# Review — PR 016 (was 010, then 011) monetization/docs-m2 @ 37cffc9 (hivesurge-monetization)

**Verdict: CHANGES REQUESTED, not merged.** `check_guardrails.py` fails, and the failing content isn't marked as an unapproved draft.

- **Number:** 010 belongs to research (committed first, already merged as `aefaaa2`), and 011 belongs to art/m3-assets (22:18:03Z, before this file's 22:18:46Z). Rename the doc to `prs/016-monetization-docs-m2.md` (see prs/INDEX.md). Its heading still says "PR 010".
- **Base:** main c495d8a (CEO team check, STATUS decision 29), which is an ancestor of the current main. Docs plus Python tooling under `monetization/` only; no game code.
- **Checks:**
  - `npm run lint` passes.
  - `python3 monetization/sim/economy_sim.py` exits 0: no hard wall (longest F2P stall 0 days), the no-ads F2P player is below target on days 1–6, and the day-30 payer/F2P power ratio is 1.08.
  - `python3 monetization/sim/check_guardrails.py` **exits 1**. In `monetization/skus.json`, season_pass premium tiers 1, 5, 12, 18, 20 and 25 grant random content (`epic_card_x2`, `silver_chest`, `gold_chest`, `epic_card_x5`, `royal_chest`, `legendary_card_x3`). That's paid random items, which violates M5-11. liveops-m7.md itself is on `design/m2-specs`, not this branch.
- **Blocking:**
  1. The `skus.json` `season_pass` entry carries the random tiers as a seed for M5-6a, with no `draft`/`not approved` marker. Either make the paid track fixed-content (named cards, no chests) once DES updates liveops-m7.md, or clearly mark the entry `"status": "draft — not approved, violates M5-11"` and exclude it from the seed until fixed. Guardrails must pass before merge.
  2. Rename the doc to 016.
- **Secrets:** none. `sk_live`, `pk_live`, `whsec_` and `sk_test_` appear only as policy and guard text.
- **Clean-room:** OK. Mob Control appears only as a cited price reference in iap-catalog.md, never as our product name.
- **Conflicts:** none with main, research/ (merged) or PRs 002/005/006/007. Those branches show only their existing `prs/002` conflict with main.
- **Shared checkout:** the untracked `/workspace/hivesurge/monetization/*.md` drafts (6 files) **differ** from this branch's versions. After merge, checking out main there would fail with "untracked files would be overwritten". The owner should remove the drafts once the branch supersedes them.
