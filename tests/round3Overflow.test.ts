import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
/** All rule bodies whose selector list is exactly `sel`, joined. */
const block = (sel: string): string => {
  const lines = css.split('\n');
  const out: string[] = [];
  lines.forEach((l, i) => {
    if (l === `${sel} {` && !(lines[i - 1] ?? '').endsWith(','))
      out.push(lines.slice(i, lines.indexOf('}', i)).join('\n'));
  });
  expect(out.length, sel).toBeGreaterThan(0);
  return out.join('\n');
};

describe('round 3: no horizontal overflow on overlay screens', () => {
  it('root guard: html/body, #hud/#overlay and .modal clip overflow-x', () => {
    expect(css).toMatch(/html,\s*body\s*\{[^}]*overflow-x:\s*hidden/);
    expect(css).toMatch(/#hud,\s*#overlay\s*\{[^}]*overflow-x:\s*hidden/);
    expect(block('.modal')).toMatch(/overflow-x:\s*hidden/);
  });
  it('real fix: boost grid columns can shrink and cards never exceed the screen', () => {
    expect(block('.boost-grid')).toMatch(/minmax\(0,\s*1fr\)/);
    expect(block('.boost')).toMatch(/min-width:\s*0/);
    expect(block('.card')).toMatch(/max-width:\s*100%/);
    expect(block('.row')).toMatch(/flex-wrap:\s*wrap/);
  });
  it('juicy buttons calm down under prefers-reduced-motion', () => {
    const rm = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    expect(rm).toMatch(/\.btn\.primary/);
    expect(rm).toMatch(/animation:\s*none/);
  });
});
