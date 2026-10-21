/**
 * M5-4a: per-device id for the save's PN-counters. Lives in localStorage, NOT in the save
 * (the save is shared by every device of an account).
 */
const KEY = 'hivesurge.device.v1';
let cached: string | null = null;

function randomId(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  const bytes = new Uint8Array(8);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function deviceId(): string {
  if (cached) return cached;
  let id: string;
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    id = ls?.getItem(KEY) ?? '';
    if (!/^d:[0-9a-f]{16}$/.test(id)) {
      id = `d:${randomId()}`;
      ls?.setItem(KEY, id);
    }
  } catch {
    id = `d:${randomId()}`;
  }
  cached = id;
  return id;
}

/** Tests: pretend to be a given device. */
export function setDeviceIdForTests(id: string | null): void {
  cached = id;
}
