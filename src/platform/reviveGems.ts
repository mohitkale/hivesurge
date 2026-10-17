/**
 * Gem revive (M2-21c): config, caps and the atomic debit. Rules: docs/design/revive-m2.md
 * ("Gem revive"), monetization/revive-m2-21a.md (C1–C8), guardrail G19.
 */
import { dayKey } from './adPacer';

/** C8: remote config `revive.gemPrice` / `revive.gemCaps`. Defaults mirror monetization/revive-gem.json. */
export interface ReviveGemConfig {
  gemPrice: number;
  gemCaps: { session: number; day: number };
}

export const REVIVE_GEM_DEFAULTS: ReviveGemConfig = {
  gemPrice: 5, // CEO decision 36 (was 10)
  gemCaps: { session: 2, day: 3 },
};

/**
 * Apply a remote-config override, never past G19: price stays a positive integer (flat, no
 * escalation), caps are clamped to the guardrail maxima (2/session, 3/day, session <= day).
 */
export function reviveGemConfig(
  remote?: Partial<{ gemPrice: unknown; gemCaps: unknown }>,
): ReviveGemConfig {
  const d = REVIVE_GEM_DEFAULTS;
  const int = (v: unknown, def: number, max: number) =>
    typeof v === 'number' && Number.isInteger(v) && v > 0 ? Math.min(v, max) : def;
  const caps = (remote?.gemCaps ?? {}) as { session?: unknown; day?: unknown };
  const day = int(caps.day, d.gemCaps.day, d.gemCaps.day);
  const session = Math.min(int(caps.session, d.gemCaps.session, d.gemCaps.session), day);
  return { gemPrice: int(remote?.gemPrice, d.gemPrice, 1000), gemCaps: { session, day } };
}

export { emptyGemReviveDay, type GemReviveDay } from './save';
import type { GemReviveDay } from './save';

/** C2: 2 gem revives per session (memory), 3 per day (persisted in the save). */
export class GemReviveCaps {
  private session = 0;

  constructor(
    private readonly day: GemReviveDay,
    private readonly caps: ReviveGemConfig['gemCaps'] = REVIVE_GEM_DEFAULTS.gemCaps,
    private readonly now: () => number = Date.now,
  ) {}

  private roll(): void {
    const k = dayKey(this.now());
    if (this.day.day !== k) {
      this.day.day = k;
      this.day.count = 0;
    }
  }

  get ok(): boolean {
    this.roll();
    return this.session < this.caps.session && this.day.count < this.caps.day;
  }

  /** The per-session cap is the one reached (OBS-04 note wording). */
  get sessionReached(): boolean {
    return this.session >= this.caps.session;
  }

  record(): void {
    this.roll();
    this.session++;
    this.day.count++;
  }
}

/** Anything holding the gem balance (the save). */
export interface GemWallet {
  gems: number;
}

/** Atomic debit: all or nothing. Returns false (and changes nothing) when the balance is short. */
export function debitGems(w: GemWallet, amount: number): boolean {
  if (!(amount > 0) || w.gems < amount) return false;
  w.gems -= amount;
  return true;
}

/**
 * C6: no gem revive on the final level of a live event. The flag is owned by M7-3 (levels
 * will carry it); until events exist this stub is always false.
 */
export function isEventFinalLevel(levelId: string): boolean {
  void levelId; // M7-3: look up the level's event flag
  return false;
}
