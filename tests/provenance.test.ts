import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** M3-1a: every asset under public/assets and art/models must be in art/PROVENANCE.md. */
const ROOTS = ['public/assets', 'art/models'];
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const assets = ROOTS.flatMap(walk).filter((p) => !p.endsWith('.md'));

const doc = readFileSync('art/PROVENANCE.md', 'utf8');
const rows = new Map<string, { bytes: number; sha: string; generator: string }>();
for (const m of doc.matchAll(
  /^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|\s*`([0-9a-f]{16})`\s*\|([^|]+)\|/gm,
))
  rows.set(m[1], { bytes: Number(m[2]), sha: m[3], generator: m[4].trim() });

describe('asset provenance (M3-1a)', () => {
  it('covers assets in both roots', () => {
    expect(assets.filter((a) => a.startsWith('public/assets/')).length).toBeGreaterThan(50);
  });
  it('every asset file is listed with a generator', () => {
    const missing = assets.filter((a) => !rows.has(a));
    expect(missing, 'run python3 art/tools/make-provenance.py').toEqual([]);
    for (const a of assets) expect(rows.get(a)!.generator, a).toMatch(/art\/tools\//);
  });
  it('listed size and sha256 match the file (stale entries fail)', () => {
    for (const a of assets) {
      const b = readFileSync(a);
      const r = rows.get(a)!;
      expect(b.length, a).toBe(r.bytes);
      expect(createHash('sha256').update(b).digest('hex').slice(0, 16), a).toBe(r.sha);
    }
  });
  it('no listed file is missing from disk', () => {
    expect([...rows.keys()].filter((p) => !assets.includes(p))).toEqual([]);
  });
  it('states a licence line (TBD until Mohit decides) and the pinned gltfpack', () => {
    expect(doc).toMatch(/\*\*Licence:\*\*/);
    expect(doc).toMatch(/gltfpack \*\*1\.3\.0\*\*/);
  });
});
