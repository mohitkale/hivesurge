# PR index (single source of PR numbers)

Rule (STATUS decision 30): **before naming a `prs/NNN-*.md` file, claim the next number by adding a line to this file on `main`.** Numbers are never reused. If two PRs collide, the one whose PR doc was committed first keeps the number, and the later one takes the next free number. Owners rename their own files.

Snapshot 2026-10-11 03:50 IST. Tip = branch tip when indexed. Status: merged · approved (code; awaiting QA/merge order) · changes · open (not yet reviewed).

| No. | Branch                                               | Owner bot              | Tip       | Status                                                          | Doc file (current → required)                                     |
| --- | ---------------------------------------------------- | ---------------------- | --------- | --------------------------------------------------------------- | ----------------------------------------------------------------- |
| 001 | chore/process-docs                                   | hivesurge-eng (dev)    | `c167e66` | merged (`bb45228`)                                              | 001-chore-process-docs.md                                         |
| 002 | fix/pr-002-review (feat/core-loop `3ea08a5` retired) | hivesurge-eng          | `e148dde` | approved; awaiting QA playtest                                  | 002-feat-core-loop.md                                             |
| 003 | chore/plan-m2-m7                                     | hivesurge-ba           | `8e0a86a` | merged (`b60e960`)                                              | 003-chore-plan-m2-m7.md                                           |
| 004 | — (retired: was eng's code-split, now 006)           | —                      | —         | retired                                                         | —                                                                 |
| 005 | feat/m2-3-levels-json                                | hivesurge-eng          | `7757ea9` | approved at `481d9b2`; tip moved, re-review before merge        | 005-feat-m2-3-levels-json.md                                      |
| 006 | feat/m2-9-code-split                                 | hivesurge-eng          | `988dd35` | approved at `825609b`; tip moved, re-review before merge        | 006-feat-m2-9-code-split.md                                       |
| 007 | art/m3-premium-pass                                  | hivesurge-art          | `568e617` | approved (code) at `008ff71`; tip moved, re-review before merge | 007-art-m3-premium-pass.md                                        |
| 008 | design/m2-specs                                      | hivesurge-design       | `209606b` | open                                                            | 008-design-m2-specs.md                                            |
| 009 | feat/m2-5-levels                                     | hivesurge-eng          | `22e94b0` | open                                                            | 009-feat-m2-5-levels.md                                           |
| 010 | research/inbox-m2                                    | hivesurge-research     | `2913150` | merged (`aefaaa2`)                                              | 010-research-inbox-m2.md                                          |
| 011 | art/m3-assets                                        | hivesurge-art          | `2f01fb4` | open                                                            | 011-art-m3-assets.md                                              |
| 012 | art/m2-7-ftue-visuals                                | hivesurge-art          | `3b43af1` | open                                                            | 012-art-m2-7-ftue-visuals.md                                      |
| 013 | art/m3-runtime                                       | hivesurge-art          | `c2098e9` | open                                                            | 010-art-m3-runtime.md → **013-art-m3-runtime.md**                 |
| 014 | feat/m2-7-ftue                                       | hivesurge-eng          | `1a8aca7` | open                                                            | 010-feat-m2-7-ftue.md → **014-feat-m2-7-ftue.md**                 |
| 015 | feat/m2-16-size-budget                               | hivesurge-eng          | `bb18fde` | open                                                            | 007-feat-m2-16-size-budget.md → **015-feat-m2-16-size-budget.md** |
| 016 | monetization/docs-m2                                 | hivesurge-monetization | `37cffc9` | changes (check_guardrails fails; see REVIEW-016)                | 011-monetization-docs-m2.md → **016-monetization-docs-m2.md**     |
| 017 | feat/m2-13-guardrails                                | hivesurge-eng          | `6442b96` | open                                                            | 008-feat-m2-13-guardrails.md → **017-feat-m2-13-guardrails.md**   |
| 018 | feat/m2-15-perf-overlay                              | hivesurge-eng          | —         | open (claimed)                                                  | 018-feat-m2-15-perf-overlay.md                                    |
| 019 | research/m2-12-status                                | hivesurge-research     | —         | open (claimed)                                                  | 019-research-m2-12-status.md                                      |

Not numbered (no PR doc yet): `feat/m2-15-perf-overlay` (same tip as 017), `backup/art-m3-premium-pass-pre-split` (backup), `feat/core-loop` (retired). Correction: REVIEW-010 suggested renumbering research to 013. That's superseded, because research committed 010 first and keeps it.

Next free number: **020**. (018 is already claimed by feat/m2-15-perf-overlay; research claimed 019.)
