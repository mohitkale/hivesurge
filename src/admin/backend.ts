import type { RemoteConfig } from '../platform/remoteConfig';
import type { Role } from './perms';

export interface PlayerRow {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_seen: string | null;
  levels_cleared: number;
  battles: number;
  coins: number;
  gems: number;
  purchases: number;
  guest: boolean;
  is_admin: boolean;
}

export interface PurchaseRow {
  session_id: string | null;
  user_id: string;
  sku: string;
  provider: 'mock' | 'stripe_test';
  status: 'paid' | 'refunded';
  amount: number | null;
  currency: string | null;
  grants: Record<string, unknown>;
  created_at: string;
  refunded_at: string | null;
}

export interface EventRow {
  name: string;
  props: Record<string, unknown>;
  session: string;
  client_ts: string;
  created_at: string;
}

export interface AuditRow {
  id: number;
  admin_id: string | null;
  action: string;
  target_user?: string | null;
  target?: string | null;
  reason: string | null;
  before: unknown;
  after: unknown;
  at: string;
}

export interface PlayerDetail {
  profile: { id: string; display_name: string | null; created_at: string };
  email: string | null;
  save: { revision: number; data: Record<string, unknown>; updated_at: string } | null;
  stats: Record<string, unknown> | null;
  progress: { level_id: string; best_stars: number; best_coins: number }[];
  purchases: PurchaseRow[];
  events: EventRow[];
  audit: AuditRow[];
}

export interface Stats {
  levels: { level: string; starts: number; wins: number; fails: number }[];
  ftue: { step: number; players: number }[];
  ads: { placement: string; type: string; watched: number; sessions: number }[];
  sessions: number;
  players: number;
  purchases: {
    sku: string;
    provider: string;
    status: string;
    n: number;
    amount: number;
    currency: string | null;
  }[];
}

export interface ConfigVersion {
  version: number;
  config: RemoteConfig;
  note: string | null;
  published_by: string | null;
  rolled_back_from: number | null;
  published_at: string;
}

export interface LevelOverride {
  level_id: string;
  data: Record<string, unknown>;
  version: number;
  updated_by: string | null;
  updated_at: string;
}

/** Everything the panel does. Mock and Supabase implementations enforce the same rules. */
export interface AdminBackend {
  readonly mode: 'mock' | 'supabase';
  /** Signed-in admin email, or null when signed out. */
  session(): Promise<{ email: string | null } | null>;
  /** Mock: signs in at once. Supabase: sends a magic link. */
  signIn(email: string): Promise<string>;
  signOut(): Promise<void>;
  /** Role from `admin_users` (server-side), null = not an admin. */
  whoami(): Promise<Role | null>;
  findPlayers(q: string): Promise<PlayerRow[]>;
  playerDetail(id: string): Promise<PlayerDetail | null>;
  grant(
    id: string,
    coins: number,
    gems: number,
    reason: string,
  ): Promise<{ coins: number; gems: number }>;
  resetSave(id: string, reason: string, confirm: string): Promise<void>;
  stats(from: Date, to: Date): Promise<Stats>;
  purchases(f: { status?: string; sku?: string }): Promise<PurchaseRow[]>;
  audit(limit: number): Promise<AuditRow[]>;
  configVersions(): Promise<ConfigVersion[]>;
  validateConfig(c: unknown): Promise<string[]>;
  publishConfig(c: RemoteConfig, note: string): Promise<number>;
  rollbackConfig(version: number, reason: string): Promise<number>;
  levelOverrides(): Promise<LevelOverride[]>;
  saveLevel(id: string, data: Record<string, unknown>, reason: string): Promise<number>;
}

/** Server refusals surface as this (RLS / role check = 403). */
export class AdminError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 409 | 500 = 400,
  ) {
    super(message);
  }
}
