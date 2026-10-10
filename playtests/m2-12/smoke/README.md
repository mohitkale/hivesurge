# bot-sessions.mjs --runs 1 --max-battles 3 --max-min 2 (headless Chrome, vite preview, 2026-10-10 22:52 IST, branch tip 7c1fc45)

idle #1: 1 battles in 2.0 min -> /tmp/m212/bot-idle-1.json
sweeper #1: 2 battles in 2.0 min -> /tmp/m212/bot-sweeper-1.json
gate-seeker #1: 2 battles in 2.0 min -> /tmp/m212/bot-gate-seeker-1.json

| file                   | label | battles | wins | completion | retry after loss | first win (s) | drop-off level | drop-off loss | session (min) | ftue queen (ms) |
| ---------------------- | ----- | ------- | ---- | ---------- | ---------------- | ------------- | -------------- | ------------- | ------------- | --------------- |
| bot-gate-seeker-1.json | bot   | 3       | 2    | 0.67       | —                | 18.8          | clover-run     | —             | 1.19          | 5150            |
| bot-idle-1.json        | bot   | 2       | 0    | 0          | 1                | —             | ftue-meadow    | —             | 1.28          | —               |
| bot-sweeper-1.json     | bot   | 3       | 2    | 0.67       | —                | 26.2          | clover-run     | —             | 1.46          | 5717            |

Aggregate by label (bot data is never player data):

- bot: 3 sessions, 8 battles, completion 0.50, retry after loss 1
