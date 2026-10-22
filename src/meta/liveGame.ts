import { campaignLevel } from '../levels/campaign';
import {
  activeEvent,
  activeSeason,
  addPassXp,
  claimLogin,
  eventLevel,
  eventLevelCount,
  eventPoints,
  eventRules,
  PASS_XP,
  recordBattle,
  recordEventBattle,
  rollPeriods,
  syncEvent,
  syncSeason,
  winStreakBonus,
  type SeasonDef,
} from './liveops';
import type { Rng } from './economy';
import type { LiveEvent, RemoteConfig } from '../platform/remoteConfig';
import type { SaveData } from '../platform/save';
import type { LevelDef } from '../sim/types';
import type { World } from '../sim/world';

/**
 * M7-3 glue between the live-ops engine and the game loop: one context per screen, built from
 * the trusted time and the remote config the session applied (the events calendar).
 */
export interface LiveCtx {
  now: number;
  season: SeasonDef | null;
  event: LiveEvent | null;
}

/** Roll day/week, sync season/event, claim today's login reward. Returns the login day (0 = none). */
export function openLive(
  s: SaveData,
  cfg: RemoteConfig,
  now: number,
  stage: number,
  rng: Rng,
): { ctx: LiveCtx; loginDay: number } {
  const L = s.meta.liveops;
  rollPeriods(L, now, stage);
  const season = activeSeason(cfg, now);
  syncSeason(L, season);
  const event = activeEvent(cfg.events, now);
  syncEvent(L, event);
  // Login rewards wait until the FTUE is done (G1: nothing pulls a first-time player away).
  const loginDay = s.ftueDone ? claimLogin(s, now, rng) : 0;
  return { ctx: { now, season, event }, loginDay };
}

/** Next event level to play (the last one again once all are cleared). */
export function nextEventLevel(s: SaveData, e: LiveEvent): { level: LevelDef; k: number } {
  const n = eventLevelCount(e);
  const k = Math.min(n - 1, s.meta.liveops.event.id === e.id ? s.meta.liveops.event.cleared : 0);
  return { level: eventLevel(e, k, (no) => campaignLevel(no - 1)), k };
}

/** ×3 gates (value 3 multipliers) the swarm passed this battle. */
export function x3Passed(w: World): number {
  let n = 0;
  w.level.gates.forEach((g, i) => {
    if (g.kind === 'mul' && g.value === 3 && w.gatePasses[i] > 0) n++;
  });
  return n;
}

/**
 * Feed a finished battle into targets, streaks, pass XP and the event. Returns the coin
 * multiplier from the win streak (campaign wins only) and event points earned.
 */
export function afterBattle(
  s: SaveData,
  w: World,
  ctx: LiveCtx,
  stars: number,
  eventK: number | null,
): { coinMul: number; eventPts: number } {
  const L = s.meta.liveops;
  rollPeriods(L, ctx.now, 0);
  const won = w.outcome === 'won';
  const facts = {
    won,
    queens: w.stats.queens,
    x3Passes: x3Passed(w),
    hornetKills: w.stats.hornetKills,
    stars,
    boss: (w.level.bossPhases?.length ?? 0) > 0,
  };
  const coinMul = won && eventK === null ? winStreakBonus(L.winStreak) : 1;
  let eventPts = 0;
  if (eventK !== null && ctx.event) {
    eventPts = eventPoints(eventRules(ctx.event), facts);
    recordEventBattle(L, ctx.event, eventK, eventPts, won);
  }
  recordBattle(L, { ...facts, eventPts });
  addPassXp(s, won ? PASS_XP.win : PASS_XP.loss, ctx.now, ctx.season);
  return { coinMul, eventPts };
}
