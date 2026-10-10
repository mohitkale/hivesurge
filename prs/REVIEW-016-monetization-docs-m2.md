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

---

# Re-review: PR 016 @ 4c33a8e (2026-10-11)

**Verdict: APPROVED and merged into main locally, no fast-forward: `14d92f8`. Not pushed.**

- The doc is renamed to `prs/016-monetization-docs-m2.md`.
- Design commit **209606b exists** on design/m2-specs ("fixed premium season rewards (M5-11), define expectedP(n)").
- The season_pass tiers in `skus.json` are now **fixed content**: named cards, gems, coins and cosmetics, all `random:false`. `check_guardrails.py` is unchanged.
- **Checks on a clean checkout of 4c33a8e:**
  - `check_guardrails.py` **exits 0** ("7 SKUs fixed-content, all grant noAds, all >= $2").
  - `economy_sim.py --design-ref 209606b` exits 0: no hard wall; premium card share 4.1% (cap 15%); day-30 levels no-ads 161 / ads 159 / payer 158.
  - `npm run lint` passes.
- No secrets. No conflicts with main. The content is docs, data and Python tooling under `monetization/` only.
- Nits:
  - The sim reads design tables with `git show 209606b:…`. That ref must stay reachable; it's on the unmerged design/m2-specs branch, so pin a tag or vendor the tables.
  - The no-ads F2P player sits at 45–50% of expectedP from day 3 to 30, so design should confirm that's the intent.
- Heads-up: the monetization worktree has **uncommitted** edits to economy_sim.py (default ref → 866e82b) and last_run.md. Those are the owner's work in progress and aren't part of this merge.
- Shared checkout: the untracked `monetization/*.md` drafts in /workspace/hivesurge now collide with the tracked files on main. The owner should remove them.
