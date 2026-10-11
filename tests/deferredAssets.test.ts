import { describe, expect, it, vi } from 'vitest';
import { DeferredAssets } from '../src/platform/deferredAssets';

describe('DeferredAssets (M3-7 progressive loading)', () => {
  it('runs nothing until the first gameplayStart, then every task exactly once', () => {
    const a = vi.fn();
    const b = vi.fn();
    const d = new DeferredAssets([a, b]);
    expect(a).not.toHaveBeenCalled();
    expect(d.isStarted).toBe(false);
    d.onGameplayStart();
    d.onGameplayStart(); // revive / next battle
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(d.isStarted).toBe(true);
  });

  it('a failing task does not stop the others', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const b = vi.fn();
    new DeferredAssets([
      () => {
        throw new Error('x');
      },
      b,
    ]).onGameplayStart();
    expect(b).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
