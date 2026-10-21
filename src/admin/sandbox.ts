/**
 * M6-2a SANDBOX guard: the admin panel refuses to run against anything but the sandbox project
 * (or a local Supabase / the in-memory mock). Add a ref here only for another sandbox project.
 */
export const SANDBOX_REFS = ['yaizrnbfspmzshdzjcjz'] as const;

export type GuardResult =
  { ok: true; target: 'mock' | 'local' | 'sandbox' } | { ok: false; reason: string };

export function sandboxGuard(url: string | null | undefined): GuardResult {
  const u = (url ?? '').trim();
  if (!u) return { ok: true, target: 'mock' };
  let host: string;
  try {
    host = new URL(u).hostname;
  } catch {
    return { ok: false, reason: 'Supabase URL is not a valid URL' };
  }
  if (host === 'localhost' || host === '127.0.0.1') return { ok: true, target: 'local' };
  const ref = host.split('.')[0];
  if (/\.supabase\.(co|in)$/.test(host) && (SANDBOX_REFS as readonly string[]).includes(ref))
    return { ok: true, target: 'sandbox' };
  return { ok: false, reason: `refusing to run: ${host} is not the sandbox project` };
}
