/**
 * M4-5a: gems are an append-only ledger of grants (+) and spends (-). The balance is derived
 * from the ledger, so merging two saves (local + cloud, or two devices) is a union of entries
 * by id: nothing earned or bought on one side is lost, a spend is never refunded, and a
 * replayed or duplicated entry counts once (idempotent).
 *
 * Kept free of DOM/Three imports so the entry chunk stays small and Node tests can run it.
 */
export interface GemEntry {
  /** Globally unique (random) id; the merge key. */
  id: string;
  /** Signed, non-zero integer: + grant, - spend. */
  delta: number;
  /** Short tag, e.g. `stars:l1`, `purchase:gems_small`, `revive`, `legacy`, `reconcile`. */
  reason: string;
  /** Wall-clock ms when recorded (ordering only; not used for the balance). */
  at: number;
}

/** Anything holding a gem balance. A save also holds the ledger; plain wallets (tests) do not. */
export interface GemWallet {
  gems: number;
  gemLedger?: GemEntry[];
}

/** Random id that works outside secure contexts too (LAN dev server has no randomUUID). */
export function newGemEntryId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Raw sum of the ledger. Can be negative after concurrent offline spends (carried as debt). */
export function ledgerSum(entries: readonly GemEntry[]): number {
  let s = 0;
  for (const e of entries) s += e.delta;
  return s;
}

/** The spendable balance shown to the player: never below zero. */
export function ledgerBalance(entries: readonly GemEntry[]): number {
  return Math.max(0, ledgerSum(entries));
}

/**
 * Record a grant (delta > 0) or spend (delta < 0) and update the cached balance.
 * Wallets without a ledger (unit tests, plain objects) just change `gems`.
 */
export function recordGems(
  w: GemWallet,
  delta: number,
  reason: string,
  now: number = Date.now(),
  id: string = newGemEntryId(),
): void {
  const d = Math.trunc(delta);
  if (!Number.isFinite(d) || d === 0) return;
  if (!w.gemLedger) {
    w.gems = Math.max(0, w.gems + d);
    return;
  }
  w.gemLedger.push({ id, delta: d, reason, at: now });
  w.gems = ledgerBalance(w.gemLedger);
}

/** Atomic debit: all or nothing. Returns false (and changes nothing) when the balance is short. */
export function spendGems(w: GemWallet, amount: number, reason: string): boolean {
  if (!(amount > 0) || w.gems < amount) return false;
  recordGems(w, -amount, reason);
  return true;
}

const order = (a: GemEntry, b: GemEntry) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Deterministic pick when two entries share an id (should be identical; never trust it). */
function pick(a: GemEntry, b: GemEntry): GemEntry {
  if (a.delta !== b.delta) return a.delta < b.delta ? a : b; // conservative: the smaller credit
  if (a.at !== b.at) return a.at < b.at ? a : b;
  return a.reason <= b.reason ? a : b;
}

/** Union by id, sorted by time then id. Commutative, associative and idempotent. */
export function mergeLedgers(a: readonly GemEntry[], b: readonly GemEntry[]): GemEntry[] {
  const byId = new Map<string, GemEntry>();
  for (const e of [...a, ...b]) {
    const prev = byId.get(e.id);
    byId.set(e.id, prev ? pick(prev, e) : { ...e });
  }
  // No truncation: dropping old entries would change the balance. Gem events are rare (new-best
  // stars, purchases, capped revives), so the ledger stays small.
  return [...byId.values()].sort(order);
}

/** Validate a stored ledger; drops malformed entries and duplicate ids. */
export function parseLedger(v: unknown): GemEntry[] {
  if (!Array.isArray(v)) return [];
  const out: GemEntry[] = [];
  for (const x of v) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Partial<GemEntry>;
    if (typeof o.id !== 'string' || o.id.length === 0 || o.id.length > 64) continue;
    if (typeof o.delta !== 'number' || !Number.isInteger(o.delta) || o.delta === 0) continue;
    if (Math.abs(o.delta) > 1_000_000) continue;
    out.push({
      id: o.id,
      delta: o.delta,
      reason: typeof o.reason === 'string' ? o.reason.slice(0, 40) : '',
      at: typeof o.at === 'number' && Number.isFinite(o.at) ? o.at : 0,
    });
  }
  return mergeLedgers(out, []);
}

/**
 * Pre-ledger saves only stored a balance. Turn it into one opening entry whose id is derived
 * from the save itself, so re-parsing the same legacy save never creates a second entry.
 */
export function legacyOpeningEntry(gems: number, revision: number, updatedAt: number): GemEntry {
  return { id: `legacy:${revision}:${updatedAt}:${gems}`, delta: gems, reason: 'legacy', at: 0 };
}

/**
 * Safety net before a save is written: if code changed `gems` without a ledger entry, record
 * the difference so the ledger stays the source of truth (and the change is never lost).
 */
export function reconcileGems(w: GemWallet & { gemLedger: GemEntry[] }, now = Date.now()): void {
  const target = Math.max(0, Math.floor(Number.isFinite(w.gems) ? w.gems : 0));
  const sum = ledgerSum(w.gemLedger);
  if (Math.max(0, sum) !== target) recordGems(w, target - sum, 'reconcile', now);
  w.gems = ledgerBalance(w.gemLedger);
}
