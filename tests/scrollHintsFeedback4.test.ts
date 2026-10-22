import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fadeState } from '../src/ui/scrollHints';

// Feedback round 4: hidden scrollbars + fade-edge scroll hints.
describe('fadeState', () => {
  it('no fade when the content fits', () => {
    expect(fadeState(0, 300, 300)).toBe('');
    expect(fadeState(0, 301, 300)).toBe('');
  });
  it('fades the end at the top, both in the middle, the start at the bottom', () => {
    expect(fadeState(0, 900, 300)).toBe('end');
    expect(fadeState(200, 900, 300)).toBe('both');
    expect(fadeState(600, 900, 300)).toBe('start');
    expect(fadeState(599, 900, 300)).toBe('start');
  });
});

describe('style.css', () => {
  const css = readFileSync('src/style.css', 'utf8');
  it('hides native scrollbars everywhere and never scrolls the page', () => {
    expect(css).toMatch(/\*\s*\{\s*scrollbar-width:\s*none;/);
    expect(css).toMatch(/\*::-webkit-scrollbar\s*\{\s*display:\s*none;/);
    const page = /html,\s*body\s*\{([^}]*)\}/.exec(css)![1];
    expect(page).toMatch(/overflow:\s*hidden/);
  });
  it('modals do not scroll themselves', () => {
    const modal = /\n\.modal \{\n {2}position([^}]*)\}/.exec(css)![1];
    expect(modal).toMatch(/overflow:\s*hidden/);
    expect(modal).not.toMatch(/overflow-y:\s*auto/);
  });
});
