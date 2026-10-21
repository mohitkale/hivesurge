import type { CloudState } from '../platform/cloud/controller';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const STATUS: Record<CloudState['status'], string> = {
  off: 'off',
  idle: 'on',
  syncing: 'syncing…',
  offline: 'offline (will retry; local save is safe)',
  error: 'error (local save is safe)',
};

/** M4-4 Account panel. Guest play needs none of this; every action is opt-in. */
export function accountHtml(s: CloudState | null, now = Date.now()): string {
  if (!s)
    return `<div class="modal"><div class="card account"><h2>Account</h2>
      <p class="small" role="status">Loading…</p></div></div>`;
  const mock =
    s.kind === 'mock'
      ? '<span class="ad-tag">MOCK CLOUD · this browser only, no Supabase configured</span>'
      : '<span class="ad-tag">SANDBOX backend</span>';
  const email = `<input class="acct-email" id="acct-email" type="email" autocomplete="email"
      inputmode="email" placeholder="you@example.com" aria-label="Email" maxlength="254">`;
  let body: string;
  if (!s.user) {
    body = `<p>You're playing as a <b>guest</b>. Progress is saved on this device.</p>
      <div class="row"><button class="btn" data-a="acct:guest">Turn on cloud save (guest)</button></div>
      <p class="small">Have an account? Get a sign-in link:</p>
      <div class="row">${email}</div>
      <div class="row"><button class="btn" data-a="acct:magic">Email me a link</button></div>`;
  } else {
    const who = s.user.anonymous
      ? 'Guest account (no email yet)'
      : `Signed in as <b>${esc(s.user.email ?? '')}</b>`;
    const ago = s.lastSyncAt
      ? `${Math.max(0, Math.round((now - s.lastSyncAt) / 1000))} s ago`
      : 'not yet';
    body = `<p>${who}</p>
      <p class="small">Cloud save: ${STATUS[s.status]} · last sync ${ago}</p>
      ${
        s.user.anonymous
          ? `<p class="small">Link an email to keep this progress on other devices (same account):</p>
      <div class="row">${email}</div>
      <div class="row"><button class="btn" data-a="acct:link">Link email</button></div>`
          : ''
      }
      <div class="row"><button class="btn" data-a="acct:sync">Sync now</button>
      <button class="btn" data-a="acct:signout">Sign out</button></div>`;
  }
  const msg = s.message ? `<p class="small" role="status">${esc(s.message)}</p>` : '';
  return `<div class="modal"><div class="card account"><h2>Account</h2>${mock}${body}${msg}
    <div class="row"><button class="btn primary" data-a="back">Back</button></div></div></div>`;
}
