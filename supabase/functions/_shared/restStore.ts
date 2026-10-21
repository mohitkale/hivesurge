import type { PurchaseRecord } from './grant.ts';
import type { PurchaseStore } from './webhook.ts';

/**
 * PurchaseStore over PostgREST with the service-role key (Edge Function only; the key is a
 * Supabase-provided function secret and never leaves the server). Bypasses RLS by design.
 */
export function restPurchaseStore(
  supabaseUrl: string,
  serviceKey: string,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): PurchaseStore {
  const base = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
  const h = (extra: Record<string, string> = {}) => ({
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...extra,
  });
  const json = async <T>(r: Response): Promise<T> => {
    if (!r.ok) throw new Error(`db ${r.status}`);
    return (await r.json()) as T;
  };
  const cols =
    'session_id,user_id,sku,provider,status,amount,currency,grants,payment_intent,created_at,refunded_at';
  return {
    async insertPurchase(p) {
      const r = await fetchImpl(`${base}/purchases_sandbox?on_conflict=session_id&select=${cols}`, {
        method: 'POST',
        headers: h({ Prefer: 'resolution=ignore-duplicates,return=representation' }),
        body: JSON.stringify({ ...p, sandbox: true }),
      });
      const rows = await json<PurchaseRecord[]>(r);
      return rows.length ? 'inserted' : 'exists';
    },
    async getPurchase(sessionId) {
      const q = `session_id=eq.${encodeURIComponent(sessionId)}&select=${cols}`;
      const rows = await json<PurchaseRecord[]>(
        await fetchImpl(`${base}/purchases_sandbox?${q}`, { headers: h() }),
      );
      return rows[0] ?? null;
    },
    async markRefunded(pi, atIso) {
      const q = `payment_intent=eq.${encodeURIComponent(pi)}`;
      const upd = await json<PurchaseRecord[]>(
        await fetchImpl(`${base}/purchases_sandbox?${q}&status=eq.paid&select=${cols}`, {
          method: 'PATCH',
          headers: h({ Prefer: 'return=representation' }),
          body: JSON.stringify({ status: 'refunded', refunded_at: atIso }),
        }),
      );
      if (upd[0]) return upd[0];
      const rows = await json<PurchaseRecord[]>(
        await fetchImpl(`${base}/purchases_sandbox?${q}&select=${cols}`, { headers: h() }),
      );
      return rows[0]?.status === 'refunded' ? rows[0] : null;
    },
    async updateSave(userId, fn) {
      const u = encodeURIComponent(userId);
      for (let i = 0; i < 5; i++) {
        const rows = await json<{ revision: number; data: unknown }[]>(
          await fetchImpl(`${base}/saves?user_id=eq.${u}&select=revision,data`, { headers: h() }),
        );
        if (!rows[0]) return;
        const { revision, data } = rows[0];
        if (!fn(data)) return;
        const next = revision + 1;
        (data as Record<string, unknown>).revision = next;
        (data as Record<string, unknown>).updatedAt = now();
        const done = await json<unknown[]>(
          await fetchImpl(`${base}/saves?user_id=eq.${u}&revision=eq.${revision}&select=revision`, {
            method: 'PATCH',
            headers: h({ Prefer: 'return=representation' }),
            body: JSON.stringify({
              data,
              revision: next,
              updated_at: new Date(now()).toISOString(),
            }),
          }),
        );
        if (done.length) return;
      }
      throw new Error('save busy');
    },
  };
}
