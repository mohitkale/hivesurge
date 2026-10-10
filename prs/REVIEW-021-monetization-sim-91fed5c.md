# Review — PR 021 monetization/sim-91fed5c @ 84c05db (hivesurge-monetization), based on aabb84d (PR 020)

**Verdict: CHANGES REQUESTED, not merged.** One trivial blocker: lint fails.

- Design ref **91fed5c exists** on design/m2-specs ("catch-up easing max 5%, loss assist floor 0.85, sim model note"). The sim's default `--design-ref` is 91fed5c.
- Scope: docs/data/tooling only (`monetization/economy.md`, `sim/economy_sim.py`, `sim/last_run.md`, `prs/021`). `check_guardrails.py` and `skus.json` are unchanged. No secrets. It merges into main (v0.1.0-slice) with no conflicts.
- `check_guardrails.py` exits 0. `economy_sim.py` exits 0: easier-only scaling (enemy scale ≤ 1.00 for every persona, 0 days above 1.0), and the no-ads F2P player sits at a median 93% of expectedP (min 82%). Day-30 levels: no-ads 132 / ads 134 / payer 135, which resolves the PR 020 finding where payers progressed slowest. The payer vs no-ads Epic-level gap is +0.67, so the tier-18 gem trigger doesn't fire.
- **Blocking:** `npm run lint` fails because **`monetization/sim/last_run.md` isn't prettier-formatted**. Run `npx prettier --write monetization/sim/last_run.md` and commit. If the sim regenerates this file, have it run prettier too, or add the file to `.prettierignore`.
- Nit: the PR describes power term k = 0.3/0.5. Confirm the economy.md recommendation states k = 0.5 explicitly.
