import { z } from 'zod';
import { validateRemoteConfig, type RemoteConfig } from '../platform/remoteConfig';

/** M6-2a zod schemas for every remote config key; the server re-checks on publish. */
const nonNeg = z.number().finite().min(0);
const cap = z.object({ session: z.number().int().min(0), day: z.number().int().min(0) }).strict();
const odds = z.object({ C: nonNeg, R: nonNeg, E: nonNeg, L: nonNeg }).strict();

export const AdsSchema = z
  .object({
    interstitialPerSession: z.number().int().min(0).max(4),
    interstitialPerDay: z.number().int().min(0).max(15),
    rewardedPerSession: z.number().int().min(0).max(12),
    rewardedPerDay: z.number().int().min(0).max(30),
    placements: z.record(z.string().min(1).max(32), cap),
  })
  .strict();

export const ChestsSchema = z
  .object({
    wood: z.object({ odds }).strict(),
    silver: z.object({ odds }).strict(),
    gold: z.object({ odds }).strict(),
    royal: z.object({ odds }).strict(),
  })
  .strict();

const point = z.tuple([z.number().finite(), z.number().finite()]);
export const DifficultySchema = z
  .object({
    expectedP: z.array(point).min(1).max(50),
    lossAssist: z.array(point).max(20),
    scaleFloor: z.number().min(0.85).max(1),
  })
  .strict();

export const EventsSchema = z
  .array(
    z
      .object({
        id: z.string().min(1).max(64),
        name: z.string().max(80).optional(),
        start: z.number().int(),
        end: z.number().int(),
        rules: z.record(z.string(), z.unknown()).optional(),
      })
      .strict()
      .refine((e) => e.end > e.start, 'end must be after start'),
  )
  .max(50);

export const RemoteConfigSchema = z
  .object({
    ads: AdsSchema,
    chests: ChestsSchema,
    difficulty: DifficultySchema,
    events: EventsSchema.optional(),
  })
  .strict();

/** zod shape check + the game's publish check (odds sum to 100, G5 caps, easier-only). */
export function checkRemoteConfig(
  json: unknown,
): { ok: true; config: RemoteConfig } | { ok: false; errors: string[] } {
  const r = RemoteConfigSchema.safeParse(json);
  // Run the publish check too (when the shape allows) so every problem is listed at once.
  let publish: string[] = [];
  try {
    publish = validateRemoteConfig(json as RemoteConfig);
  } catch {
    /* shape too broken; zod explains */
  }
  if (!r.success) {
    const errors = r.error.issues.map((i) => `${i.path.join('.') || 'config'}: ${i.message}`);
    return {
      ok: false,
      errors: [
        ...errors,
        ...publish.filter((p) => !errors.some((e) => e.startsWith(p.split(' ')[0]))),
      ],
    };
  }
  return publish.length
    ? { ok: false, errors: publish }
    : { ok: true, config: r.data as RemoteConfig };
}
