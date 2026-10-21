// M6-2: prove the admin panel is a separate entry. The player build (dist/) must contain no
// admin.html and no file with the admin marker; the admin build (dist-admin/) must have both.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MARKER = 'HIVESURGE_ADMIN_PANEL';

function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

export function splitProblems(dist, distAdmin) {
  const bad = [];
  const player = files(dist);
  if (!player.length) bad.push(`${dist} is empty (run vite build first)`);
  if (player.some((p) => p.endsWith('admin.html'))) bad.push('admin.html is in the player build');
  for (const p of player.filter((f) => /\.(js|html|css)$/.test(f)))
    if (readFileSync(p, 'utf8').includes(MARKER)) bad.push(`admin code in player file ${p}`);
  const admin = files(distAdmin);
  if (!admin.some((p) => p.endsWith('admin.html'))) bad.push(`${distAdmin}/admin.html missing`);
  if (!admin.some((p) => p.endsWith('.js') && readFileSync(p, 'utf8').includes(MARKER)))
    bad.push('admin build has no admin chunk');
  return bad;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bad = splitProblems(
    resolve(process.argv[2] ?? 'dist'),
    resolve(process.argv[3] ?? 'dist-admin'),
  );
  if (bad.length) {
    for (const b of bad) console.error(`admin split check FAILED: ${b}`);
    process.exit(1);
  }
  console.log('admin split check: player bundle has no admin code; admin entry built separately');
}
