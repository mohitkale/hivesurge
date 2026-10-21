import type { Currency, Grants } from './skus.ts';

/** One row of `purchases_sandbox` (also the mock server's record). */
export interface PurchaseRecord {
  session_id: string;
  user_id: string;
  sku: string;
  provider: 'stripe_test' | 'mock';
  status: 'paid' | 'refunded';
  amount: number;
  currency: Currency;
  grants: Grants;
  payment_intent: string | null;
  created_at: string;
  refunded_at: string | null;
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);

function book(
  data: Json,
  key: string,
): { earn: Json; spend: Json; grants: Record<string, number> } {
  const b = isObj(data[key]) ? (data[key] as Json) : {};
  if (!isObj(b.earn)) b.earn = {};
  if (!isObj(b.spend)) b.spend = {};
  if (!isObj(b.grants)) b.grants = {};
  data[key] = b;
  return b as never;
}

function bookBalance(b: { earn: Json; spend: Json; grants: Json }): number {
  let s = 0;
  for (const v of Object.values(b.earn)) s += typeof v === 'number' ? v : 0;
  for (const v of Object.values(b.spend)) s -= typeof v === 'number' ? v : 0;
  for (const v of Object.values(b.grants)) s += typeof v === 'number' ? v : 0;
  return Math.max(0, s);
}

function keyedBook(data: Json, bookKey: string, cachedKey: string, key: string, amount: number) {
  if (!amount) return false;
  const b = book(data, bookKey);
  if (key in b.grants) return false;
  b.grants[key] = Math.trunc(amount);
  data[cachedKey] = bookBalance(b);
  return true;
}

function ledgerEntry(data: Json, id: string, delta: number, reason: string, at: number) {
  if (!delta) return false;
  const l = Array.isArray(data.gemLedger) ? (data.gemLedger as Json[]) : [];
  data.gemLedger = l;
  if (l.some((e) => isObj(e) && e.id === id)) return false;
  l.push({ id, delta: Math.trunc(delta), reason, at });
  let s = 0;
  for (const e of l) s += isObj(e) && typeof e.delta === 'number' ? e.delta : 0;
  data.gems = Math.max(0, s);
  return true;
}

/**
 * Apply a server-confirmed purchase (and its refund, if any) to a v2 save document, in place.
 * Idempotent: grants are keyed by session id (`purchase:<id>`, `refund:<id>`), so applying the
 * same record on the server, on any client and after any merge credits it exactly once.
 * Returns true when something changed. Non-v2 documents are left alone (the client applies the
 * record after it migrates).
 */
export function applyPurchaseToSave(data: unknown, p: PurchaseRecord, nowMs: number): boolean {
  if (!isObj(data) || data.version !== 2) return false;
  const g = p.grants ?? {};
  const k = `purchase:${p.session_id}`;
  let changed = false;
  changed = keyedBook(data, 'coinBook', 'coins', k, g.coins ?? 0) || changed;
  changed = keyedBook(data, 'ticketBook', 'skipTickets', k, g.skipTickets ?? 0) || changed;
  changed = ledgerEntry(data, k, g.gems ?? 0, `purchase:${p.sku}`, nowMs) || changed;
  // G6: any purchase removes forced ads. Kept after a refund (player-friendly, no take-backs).
  if (data.noAds !== true) {
    data.noAds = true;
    changed = true;
  }
  if (g.skin) {
    const skins = Array.isArray(data.skins) ? (data.skins as unknown[]) : [];
    data.skins = skins;
    if (!skins.includes(g.skin)) {
      skins.push(g.skin);
      data.equippedSkin = g.skin;
      changed = true;
    }
  }
  if (g.seasonPremium && isObj(data.meta) && data.meta.seasonPremium !== true) {
    data.meta.seasonPremium = true;
    changed = true;
  }
  if (p.status === 'refunded') {
    const r = `refund:${p.session_id}`;
    changed = keyedBook(data, 'coinBook', 'coins', r, -(g.coins ?? 0)) || changed;
    changed = keyedBook(data, 'ticketBook', 'skipTickets', r, -(g.skipTickets ?? 0)) || changed;
    changed = ledgerEntry(data, r, -(g.gems ?? 0), `refund:${p.sku}`, nowMs) || changed;
  }
  return changed;
}
