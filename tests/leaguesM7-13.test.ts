import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  boardTop,
  closeWeek,
  fillWithBots,
  GROUP_MAX,
  GROUP_MIN,
  isCosmetic,
  LEAGUE_REWARDS,
  seedGroups,
  tierOf,
  TIERS,
  weeklyRewards,
  weeklyScore,
} from '../src/meta/leagues';
import { rewardValid } from '../src/meta/eventRules';
import { homeHtml } from '../src/ui/home';

const players = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    rating: 1000 + ((i * 37) % 400),
    power: i * 5,
  }));

describe('M7-13 weekly leagues', () => {
  it('seeding: groups of 30..50, contiguous by league rating (not hive power), deterministic', () => {
    for (const n of [30, 41, 79, 120, 333, 1000]) {
      const g = seedGroups(players(n));
      expect(g.flat()).toHaveLength(n);
      for (const grp of g) {
        expect(grp.length).toBeGreaterThanOrEqual(GROUP_MIN);
        expect(grp.length).toBeLessThanOrEqual(GROUP_MAX);
      }
      for (let i = 1; i < g.length; i++)
        expect(Math.min(...g[i - 1].map((p) => p.rating))).toBeGreaterThanOrEqual(
          Math.max(...g[i].map((p) => p.rating)),
        );
    }
    // Hive power plays no part: same ratings, any power, same groups.
    const a = seedGroups(players(120));
    const b = seedGroups(players(120).map((p) => ({ ...p, power: 99999 - p.power })));
    expect(b.map((g) => g.map((p) => p.id))).toEqual(a.map((g) => g.map((p) => p.id)));
    expect(seedGroups(players(12))).toHaveLength(1); // small: one group, bots fill it
    expect(seedGroups([])).toEqual([]);
  });

  it('week close: top 20% promote, bottom 20% relegate', () => {
    expect(closeWeek(1000, 1, 40)).toBe(1040);
    expect(closeWeek(1000, 8, 40)).toBe(1040);
    expect(closeWeek(1000, 9, 40)).toBe(1000);
    expect(closeWeek(1000, 40, 40)).toBe(960);
    expect(closeWeek(10, 40, 40)).toBe(0);
    expect(tierOf(1000)).toBe('Bronze');
    expect(tierOf(1700)).toBe('Queen');
  });

  it('reward-table lint: every reward valid; the top tier (Queen) is cosmetic only', () => {
    for (const t of TIERS)
      for (const r of Object.values(LEAGUE_REWARDS[t]).flat())
        expect(rewardValid(r), `${t} ${r}`).toBe(true);
    const top = TIERS[TIERS.length - 1];
    for (const r of Object.values(LEAGUE_REWARDS[top]).flat()) expect(isCosmetic(r), r).toBe(true);
    expect(weeklyRewards('Queen', 1, 40).every(isCosmetic)).toBe(true);
    expect(weeklyRewards('Bronze', 20, 40)).toEqual(['coins:50']);
  });

  it('small groups fill with labelled bots; the player is always on the home card', () => {
    const rows = fillWithBots([{ name: 'You', score: 0, you: true, bot: false }], '2026-10-19', 3);
    expect(rows).toHaveLength(GROUP_MIN);
    for (const r of rows.filter((x) => x.bot)) expect(r.name).toMatch(/\(bot\)$/);
    expect(rows.filter((x) => !x.bot)).toHaveLength(1);
    const top = boardTop(rows);
    expect(top).toHaveLength(5);
    expect(top.some((r) => r.you)).toBe(true);
    expect(fillWithBots([], '2026-10-19', 3)).toEqual(fillWithBots([], '2026-10-19', 3));
    expect(weeklyScore({ win: 3, eventPts: 250 })).toBe(550);
  });

  it('home shows the league label instead of the old mock tag', () => {
    const html = homeHtml({
      levelNo: 3,
      stars: 4,
      coins: 0,
      gems: 0,
      earned: null,
      collection: [],
      challenges: [],
      ranks: boardTop(fillWithBots([{ name: 'You', score: 100, you: true, bot: false }], 'w', 0)),
      rankLabel: 'Bronze league · offline, bots labelled',
    });
    expect(html).toContain('Bronze league · offline, bots labelled');
    expect(html).not.toContain('mock · local only');
  });

  it('migration: scores only via the capped, monotonic RPC; board is pseudonymous', () => {
    const sql = readFileSync('supabase/migrations/20261022001000_m7_leagues.sql', 'utf8');
    expect(sql).toMatch(
      /revoke all on public\.league_ratings, public\.league_scores from anon, authenticated/,
    );
    expect(sql).not.toMatch(/grant (insert|update|delete)[^;]*league/i);
    expect(sql).toMatch(/greatest\(ls\.score, excluded\.score\)/);
    expect(sql).toMatch(/'Bee-' \|\| left\(md5/);
  });
});
