import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/levels';
import { World } from '../src/sim/world';
import {
  BOOSTS,
  boostEnemyScale,
  MEGA_SWARM_INTERVAL_MUL,
  MEGA_SWARM_MUL,
  type BattleBoosts,
} from '../src/sim/boosts';
import { campaignLevel } from '../src/levels/campaign';
import { mapHtml, mapNodes, starGain, totalStars } from '../src/ui/homeMap';
import { AdPacer } from '../src/platform/adPacer';
import { emptyAdDay } from '../src/platform/save';
import { aimBot, centreBot, run } from './bots';

const fire = { aimX: 0, firing: true, queen: false };

function firedAfter(boosts: BattleBoosts, seconds: number): World {
  const w = new World(getLevel('clover-run'), boosts);
  for (let i = 0; i < Math.round(seconds * 60); i++) w.step(fire);
  return w;
}

describe('feedback 2026-10-15: pre-level boosts (sim)', () => {
  it('offers exactly the four requested boosts', () => {
    expect(BOOSTS.map((b) => b.id)).toEqual(['doubleCannon', 'fastFire', 'fastQueen', 'megaSwarm']);
  });

  it('round 3: boosted battles face a scaled nest, unboosted ones are unchanged', () => {
    const L = getLevel('clover-run');
    expect(new World(L, {}).nestHp).toBe(L.nestHp);
    for (const b of BOOSTS) {
      const w = new World(L, { [b.id]: true });
      const k = boostEnemyScale({ [b.id]: true });
      expect(k.nestHp).toBeGreaterThan(1);
      expect(w.nestHp).toBe(Math.round(L.nestHp * k.nestHp));
      expect(w.level.nestHp).toBe(w.nestHp); // HUD/scene read the scaled max
    }
  });

  it('round 3: a whole-level boost is not a free win (no-aim centre bot still loses L8)', () => {
    const L = campaignLevel(7);
    for (const b of ['megaSwarm', 'fastFire'] as const) {
      const w = new World(L, { [b]: true });
      while (w.outcome === 'playing') w.step(centreBot(w));
      expect(w.outcome, b).toBe('lost');
    }
  }, 60000);

  it('2x Cannon fires two bees per shot', () => {
    const a = firedAfter({}, 1).stats.fired;
    const b = firedAfter({ doubleCannon: true }, 1).stats.fired;
    expect(b).toBe(a * 2);
  });

  it('2x Fire speed halves the shot interval', () => {
    const a = firedAfter({}, 2).stats.fired;
    const b = firedAfter({ fastFire: true }, 2).stats.fired;
    expect(b / a).toBeGreaterThan(1.9);
    expect(b / a).toBeLessThan(2.1);
  });

  it('Fast Queen charges in half the time', () => {
    const L = getLevel('clover-run');
    const w = new World(L, { fastQueen: true });
    expect(w.queenChargeMax).toBe(L.queenCharge / 2);
    for (let i = 0; i < Math.ceil((L.queenCharge / 2) * 60) + 1; i++) w.step(fire);
    expect(w.queenReady).toBe(true);
    expect(firedAfter({}, L.queenCharge / 2).queenReady).toBe(false);
  });

  it('round 3: 10x Bees lasts the whole level at 10 bees per (5x slower) shot', () => {
    const L = getLevel('clover-run');
    const w = new World(L, { megaSwarm: true });
    expect(w.fireInterval).toBeCloseTo(L.fireInterval * MEGA_SWARM_INTERVAL_MUL);
    let prev = 0;
    for (let s = 1; s <= 30; s++) {
      for (let i = 0; i < 60; i++) w.step(fire);
      if (w.outcome !== 'playing') break;
      if (s > 2 && s % 10 === 0) expect(w.stats.fired - prev).toBeGreaterThan(0);
      prev = w.stats.fired;
    }
    // still 10 per shot at the end: fired count is a multiple of 10
    expect(w.stats.fired % MEGA_SWARM_MUL).toBe(0);
  });

  it('no boost = same battle as before (deterministic)', () => {
    const L = getLevel('clover-run');
    const bot = aimBot(L);
    const r1 = run(L, bot);
    const w = new World(L, {});
    while (w.outcome === 'playing') w.step(bot(w));
    expect(w.outcome).toBe(r1.outcome);
  }, 60000);

  it('the boost placement has its own caps', () => {
    const p = new AdPacer(emptyAdDay());
    for (let i = 0; i < 6; i++) {
      expect(p.canRewarded('boost')).toBe(true);
      p.recordRewarded('boost');
    }
    expect(p.canRewarded('boost')).toBe(false);
    expect(p.canRewarded('win_double')).toBe(true);
  });
});

describe('feedback 2026-10-15: home map', () => {
  it('shows cleared, current and locked levels around the current one', () => {
    const stars = { [campaignLevel(0).id]: 3, [campaignLevel(1).id]: 2, [campaignLevel(2).id]: 1 };
    const n = mapNodes(3, stars);
    expect(n.map((x) => x.no)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(n.map((x) => x.state)).toEqual([
      'done',
      'done',
      'current',
      'locked',
      'locked',
      'locked',
    ]);
    expect(n[0].stars).toBe(2);
    expect(n.find((x) => x.no === 5)!.boss).toBe(true);
    expect(mapNodes(0, {})[0]).toMatchObject({ no: 1, state: 'current' });
    expect(totalStars(stars)).toBe(6);
  });

  it('new-best stars pay gems, repeats do not', () => {
    expect(starGain(0, 3)).toEqual({ newStars: 3, gems: 3 });
    expect(starGain(2, 3)).toEqual({ newStars: 1, gems: 1 });
    expect(starGain(3, 1)).toEqual({ newStars: 0, gems: 0 });
  });

  it('renders the level path, rewards earned and a Play button for the next level', () => {
    const nodes = mapNodes(6, {});
    const html = mapHtml({
      nodes,
      coins: 120,
      gems: 4,
      stars: 9,
      earned: { levelNo: 6, won: true, coins: 75, stars: 2, newStars: 2, gems: 2 },
      current: nodes.find((x) => x.state === 'current')!,
    });
    expect(html).toContain('data-a="play"');
    expect(html).toContain('LEVEL 7');
    expect(html).toContain('Level 6 cleared!');
    expect(html).toContain('+🪙 75');
    expect(html).toContain('+💎 2');
    expect(html).toContain('Lavender Dusk');
  });
});
