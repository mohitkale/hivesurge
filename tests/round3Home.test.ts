import { describe, expect, it } from 'vitest';
import {
  collection,
  dailyChallenges,
  homeHtml,
  mockLeaderboard,
  modeState,
  MODES,
  playerScore,
} from '../src/ui/home';

const base = {
  levelNo: 4,
  stars: 7,
  coins: 340,
  gems: 12,
  earned: null,
  collection: collection(4, [
    { id: 'classic', name: 'Classic Worker', owned: true, unlock: null },
    { id: 'starter', name: 'Starter Gold', owned: false, unlock: 'Starter Pack' },
  ]),
  challenges: dailyChallenges('2026-10-16', 3),
  ranks: mockLeaderboard(7, 4),
};

describe('round 3: home screen model', () => {
  it('Story is open; Arena and Explorer are locked with their unlock level, then coming soon', () => {
    const [story, arena, explorer] = MODES;
    expect(modeState(story, 1)).toBe('open');
    expect(modeState(arena, 4)).toBe('locked');
    expect(modeState(arena, 10)).toBe('soon');
    expect(modeState(explorer, 19)).toBe('locked');
    expect(modeState(explorer, 20)).toBe('soon');
  });

  it('collection lists cannon placeholders and bee skins with ownership', () => {
    const c = base.collection;
    expect(c.filter((i) => i.kind === 'cannon').length).toBeGreaterThanOrEqual(3);
    expect(c.find((i) => i.id === 'cannon-classic')!.owned).toBe(true);
    expect(c.find((i) => i.id === 'cannon-comb')!.owned).toBe(false);
    expect(c.find((i) => i.id === 'starter')!.unlock).toBe('Starter Pack');
  });

  it('daily challenges: 3 open + 2 upcoming, deterministic per day, progress within goal', () => {
    const a = dailyChallenges('2026-10-16', 5);
    expect(a.filter((c) => c.state === 'open')).toHaveLength(3);
    expect(a.filter((c) => c.state === 'upcoming')).toHaveLength(2);
    expect(dailyChallenges('2026-10-16', 5)).toEqual(a);
    expect(dailyChallenges('2026-10-17', 5).map((c) => c.title)).not.toEqual(a.map((c) => c.title));
    for (const c of a) expect(c.progress).toBeLessThanOrEqual(c.goal);
  });

  it('mock leaderboard always includes the player, sorted by score', () => {
    for (const [s, l] of [
      [0, 1],
      [40, 30],
    ]) {
      const r = mockLeaderboard(s, l);
      expect(r).toHaveLength(5);
      expect(r.some((x) => x.you && x.score === playerScore(s, l))).toBe(true);
    }
    const top = mockLeaderboard(40, 30);
    expect(top[0].you).toBe(true);
  });

  it('HTML: logo, progress, PLAY, Story tile, locked tiles, mock labels', () => {
    const html = homeHtml(base);
    expect(html).toContain('HIVE');
    expect(html).toContain('data-a="play"');
    expect(html).toContain('data-a="mode:story"');
    expect(html).toContain('🔒 Level 10');
    expect(html).toContain('🔒 Level 20');
    expect(html).toContain('LV <b>4</b>');
    expect(html).toMatch(/mock · local only/);
    expect(html).toContain('resets 00:00 UTC'); // M7-3: real daily targets
    expect(html).toContain('Upcoming');
  });

  it('HTML escapes names', () => {
    const html = homeHtml({
      ...base,
      collection: collection(1, [{ id: 'x', name: '<b>', owned: true, unlock: null }]),
    });
    expect(html).not.toContain('<small><b></small>');
  });
});
