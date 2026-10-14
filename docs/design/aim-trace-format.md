# Aim trace JSON format (M2-28d)

An aim trace records one battle's aim input so design can study real wiggle patterns (M2-28b/c).

## Turning it on

Add `?trace=aim` to the game URL. `?debug&trace=aim` works too.

- **Works in production builds, on purpose.** The other debug params (`?debug` overlay, `?level`,
  `?battle`, `?revive`) are dev-only. This one exists to capture data from real devices and outside
  testers, who only get production builds. So it is gated on `trace=aim` alone, never on the dev
  overlay.
- **Safe for players.** It changes no gameplay, economy or ad pacing. It only records and offers an
  export.
- **Zero cost when off.** Without the param, the game does one URL check at startup. It adds no
  listeners and no allocations, and has a null check per sim step. The recorder module
  (`src/debug/aimTrace.ts`) is lazy-loaded on the first traced battle, so it adds nothing to the
  initial JS.

At battle end, the bottom-left corner shows **⬇ Aim trace** (downloads
`aim-trace-<level>-<startedAt>.json`) and **Copy** (copies the JSON to the clipboard). The panel
stays up until the next battle starts.

## Shape (version 1)

```json
{
  "format": "hivesurge.aimTrace",
  "version": 1,
  "level": "dandelion-drift",
  "seed": 201,
  "viewport": { "w": 390, "h": 844, "dpr": 3 },
  "startedAt": "2026-10-15T00:40:00.000Z",
  "aim": [
    [17, 0],
    [50, 0.05],
    [83, 0.15]
  ],
  "launches": [
    [17, "bee", 1],
    [117, "bee", 1],
    [6033, "queen", 1]
  ],
  "results": [{ "t": 58517, "outcome": "won", "nestLeftPct": 0, "hiveLeft": 38 }]
}
```

| field               | meaning                                                                                                                                                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `format`, `version` | Always `"hivesurge.aimTrace"` and `1`. Any change to the shape bumps `version`.                                                                                                                                                                                                                                                                  |
| `level`             | The level id.                                                                                                                                                                                                                                                                                                                                    |
| `seed`              | The level's sim RNG seed, or `null` if the level has none.                                                                                                                                                                                                                                                                                       |
| `viewport`          | CSS pixel size (`innerWidth`, `innerHeight`) and `devicePixelRatio` at battle start.                                                                                                                                                                                                                                                             |
| `startedAt`         | Wall-clock ISO time when the trace began.                                                                                                                                                                                                                                                                                                        |
| `aim`               | `[t, x]` samples. `t` is ms since battle start, in sim time, so pauses and hidden tabs don't count. `x` is the cannon x in lane units (centre 0, ± `maxCannonX`), rounded to 2 decimals. A sample is written only when x changed, and at most once per 33 ms (about 30 Hz). Holding still writes nothing; the last sample's value still applies. |
| `launches`          | `[t, kind, count]`. `kind` is `"bee"` (normal launch) or `"queen"`. Bee launches are grouped per sim step (60 Hz), so `count` is usually 1.                                                                                                                                                                                                      |
| `results`           | One entry per battle end: `t` (ms), `outcome` (`"won"` or `"lost"`), `nestLeftPct` (0–100) and `hiveLeft` (hive HP). A revive continues the same battle and trace, so a revived battle has two entries.                                                                                                                                          |

Size: a 58 s sim battle with constant wiggle came to 1714 aim samples, 533 launch entries,
31 KB of raw JSON and 9 KB gzipped.
