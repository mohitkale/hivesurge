import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AD_CAPS, AdPacer } from '../src/platform/adPacer';
import type { AdDayCounters } from '../src/platform/save';
import { defaultSave } from '../src/platform/save';
import {
  CAP_LIMITS,
  applyRemoteConfig,
  defaultRemoteConfig,
  loadRemoteConfig,
  validateRemoteConfig,
} from '../src/platform/remoteConfig';
import { CHESTS } from '../src/meta/defs';
import {
  awardChest,
  chestSkipAllowed,
  collectHoneyAway,
  openDailyPack,
  startUnlock,
  useSkipTicket,
} from '../src/meta/economy';
import { chestInfoHtml } from '../src/ui/meta';
import { CATALOG } from '../src/platform/platform';
import { SERVER_SKUS } from '../supabase/functions/_shared/skus.ts';
import { createRng } from '../src/sim/rng';

const day = (): AdDayCounters => ({ day: '', rewarded: 0, interstitial: 0, perPlacement: {} });
const T = 10 * 86_400_000;

describe('M5-6g remote config + M5-4b publish check', () => {
  const saved = defaultRemoteConfig();
  afterEach(() => applyRemoteConfig(saved));

  it('the shipped public/remote-config.json passes the publish check', () => {
    const j: unknown = JSON.parse(readFileSync('public/remote-config.json', 'utf8'));
    expect(validateRemoteConfig(j as never)).toEqual([]);
    expect(loadRemoteConfig(j)).toEqual(defaultRemoteConfig());
  });

  it('fails publish unless every chest odds sum to 100', () => {
    const c = defaultRemoteConfig();
    c.chests.gold.odds.L = 3;
    expect(validateRemoteConfig(c)).toContain('chests.gold.odds must sum to 100');
    c.chests.gold.odds = { C: 60, R: 28, E: 11, L: 1 };
    expect(validateRemoteConfig(c)).toEqual([]);
  });

  it('caps can be lowered but never raised past the G5 guardrail (4/session, 15/day)', () => {
    const c = defaultRemoteConfig();
    expect(c.ads.interstitialPerSession).toBe(CAP_LIMITS.interstitialPerSession);
    expect(c.ads.interstitialPerDay).toBe(CAP_LIMITS.interstitialPerDay);
    c.ads.interstitialPerSession = 6;
    c.ads.interstitialPerDay = 20;
    expect(validateRemoteConfig(c)).toHaveLength(2);
    expect(loadRemoteConfig(c).ads.interstitialPerSession).toBe(4); // rejected -> defaults
    expect(
      loadRemoteConfig({ ads: { interstitialPerSession: 2 } }).ads.interstitialPerSession,
    ).toBe(2);
  });

  it('rejects harder-than-base difficulty and bad shapes, falling back to defaults', () => {
    expect(
      validateRemoteConfig({
        ...defaultRemoteConfig(),
        difficulty: { ...saved.difficulty, scaleFloor: 1.2 },
      }),
    ).not.toEqual([]);
    expect(loadRemoteConfig('nope')).toEqual(defaultRemoteConfig());
    expect(loadRemoteConfig({ chests: { wood: { odds: { C: 1 } } } })).toEqual(
      defaultRemoteConfig(),
    );
  });

  it('applyRemoteConfig drives the live odds table', () => {
    const c = defaultRemoteConfig();
    c.chests.wood.odds = { C: 70, R: 25, E: 5, L: 0 };
    applyRemoteConfig(c);
    expect(CHESTS.wood.odds.R).toBe(25);
    const s = defaultSave();
    s.meta.chests.push({ id: 'w', type: 'wood', unlockAt: null, earnedAt: T });
    expect(chestInfoHtml(s, s.meta.chests[0], T)).toContain('25');
  });

  it('G1-G5 interstitial caps read from the remote config', () => {
    const c = loadRemoteConfig({ ads: { interstitialPerSession: 2, interstitialPerDay: 3 } });
    const d = day();
    const p = new AdPacer(d, () => T, c.ads);
    p.recordInterstitial();
    p.recordInterstitial();
    expect(p.canInterstitial()).toBe(false);
    const p2 = new AdPacer(d, () => T, c.ads); // new session, same day
    expect(p2.canInterstitial()).toBe(true);
    p2.recordInterstitial();
    expect(p2.canInterstitial()).toBe(false); // 3/day
  });
});

describe('M5-5 rewarded placements', () => {
  it('placement caps: chest skip 3/session 8/day, daily pack 1/day, away doubler 1/session 3/day', () => {
    expect(AD_CAPS.placements.chest_skip).toEqual({ session: 3, day: 8 });
    expect(AD_CAPS.placements.daily_pack).toEqual({ session: 1, day: 1 });
    expect(AD_CAPS.placements.away_doubler).toEqual({ session: 1, day: 3 });
    const d = day();
    let used = 0;
    for (let session = 0; session < 4; session++) {
      const p = new AdPacer(d, () => T);
      while (p.canRewarded('chest_skip')) {
        p.recordRewarded('chest_skip');
        used++;
      }
    }
    expect(used).toBe(8);
    const p = new AdPacer(d, () => T);
    p.recordRewarded('daily_pack');
    expect(new AdPacer(d, () => T).canRewarded('daily_pack')).toBe(false);
    expect(new AdPacer(d, () => T + 86_400_000).canRewarded('daily_pack')).toBe(true);
  });

  it('never offers a chest skip (ad or ticket) on the first chest', () => {
    const s = defaultSave();
    s.skipTickets = 2;
    const rng = createRng(1);
    const id = awardChest(s, 'silver', T, rng)!;
    startUnlock(s, id, T);
    expect(chestSkipAllowed(s)).toBe(false);
    expect(useSkipTicket(s, id, T)).toBe(false);
    s.meta.chestsOpened = 1;
    const before = s.meta.chests[0].unlockAt! - T;
    expect(useSkipTicket(s, id, T)).toBe(true);
    expect(s.meta.chests[0].unlockAt! - T).toBe(Math.ceil(before / 2));
    expect(s.skipTickets).toBe(1);
  });

  it('chest screen shows the ad and ticket buttons only when allowed', () => {
    const s = defaultSave();
    s.meta.chests.push({ id: 'c', type: 'silver', unlockAt: T + 3_600_000, earnedAt: T });
    const c = s.meta.chests[0];
    expect(chestInfoHtml(s, c, T)).not.toContain('data-a="halve"');
    const html = chestInfoHtml(s, c, T, { canHalve: true, canTicket: true, tickets: 3 });
    expect(html).toContain('data-a="halve"');
    expect(html).toContain('data-a="ticket"');
    expect(chestInfoHtml(s, c, T, { canHalve: false, canTicket: true, tickets: 0 })).not.toContain(
      'ticket"',
    );
  });

  it('daily pack opens wood-odds cards immediately', () => {
    const s = defaultSave();
    const r = openDailyPack(s, createRng(3));
    expect(r.type).toBe('wood');
    expect(r.cards.length).toBeGreaterThan(0);
    expect(s.meta.chestsOpened).toBe(1);
  });

  it('away doubler pays idle honey twice only when the ad completed', () => {
    const s = defaultSave();
    s.meta.hive.honey = { level: 1, buildUntil: null } as never;
    s.meta.honeyAt = T - 3 * 3_600_000;
    const c0 = s.coins;
    const once = collectHoneyAway(structuredClone(s), T, false);
    const twice = collectHoneyAway(s, T, true);
    expect(once).toBeGreaterThan(0);
    expect(twice).toBe(once * 2);
    expect(s.coins - c0).toBe(twice);
  });

  it('skip tickets are on sale in both the client and server catalogs', () => {
    expect(CATALOG.skip_tickets_10.available).toBe(true);
    expect(SERVER_SKUS.skip_tickets_10.available).toBe(true);
  });
});
