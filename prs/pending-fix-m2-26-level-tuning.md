# PR (number pending): fix/m2-26-level-tuning

Task: M2-26 (validation-m2.md, PR 035 / 041). Base: main `58f7c72`.

## Changes

- `thistle-gauntlet`: nestHp 3400 -> 2650, hiveHp 40 -> 50.
- `wasp-queen-nest`: nestHp 6000 -> 3200, hiveHp 45 -> 50; add gate +3 -> +5; x3 gate width 3.4, speed 0.6; waves about 20% fewer; trap moved to x0 y14 w2.6.
- `tests/levelTuningM2-26.test.ts`: spec values; casual in band, idle loses, centre below casual.

## Bot win rates (200 seeds each; aim, centre and idle use `winRate`)

| level            | idle | centre | casual | aim  | design casual |
| ---------------- | ---- | ------ | ------ | ---- | ------------- |
| thistle-gauntlet | 0%   | 0%     | 65.0%  | 100% | 65%           |
| wasp-queen-nest  | 0%   | 0%     | 59.5%  | 100% | 59.5%         |

The bots agree with design's numbers. No tuning beyond the spec. The 18px gate-label tests pass.

## Checks

lint ok · tests 207/207 · build ok · size budget: initial JS 2.26 KiB gzip, dist 899.32 KiB.
