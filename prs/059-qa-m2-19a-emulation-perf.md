# PR 059: QA M2-19a emulation perf log (software WebGL)

Branch: qa/m2-19a-emulation-perf. Adds playtests/m2-19a-2026-10-14.md and screenshots. This is a log-only change.
Per decision 35, real-device fps and input lag move to M2-19b. The software-render fps stays as a low-end regression check and will be re-measured on eng's perf fix. Draw calls PASS (66-69). The starter skin still FAILs on main e7abf40 (art is fixing it).
