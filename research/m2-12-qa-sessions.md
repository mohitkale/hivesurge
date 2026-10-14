# M2-12 QA box sessions (pointer)

**Full log:** [`playtests/m2-12/qa/2026-10-15-box-sessions.md`](../playtests/m2-12/qa/2026-10-15-box-sessions.md)  
**Screenshots:** `playtests/m2-12/qa/img/` (12 frames)

> Automated agent play on box **software-render**, load ~5–22. **Not human players.** FPS low-confidence (median ~12–22, 1% low ~5).

## Key findings (2026-10-15, build `21acf39`)

- **S1 / S2:** L1 lost 3× each (S1 nest 98/80/38%; S2 21/31/37% with 21–32 bees unfired). No win.
- **S3:** L1 win at **192 s** (3★, 4 s left) after one near-miss (8%); then **L2 drop-off** (99/98/82%) by **390 s**.
- **Ads/offers:** none seen (Retry free / Home only).
- **Major bugs:** stuck "Drag to the x2 gate" hint (S2 a2–a3); no missed-gate feedback (volley straight up); L2 bee/damage spike (6–19 bees / 1–2% nest per volley); L2 trap values (−600 / −550..−580) change unexplained.
- **Minor:** fail tips weak on chaining/queen; hold hint repeats; no aim preview.

Feeds the provisional bot report in `research/m2-12-local-playtest-report.md` (QA box-browser row was pending).
