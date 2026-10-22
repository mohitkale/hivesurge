/**
 * M7-11 / M7-12 rival hives (research RIV-A / RIV-B, research/m7-6-rivals-leagues.md).
 * Rivals are async defence snapshots, never live players. Pure functions (time and RNG passed in)
 * so the server, the client and the sims share one set of rules. Raids are a v2 feature (no UI
 * entry in the game yet); this module is the rule set the raid screen and server will call.
 */

/** MMR bucket width; matchmaking looks at the player's bucket and the ones next to it (±1). */
export const MMR_BUCKET = 100;
/** No repeat target within this window. */
export const REPEAT_WINDOW_MS = 24 * 3_600_000;
/**
 * M7-12 raid loss cap N: at most this share of a defender's stored nectar per raid.
 * PROVISIONAL 10% until MON sets N in the M5-2 sheet (PLAN M7-12).
 */
export const RAID_LOSS_CAP = 0.1;
/** Label every bot hive carries (no fake player numbers, research point 2). */
export const BOT_LABEL = '🤖 Practice hive';

export interface HiveSnapshot {
  id: string;
  name: string;
  mmr: number;
  /** Trusted time until which the hive is shielded (0 = none). */
  shieldUntil: number;
  bot: boolean;
}

export const mmrBucket = (mmr: number): number => Math.floor(Math.max(0, mmr) / MMR_BUCKET);

/** Display name: bots always carry the label, whatever the snapshot says. */
export function rivalName(h: HiveSnapshot): string {
  return h.bot ? `${BOT_LABEL} · ${h.name.replace(/^🤖 Practice hive · /, '')}` : h.name;
}

/** Why a candidate is not eligible (null = eligible). Exposed for the per-rule tests. */
export function ineligible(
  me: { id: string; mmr: number },
  h: HiveSnapshot,
  now: number,
  lastRaided: Record<string, number>,
): 'self' | 'bucket' | 'shielded' | 'repeat' | null {
  if (h.id === me.id) return 'self';
  if (Math.abs(mmrBucket(h.mmr) - mmrBucket(me.mmr)) > 1) return 'bucket';
  if (h.shieldUntil > now) return 'shielded';
  const t = lastRaided[h.id];
  if (t !== undefined && now - t < REPEAT_WINDOW_MS) return 'repeat';
  return null;
}

/** A labelled practice bot at the player's MMR (deterministic per seed). */
export function practiceBot(mmr: number, i: number, seed: number): HiveSnapshot {
  const names = ['Clover', 'Bramble', 'Thistle', 'Marigold', 'Heather', 'Sorrel'];
  const jitter = (((seed * 2654435761 + i * 40503) >>> 0) % 81) - 40;
  return {
    id: `bot:${seed}:${i}`,
    name: `${BOT_LABEL} · ${names[i % names.length]}`,
    mmr: Math.max(0, mmr + jitter),
    shieldUntil: 0,
    bot: true,
  };
}

/**
 * RIV-A matchmaking: real snapshots in MMR buckets ±1, shielded hives excluded, no target
 * raided in the last 24 h, closest MMR first; labelled bots fill only the missing slots.
 */
export function findRaidTargets(
  me: { id: string; mmr: number },
  pool: HiveSnapshot[],
  now: number,
  lastRaided: Record<string, number>,
  count = 3,
  seed = 1,
): HiveSnapshot[] {
  const real = pool
    .filter((h) => ineligible(me, h, now, lastRaided) === null)
    .sort((a, b) => Math.abs(a.mmr - me.mmr) - Math.abs(b.mmr - me.mmr) || (a.id < b.id ? -1 : 1))
    .slice(0, count);
  const out = real.map((h) => (h.bot ? { ...h, name: rivalName(h) } : h));
  for (let i = 0; out.length < count; i++) {
    const b = practiceBot(me.mmr, i, seed);
    if (ineligible(me, b, now, lastRaided) === null) out.push(b);
    if (i > count * 10) break;
  }
  return out;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Rival list (raid screen). Every bot row shows the bot label and a `bot` class. */
export function rivalsHtml(list: HiveSnapshot[]): string {
  return `<ul class="rivals">${list
    .map(
      (h) =>
        `<li class="rival${h.bot ? ' bot' : ''}" data-id="${esc(h.id)}"><b>${esc(rivalName(h))}</b>${h.bot ? ' <small class="bot-tag">bot</small>' : ''} <small>MMR ${Math.round(h.mmr)}</small></li>`,
    )
    .join('')}</ul>`;
}

/** What a defender holds. Only `nectar` (earned, stored) can ever be raided. */
export interface DefenderStash {
  nectar: number;
  /** Paid currency: never stealable. */
  gems: number;
  /** Purchased items (no ads, skins, pass): never stealable. */
  paid: readonly string[];
}

/**
 * RIV-B raid loss: `power` in 0..1 is how well the raid went. Shielded hives lose nothing.
 * The loot is at most floor(RAID_LOSS_CAP × stored nectar) and never touches gems or paid items.
 */
export function raidLoot(stash: DefenderStash, power: number, shielded: boolean): number {
  if (shielded || !(stash.nectar > 0)) return 0;
  const p = Math.min(1, Math.max(0, Number.isFinite(power) ? power : 0));
  return Math.floor(Math.floor(stash.nectar) * RAID_LOSS_CAP * p);
}

/** Apply a raid to the defender: returns the new stash (gems and paid items unchanged). */
export function applyRaid(stash: DefenderStash, power: number, shielded: boolean): DefenderStash {
  const loot = raidLoot(stash, power, shielded);
  return { ...stash, nectar: stash.nectar - loot };
}
