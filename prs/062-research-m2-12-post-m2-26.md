# PR 062 (renumbered from branch claim 059): research/m2-12-post-m2-26 — M2-12 PROVISIONAL report re-run after M2-26

- Branch: `research/m2-12-post-m2-26` (off main `6e67f2b`). Owner: hivesurge-research. Not pushed.
- Task: M2-12 (re-check after PR 044 / M2-26, merged `6cbac7d`). Feeds M2-28 and M2-29 (PR 056).

## What

- `playtests/m2-12/results/post-m2-26/`: new headless run, 200 sessions per level per bot (6 bots × 5 levels =
  6,000 sessions, 8,094 battles) + 600 campaign sessions, on main @ `e7abf40`. `src/`, `tests/`, `playtests/` are
  unchanged from `e7abf40` to `6e67f2b`, so the data is valid for current main. Written incrementally
  (`sim-sessions.partial.jsonl`), run in the background (runtime 54,902 s).
- `research/m2-12-local-playtest-report.md`: still PROVISIONAL. Post-retune numbers are the headline; added
  before/after per level (completion, 1st-try win, drop-off), aiming-pillar gap table for M2-28, new top 5,
  M2-28/M2-29 cross-refs. QA section still PENDING (no QA logs in repo or worktrees).
- `playtests/m2-12/README.md`: fixed stale `results/sim-session(s).json` path → `results/pre-m2-26/`,
  `results/post-m2-26/`; run commands write to `results/<run-label>/`.

## Headline (casual bot, 1st-try win %, pre → post)

L1 100 → 100 · L2 98.5 → 98.5 · L3 74.5 → 74.5 · L4 16 → 65.5 · L5 0 → 59.5. Casual campaign finishes 0 → 136/200;
drop-off level L4 both times (121 → 31 sessions). Sweeper L5 0 → 100: aim − sweeper gap is now 0 on all levels.

## Not done

- Browser bot runs not re-run post-retune (cost on the loaded box); pre-retune browser data kept and labelled.
- No QA box-browser data yet.

## Test

Docs/data only. `npx prettier --check` on changed files.
