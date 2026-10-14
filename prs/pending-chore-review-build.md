# PR (number pending from review): chore/review-build

CEO decision 39 (usage-saving mode): a local review build. Nothing is deployed.

## Changes

- **`npm run build:review`:** live-key guard, `tsc`, `vite build --outDir dist-review`, then the
  live-key guard and size budget run again on `dist-review/`.
- **`npm run serve:review`:** `vite preview` of `dist-review/` on `127.0.0.1:4180` with
  `--strictPort`, so it fails rather than switching to another port.
- **`npm run review`:** both of the above in one command.
- **Ignore lists:** `dist-review/` is added to `.gitignore`, `.prettierignore` and the ESLint
  ignores.
- **Live-key guard:** it now also scans `dist-review/`. This is a one-line addition, and it still
  skips paths that don't exist.
- **README:** a new "Review build" section covers:
  - exact run steps and the URL;
  - params that work in production (`?trace=aim`, `?quality=low|med|high`, `?assets=off`,
    `?stress=N`);
  - the dev-only params (`?debug`/F3, `?level`, `?battle`, `?revive`);
  - a crowd LOD placeholder comment.

## Notes

- **Crowd LOD:** art's `fix/crowd-lod-hysteresis` has already landed on main (PR 083). It runs
  automatically in every build, so I only left a placeholder, as asked. Nothing is wired yet.
- **`?stress=N` is not gated:** `stressCountFromUrl` is documented as "dev only", but `game.ts`
  doesn't gate it, so it works in production. I left it unchanged and documented it as it really
  behaves. Review should decide whether to gate it.

## Tried once

- `npm run build:review` passed: initial JS 2.42 KiB gzip, `dist-review` 936 KiB.
- `npm run serve:review` served HTTP 200 on 127.0.0.1:4180.
- Headless load of `?trace=aim&quality=low&debug`: the game booted into the FTUE, the `aimTrace`
  chunk loaded, `?debug` was ignored (no overlay, no dev hook), and there were no page errors.
