# Hive Surge (vertical slice)

Original swarm-lane web game: aim a honey cannon, fly bees through flower gates to multiply the swarm,
break the wasp nest before wasps break your hive.

```bash
npm install
npm run dev    # http://localhost:5173 (also on LAN for phone testing)
npm test       # Vitest
npm run lint   # ESLint + Prettier check
npm run build  # type-check + production build to dist/
```

Controls: hold + drag (touch/mouse) · A/D or ←/→ to aim, Space to fire, Q to launch the Queen.

Docs: `STATUS.md` (state + decisions), `PLAN.md` (milestones), `CONTRIBUTING.md` (process), `CHANGELOG.md`,
`playtests/`, `prs/`. Ads and purchases are sandbox mocks only.

## Review build

A production build served locally for review (CEO decision 39). It deploys nowhere: it binds to
`127.0.0.1` only.

```bash
npm ci                    # once per checkout
npm run review            # build:review, then serve:review
# or in two steps:
npm run build:review      # live-key guard + type-check + production build to dist-review/ + size budget
npm run serve:review      # vite preview of dist-review/ on a fixed port
```

Open **http://127.0.0.1:4180/**. The port is fixed (`--strictPort`), so the command fails rather
than moving to another port if 4180 is busy. Stop the server with Ctrl+C. `dist-review/` is
gitignored.

To test on a phone on the same LAN, run
`npx vite preview --outDir dist-review --host --port 4180 --strictPort` instead. That is still
local only.

URL params that work in this production build:

| Param                     | Effect                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `?trace=aim`              | Aim-trace logger; Download/Copy JSON at battle end (`docs/design/aim-trace-format.md`) |
| `?quality=low\|med\|high` | Pin a render quality tier (no auto scaling)                                            |
| `?assets=off`             | Force the procedural models (skip GLB loading)                                         |

Dev-only, so **ignored in this build** (use `npm run dev` for them): the `?debug` perf overlay and
F3, `?level=<id>`, `?battle=N`, `?revive=force` and `?stress=N`.

Fresh player: clear site data, or use a private window. The save is in `localStorage`
(`hivesurge.save.v1`).

<!-- Crowd LOD placeholder: art's fix/crowd-lod-hysteresis (PR 083) is merged and runs
automatically in every build. Review-build params or notes for it go here once art adds any. -->
