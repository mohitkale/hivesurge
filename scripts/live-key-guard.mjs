// G17 (guardrails.md): refuse to build if a live payment key is present.
// Scans source, built output and env files for Stripe live keys (sk_live_, pk_live_, rk_live_)
// and RevenueCat production Web Billing keys (rcb_ without the sandbox rcb_sb_ prefix).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIVE_KEY_PATTERNS = [
  /\b(?:sk|pk|rk)_live_[A-Za-z0-9]{8,}/,
  /\brcb_(?!sb_)[A-Za-z0-9_]{8,}/,
];

const SKIP_DIRS = new Set(['node_modules', '.git', 'scripts']);

function walk(dir) {
  if (!existsSync(dir)) return [];
  if (statSync(dir).isFile()) return [dir];
  return readdirSync(dir).flatMap((name) => {
    if (SKIP_DIRS.has(name)) return [];
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Returns offending `file: pattern` strings (never the key itself). */
export function findLiveKeys(roots) {
  const hits = [];
  for (const f of roots.flatMap(walk)) {
    const text = readFileSync(f, 'utf8');
    for (const re of LIVE_KEY_PATTERNS) if (re.test(text)) hits.push(`${f}: matches ${re.source}`);
  }
  return hits;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? '.');
  const envFiles = existsSync(root)
    ? readdirSync(root)
        .filter((n) => n.startsWith('.env'))
        .map((n) => join(root, n))
    : [];
  const hits = findLiveKeys([
    join(root, 'src'),
    join(root, 'dist'),
    join(root, 'dist-review'), // npm run build:review
    join(root, 'index.html'),
    ...envFiles,
  ]);
  if (hits.length) {
    for (const h of hits) console.error(`live-key guard FAILED: ${h}`);
    process.exit(1);
  }
  console.log('live-key guard: no live payment keys found');
}
