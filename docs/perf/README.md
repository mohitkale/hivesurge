# Low-end perf evidence (fix/perf-lowend)

Headless Chrome on SwiftShader (software WebGL, no GPU), 1280x800 viewport, `clover-run` level,
60 s of real play per run (hold and weave the pointer). The box is shared: every file records
the load average and co-tenant processes (other agents' Chrome GPU processes were at 230-470 % CPU).
Wall fps moves with that load. `cpuMsPerFrame` (CPU time of the whole bench browser tree per
frame) moves much less, so use it to compare builds.

- `lowend-run1-2026-10-14.txt`: first full set (preart, main, fix auto/high/med/low), loadavg 20-29.
- `lowend-run2-2026-10-14.txt`: second set (main, fix auto, preart, fix low), loadavg 20-28.
- `lowend-ablation-2026-10-14.txt`: one frozen battle frame, render + readback timed per feature,
  each interleaved with the reference (MSAA-on context, as main, and MSAA-off context).
- `lint/test/build-2026-10-14.txt`: checks on the branch tip.

Reproduce: `npm run dev -- --port 5291`, then
`node scripts/perf-bench.mjs "http://localhost:5291/?level=clover-run[&quality=low|med|high]" 60 label`
and `node scripts/perf-ablate.mjs "http://localhost:5291/?level=clover-run" 2`.
