import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { CloudBackend, CloudUser, SyncRequest, SyncResponse } from './types';

/**
 * Supabase implementation of CloudBackend. Only ever loaded through a dynamic import (see
 * cloud/controller.ts), so `@supabase/supabase-js` stays out of the first-load bundle.
 * Uses only the public URL + anon/publishable key; RLS is the security boundary.
 */
export async function createSupabaseBackend(url: string, anonKey: string): Promise<CloudBackend> {
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return new SupabaseCloud(client);
}

const toUser = (u: User | null | undefined): CloudUser | null =>
  u ? { id: u.id, email: u.email ?? null, anonymous: u.is_anonymous === true } : null;

/** Exported for live sandbox checks with an already signed-in client. */
export class SupabaseCloud implements CloudBackend {
  readonly kind = 'supabase' as const;
  constructor(private readonly sb: SupabaseClient) {}

  async currentUser() {
    // getSession reads the local session (refreshing it when needed); no request per call.
    const { data } = await this.sb.auth.getSession();
    return toUser(data.session?.user);
  }

  async signInAnonymously() {
    const { data, error } = await this.sb.auth.signInAnonymously();
    if (error) throw new Error(error.message);
    return toUser(data.user)!;
  }

  async sendMagicLink(email: string, redirectTo: string) {
    const { error } = await this.sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (error) throw new Error(error.message);
  }

  async linkEmail(email: string, redirectTo: string) {
    // Anonymous -> permanent: the same auth user gets an email (after the confirm link).
    const { error } = await this.sb.auth.updateUser({ email }, { emailRedirectTo: redirectTo });
    if (error) throw new Error(error.message);
  }

  async signOut() {
    await this.sb.auth.signOut({ scope: 'local' });
  }

  onAuthChange(cb: (u: CloudUser | null) => void) {
    const { data } = this.sb.auth.onAuthStateChange((_e, session) => cb(toUser(session?.user)));
    return () => data.subscription.unsubscribe();
  }

  async sync(r: SyncRequest): Promise<SyncResponse> {
    const { data, error } = await this.sb.rpc('sync_player', {
      p_data: r.data,
      p_revision: r.revision,
      p_expected: r.expected,
      p_levels: r.levels,
      p_stats: r.stats ?? {},
      p_events: r.events,
    });
    if (error) throw new Error(error.message || 'network error');
    const o = (data ?? {}) as Partial<SyncResponse>;
    return {
      ok: o.ok === true,
      revision: typeof o.revision === 'number' ? o.revision : null,
      data: o.data ?? null,
      now: typeof o.now === 'number' && Number.isFinite(o.now) ? o.now : undefined,
    };
  }
}
