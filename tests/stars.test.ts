import { describe, expect, it } from 'vitest';
import { starRowHtml, starsLabel } from '../src/ui/stars';

describe('star rating text (M2-23)', () => {
  it('labels match the earned rating', () => {
    expect(starsLabel(0)).toBe('0 of 3 stars');
    expect(starsLabel(1)).toBe('1 of 3 stars');
    expect(starsLabel(2)).toBe('2 of 3 stars');
    expect(starsLabel(3)).toBe('3 of 3 stars');
  });
  it('star row exposes aria-label and text, icons are decorative', () => {
    for (const n of [0, 1, 2, 3]) {
      const html = starRowHtml(n);
      expect(html).toContain(`aria-label="${starsLabel(n)}"`);
      expect(html).toContain(`<span class="sr-only">${starsLabel(n)}</span>`);
      expect((html.match(/class=""/g) ?? []).length).toBe(n);
      expect((html.match(/aria-hidden="true"/g) ?? []).length).toBe(3);
    }
  });
});
