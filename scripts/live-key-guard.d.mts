export const LIVE_KEY_PATTERNS: RegExp[];
export function findLiveKeys(roots: string[]): string[];
export function findNonTestStripeEnv(env: Record<string, string | undefined>): string[];
