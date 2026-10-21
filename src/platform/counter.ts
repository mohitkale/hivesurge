/**
 * M5-4a: mergeable counter for spendable amounts that change often (coins, pollen, skip
 * tickets, XP). A PN-counter per device plus immutable keyed grants:
 *
 * - `earn[device]` / `spend[device]` only ever grow and are written by one device each, so a
 *   merge takes the per-key max and never loses or double counts a device's own changes.
 * - `grants[key]` are one-off signed amounts with a unique key (a purchase, a refund, the v1
 *   opening balance). The same key always has the same value, so a merge is a union and a
 *   replayed grant counts once. The server can add grants (server-authoritative purchases).
 *
 * The game keeps a cached balance next to the book and just changes that number;
 * `reconcileBook` (on commit and before a merge) turns the difference into earn/spend for
 * this device. Sum < 0 (two offline devices spending the same coins) is a debt shown as 0.
 */
export interface CounterBook {
  earn: Record<string, number>;
  spend: Record<string, number>;
  grants: Record<string, number>;
}

export const emptyBook = (): CounterBook => ({ earn: {}, spend: {}, grants: {} });

const total = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

export function bookSum(b: CounterBook): number {
  return total(b.earn) + total(b.grants) - total(b.spend);
}

export function bookBalance(b: CounterBook): number {
  return Math.max(0, bookSum(b));
}

/** Record the difference between the cached balance and the book for `device`. */
export function reconcileBook(b: CounterBook, cached: number, device: string): number {
  const target = Math.max(0, Math.floor(Number.isFinite(cached) ? cached : 0));
  const sum = bookSum(b);
  if (Math.max(0, sum) !== target) {
    const d = target - sum;
    if (d > 0) b.earn[device] = (b.earn[device] ?? 0) + d;
    else b.spend[device] = (b.spend[device] ?? 0) - d;
  }
  return bookBalance(b);
}

function maxMerge(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
}

export function mergeBooks(a: CounterBook, b: CounterBook): CounterBook {
  const grants = { ...a.grants };
  // Same key = same grant. If two sides ever disagree, keep the smaller credit (never mint).
  for (const [k, v] of Object.entries(b.grants))
    grants[k] = k in grants ? Math.min(grants[k], v) : v;
  return { earn: maxMerge(a.earn, b.earn), spend: maxMerge(a.spend, b.spend), grants };
}

function parseRec(v: unknown, signed: boolean): Record<string, number> {
  const out: Record<string, number> = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const [k, n] of Object.entries(v)) {
    if (k.length === 0 || k.length > 80 || typeof n !== 'number' || !Number.isFinite(n)) continue;
    const x = Math.trunc(n);
    if (!signed && x < 0) continue;
    if (Math.abs(x) > 1e12) continue;
    out[k] = x;
  }
  return out;
}

export function parseBook(v: unknown): CounterBook {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<CounterBook>;
  return {
    earn: parseRec(o.earn, false),
    spend: parseRec(o.spend, false),
    grants: parseRec(o.grants, true),
  };
}

/** Add a keyed one-off grant (idempotent: the same key is applied once). */
export function addGrant(b: CounterBook, key: string, amount: number): boolean {
  if (key in b.grants || !Number.isFinite(amount) || Math.trunc(amount) === 0) return false;
  b.grants[key] = Math.trunc(amount);
  return true;
}
