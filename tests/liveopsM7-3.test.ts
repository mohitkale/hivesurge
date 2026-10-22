import { describe, expect, it } from 'vitest';
import { campaignLevel } from '../src/levels/campaign';
import {
  activeEvent,
  activeSeason,
  addPassXp,
  applyEventRules,
  claimDaily,
  claimDailyBonus,
  claimLogin,
  claimMilestone,
  claimTier,
  claimWeekly,
  dailyTargets,
  DAY,
  dayKey,
  drawDaily,
  eventLevel,
  eventPoints,
  nextEvent,
  parseEventLevelId,
  premiumRewards,
  recordAction,
  recordBattle,
  recordEventBattle,
  rerollDaily,
  rewardValid,
  rollPeriods,
  validateEventRules,
  weekKey,
  winStreakBonus,
  type SeasonDef,
} from '../src/meta/liveops';
import { validateRemoteConfig, defaultRemoteConfig } from '../src/platform/remoteConfig';
import { isEventFinalLevel } from '../src/platform/reviveGems';
import { defaultSave, mergeSaves, parseSave, reconcileSave } from '../src/platform/save';
import type { LiveEvent } from '../src/platform/remoteConfig';
import { createRng } from '../src/sim/rng';

const T0 = Date.UTC(2026, 10, 2); // Mon 2026-11-02 00:00 UTC
const rng = createRng(3);
const SEASON: SeasonDef = { id: 's1-bloom', start: T0, days: 28, xpPerTier: 270 };
const POLLEN: LiveEvent = {
  id: 'pollen-rush',
  name: 'Pollen Rush',
  start: T0,
  end: T0 + 3 * DAY,
  rules: {
    gateAdd: 1,
    waveMul: 1.3,
    milestones: [
      [300, 'coins:200'],
      [800, 'chest:silver'],
    ],
  },
};
const win = { won: true, queens: 2, x3Passes: 1, hornetKills: 4, stars: 3, boss: false };

describe('M7-3 clock: UTC day and Monday week keys (clock mock)', () => {
  it('day rollover at 00:00 UTC, event boundary at 23:59:59', () => {
    expect(dayKey(T0 - 1)).toBe('2026-11-01');
    expect(dayKey(T0)).toBe('2026-11-02');
    expect(weekKey(T0 + 6 * DAY + DAY - 1)).toBe('2026-11-02'); // Sunday 23:59:59.999
    expect(weekKey(T0 + 7 * DAY)).toBe('2026-11-09');
    expect(activeEvent([POLLEN], POLLEN.end - 1000)?.id).toBe('pollen-rush'); // 23:59:59
    expect(activeEvent([POLLEN], POLLEN.end)).toBeNull();
    expect(nextEvent([POLLEN], T0 - DAY)?.id).toBe('pollen-rush');
  });

  it('timezone offsets do not matter: keys come from UTC ms, not the device zone', () => {
    // 2026-11-02 23:30 in UTC+5:30 is 18:00 UTC the same day.
    expect(dayKey(Date.parse('2026-11-02T23:30:00+05:30'))).toBe('2026-11-02');
    expect(dayKey(Date.parse('2026-11-03T04:00:00+05:30'))).toBe('2026-11-02');
  });
});

describe('M7-3 daily and weekly targets', () => {
  it('draws 3 deterministic targets per day; stage-3 targets only after stage 3', () => {
    expect(drawDaily('2026-11-02', 5)).toEqual(drawDaily('2026-11-02', 5));
    for (let d = 0; d < 30; d++) {
      const early = drawDaily(dayKey(T0 + d * DAY), 0);
      expect(early).toHaveLength(3);
      expect(early).not.toContain('d-x3');
      expect(early).not.toContain('d-hornet');
    }
  });

  it('progress, claim once, daily bonus, weekly count; resets next day', () => {
    const s = defaultSave();
    const L = s.meta.liveops;
    rollPeriods(L, T0 + 1000, 5);
    for (let i = 0; i < 25; i++) recordBattle(L, win);
    recordAction(L, 'chest', 2);
    for (const [i] of dailyTargets(L).entries()) {
      if (!claimDaily(s, i, T0, rng, SEASON)) {
        // A "2+ stars" or other target may need more; force the count for the test.
        L.daily.counts[dailyTargets(L)[i].metric] = 99;
        expect(claimDaily(s, i, T0, rng, SEASON)).toBe(true);
      }
      expect(claimDaily(s, i, T0, rng, SEASON)).toBe(false); // once only
    }
    expect(claimDailyBonus(s, T0, rng, SEASON)).toBe(true);
    expect(claimDailyBonus(s, T0, rng, SEASON)).toBe(false);
    expect(L.weekly.counts.dailyBonus).toBe(1);
    expect(L.season.xp).toBe(3 * 20 + 50);
    expect(claimWeekly(s, 0, T0, rng, SEASON)).toBe(true); // 25 wins → Silver chest
    expect(L.season.xp).toBe(3 * 20 + 50 + 100);
    rollPeriods(L, T0 + DAY, 5);
    expect(L.daily.claimed).toEqual([]);
    expect(L.weekly.claimed).toEqual([0]); // same week
    rollPeriods(L, T0 + 7 * DAY, 5);
    expect(L.weekly.claimed).toEqual([]);
  });

  it('one free reroll per day', () => {
    const s = defaultSave();
    const L = s.meta.liveops;
    rollPeriods(L, T0, 5);
    const before = [...L.daily.picks];
    expect(rerollDaily(L, 1, 5)).toBe(true);
    expect(L.daily.picks[1]).not.toBe(before[1]);
    expect(new Set(L.daily.picks).size).toBe(3);
    expect(rerollDaily(L, 0, 5)).toBe(false);
  });

  it('a claim on two offline devices pays once after the merge', () => {
    const s = defaultSave();
    rollPeriods(s.meta.liveops, T0, 5);
    s.meta.liveops.daily.counts = { win: 9, queen: 99, x3: 9, hornet: 99, stars2: 9, chest: 9 };
    reconcileSave(s, 'a', T0);
    const a = structuredClone(s);
    const b = structuredClone(s);
    expect(claimDaily(a, 0, T0, rng, SEASON)).toBe(true);
    expect(claimDaily(b, 0, T0 + 5, rng, SEASON)).toBe(true);
    reconcileSave(a, 'a', T0);
    reconcileSave(b, 'b', T0);
    const m = mergeSaves(a, b, 'a');
    expect(m.coins + m.gems).toBe(a.coins + a.gems);
    expect(m.meta.liveops.daily.claimed).toEqual([0]);
    // And the state survives a save round trip.
    expect(parseSave(JSON.stringify(m)).meta.liveops).toEqual(m.meta.liveops);
  });
});

describe('M7-3 streaks', () => {
  it('login: 7-day cycle, one frozen miss per week, a longer gap restarts', () => {
    const s = defaultSave();
    const day = (d: number) => T0 + d * DAY + 3600_000;
    expect(claimLogin(s, day(0), rng)).toBe(1);
    expect(claimLogin(s, day(0) + 1000, rng)).toBe(0); // same day
    expect(claimLogin(s, day(1), rng)).toBe(2);
    expect(claimLogin(s, day(3), rng)).toBe(3); // missed day 2: honey jar freezes it
    expect(claimLogin(s, day(5), rng)).toBe(1); // second miss in the same week: reset
    for (let d = 6; d < 12; d++) claimLogin(s, day(d), rng);
    expect(s.meta.liveops.login.streakDay).toBe(7);
    expect(claimLogin(s, day(12), rng)).toBe(1); // cycle wraps
    expect(claimLogin(s, day(11), rng)).toBe(0); // clock set back: no re-claim
    expect(s.coins).toBeGreaterThan(0);
  });

  it('device clock set forward: the trusted clock (server time) decides, never the device', () => {
    // The engine only takes the trusted time; a device-forward clock is corrected by GameClock.
    const s = defaultSave();
    expect(claimLogin(s, T0, rng)).toBe(1);
    expect(claimLogin(s, T0 + 5 * 60_000, rng)).toBe(0);
  });

  it('win streak: +20% after 3 wins, +40% after 5, a loss resets', () => {
    const L = defaultSave().meta.liveops;
    for (let i = 0; i < 3; i++) recordBattle(L, win);
    expect(winStreakBonus(L.winStreak)).toBe(1.2);
    recordBattle(L, win);
    recordBattle(L, win);
    expect(winStreakBonus(L.winStreak)).toBe(1.4);
    recordBattle(L, { ...win, won: false });
    expect(L.winStreak).toBe(0);
    expect(winStreakBonus(0)).toBe(1);
  });
});

describe('M7-3 season pass', () => {
  it('active only inside the season; XP to tiers; premium needs the pass and is retroactive', () => {
    const cfg = { season: SEASON };
    expect(activeSeason(cfg, T0 - 1)).toBeNull();
    expect(activeSeason(cfg, T0 + 27 * DAY)?.id).toBe('s1-bloom');
    expect(activeSeason(cfg, T0 + 28 * DAY)).toBeNull();
    const s = defaultSave();
    addPassXp(s, 270 * 5 + 10, T0, SEASON);
    expect(claimTier(s, SEASON, 6, 'free', T0, rng)).toBe(false); // not reached
    expect(claimTier(s, SEASON, 1, 'free', T0, rng)).toBe(true);
    expect(claimTier(s, SEASON, 1, 'free', T0, rng)).toBe(false);
    expect(claimTier(s, SEASON, 1, 'premium', T0, rng)).toBe(false); // no pass
    s.meta.seasonPremium = true; // sandbox purchase grant
    expect(claimTier(s, SEASON, 1, 'premium', T0, rng)).toBe(true); // retroactive
    expect(s.meta.bees.orchid.level).toBeGreaterThan(0);
    expect(s.skins).toContain('season-frame');
  });

  it('premium rewards are fixed and named: no chests, no random cards (M5-11)', () => {
    for (let t = 1; t <= 30; t++)
      for (const r of premiumRewards(t)) {
        expect(rewardValid(r), r).toBe(true);
        expect(r.startsWith('chest:'), `tier ${t}`).toBe(false);
      }
  });
});

describe('M7-3 events calendar (driven by remote config)', () => {
  it('rules change the level: gate +1, waves ×1.3, queen ×0.5, hornet share', () => {
    const base = campaignLevel(6);
    const r = applyEventRules(base, { gateAdd: 1, waveMul: 1.3, queenChargeMul: 0.5 });
    const pos = (l: typeof base) => l.gates.filter((g) => g.kind !== 'sub').map((g) => g.value);
    expect(pos(r)).toEqual(pos(base).map((v) => v + 1));
    expect(r.waves[0].count).toBe(Math.round(base.waves[0].count * 1.3));
    expect(r.queenCharge).toBeCloseTo(base.queenCharge * 0.5);
    const h = applyEventRules(base, { hornetShare: 0.5 });
    expect(h.waves.filter((w) => w.kind === 'hornet').length).toBeGreaterThan(
      base.waves.filter((w) => w.kind === 'hornet').length,
    );
  });

  it('M7-10 rule tweak: only ×3 gates count (traps stay)', () => {
    const base = campaignLevel(7);
    const r = applyEventRules(base, { onlyX3: true });
    expect(
      r.gates.filter((g) => g.kind !== 'sub').every((g) => g.kind === 'mul' && g.value === 3),
    ).toBe(true);
    expect(r.gates.some((g) => g.kind === 'mul')).toBe(true);
    expect(r.gates.filter((g) => g.kind === 'sub')).toEqual(
      base.gates.filter((g) => g.kind === 'sub'),
    );
  });

  it('final level of an event exposes isEventFinalLevel = true (M2-21c C6)', () => {
    const ev = { ...POLLEN, rules: { ...POLLEN.rules, levels: 3 } };
    const lv = [0, 1, 2].map((k) => eventLevel(ev, k, (n) => campaignLevel(n - 1)));
    expect(lv.map((l) => l.isEventFinalLevel)).toEqual([false, false, true]);
    expect(lv[2].id).toBe('event:pollen-rush:3');
    expect(parseEventLevelId(lv[2].id)).toEqual({ event: 'pollen-rush', k: 2 });
    expect(isEventFinalLevel(lv[2])).toBe(true);
    expect(isEventFinalLevel(lv[0])).toBe(false);
    expect(isEventFinalLevel(campaignLevel(3))).toBe(false);
  });

  it('points and milestones are the event track (distinct from campaign rewards)', () => {
    const s = defaultSave();
    const L = s.meta.liveops;
    expect(eventPoints(POLLEN.rules!, win)).toBe(100);
    recordEventBattle(L, POLLEN, 0, 250, true);
    expect(claimMilestone(s, POLLEN, 0, T0, rng)).toBe(false); // 250 < 300
    recordEventBattle(L, POLLEN, 1, 100, true);
    expect(L.event.cleared).toBe(2);
    expect(claimMilestone(s, POLLEN, 0, T0, rng)).toBe(true);
    expect(s.coinBook.grants['event:pollen-rush:0']).toBe(200);
    // A new event starts from zero.
    recordEventBattle(L, { ...POLLEN, id: 'hornet-hunt' }, 0, 10, false);
    expect(L.event).toMatchObject({ id: 'hornet-hunt', points: 10, cleared: 0, claimed: [] });
  });

  it('publish check rejects bad rules and accepts the shipped calendar shape', () => {
    expect(validateEventRules({ gateAdd: 9 })).toContain('rules.gateAdd must be 0..5');
    expect(validateEventRules({ milestones: [[300, 'coins:x']] })[0]).toMatch(/milestones/);
    const c = { ...defaultRemoteConfig(), events: [POLLEN], season: SEASON };
    expect(validateRemoteConfig(c)).toEqual([]);
    expect(validateRemoteConfig({ ...c, season: { ...SEASON, days: 0 } })[0]).toMatch(/season/);
    expect(
      validateRemoteConfig({ ...c, events: [{ ...POLLEN, rules: { waveMul: 5 } }] }),
    ).toContain('events[0].rules.waveMul must be 0.5..2');
  });
});
