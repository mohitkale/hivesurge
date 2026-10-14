import { describe, expect, it } from 'vitest';
import { Analytics, ANALYTICS_MAX, MemoryStore } from '../src/analytics/analytics';
import { LocalSaveBackend, mergeSaves, defaultSave, SaveStore } from '../src/platform/save';
import { QualityScaler } from '../src/render/quality';
import { CB_COLORS, COLORS, palette } from '../src/ui/theme';

describe('analytics', () => {
  it('persists events with session and timestamp', () => {
    const store = new MemoryStore();
    const a = new Analytics(store, () => 1000, 's1');
    a.track('level_start', { level: 'clover-run' });
    a.track('level_win', { stars: 3 });
    const b = new Analytics(store, () => 2000, 's2');
    expect(b.events()).toHaveLength(2);
    expect(b.events()[0]).toEqual({
      name: 'level_start',
      ts: 1000,
      session: 's1',
      props: { level: 'clover-run' },
    });
    expect(b.summary().level_win).toBe(1);
  });
  it('caps the ring buffer', () => {
    const a = new Analytics(new MemoryStore(), () => 0, 's');
    for (let i = 0; i < ANALYTICS_MAX + 20; i++) a.track('ad_offered', { i });
    const ev = a.events();
    expect(ev).toHaveLength(ANALYTICS_MAX);
    expect(ev[0].props.i).toBe(20);
  });
  it('survives corrupt storage', () => {
    const s = new MemoryStore();
    s.setItem('hivesurge.analytics.v1', '{bad');
    expect(new Analytics(s).events()).toEqual([]);
  });
});

describe('save store', () => {
  it('commits with increasing revision and reloads', async () => {
    const kv = new MemoryStore();
    const s = new SaveStore(new LocalSaveBackend(kv), () => 42);
    await s.load();
    s.data.coins = 120;
    await s.commit();
    await s.commit();
    const s2 = new SaveStore(new LocalSaveBackend(kv));
    const d = await s2.load();
    expect(d.coins).toBe(120);
    expect(d.revision).toBe(2);
    expect(d.updatedAt).toBe(42);
  });
  it('merges conflicting saves without losing progress or purchases', () => {
    const a = { ...defaultSave(), revision: 5, coins: 100, bestStars: { x: 1 }, noAds: true };
    const b = { ...defaultSave(), revision: 7, coins: 80, gems: 9, bestStars: { x: 3, y: 2 } };
    const m = mergeSaves(a, b);
    expect(m.coins).toBe(100);
    // 048 follow-up: gems take the lower balance so a spend is never refunded by a merge.
    expect(m.gems).toBe(0);
    expect(m.bestStars).toEqual({ x: 3, y: 2 });
    expect(m.noAds).toBe(true);
    expect(m.revision).toBe(8);
  });
});

describe('quality scaler', () => {
  it('drops pixel ratio under sustained slow frames and recovers', () => {
    const q = new QualityScaler(2);
    expect(q.pixelRatio).toBe(2);
    let changed = false;
    for (let i = 0; i < 200 && !changed; i++) changed = q.sample(33);
    expect(changed).toBe(true);
    expect(q.pixelRatio).toBe(1.5);
    for (let i = 0; i < 2000; i++) q.sample(8);
    expect(q.pixelRatio).toBe(2);
  });
  it('never exceeds the device ratio', () => {
    const q = new QualityScaler(1);
    for (let i = 0; i < 2000; i++) q.sample(5);
    expect(q.pixelRatio).toBe(1);
  });
});

describe('theme', () => {
  it('colour-blind palette swaps gate colours only', () => {
    expect(palette(true).teal).toBe(CB_COLORS.teal);
    expect(palette(false).teal).toBe(COLORS.teal);
    expect(Object.keys(CB_COLORS)).toEqual(Object.keys(COLORS));
  });
});
