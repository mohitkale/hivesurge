import type { AdDayCounters } from './save';

/** G5 caps (monetization/ad-placements.md; ASSUMPTIONS, tune via remote config in M5-6g). */
export const AD_CAPS = {
  interstitialPerSession: 4,
  interstitialPerDay: 15,
  rewardedPerSession: 12,
  rewardedPerDay: 30,
  placements: {
    win_double: { session: 6, day: 20 },
    revive: { session: 3, day: 10 },
  } as Record<string, { session: number; day: number }>,
};
export type AdCaps = typeof AD_CAPS;

/** Local calendar day for daily caps. */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Session + daily ad caps (G5). Session counters live in memory (a new AdPacer per app launch);
 * daily counters are persisted in the save (`adDay`) and reset when the calendar day changes.
 * The clock is injected so tests can mock it.
 */
export class AdPacer {
  private sessionRewarded = 0;
  private sessionInterstitial = 0;
  private readonly sessionPlacement: Record<string, number> = {};

  constructor(
    private readonly day: AdDayCounters,
    private readonly now: () => number = Date.now,
    private readonly caps: AdCaps = AD_CAPS,
  ) {}

  private rollDay(): void {
    const k = dayKey(this.now());
    if (this.day.day !== k) {
      this.day.day = k;
      this.day.rewarded = 0;
      this.day.interstitial = 0;
      this.day.perPlacement = {};
    }
  }

  canRewarded(placement: string): boolean {
    this.rollDay();
    const pc = this.caps.placements[placement];
    if (this.sessionRewarded >= this.caps.rewardedPerSession) return false;
    if (this.day.rewarded >= this.caps.rewardedPerDay) return false;
    if (pc && (this.sessionPlacement[placement] ?? 0) >= pc.session) return false;
    if (pc && (this.day.perPlacement[placement] ?? 0) >= pc.day) return false;
    return true;
  }

  recordRewarded(placement: string): void {
    this.rollDay();
    this.sessionRewarded++;
    this.day.rewarded++;
    this.sessionPlacement[placement] = (this.sessionPlacement[placement] ?? 0) + 1;
    this.day.perPlacement[placement] = (this.day.perPlacement[placement] ?? 0) + 1;
  }

  canInterstitial(): boolean {
    this.rollDay();
    return (
      this.sessionInterstitial < this.caps.interstitialPerSession &&
      this.day.interstitial < this.caps.interstitialPerDay
    );
  }

  recordInterstitial(): void {
    this.rollDay();
    this.sessionInterstitial++;
    this.day.interstitial++;
  }
}
