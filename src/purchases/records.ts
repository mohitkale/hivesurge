import {
  applyPurchaseToSave,
  type PurchaseRecord,
} from '../../supabase/functions/_shared/grant.ts';
import { reconcileSave, type SaveData } from '../platform/save';

/**
 * Apply server-confirmed purchase records to the running save (M5-8). The client never grants
 * paid items from the catalog itself: it only replays records the server wrote, keyed by
 * session id, so restore, retries and merges credit each purchase exactly once.
 */
export function applyPurchaseRecords(
  save: SaveData,
  records: readonly PurchaseRecord[],
  device: string,
  now: number,
): PurchaseRecord[] {
  reconcileSave(save, device, now); // fold pending cached changes into the books first
  const applied: PurchaseRecord[] = [];
  for (const r of records) if (applyPurchaseToSave(save, r, now)) applied.push(r);
  return applied;
}
