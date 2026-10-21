import type { SupabaseClient } from '@supabase/supabase-js';
import type { RemoteConfig } from '../platform/remoteConfig';
import {
  AdminError,
  type AdminBackend,
  type ConfigVersion,
  type LevelOverride,
  type PurchaseRow,
  type Stats,
} from './backend';
import type { Role } from './perms';

interface PgErr {
  code?: string;
  message: string;
}

function fail(e: PgErr): never {
  const status =
    e.code === '42501' ? 403 : e.code === 'P0002' ? 404 : e.code === '22023' ? 400 : 500;
  throw new AdminError(e.message, status);
}

/**
 * Real backend: Supabase auth (email magic link) + the role-checked `admin_*` RPCs and
 * RLS-protected reads. Uses its own auth storage key so it never shares the player session.
 */
export class SupabaseAdminBackend implements AdminBackend {
  readonly mode = 'supabase' as const;
  private constructor(private readonly db: SupabaseClient) {}

  static async create(url: string, anonKey: string): Promise<SupabaseAdminBackend> {
    const { createClient } = await import('@supabase/supabase-js');
    const db = createClient(url, anonKey, {
      auth: {
        storageKey: 'hivesurge-admin-auth',
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
    return new SupabaseAdminBackend(db);
  }

  private async rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await this.db.rpc(fn, args);
    if (error) fail(error);
    return data as T;
  }

  async session() {
    const { data } = await this.db.auth.getSession();
    return data.session ? { email: data.session.user.email ?? null } : null;
  }
  async signIn(email: string) {
    const { error } = await this.db.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${location.origin}${location.pathname}`,
      },
    });
    if (error) fail(error);
    return 'Check your inbox for the sign-in link.';
  }
  async signOut() {
    await this.db.auth.signOut();
  }
  whoami() {
    return this.rpc<Role | null>('admin_whoami');
  }
  findPlayers(q: string) {
    return this.rpc<never>('admin_find_players', { p_q: q });
  }
  playerDetail(id: string) {
    return this.rpc<never>('admin_player_detail', { p_uid: id });
  }
  async grant(id: string, coins: number, gems: number, reason: string) {
    const r = await this.rpc<{ coins: number; gems: number }>('admin_grant', {
      p_uid: id,
      p_coins: coins,
      p_gems: gems,
      p_reason: reason,
    });
    return { coins: Number(r.coins), gems: Number(r.gems) };
  }
  async resetSave(id: string, reason: string, confirm: string) {
    await this.rpc('admin_reset_save', { p_uid: id, p_reason: reason, p_confirm: confirm });
  }
  stats(from: Date, to: Date) {
    return this.rpc<Stats>('admin_stats', { p_from: from.toISOString(), p_to: to.toISOString() });
  }
  async purchases(f: { status?: string; sku?: string }) {
    let q = this.db
      .from('purchases_sandbox')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (f.status) q = q.eq('status', f.status);
    if (f.sku) q = q.eq('sku', f.sku);
    const { data, error } = await q;
    if (error) fail(error);
    return data as PurchaseRow[];
  }
  async audit(limit: number) {
    const { data, error } = await this.db
      .from('admin_audit')
      .select('*')
      .order('at', { ascending: false })
      .limit(limit);
    if (error) fail(error);
    return data as never;
  }
  async configVersions() {
    const { data, error } = await this.db
      .from('remote_config')
      .select('*')
      .order('version', { ascending: false })
      .limit(20);
    if (error) fail(error);
    return data as ConfigVersion[];
  }
  validateConfig(c: unknown) {
    return this.rpc<string[]>('admin_validate_config', { p_config: c });
  }
  publishConfig(c: RemoteConfig, note: string) {
    return this.rpc<number>('admin_publish_config', { p_config: c, p_note: note });
  }
  rollbackConfig(version: number, reason: string) {
    return this.rpc<number>('admin_rollback_config', { p_version: version, p_reason: reason });
  }
  async levelOverrides() {
    const { data, error } = await this.db.from('level_overrides').select('*').order('level_id');
    if (error) fail(error);
    return data as LevelOverride[];
  }
  saveLevel(id: string, data: Record<string, unknown>, reason: string) {
    return this.rpc<number>('admin_save_level', { p_level_id: id, p_data: data, p_reason: reason });
  }
}
