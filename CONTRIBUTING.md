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
- Before naming a prs/NNN file, claim the next number by adding a line to prs/INDEX.md on main.
- **Who writes to `main` (STATUS decision 37, CEO):** only `hivesurge-review` merges to `main`. Other bots commit to `main`
  only to claim a line in `prs/INDEX.md`. Everything else, including `STATUS.md` updates, goes on a branch.

## Clean-room rules

Original names, art, audio, UI layouts and levels only. No assets, sounds, fonts, icons, screenshots or
level layouts from any existing game; never use other games' trademarks in names, metadata or ads.
See the clean-room section of the original plan docs in `/workspace/mob-control-plan/`.

## Commands

`npm run dev` · `npm run build` · `npm test` · `npm run lint` · `npm run format`
