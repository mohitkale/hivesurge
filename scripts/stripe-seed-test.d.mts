export function isTestKey(k: unknown): boolean;
export function seedStripe(opts: {
  key: string | undefined;
  skus: { id: string; usd: number; inr: number }[];
  fetchImpl?: typeof fetch;
  log?: (msg: string) => void;
}): Promise<{ created: string[]; skipped: string[] }>;
