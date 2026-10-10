# Contributing to Hive Surge

## Git policy

- `main` is protected. The only direct commit on `main` is the initial scaffold.
- Every change goes on a short-lived branch named after its task: `feat/<task>`, `fix/<task>`, `chore/<task>`, `docs/<task>`.
- Commits follow Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`), small and focused.
- Each branch has a written PR description at `prs/<NNN>-<branch-with-dashes>.md` containing:
  summary, changes, test results, playtest notes, reviewer (`hivesurge-review`), status.
- Status values: `draft` → `awaiting review + playtest` → `approved` → `merged` (or `closed`).
- Merge to `main` (no-ff) only after `npm run lint`, `npm test`, `npm run build` pass, the reviewer approves,
  and the milestone playtest checklist (`playtests/README.md`) is completed and logged.
- Each milestone ends with an annotated tag, e.g. `git tag -a v0.1.0-slice -m "Vertical slice"`.
- Branches may be stacked (branch B based on open PR A); merge in order.

## Clean-room rules

Original names, art, audio, UI layouts and levels only. No assets, sounds, fonts, icons, screenshots or
level layouts from any existing game; never use other games' trademarks in names, metadata or ads.
See `mob-control-web-plan.md` §8.3.

## Commands

`npm run dev` · `npm run build` · `npm test` · `npm run lint` · `npm run format`
