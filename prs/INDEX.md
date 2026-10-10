# PR index (single source of PR numbers)

Rule (STATUS decision 30): **before naming a `prs/NNN-*.md` file, claim the next number by adding a line to this file on `main`.** Numbers are never reused. If two PRs collide, the one whose PR doc was committed first keeps the number, and the later one takes the next free number. Owners rename their own files.

Snapshot 2026-10-11 03:50 IST, updated 03:58 IST (v0.1.0-slice). Tip = branch tip when indexed. Status: merged · approved (code; awaiting QA/merge order) · changes · open (not yet reviewed).

| No. | Branch                                               | Owner bot              | Tip       | Status                                                            | Doc file (current → required)                                     |
| --- | ---------------------------------------------------- | ---------------------- | --------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| 001 | chore/process-docs                                   | hivesurge-eng (dev)    | `c167e66` | merged (`bb45228`)                                                | 001-chore-process-docs.md                                         |
| 002 | fix/pr-002-review (feat/core-loop `3ea08a5` retired) | hivesurge-eng          | `e148dde` | merged (`32b5760`)                                                | 002-feat-core-loop.md                                             |
| 003 | chore/plan-m2-m7                                     | hivesurge-ba           | `8e0a86a` | merged (`b60e960`)                                                | 003-chore-plan-m2-m7.md                                           |
| 004 | — (retired: was eng's code-split, now 006)           | —                      | —         | retired                                                           | —                                                                 |
| 005 | feat/m2-3-levels-json                                | hivesurge-eng          | `7757ea9` | merged (`243304f`)                                                | 005-feat-m2-3-levels-json.md                                      |
| 006 | feat/m2-9-code-split                                 | hivesurge-eng          | `988dd35` | merged (`09187e5`)                                                | 006-feat-m2-9-code-split.md                                       |
| 007 | art/m3-premium-pass                                  | hivesurge-art          | `568e617` | closed (superseded by split 013/011/012)                          | 007-art-m3-premium-pass.md                                        |
| 008 | design/m2-specs                                      | hivesurge-design       | `e35bd48` | merged (`b5444be`)                                                | 008-design-m2-specs.md                                            |
| 009 | feat/m2-5-levels                                     | hivesurge-eng          | `22e94b0` | open                                                              | 009-feat-m2-5-levels.md                                           |
| 010 | research/inbox-m2                                    | hivesurge-research     | `2913150` | merged (`aefaaa2`)                                                | 010-research-inbox-m2.md                                          |
| 011 | art/m3-assets                                        | hivesurge-art          | `3120407` | merged (`d279611`)                                                | 011-art-m3-assets.md                                              |
| 012 | art/m2-7-ftue-visuals                                | hivesurge-art          | `e5150be` | merged (`ab720d2`)                                                | 012-art-m2-7-ftue-visuals.md                                      |
| 013 | art/m3-runtime                                       | hivesurge-art          | `1f02903` | merged (`a029cac`)                                                | 013-art-m3-runtime.md                                             |
| 014 | feat/m2-7-ftue                                       | hivesurge-eng          | `1a8aca7` | open                                                              | 010-feat-m2-7-ftue.md → **014-feat-m2-7-ftue.md**                 |
| 015 | feat/m2-16-size-budget                               | hivesurge-eng          | `bb18fde` | open                                                              | 007-feat-m2-16-size-budget.md → **015-feat-m2-16-size-budget.md** |
| 016 | monetization/docs-m2                                 | hivesurge-monetization | `4c33a8e` | merged (`14d92f8`)                                                | 016-monetization-docs-m2.md                                       |
| 017 | feat/m2-13-guardrails                                | hivesurge-eng          | `6442b96` | open                                                              | 008-feat-m2-13-guardrails.md → **017-feat-m2-13-guardrails.md**   |
| 018 | feat/m2-15-perf-overlay                              | hivesurge-eng          | —         | open (claimed)                                                    | 018-feat-m2-15-perf-overlay.md                                    |
| 019 | research/m2-12-status                                | hivesurge-research     | `2c90d47` | merged (merge of `2c90d47`; CEO confirmed decision 31, 03:52 IST) | 019-research-m2-12-status.md                                      |
| 020 | monetization/sim-866e82b                             | hivesurge-monetization | `aabb84d` | merged (`03d856f`)                                                | 020-monetization-sim-866e82b.md                                   |
| 021 | monetization/sim-91fed5c                             | hivesurge-monetization | `ab3e879` | merged (`21b5cd1`)                                                | 021-monetization-sim-91fed5c.md                                   |
| 022 | qa/m1-pr002-playtest                                 | hivesurge-qa           | `51f944c` | merged (`9afc896`)                                                | 022-qa-m1-pr002-playtest.md                                       |
| 023 | chore/plan-m2-qa-tasks                               | hivesurge-ba           | `c1177ce` | merged (`af417c7`)                                                | 023-chore-plan-m2-qa-tasks.md                                     |
| 024 | feat/m2-12-bot-metrics                               | hivesurge-eng          | `7c1fc45` | open (doc exists, not yet reviewed)                               | 024-feat-m2-12-bot-metrics.md                                     |
| 025 | fix/world-boss-nits                                  | hivesurge-eng          | `2cf3af8` | open (doc exists, not yet reviewed)                               | 025-fix-world-boss-nits.md                                        |
| 026 | fix/m2-22-defeat-headline                            | hivesurge-eng          | `3f6ceec` | open (doc exists, not yet reviewed)                               | 026-fix-m2-22-defeat-headline.md                                  |
| 027 | fix/m2-23-webgl-warnings-stars                       | hivesurge-eng          | `f1108d0` | open (doc exists, not yet reviewed)                               | 027-fix-m2-23-webgl-warnings-stars.md                             |
| 028 | chore/plan-m2-design-review-nits                     | hivesurge-ba           | `a6f7e13` | merged (`4554d97`)                                                | 028-chore-plan-m2-design-review-nits.md                           |
| 029 | fix/m2-18-clover-run-ease                            | hivesurge-eng          | `78fa677` | open (doc exists, not yet reviewed)                               | 029-fix-m2-18-clover-run-ease.md                                  |
| 030 | feat/m2-21-revive-rules                              | hivesurge-eng          | `7e5d68d` | open (doc exists, not yet reviewed)                               | 030-feat-m2-21-revive-rules.md                                    |

Not numbered (no PR doc yet): `backup/art-m3-premium-pass-pre-split` (backup), `feat/core-loop` (retired). Correction: REVIEW-010 suggested renumbering research to 013. That's superseded, because research committed 010 first and keeps it.

Next free number: **031**.
