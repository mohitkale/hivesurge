/**
 * Local-first analytics. Events go to a capped ring buffer in storage so they
 * survive reloads; a later sink (PostHog / Supabase table) can drain them.
 */
export type AnalyticsEventName =
  | 'level_start'
  | 'level_fail'
  | 'level_win'
  | 'ad_offered'
  | 'ad_watched'
  | 'ad_requested'
  | 'ad_failed'
  | 'revive_granted'
  | 'revive_declined'
  | 'revive_gem_confirm'
  | 'gems_spent'
  | 'boost_granted'
  | 'purchase'
  | 'purchase_started'
  | 'purchase_cancelled'
  | 'purchase_failed'
  | 'offer_shown'
  | 'offer_declined'
  | 'ftue_step';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  ts: number;
  session: string;
  props: Record<string, string | number | boolean>;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const ANALYTICS_KEY = 'hivesurge.analytics.v1';
export const ANALYTICS_MAX = 500;

export class Analytics {
  readonly session: string;
  constructor(
    private readonly store: KeyValueStore,
    private readonly now: () => number = Date.now,
    session?: string,
  ) {
    this.session =
      session ?? Math.floor(this.now()).toString(36) + Math.random().toString(36).slice(2, 6);
  }

  track(name: AnalyticsEventName, props: AnalyticsEvent['props'] = {}): AnalyticsEvent {
    const ev: AnalyticsEvent = { name, ts: this.now(), session: this.session, props };
    const all = this.events();
    all.push(ev);
    if (all.length > ANALYTICS_MAX) all.splice(0, all.length - ANALYTICS_MAX);
    try {
      this.store.setItem(ANALYTICS_KEY, JSON.stringify(all));
    } catch {
      /* storage full or blocked: analytics must never break play */
    }
    return ev;
  }

  events(): AnalyticsEvent[] {
    try {
      const v = JSON.parse(this.store.getItem(ANALYTICS_KEY) ?? '[]');
      return Array.isArray(v) ? (v as AnalyticsEvent[]) : [];
    } catch {
      return [];
    }
  }

  /** Simple funnel counts for a debug panel / tuning. */
  summary(): Record<AnalyticsEventName, number> {
    const out: Record<AnalyticsEventName, number> = {
      level_start: 0,
      level_fail: 0,
      level_win: 0,
      ad_offered: 0,
      ad_watched: 0,
      ad_requested: 0,
      ad_failed: 0,
      revive_granted: 0,
      revive_declined: 0,
      revive_gem_confirm: 0,
      gems_spent: 0,
      boost_granted: 0,
      purchase: 0,
      purchase_started: 0,
      purchase_cancelled: 0,
      purchase_failed: 0,
      offer_shown: 0,
      offer_declined: 0,
      ftue_step: 0,
    };
    for (const e of this.events()) if (e.name in out) out[e.name]++;
    return out;
  }
}

export class MemoryStore implements KeyValueStore {
  private readonly m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}
