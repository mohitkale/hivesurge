/**
 * Entry-safe cloud config (tiny, no Supabase import). Decides whether a cloud backend is
 * configured and whether the lazy cloud chunk should start on boot.
 */
import type { KeyValueStore } from '../../analytics/analytics';

export interface CloudEnv {
  url: string;
  anonKey: string;
}

export const MOCK_SESSION_KEY = 'hivesurge.mockcloud.session.v1';

/** Supabase is used only when both public values are set (VITE_ vars, e.g. in .env.local). */
export function cloudEnv(
  env: Record<string, string | boolean | undefined> = import.meta.env,
): CloudEnv | null {
  const url = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : '';
  const anonKey =
    typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY.trim() : '';
  if (
    !/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$|^http:\/\/(localhost|127\.0\.0\.1):\d+\/?$/.test(
      url,
    )
  )
    return null;
  if (!anonKey || /^your-/.test(anonKey)) return null;
  return { url: url.replace(/\/$/, ''), anonKey };
}

/** supabase-js default storage key for a project URL. */
export function supabaseSessionKey(url: string): string {
  return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
}

/** Start the cloud chunk on boot only for a returning signed-in player or an auth redirect. */
export function shouldAutoStartCloud(
  kv: KeyValueStore,
  loc: { hash: string; search: string },
  env: CloudEnv | null,
): boolean {
  if (/access_token=|error_description=/.test(loc.hash)) return env !== null;
  if (/[?&](code|token_hash)=/.test(loc.search)) return env !== null;
  try {
    if (env) return kv.getItem(supabaseSessionKey(env.url)) !== null;
    return !!kv.getItem(MOCK_SESSION_KEY);
  } catch {
    return false;
  }
}
