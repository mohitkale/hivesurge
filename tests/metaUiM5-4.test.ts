import { describe, expect, it } from 'vitest';
import { CHESTS, xpForLevel } from '../src/meta/defs';
import { addXp, awardChest, startUnlock } from '../src/meta/economy';
import { metaMods } from '../src/meta/mods';
import { defaultSave } from '../src/platform/save';
import { emptyBee } from '../src/platform/saveMeta';
import { LEVELS } from '../src/sim/levels';
import { createRng } from '../src/sim/rng';
import { NO_MODS, World } from '../src/sim/world';
import {
  beesHtml,
  chestInfoHtml,
  chestOpenHtml,
  chestRowHtml,
  fmtDuration,
  hiveHtml,
  nextGoal,
  oddsTableHtml,
} from '../src/ui/meta';
import { homeHtml } from '../src/ui/home';

const H = 3_600_000;

describe('M5-4b / M5-11 chest UI shows the odds table', () => {
  it('every chest info screen lists all rarities with their percentages', () => {
    for (const type of Object.keys(CHESTS) as (keyof typeof CHESTS)[]) {
      const s = defaultSave();
      awardChest(s, type, 0, createRng(1));
      const html = chestInfoHtml(s, s.meta.chests[0], 0);
      // Feedback round 4: rarity chips instead of a table, same facts (G12).
      expect(html).toContain('<ul class="odds" aria-label="Odds per card"');
      for (const [r, name] of [
        ['C', 'Common'],
        ['R', 'Rare'],
        ['E', 'Epic'],
        ['L', 'Legendary'],
      ] as const)
        expect(html).toContain(
          `<li class="odd r-${r}"><b>${CHESTS[type].odds[r]}%</b><small>${name}</small></li>`,
        );
      expect(html).toMatch(/Legendary guaranteed within 40 chests/);
    }
    expect(oddsTableHtml('royal')).toContain('at least 1 Epic');
  });

  it('chest actions follow the timer state; gem skip price shown', () => {
    const s = defaultSave();
    const a = awardChest(s, 'silver', 0, createRng(1))!;
    awardChest(s, 'wood', 0, createRng(2));
    expect(chestInfoHtml(s, s.meta.chests[0], 0)).toContain('data-a="unlock"');
    startUnlock(s, a, 0);
    const unlocking = chestInfoHtml(s, s.meta.chests[0], 10 * 60_000);
    expect(unlocking).toContain('Open now · 💎 8'); // 50 min left, capped at the listed 8
    expect(chestInfoHtml(s, s.meta.chests[1], 0)).toContain('Another chest is unlocking');
    expect(chestInfoHtml(s, s.meta.chests[0], H)).toContain('data-a="open"');
  });
});

describe('M5-4 home chest row + screens', () => {
  it('shows 4 slots with locked / unlocking / ready states and the free chest', () => {
    const T = 10 * 24 * H;
    const s = defaultSave();
    const a = awardChest(s, 'wood', T, createRng(1))!;
    awardChest(s, 'gold', T, createRng(2));
    startUnlock(s, a, T);
    const html = chestRowHtml(s, T + 60_000);
    expect(html.match(/class="chest-slot/g)).toHaveLength(4);
    expect(html).toContain('chest-slot unlocking');
    expect(html).toContain('chest-slot locked');
    expect(html).toContain('data-a="freechest"');
    expect(chestRowHtml(s, T + 15 * 60_000)).toContain('chest-slot ready');
    s.meta.freeChestAt = T;
    expect(chestRowHtml(s, T + H)).toContain('Free chest in');
    expect(fmtDuration(3_725_000)).toBe('1h 2m');
  });

  it('chest opening lists cards, NEW tags and coins', () => {
    const html = chestOpenHtml({
      type: 'silver',
      coins: 99,
      pity: false,
      cards: [{ bee: 'orchid', rarity: 'E', count: 1, isNew: true, overflowCoins: 0 }],
    });
    expect(html).toContain('Orchid Bee');
    expect(html).toContain('NEW');
    expect(html).toContain('+🪙 99');
  });

  it('bees screen: locked slots until stage 3, affordable upgrade highlighted, no effect is pending (M7)', () => {
    const s = defaultSave();
    s.meta.bees.bumble = { ...emptyBee(1), pollen: 2 };
    s.coins = 100;
    const early = beesHtml(s, 1);
    expect(early.match(/slot locked/g)).toHaveLength(4);
    const later = beesHtml(s, 5);
    expect(later.match(/slot locked/g)).toHaveLength(2);
    expect(later).toContain('data-a="upgrade:bumble"');
    expect(later).toContain('can-up');
    expect(later).not.toContain('effect coming soon'); // M7: every bee effect is live
    expect(later).toContain('data-a="equip:bumble"');
  });

  it('hive screen shows the account-level room cap', () => {
    const s = defaultSave();
    s.coins = 10_000;
    expect(hiveHtml(s, 0)).toContain('Needs account level 2');
    addXp(s, xpForLevel(2), 0);
    expect(hiveHtml(s, 0)).toContain('data-a="build:honey"');
  });

  it('home renders the meta block', () => {
    const html = homeHtml({
      levelNo: 3,
      stars: 4,
      coins: 1,
      gems: 2,
      earned: null,
      collection: [],
      challenges: [],
      ranks: [],
      meta: '<div class="goal-bar">x</div>',
    });
    expect(html).toContain('goal-bar');
  });
});

describe('M5-12 next goal', () => {
  it('progress increases after a win (coins + XP)', () => {
    const s = defaultSave();
    s.meta.bees.bumble = { ...emptyBee(1), pollen: 1 };
    const before = nextGoal(s, 1, 0);
    s.coins += 60; // a win pays coins
    addXp(s, 30, 0); // and XP
    const after = nextGoal(s, 2, 0);
    expect(after.progress).toBeGreaterThan(before.progress);
    expect(after.label).toBeTruthy();
  });

  it('an affordable upgrade is shown first', () => {
    const s = defaultSave();
    s.meta.bees.bumble = { ...emptyBee(1), pollen: 5 };
    s.coins = 500;
    expect(nextGoal(s, 1, 0)).toEqual({ label: 'Upgrade Bumble Tank to L2', progress: 1 });
  });
});

describe('M5-4 loadout effects in the sim (only when equipped)', () => {
  it('a fresh save changes nothing (balance tests stay valid)', () => {
    expect(metaMods(defaultSave(), 1, LEVELS[1].id)).toEqual(NO_MODS);
  });

  it('mason, orchid, dart, worker level and rooms map to sim knobs', () => {
    const s = defaultSave();
    s.meta.bees.mason = emptyBee(3);
    s.meta.bees.orchid = emptyBee(1);
    s.meta.bees.dart = emptyBee(1);
    s.meta.bees.worker = emptyBee(6);
    s.meta.loadout = ['mason', 'orchid', 'dart', ''];
    s.meta.hive.wax = { level: 2, building: null };
    s.meta.hive.brood = { level: 1, building: null };
    const m = metaMods(s, 12, LEVELS[1].id);
    expect(m.hiveHpBonus).toBe(14 + 6);
    expect(m.fireRateMul).toBeCloseTo(1.1);
    expect(m.beeSpeedMul).toBeCloseTo(1.1);
    expect(m.queenChargeMul).toBeCloseTo(1 / 1.15);
    expect(m.queenChargeSec).toBeCloseTo(0.2);
    // Slots 2-3 are locked at stage 3: only mason counts.
    expect(metaMods(s, 3, LEVELS[1].id).queenChargeMul).toBe(1);
    const lv = LEVELS[1];
    const w = new World(lv, {}, m);
    expect(w.hiveHp).toBe(lv.hiveHp + 20);
    expect(w.fireInterval).toBeCloseTo(lv.fireInterval / 1.1);
    expect(w.queenChargeMax).toBeCloseTo(lv.queenCharge / 1.15 - 0.2);
  });

  it('loss streak eases the enemy (never harder), floor 0.85', () => {
    const lv = LEVELS[2];
    const w = new World(lv, {}, { ...NO_MODS, enemyScale: 0.9 });
    expect(w.nestHp).toBe(Math.round(lv.nestHp * 0.9));
    expect(new World(lv, {}, { ...NO_MODS, enemyScale: 1.5 }).nestHp).toBe(lv.nestHp);
    expect(new World(lv, {}, { ...NO_MODS, enemyScale: 0.5 }).nestHp).toBe(
      Math.round(lv.nestHp * 0.85),
    );
  });
});
