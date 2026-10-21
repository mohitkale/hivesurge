import type {
  AuditRow,
  ConfigVersion,
  LevelOverride,
  PlayerDetail,
  PlayerRow,
  PurchaseRow,
  Stats,
} from './backend';
import { can, GRANT_CAPS, type Role } from './perms';

export const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const when = (s: string | null | undefined) => (s ? esc(s.replace('T', ' ').slice(0, 16)) : '—');
const dis = (ok: boolean) => (ok ? '' : ' disabled title="Your role cannot do this"');

export function bannerHtml(target: string, role: Role | null, email: string | null): string {
  return `<header class="banner" data-testid="sandbox-banner"><b>SANDBOX</b> · ${esc(target)}${
    role
      ? ` · ${esc(email ?? '')} <span class="role" data-testid="role">${esc(role)}</span> <button data-act="signout">Sign out</button>`
      : ''
  }</header>`;
}

export const refusedHtml = (reason: string) =>
  `<main class="refused" data-testid="guard"><h1>Admin disabled</h1><p>${esc(reason)}</p><p>The admin panel only runs against the sandbox project.</p></main>`;

export function loginHtml(mock: boolean, msg = ''): string {
  return `<main class="login"><h1>Hive Surge admin</h1>
    <form data-form="login"><label>Email <input name="email" type="email" ${mock ? 'value="mock-admin@example.test"' : 'required'} autocomplete="email"></label>
    <button type="submit">${mock ? 'Sign in (mock)' : 'Send magic link'}</button></form>
    ${mock ? '<p class="hint">Mock mode: in-memory seeded data, no backend. Try <code>?role=viewer</code>, <code>support</code>, <code>liveops</code> or <code>none</code>.</p>' : ''}
    <p class="msg" data-testid="login-msg">${esc(msg)}</p></main>`;
}

export const forbiddenHtml = () =>
  `<main class="forbidden" data-testid="forbidden"><h1>403</h1><p>This account is not in <code>admin_users</code>. Ask an owner to grant access (see docs/backend/README.md).</p><button data-act="signout">Sign out</button></main>`;

export const TABS = ['players', 'stats', 'purchases', 'config', 'levels', 'audit'] as const;
export type Tab = (typeof TABS)[number];
const TAB_NAMES: Record<Tab, string> = {
  players: 'Players',
  stats: 'Stats',
  purchases: 'Purchases',
  config: 'Remote config',
  levels: 'Levels',
  audit: 'Audit log',
};
export const navHtml = (cur: Tab) =>
  `<nav>${TABS.map((t) => `<a href="#${t}" class="${t === cur ? 'on' : ''}" data-testid="nav-${t}">${TAB_NAMES[t]}</a>`).join('')}</nav>`;

export function playersHtml(q: string, rows: PlayerRow[]): string {
  return `<section><h2>Player lookup</h2>
  <form data-form="search"><input name="q" value="${esc(q)}" placeholder="user id, exact email or name prefix" size="40"><button>Search</button></form>
  <table data-testid="players"><thead><tr><th>Player</th><th>Email</th><th>Created</th><th>Last seen</th><th>Levels</th><th>Battles</th><th>Coins</th><th>Gems</th><th>Purchases</th><th>Flags</th></tr></thead><tbody>
  ${rows
    .map(
      (r) =>
        `<tr><td><a href="#player/${esc(r.id)}">${esc(r.display_name ?? r.id.slice(0, 8))}</a></td><td>${esc(r.email ?? '—')}</td><td>${when(r.created_at)}</td><td>${when(r.last_seen)}</td><td>${r.levels_cleared}</td><td>${r.battles}</td><td>${r.coins}</td><td>${r.gems}</td><td>${r.purchases}</td><td>${r.guest ? 'guest ' : ''}${r.is_admin ? 'admin' : ''}</td></tr>`,
    )
    .join('')}
  </tbody></table>${rows.length ? '' : '<p>No players found.</p>'}</section>`;
}

interface LedgerEntry {
  id?: string;
  delta?: number;
  reason?: string;
  at?: number;
}

export function playerHtml(d: PlayerDetail, role: Role | null, msg = ''): string {
  const data = d.save?.data ?? {};
  const ledger = (Array.isArray(data.gemLedger) ? data.gemLedger : []) as LedgerEntry[];
  const cap = role ? GRANT_CAPS[role] : { coins: 0, gems: 0 };
  return `<section data-testid="player"><p><a href="#players">← Players</a></p>
  <h2>${esc(d.profile.display_name ?? d.profile.id)}</h2>
  <dl class="kv"><dt>Id</dt><dd><code>${esc(d.profile.id)}</code></dd><dt>Email</dt><dd>${esc(d.email ?? '—')}</dd>
  <dt>Created</dt><dd>${when(d.profile.created_at)}</dd><dt>Save revision</dt><dd>${esc(d.save?.revision ?? 'no cloud save')}</dd>
  <dt>Coins</dt><dd data-testid="coins">${esc(data.coins ?? 0)}</dd><dt>Gems</dt><dd data-testid="gems">${esc(data.gems ?? 0)}</dd>
  <dt>No ads</dt><dd>${data.noAds === true ? 'yes' : 'no'}</dd><dt>Reset epoch</dt><dd>${esc(data.resetEpoch ?? 0)}</dd></dl>
  <p class="msg" data-testid="action-msg">${esc(msg)}</p>
  <div class="actions">
   <form data-form="grant"><h3>Grant test currency</h3>
    <label>Coins <input name="coins" type="number" min="0" max="${cap.coins}" value="0"></label>
    <label>Gems <input name="gems" type="number" min="0" max="${cap.gems}" value="0"></label>
    <label>Reason <input name="reason" minlength="5" placeholder="min 5 chars"></label>
    <button${dis(can(role, 'grant'))} data-testid="grant">Grant</button><small>${role ? `cap ${cap.coins} coins / ${cap.gems} gems` : ''}</small></form>
   <form data-form="reset"><h3>Reset save</h3>
    <label>Reason <input name="reason" minlength="5"></label>
    <label>Type RESET <input name="confirm" autocomplete="off"></label>
    <button class="danger"${dis(can(role, 'reset'))} data-testid="reset">Reset save</button></form>
  </div>
  <h3>Gem ledger</h3><table data-testid="ledger"><thead><tr><th>Entry</th><th>Δ gems</th><th>Reason</th><th>At</th></tr></thead><tbody>
  ${ledger.map((e) => `<tr><td><code>${esc(e.id)}</code></td><td>${esc(e.delta)}</td><td>${esc(e.reason)}</td><td>${e.at ? when(new Date(e.at).toISOString()) : '—'}</td></tr>`).join('')}
  </tbody></table>
  <h3>Purchases (sandbox)</h3>${purchaseTable(d.purchases)}
  <h3>Level progress</h3><table><thead><tr><th>Level</th><th>Stars</th><th>Best coins</th></tr></thead><tbody>
  ${d.progress.map((p) => `<tr><td>${esc(p.level_id)}</td><td>${'★'.repeat(p.best_stars)}</td><td>${p.best_coins}</td></tr>`).join('')}</tbody></table>
  <h3>Audit</h3>${auditTable(d.audit)}
  <details><summary>Events (last ${d.events.length})</summary><table><tbody>
  ${d.events.map((e) => `<tr><td>${when(e.created_at)}</td><td>${esc(e.name)}</td><td><code>${esc(JSON.stringify(e.props))}</code></td></tr>`).join('')}</tbody></table></details>
  <details><summary>Save JSON</summary><pre data-testid="save-json">${esc(JSON.stringify(data, null, 2))}</pre></details>
  </section>`;
}

export function purchaseTable(rows: PurchaseRow[]): string {
  return `<table data-testid="purchases"><thead><tr><th>Time</th><th>User</th><th>SKU</th><th>Provider</th><th>Amount (TEST)</th><th>Status</th><th>Session</th></tr></thead><tbody>
  ${rows
    .map(
      (p) =>
        `<tr class="${esc(p.status)}"><td>${when(p.created_at)}</td><td><a href="#player/${esc(p.user_id)}"><code>${esc(p.user_id.slice(0, 8))}</code></a></td><td>${esc(p.sku)}</td><td>${esc(p.provider)}</td><td>${p.amount == null ? '—' : `${(p.amount / 100).toFixed(2)} ${esc((p.currency ?? '').toUpperCase())}`}</td><td>${esc(p.status)}${p.refunded_at ? ` ${when(p.refunded_at)}` : ''}</td><td><code>${esc(p.session_id ?? '')}</code></td></tr>`,
    )
    .join('')}</tbody></table>`;
}

export function purchasesHtml(
  rows: PurchaseRow[],
  f: { status?: string; sku?: string },
  skus: string[],
): string {
  const opt = (v: string, cur?: string) =>
    `<option value="${esc(v)}"${v === (cur ?? '') ? ' selected' : ''}>${esc(v || 'any')}</option>`;
  return `<section><h2>Sandbox purchase log <small class="test">TEST MODE ONLY</small></h2>
  <form data-form="pfilter"><label>Status <select name="status">${['', 'paid', 'refunded'].map((s) => opt(s, f.status)).join('')}</select></label>
  <label>SKU <select name="sku">${['', ...skus].map((s) => opt(s, f.sku)).join('')}</select></label><button>Filter</button></form>
  ${purchaseTable(rows)}</section>`;
}

export function auditTable(rows: AuditRow[]): string {
  return `<table data-testid="audit"><thead><tr><th>At</th><th>Action</th><th>Target</th><th>Reason</th><th>Admin</th></tr></thead><tbody>
  ${rows.map((a) => `<tr><td>${when(a.at)}</td><td>${esc(a.action)}</td><td>${esc(a.target ?? a.target_user ?? '')}</td><td>${esc(a.reason)}</td><td><code>${esc((a.admin_id ?? '').slice(0, 8))}</code></td></tr>`).join('')}
  </tbody></table>`;
}

/** Horizontal bar chart as inline SVG (no chart library in the admin bundle). */
export function barChart(
  title: string,
  rows: { label: string; values: number[] }[],
  series: string[],
): string {
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  const W = 360;
  const rowH = 14 * series.length + 8;
  const colors = ['#1f6fb8', '#2e8b57', '#c0392b', '#a86f00'];
  const bars = rows
    .map((r, i) => {
      const y = i * rowH;
      return `<text x="0" y="${y + 12}" font-size="11">${esc(r.label)}</text>${r.values
        .map(
          (v, k) =>
            `<rect x="130" y="${y + k * 14}" width="${Math.max(1, (v / max) * (W - 170))}" height="12" fill="${colors[k % 4]}"><title>${esc(series[k])}: ${v}</title></rect><text x="${134 + (v / max) * (W - 170)}" y="${y + k * 14 + 10}" font-size="10">${v}</text>`,
        )
        .join('')}`;
    })
    .join('');
  return `<figure class="chart" data-testid="chart-${esc(title.toLowerCase().replace(/\W+/g, '-'))}"><figcaption>${esc(title)} <small>${series
    .map((s, k) => `<span style="color:${colors[k % 4]}">■</span> ${esc(s)}`)
    .join(
      ' ',
    )}</small></figcaption><svg width="${W}" height="${Math.max(20, rows.length * rowH)}" role="img" aria-label="${esc(title)}">${bars}</svg></figure>`;
}

export function statsHtml(s: Stats, days: number, levelOrder: string[]): string {
  const levels = [...s.levels].sort(
    (a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level),
  );
  const inter = s.ads.filter((a) => a.type === 'interstitial').reduce((n, a) => n + a.watched, 0);
  const rewarded = s.ads
    .filter((a) => a.type !== 'interstitial')
    .reduce((n, a) => n + a.watched, 0);
  return `<section data-testid="stats"><h2>Stats</h2>
  <form data-form="range"><label>Range <select name="days">${[1, 7, 30, 90].map((d) => `<option value="${d}"${d === days ? ' selected' : ''}>last ${d} day${d > 1 ? 's' : ''}</option>`).join('')}</select></label><button>Apply</button></form>
  <div class="cards"><div><b>${s.players}</b> players</div><div><b>${s.sessions}</b> sessions</div>
  <div><b>${s.sessions ? (inter / s.sessions).toFixed(2) : '0'}</b> interstitials / session</div>
  <div><b>${s.players ? (rewarded / s.players).toFixed(2) : '0'}</b> rewarded / player</div></div>
  ${barChart(
    'Level funnel',
    levels.map((l) => ({ label: l.level, values: [l.starts, l.wins, l.fails] })),
    ['starts', 'wins', 'fails'],
  )}
  <table data-testid="funnel"><thead><tr><th>Level</th><th>Starts</th><th>Wins</th><th>Fails</th><th>Win %</th></tr></thead><tbody>
  ${levels.map((l) => `<tr><td>${esc(l.level)}</td><td>${l.starts}</td><td>${l.wins}</td><td>${l.fails}</td><td>${l.starts ? Math.round((100 * l.wins) / l.starts) : 0}%</td></tr>`).join('')}</tbody></table>
  ${barChart(
    'FTUE funnel',
    s.ftue.map((f) => ({ label: `step ${f.step}`, values: [f.players] })),
    ['players'],
  )}
  <h3>Ad pacing</h3><table data-testid="ads"><thead><tr><th>Placement</th><th>Type</th><th>Watched</th><th>Sessions</th></tr></thead><tbody>
  ${s.ads.map((a) => `<tr><td>${esc(a.placement)}</td><td>${esc(a.type)}</td><td>${a.watched}</td><td>${a.sessions}</td></tr>`).join('')}</tbody></table>
  ${barChart(
    'Sandbox revenue (TEST)',
    s.purchases.map((p) => ({ label: `${p.sku} ${p.status}`, values: [p.n] })),
    ['transactions'],
  )}
  </section>`;
}

/** Changed leaf paths between two JSON values (for the config diff). */
export function jsonDiff(a: unknown, b: unknown, path = ''): string[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  const isO = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
  if (!isO(a) || !isO(b) || Array.isArray(a) !== Array.isArray(b))
    return [`${path || '(root)'}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`];
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return keys.flatMap((k) => jsonDiff(a[k], b[k], path ? `${path}.${k}` : k));
}

export function configHtml(
  versions: ConfigVersion[],
  draft: string,
  errors: string[] | null,
  diff: string[],
  role: Role | null,
  msg = '',
): string {
  const live = versions[0];
  const canPub = can(role, 'publish') && errors !== null && errors.length === 0 && diff.length > 0;
  return `<section data-testid="config"><h2>Remote config</h2>
  <p>Live: <b data-testid="live-version">v${live?.version ?? '—'}</b> ${live ? `(${when(live.published_at)}, ${esc(live.note ?? '')})` : '(none published: the game uses its shipped defaults)'}.
  The game applies the live version on the next session start. Chest odds need the owner role.</p>
  <form data-form="config"><textarea name="json" rows="22" cols="90" spellcheck="false" data-testid="config-json">${esc(draft)}</textarea>
  <div><button type="button" data-act="validate" data-testid="validate">Validate</button>
  <input name="note" placeholder="publish note" maxlength="200">
  <button type="submit" data-testid="publish"${canPub ? '' : ' disabled'}>Publish</button></div></form>
  <p class="msg" data-testid="config-msg">${esc(msg)}</p>
  ${errors === null ? '' : errors.length ? `<ul class="errors" data-testid="config-errors">${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : '<p class="ok" data-testid="config-ok">Valid: odds sum to 100 and caps are within the guardrails.</p>'}
  ${diff.length ? `<h3>Diff vs live</h3><ul data-testid="config-diff">${diff.map((d) => `<li><code>${esc(d)}</code></li>`).join('')}</ul>` : ''}
  <h3>Versions</h3><table><thead><tr><th>Version</th><th>Published</th><th>Note</th><th></th></tr></thead><tbody>
  ${versions.map((v, i) => `<tr><td>v${v.version}${v.rolled_back_from ? ` (from v${v.rolled_back_from})` : ''}</td><td>${when(v.published_at)}</td><td>${esc(v.note)}</td><td>${i > 0 ? `<button data-act="rollback" data-v="${v.version}"${dis(can(role, 'rollback'))}>Roll back to this</button>` : 'live'}</td></tr>`).join('')}
  </tbody></table></section>`;
}

export function levelsHtml(
  ids: string[],
  overrides: LevelOverride[],
  sel: string,
  draft: string,
  check: { errors: string[]; notes: string[] } | null,
  role: Role | null,
  msg = '',
): string {
  const ov = new Map(overrides.map((o) => [o.level_id, o]));
  return `<section data-testid="levels"><h2>Levels</h2>
  <p>Shipped levels are data files in <code>src/levels/*.json</code>. Edits here are saved as <code>level_overrides</code> rows (audit-logged) or downloaded as a JSON file for a PR; the game still plays the shipped files.</p>
  <ul class="levels">${ids.map((id) => `<li><a href="#levels/${esc(id)}" class="${id === sel ? 'on' : ''}">${esc(id)}</a>${ov.has(id) ? ` <small>row v${ov.get(id)!.version}</small>` : ''}</li>`).join('')}</ul>
  ${
    sel
      ? `<form data-form="level"><textarea name="json" rows="24" cols="90" spellcheck="false" data-testid="level-json">${esc(draft)}</textarea>
  <div><button type="button" data-act="check-level" data-testid="check-level">Validate</button>
  <input name="reason" placeholder="reason (min 5 chars)"><button type="submit" data-testid="save-level"${dis(can(role, 'saveLevel'))}>Save as row</button>
  <button type="button" data-act="download-level">Download JSON</button></div></form>`
      : ''
  }
  <p class="msg" data-testid="level-msg">${esc(msg)}</p>
  ${check ? `${check.errors.length ? `<ul class="errors" data-testid="level-errors">${check.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : '<p class="ok" data-testid="level-ok">Level parses and runs.</p>'}${check.notes.map((n) => `<p class="note">${esc(n)}</p>`).join('')}` : ''}
  </section>`;
}

export const auditHtml = (rows: AuditRow[]) =>
  `<section><h2>Audit log</h2>${auditTable(rows)}</section>`;
