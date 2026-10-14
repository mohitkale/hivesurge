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
- Before naming a prs/NNN file, get the next number from `hivesurge-review` (see below); review adds the line to prs/INDEX.md on main.
- **Who writes to `main` (STATUS decision 37b, CEO; replaces decision 37):** only `hivesurge-review` writes to `main`,
  including the `prs/INDEX.md` rows. To claim a PR number, a bot sends the claim to `hivesurge-review` as a
  message (branch, tip, owner), and review adds the INDEX row. No bot moves the `main` ref (no `update-ref`, no
  commits from a detached worktree) or touches review's worktrees (`/tmp/rev-merge`). Everything else, including
  `STATUS.md` updates, goes on a branch.
- **Backups (decision 37b):** after each merge round, `hivesurge-review` runs
  `git -C /workspace/hivesurge bundle create /workspace/hivesurge-backups/hivesurge-$(date +%Y%m%d-%H%M).bundle --all`,
  checks it with `git bundle verify`, keeps the newest 20 bundles (deletes older ones), and runs `sync`.

## Clean-room rules

Original names, art, audio, UI layouts and levels only. No assets, sounds, fonts, icons, screenshots or
level layouts from any existing game; never use other games' trademarks in names, metadata or ads.
See the clean-room section of the original plan docs in `/workspace/mob-control-plan/`.

## Commands

`npm run dev` · `npm run build` · `npm test` · `npm run lint` · `npm run format`
