import { describe, expect, it } from 'vitest';
import {
  applyRaid,
  BOT_LABEL,
  findRaidTargets,
  ineligible,
  RAID_LOSS_CAP,
  raidLoot,
  REPEAT_WINDOW_MS,
  rivalsHtml,
  type HiveSnapshot,
} from '../src/meta/rivals';

const H = 3_600_000;
const NOW = 1000 * H;
const hive = (id: string, mmr: number, o: Partial<HiveSnapshot> = {}): HiveSnapshot => ({
  id,
  name: id,
  mmr,
  shieldUntil: 0,
  bot: false,
  ...o,
});
const me = { id: 'me', mmr: 1050 }; // bucket 10

describe('M7-11 rival matchmaking (RIV-A)', () => {
  it('rule: only MMR buckets ±1', () => {
    expect(ineligible(me, hive('a', 900), NOW, {})).toBeNull(); // bucket 9
    expect(ineligible(me, hive('b', 1199), NOW, {})).toBeNull(); // bucket 11
    expect(ineligible(me, hive('c', 899), NOW, {})).toBe('bucket'); // bucket 8
    expect(ineligible(me, hive('d', 1200), NOW, {})).toBe('bucket'); // bucket 12
    expect(ineligible(me, hive('me', 1050), NOW, {})).toBe('self');
  });

  it('rule: shielded hives are excluded until the shield ends', () => {
    expect(ineligible(me, hive('a', 1050, { shieldUntil: NOW + 1 }), NOW, {})).toBe('shielded');
    expect(ineligible(me, hive('a', 1050, { shieldUntil: NOW }), NOW, {})).toBeNull();
  });

  it('rule: no repeat target within 24 h', () => {
    expect(ineligible(me, hive('a', 1050), NOW, { a: NOW - REPEAT_WINDOW_MS + 1 })).toBe('repeat');
    expect(ineligible(me, hive('a', 1050), NOW, { a: NOW - REPEAT_WINDOW_MS })).toBeNull();
  });

  it('picks eligible real hives closest in MMR and fills the rest with labelled bots', () => {
    const pool = [
      hive('far', 1500),
      hive('shield', 1040, { shieldUntil: NOW + H }),
      hive('recent', 1051),
      hive('ok1', 1000),
      hive('ok2', 1060),
    ];
    const t = findRaidTargets(me, pool, NOW, { recent: NOW - H }, 4, 7);
    expect(t.map((x) => x.id).slice(0, 2)).toEqual(['ok2', 'ok1']);
    expect(t).toHaveLength(4);
    expect(t.slice(2).every((x) => x.bot && x.name.startsWith(BOT_LABEL))).toBe(true);
    expect(findRaidTargets(me, [], NOW, {}, 3, 7)).toEqual(findRaidTargets(me, [], NOW, {}, 3, 7));
  });

  it('UI snapshot: every bot hive shows the bot label, even a mislabelled snapshot', () => {
    const list = [
      hive('real', 1000),
      hive('sneaky', 1010, { bot: true, name: 'TotallyHuman' }),
      ...findRaidTargets(me, [], NOW, {}, 2, 3),
    ];
    const html = rivalsHtml(list);
    const items = html.split('<li ').slice(1);
    const bots = items.filter((x) => x.startsWith('class="rival bot"'));
    expect(bots).toHaveLength(3);
    for (const b of bots) {
      expect(b).toContain(BOT_LABEL);
      expect(b).toContain('<small class="bot-tag">bot</small>');
    }
    expect(items[0]).not.toContain(BOT_LABEL);
    expect(html).toMatchInlineSnapshot(
      `"<ul class="rivals"><li class="rival" data-id="real"><b>real</b> <small>MMR 1000</small></li><li class="rival bot" data-id="sneaky"><b>🤖 Practice hive · TotallyHuman</b> <small class="bot-tag">bot</small> <small>MMR 1010</small></li><li class="rival bot" data-id="bot:3:0"><b>🤖 Practice hive · Clover</b> <small class="bot-tag">bot</small> <small>MMR 1090</small></li><li class="rival bot" data-id="bot:3:1"><b>🤖 Practice hive · Bramble</b> <small class="bot-tag">bot</small> <small>MMR 1012</small></li></ul>"`,
    );
  });
});

describe('M7-12 raid loss cap (RIV-B)', () => {
  it('1,000 simulated raids never exceed the cap and never touch gems or paid items', () => {
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32;
    for (let i = 0; i < 1000; i++) {
      const stash = {
        nectar: Math.floor(rnd() * 50_000),
        gems: Math.floor(rnd() * 5000),
        paid: ['no_ads', 'season_pass'],
      };
      const power = rnd() * 1.5 - 0.2; // includes out-of-range values
      const shielded = rnd() < 0.2;
      const after = applyRaid(stash, power, shielded);
      const lost = stash.nectar - after.nectar;
      expect(lost).toBeGreaterThanOrEqual(0);
      expect(lost).toBeLessThanOrEqual(Math.floor(stash.nectar * RAID_LOSS_CAP));
      if (shielded) expect(lost).toBe(0);
      expect(after.gems).toBe(stash.gems);
      expect(after.paid).toEqual(stash.paid);
    }
    expect(raidLoot({ nectar: 1000, gems: 9, paid: [] }, 1, false)).toBe(100);
    expect(raidLoot({ nectar: 1000, gems: 9, paid: [] }, NaN, false)).toBe(0);
    expect(raidLoot({ nectar: -5, gems: 9, paid: [] }, 1, false)).toBe(0);
  });
});
