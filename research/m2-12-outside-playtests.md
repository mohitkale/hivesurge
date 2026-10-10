# M2-12 — Outside playtests (status: BLOCKED, protocol ready)

**Acceptance:** report with completion rate, D0 retry rate, top 5 issues from 5–10 outside testers, vs plan §7.1 exit criteria.

**Why not done:** research cannot recruit humans or publish a test build. Recruiting/messaging people is
an external action needing Mohit's approval, and hosting is an open question (PLAN.md open question 3:
local tunnel vs preview URL). Dependency M2-7 must also be done. No numbers below are real results.

## §7.1 exit criteria (hypotheses, from mob-control-web-plan.md)

1. Testers voluntarily play **≥10 battles**.
2. Frame rate stable over a **15-minute** session.
3. First battle starts within **~3 s** of load on 4G.

## Protocol

- 5–10 testers who have not seen the game; ≥3 on mid-range Android Chrome, ≥1 iOS Safari.
- Hand over the URL with only: "Play as long as you like, stop whenever you want." No coaching.
- Capture (manual or via local analytics log): time-to-first-battle, battles started, wins/losses,
  retries after a loss (D0 retry = losses followed by another battle within 60 s / total losses),
  session length, fps min/avg (dev overlay), whether they asked to keep playing.
- 3 exit questions: what was confusing? what was most fun? would you play again tomorrow (1–5)?

## Report template

| Tester | Device/browser | Load→battle (s) | Battles | Completion rate (wins/started) | Retries/losses | Session min | fps min/avg | Wants more? |
| ------ | -------------- | --------------- | ------- | ------------------------------ | -------------- | ----------- | ----------- | ----------- |

Summary: % testers ≥10 battles; median completion rate; D0 retry rate; pass/fail per §7.1 criterion;
top 5 issues ranked by #testers affected.
