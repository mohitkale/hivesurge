import type { AnalyticsEvent } from '../../analytics/analytics';
import type { SaveStore } from '../save';
import { cloudEnv, MOCK_SESSION_KEY } from './config';
import { CloudSync, type SyncStatus } from './cloudSync';
import { MockCloudBackend, MockCloudServer, normEmail } from './mockCloud';
import type { CloudBackend, CloudKind, CloudUser } from './types';

export interface CloudState {
  kind: CloudKind;
  user: CloudUser | null;
  status: SyncStatus;
  lastSyncAt: number;
  /** Last user-facing message (link sent, error, ...). */
  message: string;
}

export interface ControllerOptions {
  events?: () => AnalyticsEvent[];
  onApplied?: () => void;
  onChange?: () => void;
  storage?: Storage;
  redirectTo?: string;
}

/**
 * Account + cloud save controller (lazy chunk). Guest play never needs it; it starts only
 * when the player opens Account, or on boot for a returning signed-in player.
 */
export class CloudController {
  user: CloudUser | null = null;
  message = '';
  readonly sync: CloudSync;

  private constructor(
    readonly backend: CloudBackend,
    store: SaveStore,
    private readonly opts: ControllerOptions,
  ) {
    const kv = opts.storage ?? localStorage;
    this.sync = new CloudSync(store, backend, kv, {
      events: opts.events,
      onApplied: opts.onApplied,
      onStatus: () => opts.onChange?.(),
    });
  }

  static async create(store: SaveStore, opts: ControllerOptions = {}): Promise<CloudController> {
    const env = cloudEnv();
    const kv = opts.storage ?? localStorage;
    let backend: CloudBackend;
    if (env) {
      const { createSupabaseBackend } = await import('./supabaseCloud');
      backend = await createSupabaseBackend(env.url, env.anonKey);
    } else {
      backend = new MockCloudBackend(new MockCloudServer(kv), kv, MOCK_SESSION_KEY);
    }
    const c = new CloudController(backend, store, opts);
    c.user = await backend.currentUser().catch(() => null);
    backend.onAuthChange((u) => c.onUser(u));
    if (c.user) c.startSync();
    return c;
  }

  private onUser(u: CloudUser | null): void {
    const changed = u?.id !== this.user?.id;
    this.user = u;
    if (!u) this.sync.stop();
    else if (changed) this.startSync();
    this.opts.onChange?.();
  }

  private startSync(): void {
    this.sync.start();
    void this.sync.syncNow().then(() => this.opts.onChange?.());
  }

  state(): CloudState {
    return {
      kind: this.backend.kind,
      user: this.user,
      status: this.sync.status,
      lastSyncAt: this.sync.lastSyncAt,
      message: this.message,
    };
  }

  private redirect(): string {
    return this.opts.redirectTo ?? `${location.origin}${location.pathname}`;
  }

  private async act(fn: () => Promise<void>, ok: string): Promise<void> {
    try {
      await fn();
      this.message = ok;
    } catch (e) {
      this.message = friendlyError(e instanceof Error ? e.message : String(e));
    }
    this.opts.onChange?.();
  }

  /** Guest cloud save (anonymous account, no email). */
  playAsGuest(): Promise<void> {
    return this.act(async () => {
      this.user = await this.backend.signInAnonymously();
      this.startSync();
    }, 'Cloud save is on. Link an email to keep it on other devices.');
  }

  /** Sign in (or create an account) with an emailed link. */
  sendMagicLink(email: string): Promise<void> {
    return this.act(
      () => this.backend.sendMagicLink(normEmail(email), this.redirect()),
      this.backend.kind === 'mock'
        ? 'Mock cloud: signed in (no email is sent).'
        : 'Check your inbox for the sign-in link.',
    );
  }

  /** Upgrade the guest account: same user id, same cloud save. */
  linkEmail(email: string): Promise<void> {
    return this.act(
      () => this.backend.linkEmail(normEmail(email), this.redirect()),
      this.backend.kind === 'mock'
        ? 'Mock cloud: email linked (no email is sent).'
        : 'Check your inbox to confirm the email. Your progress stays on this account.',
    );
  }

  signOut(): Promise<void> {
    return this.act(async () => {
      await this.backend.signOut();
      this.user = null;
      this.sync.stop();
    }, 'Signed out. Your progress stays on this device.');
  }

  syncNow(): Promise<void> {
    return this.act(async () => {
      const r = await this.sync.syncNow();
      if (r.error) throw new Error(r.error);
    }, 'Synced.');
  }
}

/** Plain-language errors for the Account panel. */
export function friendlyError(msg: string): string {
  if (/anonymous sign-ins are disabled/i.test(msg))
    return 'Guest cloud save is not enabled on this backend yet. Use "Email me a link" instead.';
  if (/invalid email/i.test(msg)) return 'Please enter a valid email address.';
  if (/rate limit|too many/i.test(msg))
    return 'Too many tries. Please wait a minute and try again.';
  if (/fetch|network|offline/i.test(msg))
    return 'You seem to be offline. Your progress is saved on this device.';
  return `Could not do that: ${msg}`;
}
