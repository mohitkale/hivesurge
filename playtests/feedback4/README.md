# Feedback round 4 (Mohit, 2026-10-22) screenshots

Headless Chrome (SwiftShader) against `npm run dev` (zero env vars, mock services), `?battle=8`.

- `before/`: the live build's code (main `4526b7e`), every meta screen at 390x844 and 360x640;
  `*-end-*` = the far end of the screen's scroll track (season pass, rankings, bees, ...).
- `after/`: the same screens after the round 4 PRs, plus the blocker countdown proof
  (`countdown-*.png`), level openings (`openings-*.png`) and environments (`env-*.png`).
- `compare-*.png`: before | after side by side for the screens that changed layout.

Re-run: `TAG=after BASE=http://127.0.0.1:5173 npx playwright test -c playtests/feedback4/pw.config.ts`
(`SCREENS=liveops,shop` limits the set).
