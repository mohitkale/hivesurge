import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkBudget, initialJsFiles } from '../scripts/size-budget.mjs';

function fakeDist(entryBytes: Buffer, extra: Record<string, Buffer> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'hs-budget-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(
    join(dir, 'index.html'),
    '<script type="module" crossorigin src="./assets/index.js"></script>' +
      '<link rel="modulepreload" href="./assets/pre.js">',
  );
  writeFileSync(join(dir, 'assets/index.js'), entryBytes);
  writeFileSync(join(dir, 'assets/pre.js'), 'export {}');
  writeFileSync(join(dir, 'assets/lazy.js'), 'x'.repeat(1000));
  for (const [k, v] of Object.entries(extra)) writeFileSync(join(dir, k), v);
  return dir;
}

const script = fileURLToPath(new URL('../scripts/size-budget.mjs', import.meta.url));

describe('size budget (M2-16)', () => {
  it('counts entry + modulepreload only, not lazy chunks', () => {
    const dir = fakeDist(Buffer.from('console.log(1)'));
    expect(initialJsFiles(dir).map((f) => f.split('/').pop())).toEqual(['index.js', 'pre.js']);
    expect(checkBudget(dir).ok).toBe(true);
  });

  it('fails when initial JS gzip/brotli exceeds 1 MiB (incompressible data)', () => {
    const dir = fakeDist(randomBytes(1.2 * 1024 * 1024));
    const r = checkBudget(dir);
    expect(r.ok).toBe(false);
    expect(r.failures.join()).toMatch(/gzip/);
    expect(r.failures.join()).toMatch(/brotli/);
    // CLI exits non-zero so `npm run build` fails.
    expect(spawnSync(process.execPath, [script, dir]).status).toBe(1);
  });

  it('fails when dist/ exceeds 5 MiB even if initial JS is small', () => {
    const dir = fakeDist(Buffer.from('console.log(1)'), {
      'assets/big.bin': Buffer.alloc(6 * 1024 * 1024),
    });
    const r = checkBudget(dir);
    expect(r.ok).toBe(false);
    expect(r.failures.join()).toMatch(/^dist/);
    expect(spawnSync(process.execPath, [script, dir]).status).toBe(1);
  });

  it('CLI passes on a small build', () => {
    expect(spawnSync(process.execPath, [script, fakeDist(Buffer.from('1'))]).status).toBe(0);
  });
});
