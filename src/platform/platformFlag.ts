/**
 * M7-4 build flag `VITE_PLATFORM`: `poki` / `crazygames` load the portal adapter in SDK sandbox
 * mode (src/platform/adapters/portal.ts, lazy); `own` and the default `sandbox` keep the
 * labelled sandbox mock (own-site ad network waits for Mohit's account approval, PLAN M5-6h).
 */
export type PortalFlag = 'poki' | 'crazygames';
export type PlatformFlag = 'sandbox' | 'own' | PortalFlag;

/** Anything unknown or unset is the sandbox mock (zero env vars = guest sandbox play). */
export function platformFlag(v: string | undefined): PlatformFlag {
  return v === 'poki' || v === 'crazygames' || v === 'own' ? v : 'sandbox';
}

export const isPortal = (f: PlatformFlag): f is PortalFlag => f === 'poki' || f === 'crazygames';
