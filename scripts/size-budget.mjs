// Build size budget (PLAN M2-16, research PERF-B). Run after `vite build`.
// Fails (exit 1) if the initial JS (entry scripts + modulepreloads in dist/index.html)
// exceeds the gzip or Brotli budget, or if the whole dist/ folder exceeds its budget.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';

export const DEFAULT_BUDGET = {
  initialGzipBytes: 1024 * 1024,
  initialBrotliBytes: 1024 * 1024,
  distBytes: 5 * 1024 * 1024,
};

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** JS files the browser fetches before any dynamic import: module scripts and modulepreloads. */
export function initialJsFiles(distDir) {
  const html = readFileSync(join(distDir, 'index.html'), 'utf8');
  const tags = html.match(/<(script|link)\b[^>]*>/g) ?? [];
  const files = new Set();
  for (const tag of tags) {
    const isScript = tag.startsWith('<script') && /type="module"/.test(tag);
    const isPreload = tag.startsWith('<link') && /rel="modulepreload"/.test(tag);
    if (!isScript && !isPreload) continue;
    const m = tag.match(/(?:src|href)="([^"]+\.js)"/);
    if (m && !/^https?:/.test(m[1])) files.add(join(distDir, m[1].replace(/^\.?\//, '')));
  }
  return [...files];
}

export function measure(distDir) {
  const initial = initialJsFiles(distDir);
  let raw = 0;
  let gzip = 0;
  let brotli = 0;
  for (const f of initial) {
    const buf = readFileSync(f);
    raw += buf.length;
    gzip += gzipSync(buf, { level: 9 }).length;
    brotli += brotliCompressSync(buf).length;
  }
  const distBytes = walk(distDir).reduce((s, f) => s + statSync(f).size, 0);
  return {
    initialFiles: initial,
    initialRawBytes: raw,
    initialGzipBytes: gzip,
    initialBrotliBytes: brotli,
    distBytes,
  };
}

export function checkBudget(distDir, budget = DEFAULT_BUDGET) {
  const m = measure(distDir);
  const failures = [];
  if (m.initialFiles.length === 0) failures.push('no initial JS found in index.html');
  if (m.initialGzipBytes > budget.initialGzipBytes)
    failures.push(`initial JS gzip ${m.initialGzipBytes} B > ${budget.initialGzipBytes} B`);
  if (m.initialBrotliBytes > budget.initialBrotliBytes)
    failures.push(`initial JS brotli ${m.initialBrotliBytes} B > ${budget.initialBrotliBytes} B`);
  if (m.distBytes > budget.distBytes)
    failures.push(`dist ${m.distBytes} B > ${budget.distBytes} B`);
  return { ok: failures.length === 0, failures, ...m };
}

const kb = (n) => `${(n / 1024).toFixed(2)} KiB`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = resolve(process.argv[2] ?? 'dist');
  const r = checkBudget(dist);
  console.log(
    `size budget: initial JS ${kb(r.initialRawBytes)} raw, ${kb(r.initialGzipBytes)} gzip, ` +
      `${kb(r.initialBrotliBytes)} brotli (limit 1 MiB) · dist ${kb(r.distBytes)} (limit 5 MiB)`,
  );
  if (!r.ok) {
    for (const f of r.failures) console.error(`size budget FAILED: ${f}`);
    process.exit(1);
  }
}
