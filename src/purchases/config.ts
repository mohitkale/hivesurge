/**
 * Entry-safe purchase config (no purchase code imported). Real Stripe TEST-mode Checkout is used
 * only when a `pk_test_` publishable key AND the Supabase env are set; anything else (including
 * zero env vars) uses the in-browser mock with the same Checkout/webhook shapes.
 */
import { cloudEnv } from '../platform/cloud/config';

export type PurchaseMode = 'stripe' | 'mock';

/** The publishable key if it is a TEST key; live or malformed keys are refused (G17). */
export function stripePublishableKey(
  env: Record<string, string | boolean | undefined> = import.meta.env,
): string | null {
  const k =
    typeof env.VITE_STRIPE_PUBLISHABLE_KEY === 'string'
      ? env.VITE_STRIPE_PUBLISHABLE_KEY.trim()
      : '';
  return /^pk_test_[A-Za-z0-9]+$/.test(k) ? k : null;
}

export function purchaseMode(
  env: Record<string, string | boolean | undefined> = import.meta.env,
): PurchaseMode {
  return stripePublishableKey(env) && cloudEnv(env) ? 'stripe' : 'mock';
}

/** `?checkout=success&session_id=cs_...` / `?checkout=cancel` after a hosted Checkout redirect. */
export function checkoutReturn(
  search: string,
): { kind: 'success' | 'cancel'; sessionId: string } | null {
  const q = new URLSearchParams(search);
  const k = q.get('checkout');
  if (k === 'cancel') return { kind: 'cancel', sessionId: '' };
  const id = q.get('session_id') ?? '';
  if (k === 'success' && /^cs_(test_)?[A-Za-z0-9_]+$/.test(id))
    return { kind: 'success', sessionId: id };
  return null;
}
