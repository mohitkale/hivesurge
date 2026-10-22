import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { campaignLevel } from '../src/levels/campaign';
import { afterBattle, nextEventLevel, openLive, x3Passed } from '../src/meta/liveGame';
import { activeEvent, DAY } from '../src/meta/liveops';
import { loadRemoteConfig } from '../src/platform/remoteConfig';
import { defaultSave } from '../src/platform/save';
import { World } from '../src/sim/world';
import { homeChallenges, liveBannerHtml, liveopsHtml } from '../src/ui/liveops';
import { createRng } from '../src/sim/rng';

const cfg = loadRemoteConfig(JSON.parse(readFileSync('public/remote-config.json', 'utf8')));
const T = Date.UTC(2026, 9, 22, 6); // inside Pollen Rush and the preview season
const rng = createRng(1);

function played(won: boolean): World {
  const w = new World(campaignLevel(2));
  w.outcome = won ? 'won' : 'lost';
  w.stats.queens = 3;
  return w;
}

describe('M7-3 in game: the remote-config calendar drives events (carry-over b)', () => {
  it('the shipped calendar has a season and back-to-back events incl. the M7-10 rule tweak', () => {
    expect(cfg.season?.id).toBe('s0-preview');
    expect(activeEvent(cfg.events, T)?.id).toBe('pollen-rush');
    expect(activeEvent(cfg.events, Date.UTC(2026, 9, 25))?.rules).toMatchObject({ onlyX3: true });
  });

  it('home opens the live context: login reward after the FTUE, targets drawn, banner shown', () => {
    const s = defaultSave();
    expect(openLive(s, cfg, T, 5, rng).loginDay).toBe(0); // FTUE not done
    s.ftueDone = true;
    const { ctx, loginDay } = openLive(s, cfg, T, 5, rng);
    expect(loginDay).toBe(1);
    expect(ctx.event?.id).toBe('pollen-rush');
    expect(homeChallenges(s)).toHaveLength(5);
    expect(liveBannerHtml(s, ctx, null)).toContain('data-a="event:play"');
    const html = liveopsHtml(s, ctx, '$4.99');
    expect(html).toContain('Season pass');
    expect(html).toContain('data-a="buy:season_pass"');
    expect(html).toMatch(/300 pts/);
  });

  it('event battles: event rules applied, points instead of stars, levels advance', () => {
    const s = defaultSave();
    const { ctx } = openLive(s, cfg, T, 5, rng);
    const { level, k } = nextEventLevel(s, ctx.event!);
    expect(k).toBe(0);
    expect(level.id).toBe('event:pollen-rush:1');
    const w = new World(level);
    w.outcome = 'won';
    const r = afterBattle(s, w, ctx, 3, k);
    expect(r.eventPts).toBe(100);
    expect(r.coinMul).toBe(1);
    expect(nextEventLevel(s, ctx.event!).k).toBe(1);
    expect(s.meta.liveops.season.xp).toBe(30);
  });

  it('campaign battles feed targets, streak bonus and pass XP', () => {
    const s = defaultSave();
    const { ctx } = openLive(s, cfg, T, 5, rng);
    for (let i = 0; i < 3; i++) afterBattle(s, played(true), ctx, 3, null);
    expect(afterBattle(s, played(true), ctx, 3, null).coinMul).toBe(1.2);
    afterBattle(s, played(false), ctx, 0, null);
    expect(s.meta.liveops.winStreak).toBe(0);
    expect(s.meta.liveops.daily.counts.win).toBe(4);
    expect(s.meta.liveops.daily.counts.queen).toBe(15);
    expect(s.meta.liveops.season.xp).toBe(4 * 30 + 10);
    expect(x3Passed(played(true))).toBe(0);
  });

  it('outside the calendar: no event, no season, next event teaser', () => {
    const s = defaultSave();
    const { ctx } = openLive(s, cfg, Date.UTC(2026, 9, 31, 12), 5, rng);
    expect(ctx.event).toBeNull();
    expect(
      liveBannerHtml(s, ctx, {
        id: 'x',
        name: 'Next One',
        start: ctx.now + DAY,
        end: ctx.now + 2 * DAY,
      }),
    ).toContain('Next: Next One');
  });
});
