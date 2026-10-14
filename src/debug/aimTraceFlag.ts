/**
 * M2-28d aim trace switch. `?trace=aim` (with or without `?debug`) turns the trace on.
 *
 * Unlike the other debug params (`?debug`, `?level`, `?battle`, `?revive`), this one works in
 * production builds too: it exists to capture real wiggle data from phones and outside testers,
 * who only run production builds. It changes no gameplay, economy or ad pacing. It only records
 * input and offers a JSON download at battle end. So it is gated on `trace=aim` alone, not on
 * the dev-only perf overlay. The recorder (`aimTrace.ts`) is lazy-loaded, so when the flag is
 * off it costs one string check at startup: no listeners, no allocations, no extra initial JS.
 */
export function aimTraceEnabledFromUrl(search: string): boolean {
  return new URLSearchParams(search).getAll('trace').includes('aim');
}
