import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyRemoteConfig,
  cachedRemoteConfig,
  defaultRemoteConfig,
  refreshRemoteConfig,
} from '../src/platform/remoteConfig';
import { AdPacer } from '../src/platform/adPacer';
import { MockAdminBackend } from '../src/admin/mockBackend';

const env = { url: 'https://yaizrnbfspmzshdzjcjz.supabase.co', anonKey: 'anon-public' };
const mem = new Map<string, string>();

beforeEach(() => {
  mem.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  applyRemoteConfig(defaultRemoteConfig());
});

const respond = (body: unknown, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);

describe('M6-5 remote config consumed by the game', () => {
  it('an admin publish is applied on the next session start', async () => {
    const admin = new MockAdminBackend('liveops');
    await admin.signIn('ops@example.test');
    const c = defaultRemoteConfig();
    c.ads.interstitialPerSession = 2;
    await admin.publishConfig(c, 'fewer interstitials');
    const live = (await admin.configVersions())[0];
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      expect(url).toBe(
        `${env.url}/rest/v1/remote_config?select=version,config&order=version.desc&limit=1`,
      );
      expect((init?.headers as Record<string, string>).apikey).toBe('anon-public');
      return respond([{ version: live.version, config: live.config }]);
    });
    vi.stubGlobal('fetch', fetchMock);
    // This session: still the old (default) caps.
    expect(cachedRemoteConfig().ads.interstitialPerSession).toBe(4);
    expect(await refreshRemoteConfig(env)).toBe('supabase');
    // Next session start (Game constructor): cached config -> AdPacer caps.
    const rc = cachedRemoteConfig();
    const p = new AdPacer(
      { day: '', rewarded: 0, interstitial: 0, perPlacement: {} },
      () => 0,
      rc.ads,
    );
    p.recordInterstitial();
    p.recordInterstitial();
    expect(p.canInterstitial()).toBe(false);
  });

  it('falls back to the shipped file when nothing is published, and ignores invalid configs', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', (u: string) => {
      urls.push(u);
      return u.includes('/rest/v1/') ? respond([]) : respond(defaultRemoteConfig());
    });
    expect(await refreshRemoteConfig(env)).toBe('file');
    expect(urls).toHaveLength(2);
    const bad = defaultRemoteConfig();
    bad.chests.gold.odds.L = 9;
    vi.stubGlobal('fetch', () => respond([{ config: bad }]));
    mem.clear();
    expect(await refreshRemoteConfig(env)).toBe(false);
    expect(mem.size).toBe(0);
    vi.stubGlobal('fetch', () => respond(null, false));
    expect(await refreshRemoteConfig(env)).toBe(false);
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
    expect(await refreshRemoteConfig(null)).toBe(false);
  });
});
