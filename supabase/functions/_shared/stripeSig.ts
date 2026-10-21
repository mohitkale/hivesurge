/**
 * Stripe webhook signatures (https://docs.stripe.com/webhooks#verify-manually):
 * header `Stripe-Signature: t=<unix s>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>`.
 * WebCrypto only, so the same code runs in Deno (Edge Function), the browser (mock) and Node.
 */
const enc = new TextEncoder();

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Build a Stripe-Signature header (used by the mock webhook sender and tests). */
export async function signStripePayload(
  secret: string,
  payload: string,
  t: number,
): Promise<string> {
  return `t=${t},v1=${await hmacHex(secret, `${t}.${payload}`)}`;
}

/** Verify a Stripe-Signature header; rejects stale timestamps (default 5 min tolerance). */
export async function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowSec: number,
  toleranceSec = 300,
): Promise<boolean> {
  if (!header || !secret) return false;
  let t = NaN;
  const v1: string[] = [];
  for (const part of header.split(',')) {
    const [k, v] = part.split('=', 2);
    if (k === 't') t = Number(v);
    else if (k === 'v1' && v) v1.push(v);
  }
  if (!Number.isFinite(t) || !v1.length || Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = await hmacHex(secret, `${t}.${payload}`);
  return v1.some((s) => safeEqual(s, expected));
}
