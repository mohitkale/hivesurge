import { describe, expect, it } from 'vitest';
import { canShowInterstitial, INTERSTITIAL_MIN_GAP_MS } from '../src/platform/adPolicy';
import { parseSave } from '../src/platform/save';

const s = { lastInterstitialAt: 0, battlesCompleted: 5, noAds: false };
const later = INTERSTITIAL_MIN_GAP_MS + 1;

describe('ad policy', () => {
  it('allows an interstitial after the gap', () => {
    expect(canShowInterstitial(s, later, false)).toBe(true);
  });
  it('caps at one per three minutes', () => {
    expect(canShowInterstitial({ ...s, lastInterstitialAt: 1000 }, later, false)).toBe(false);
  });
  it('never chains after a rewarded ad', () => {
    expect(canShowInterstitial(s, later, true)).toBe(false);
  });
  it('any purchase removes forced ads', () => {
    expect(canShowInterstitial({ ...s, noAds: true }, later, false)).toBe(false);
  });
  it('first battles are ad-free', () => {
    expect(canShowInterstitial({ ...s, battlesCompleted: 1 }, later, false)).toBe(false);
  });
});

describe('save parsing', () => {
  it('defaults on empty or corrupt data', () => {
    expect(parseSave(null).coins).toBe(0);
    expect(parseSave('{oops').coins).toBe(0);
    expect(parseSave('{"version":9,"coins":5}').coins).toBe(0);
  });
  it('sanitises numbers', () => {
    const d = parseSave('{"version":1,"coins":-5,"gems":12.7,"noAds":"yes"}');
    expect(d.coins).toBe(0);
    expect(d.gems).toBe(12);
    expect(d.noAds).toBe(false);
  });
  it('round-trips valid data', () => {
    const d = parseSave('{"version":1,"coins":300,"bestStars":{"clover-run":2},"noAds":true}');
    expect(d.coins).toBe(300);
    expect(d.bestStars['clover-run']).toBe(2);
    expect(d.noAds).toBe(true);
  });
});
