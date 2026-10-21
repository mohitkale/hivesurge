/**
 * M4 cloud backend seam (platform/adapter pattern). The game only talks to `CloudBackend`;
 * `supabaseCloud.ts` implements it with Supabase (lazy-loaded), `mockCloud.ts` in memory
 * (tests, and every build without Supabase env vars).
 */
export type CloudKind = 'supabase' | 'mock';

export interface CloudUser {
  id: string;
  email: string | null;
  /** Anonymous (guest) account: upgrade by linking an email, same user id. */
  anonymous: boolean;
}

/** Best result per level (`level_progress`). */
export interface LevelRow {
  level_id: string;
  best_stars: number;
  best_coins: number;
}

/** Lifetime totals (`player_stats`). */
export interface StatsRow {
  battles: number;
  wins: number;
  losses: number;
  total_stars: number;
  levels_cleared: number;
  coins_earned: number;
  gems_earned: number;
  gems_spent: number;
}

/** One analytics event for the `events` drain. */
export interface EventRow {
  session: string;
  name: string;
  props: Record<string, string | number | boolean>;
  /** ISO timestamp from the client. */
  client_ts: string;
}

/** One batched sync round trip (`sync_player` RPC). */
export interface SyncRequest {
  /** Save JSON to write, or null to only check for a newer cloud save. */
  data: unknown;
  revision: number;
  /** Cloud revision this client last saw (null = none yet). */
  expected: number | null;
  levels: LevelRow[];
  stats: StatsRow | null;
  events: EventRow[];
}

export interface SyncResponse {
  /** false = revision conflict (the save was not written). */
  ok: boolean;
  /** Current cloud revision (null = no cloud save). */
  revision: number | null;
  /** Cloud save JSON, sent back on a conflict or when it changed since `expected`. */
  data: unknown;
}

export interface CloudBackend {
  readonly kind: CloudKind;
  currentUser(): Promise<CloudUser | null>;
  /** Guest account without email (anonymous sign-in). */
  signInAnonymously(): Promise<CloudUser>;
  /** Email a sign-in link (new or returning account, e.g. on a second device). */
  sendMagicLink(email: string, redirectTo: string): Promise<void>;
  /** Attach an email to the signed-in guest: same user id, same save (confirm via link). */
  linkEmail(email: string, redirectTo: string): Promise<void>;
  signOut(): Promise<void>;
  onAuthChange(cb: (user: CloudUser | null) => void): () => void;
  sync(req: SyncRequest): Promise<SyncResponse>;
}
