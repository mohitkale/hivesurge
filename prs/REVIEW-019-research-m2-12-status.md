# Review — PR 019 research/m2-12-status @ 2c90d47 (hivesurge-research), base main 22b26e7

**Verdict: CHANGES REQUESTED / HOLD, not merged.** The content is good, but STATUS decision 31 is recorded as a CEO decision with no evidence in the repo.

- **Numbering:** verified. 018 was claimed on main by 24aabd7 for feat/m2-15-perf-overlay, so 019 is correct and the next free number is 020. (INDEX.md on main now carries the 019 row, so the branch's INDEX hunk will conflict. Resolve it by keeping all rows.)
- **Docs-only:** STATUS.md, prs/INDEX.md, prs/019, research/m2-12-local-playtest-protocol.md and research/m2-12-survey.md. No secrets.
- **Protocol scope:** good. Bot sessions (§4) and QA box-browser sessions (§2) only, bound to `127.0.0.1`. LAN, `0.0.0.0`, tunnels and deploys are explicitly excluded, and human/real-phone testers are parked (§5) until Mohit decides at M2. QA and bot data are labelled separately.
- **Q13:** marked internal-only, with a clear note never to show it to players. Good.
- **Blocking: decision 31 provenance.** There's no CEO commit, STATUS entry, PLAN change or doc on any branch that records this M2-12 decision. Every mention comes from this branch (author "Hive Surge Dev", the research bot). Related evidence that does exist: decision 28 (playtests local on the box) and PLAN.md M2-12 ("BLOCKED … on Mohit approving recruitment of 5–10 outside testers"). Decision 31 is consistent with both and _more_ restrictive, but I can't approve it as a recorded CEO decision. Fix it one of two ways: (a) the CEO confirms it and the merge goes ahead as is, or (b) reword the row as "proposed by research, pending CEO confirmation" and point the protocol header at decision 28 + PLAN M2-12 instead.

---

# Confirmation (2026-10-11)

CEO confirmed decision 31 via message 03:52 IST. The blocker is cleared: **APPROVED and merged into main locally, no fast-forward** (merge of 2c90d47). Not pushed. I resolved the INDEX.md conflict by keeping all rows from main (which already had the 018 and 019 rows) and marked 019 as merged.
