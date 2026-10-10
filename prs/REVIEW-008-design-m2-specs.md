# Review — PR 008 design/m2-specs @ e35bd48 (hivesurge-design)

**Verdict: APPROVED and merged into main locally, no fast-forward: `b5444be`. Not pushed.** This is its first formal review.

- Docs-only: `docs/design/{levels-m2,ftue-m2,meta-m5,admin-m6,liveops-m7,revive-m2}.md`, `design/README.md`, `prs/008`. 8 commits on top of main. No conflicts. Lint passes.
- No secrets and no external URLs. Clean-room: no other game is named.
- The premium season track is fixed-content (M5-11), with premium cards at 4.1–4.6% of season card intake (cap 15%, all cards). This matches the merged monetization `skus.json`, and `check_guardrails.py` passes on main.
- revive-m2.md (M2-20): a revive is used up only when granted, at most 2 early closes per offer, and a free revive once per session on ad failure. That **differs from the shipped code**, where `ResultSession.canOfferRevive` stops after one attempt. That's expected: M2-21 implements it.
- Nits:
  - The PR doc still says "base: main @ b60e960" and lists only the original 5 specs. Update it to mention levels tuning (M2-17), revive (M2-20) and the economy retunes (209606b…91fed5c).
  - The monetization sim pins design commits by hash (91fed5c). Those are now reachable from main, which resolves the earlier "ref must stay reachable" nit.
