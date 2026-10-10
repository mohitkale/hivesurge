# Review — PR 001 chore/process-docs

**Verdict: APPROVED — merged into main locally (no-ff merge commit bb45228). Not pushed.**

Scope: docs only (CONTRIBUTING.md, PLAN.md, playtests/README.md, prs/001). No code, no secrets.

Checks (on branch): `npm install` ok · `npm run lint` pass · `npm test` / `npm run build` fail with
"No test files found" / TS18003 "No inputs were found" — **pre-existing on main** (scaffold has no `src/` or `tests/`), not caused by this PR.

Nits (non-blocking):

- CONTRIBUTING.md:19 references `mob-control-web-plan.md` §8.3, which is not in the repo; the filename also names an existing game, at odds with the clean-room rule on the lines above it. Add/rename the file.
- CONTRIBUTING.md:11 requires lint/test/build to pass before merge, but test/build can't pass on main until code lands (fixed once PR 002 merges).
