import { CHESTS, type ChestType, type Rarity } from '../meta/defs';
import { EXPECTED_P, LOSS_ASSIST, SCALE_FLOOR } from '../meta/economy';
import { AD_CAPS, type AdCaps } from './adPacer';

/**
 * M5-4b / M5-6g remote config: ad caps, chest odds and difficulty knobs. The shipped values
 * live in `config/remote-config.json`; `validateRemoteConfig` is the publish check (the CI
 * test on that file fails unless every chest's odds sum to 100 and caps stay within the
 * guardrails). At runtime an invalid config is ignored and the defaults are used.
 */
export interface RemoteConfig {
  ads: AdCaps;
  chests: Record<ChestType, { odds: Record<Rarity, number> }>;
  difficulty: { expectedP: [number, number][]; lossAssist: [number, number][]; scaleFloor: number };
  /** M6-5 live-ops calendar (docs/design/liveops-m7.md); consumed by M7-3. Times in ms. */
  events?: LiveEvent[];
}

export interface LiveEvent {
  id: string;
  name?: string;
  start: number;
  end: number;
  rules?: Record<string, unknown>;
}

/** Guardrail ceilings (guardrails.md G5): remote config may lower caps, never raise them. */
export const CAP_LIMITS = {
  interstitialPerSession: 4,
  interstitialPerDay: 15,
  rewardedPerSession: 12,
  rewardedPerDay: 30,
};

export function defaultRemoteConfig(): RemoteConfig {
  const chests = {} as RemoteConfig['chests'];
  for (const [k, v] of Object.entries(CHESTS)) chests[k as ChestType] = { odds: { ...v.odds } };
  return {
    ads: structuredClone(AD_CAPS),
    chests,
    difficulty: {
      expectedP: EXPECTED_P.map((p) => [...p] as [number, number]),
      lossAssist: LOSS_ASSIST.map((p) => [...p] as [number, number]),
      scaleFloor: SCALE_FLOOR,
    },
  };
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Returns a list of problems; empty = publishable. */
export function validateRemoteConfig(c: RemoteConfig): string[] {
  const e: string[] = [];
  for (const [k, lim] of Object.entries(CAP_LIMITS)) {
    const v = (c.ads as unknown as Record<string, unknown>)[k];
    if (!isNum(v) || v < 0 || v > lim) e.push(`ads.${k} must be 0..${lim}`);
  }
  for (const [p, cap] of Object.entries(c.ads.placements ?? {}))
    if (!isNum(cap.session) || !isNum(cap.day) || cap.session < 0 || cap.day < cap.session)
      e.push(`ads.placements.${p} needs 0 <= session <= day`);
  for (const t of Object.keys(CHESTS) as ChestType[]) {
    const o = c.chests?.[t]?.odds;
    if (!o) {
      e.push(`chests.${t}.odds missing`);
      continue;
    }
    const vals = (['C', 'R', 'E', 'L'] as Rarity[]).map((r) => o[r]);
    if (vals.some((v) => !isNum(v) || v < 0)) e.push(`chests.${t}.odds must be >= 0`);
    else if (Math.abs(vals.reduce((a, b) => a + b, 0) - 100) > 1e-9)
      e.push(`chests.${t}.odds must sum to 100`);
  }
  const d = c.difficulty;
  if (!d || !(d.scaleFloor >= 0.85 && d.scaleFloor <= 1))
    e.push('difficulty.scaleFloor must be 0.85..1');
  if (!d?.lossAssist?.every(([n, f]) => isNum(n) && n >= 2 && f >= 0.85 && f <= 1))
    e.push('difficulty.lossAssist factors must be 0.85..1 (easier-only)');
  if (
    !d?.expectedP?.length ||
    !d.expectedP.every(([n, p], i, a) => isNum(n) && isNum(p) && (i === 0 || n > a[i - 1][0]))
  )
    e.push('difficulty.expectedP must be increasing [n, P] points');
  if (c.events !== undefined) {
    if (!Array.isArray(c.events) || c.events.length > 50)
      e.push('events must be a list of up to 50');
    else if (
      c.events.some(
        (v) =>
          !v || typeof v.id !== 'string' || !isNum(v.start) || !isNum(v.end) || v.end <= v.start,
      )
    )
      e.push('events need an id and end > start');
  }
  return e;
}

/** Overlay a fetched JSON on the defaults; anything invalid falls back to the defaults. */
export function loadRemoteConfig(json: unknown): RemoteConfig {
  if (!json || typeof json !== 'object') return defaultRemoteConfig();
  const c = loadRemoteConfigRaw(json);
  return validateRemoteConfig(c).length ? defaultRemoteConfig() : c;
}

/** Apply a validated config to the live tables (odds shown in the UI and used by rolls stay in sync). */
export function applyRemoteConfig(c: RemoteConfig): void {
  for (const t of Object.keys(CHESTS) as ChestType[]) CHESTS[t].odds = { ...c.chests[t].odds };
  EXPECTED_P.splice(0, EXPECTED_P.length, ...c.difficulty.expectedP);
  LOSS_ASSIST.splice(0, LOSS_ASSIST.length, ...c.difficulty.lossAssist);
}

const RC_KEY = 'hivesurge.remoteConfig';
/** Last fetched config (applied at boot so a launch never waits on the network). */
export function cachedRemoteConfig(): RemoteConfig {
  try {
    return loadRemoteConfig(JSON.parse(localStorage.getItem(RC_KEY) ?? 'null'));
  } catch {
    return defaultRemoteConfig();
  }
}
/**
 * Background refresh for the next launch; failures keep the cached/default config.
 * M6-5: with Supabase configured, the live admin-published version (`remote_config`, latest
 * row, anon-readable) wins; with none published (or no backend) the shipped file is used.
 */
export async function refreshRemoteConfig(
  env: { url: string; anonKey: string } | null = null,
  file = '/remote-config.json',
): Promise<'supabase' | 'file' | false> {
  if (typeof fetch !== 'function') return false;
  const store = (j: unknown) => {
    if (validateRemoteConfig(loadRemoteConfigRaw(j)).length) return false;
    localStorage.setItem(RC_KEY, JSON.stringify(j));
    return true;
  };
  try {
    if (env) {
      const r = await fetch(
        `${env.url}/rest/v1/remote_config?select=version,config&order=version.desc&limit=1`,
        {
          headers: { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}` },
          cache: 'no-cache',
        },
      );
      if (!r.ok) return false;
      const rows = (await r.json()) as { config?: unknown }[];
      if (Array.isArray(rows) && rows.length) return store(rows[0].config) ? 'supabase' : false;
    }
    const r = await fetch(file, { cache: 'no-cache' });
    if (!r.ok) return false;
    return store(await r.json()) ? 'file' : false;
  } catch {
    return false;
  }
}
function loadRemoteConfigRaw(j: unknown): RemoteConfig {
  const d = defaultRemoteConfig();
  const x = (j ?? {}) as Partial<RemoteConfig>;
  return {
    ads: {
      ...d.ads,
      ...(x.ads ?? {}),
      placements: { ...d.ads.placements, ...(x.ads?.placements ?? {}) },
    },
    chests: { ...d.chests, ...(x.chests ?? {}) },
    difficulty: { ...d.difficulty, ...(x.difficulty ?? {}) },
    ...(x.events !== undefined ? { events: x.events } : {}),
  };
}
