import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { rankRow, rewardChip, shopItem, skuBlurb, splitLabel, toggleRow } from '../src/ui/gameUi';
import { CATALOG } from '../src/platform/platform';

// Feedback round 4 #2: table-like lists become game-style rows and cards.
describe('game-style UI pieces', () => {
  it('reward chips split icon and value; claimed / locked marks', () => {
    expect(splitLabel('🪙 150')).toEqual(['🪙', '150']);
    expect(splitLabel('🎁 Gold')).toEqual(['🎁', 'Gold']);
    expect(rewardChip('🪙 150')).toContain('<span class="rw-icon">🪙</span><b>150</b>');
    expect(rewardChip('💎 5', 'claimed')).toContain('rw claimed');
    expect(rewardChip('💎 5', 'locked')).toContain('🔒');
  });

  it('toggle rows are full-width switches with aria state', () => {
    const on = toggleRow('hap', '📳', 'Haptics', true);
    expect(on).toContain('data-a="hap"');
    expect(on).toContain('role="switch" aria-checked="true"');
    expect(on).toContain('switch on');
    expect(toggleRow('cb', '🎨', 'Colour-blind', false)).toContain('aria-checked="false"');
  });

  it('rank rows: medals for the top 3, the player highlighted', () => {
    expect(rankRow({ rank: 1, name: 'A', score: 9, you: false })).toContain('🥇');
    expect(rankRow({ rank: 3, name: 'C', score: 7, you: false })).toContain('🥉');
    const me = rankRow({ rank: 12, name: 'You', score: 3, you: true });
    expect(me).toContain('rank you');
    expect(me).toContain('#12');
  });

  it('every SKU gets a product card with what it gives and its price', () => {
    for (const s of Object.values(CATALOG)) {
      const html = shopItem(s, '$1.00');
      expect(html).toContain(`data-a="buy:${s.id}"`);
      expect(html).toContain('$1.00');
      expect(skuBlurb(s).length).toBeGreaterThan(0);
    }
    expect(skuBlurb(CATALOG.gems_small)).toBe('💎 120');
  });

  it('no <table> markup left on the meta screens', () => {
    for (const f of ['src/ui/liveops.ts', 'src/ui/meta.ts', 'src/ui/home.ts', 'src/game.ts'])
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/<table|<tr>|<td>/);
  });
});
