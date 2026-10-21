import './admin.css';
import { cloudEnv } from '../platform/cloud/config';
import { AdminApp } from './app';
import type { AdminBackend } from './backend';
import { MockAdminBackend } from './mockBackend';
import { ROLES, type Role } from './perms';
import { sandboxGuard } from './sandbox';
import { refusedHtml } from './views';

/** M6 admin entry (`/admin.html`), a separate Vite input that never ships in the player bundle. */
async function boot(): Promise<void> {
  const root = document.getElementById('admin')!;
  const params = new URLSearchParams(location.search);
  const env = params.has('mock') ? null : cloudEnv();
  const raw =
    typeof import.meta.env.VITE_SUPABASE_URL === 'string' ? import.meta.env.VITE_SUPABASE_URL : '';
  const guard = sandboxGuard(env ? env.url : params.has('mock') ? '' : raw);
  if (!guard.ok) {
    root.innerHTML = refusedHtml(guard.reason);
    return;
  }
  let be: AdminBackend;
  let target: string;
  if (env) {
    const { SupabaseAdminBackend } = await import('./supabaseBackend');
    be = await SupabaseAdminBackend.create(env.url, env.anonKey);
    target = `${guard.target} project ${new URL(env.url).hostname.split('.')[0]}`;
  } else {
    const r = params.get('role');
    const role: Role | null =
      r === 'none' ? null : ROLES.includes(r as Role) ? (r as Role) : 'owner';
    be = new MockAdminBackend(role);
    target = 'mock mode (seeded in-memory data)';
  }
  await new AdminApp(root, be, target).start();
}

void boot();
