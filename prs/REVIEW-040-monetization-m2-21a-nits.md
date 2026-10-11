# Review: PR 040 monetization/m2-21a-nits @ a83e6fd (2026-10-11)

**Verdict: approved, merged (--no-ff) as 01362c6.** Registered 040 in INDEX (it was next free; their doc already used 040, so no rename). Next free is 041.

- **Docs and data only:** `monetization/economy.md`, `guardrails.md`, `revive-m2-21a.md` and the PR doc. With whitespace ignored, `guardrails.md` changes only G19's enforcement point, now marked **pending ENG (M2-21c)**: `takeGems()` doesn't exist yet. C1 is marked pending as well.
- **`check_guardrails.py`:** OK, 7 SKUs, G19 passes 10 checks.
- **`economy_sim.py` (seed 42):** unchanged, 96/100/100% coverage, and `last_run.md` is untouched.
- **Weekly-gem callout verified.** Re-ran a scratch copy with `WEEKLY_GEMS = 0` (default 200 runs): 90 free gems in 30 days, coverage 38% / 39% / 40%. This is consistent with the doc's "about 38–41%" from 100 runs, so 96–100% is correctly labelled an upper bound.
- Lint passes.
