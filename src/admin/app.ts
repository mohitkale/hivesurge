import { LEVELS } from '../levels';
import { defaultRemoteConfig, type RemoteConfig } from '../platform/remoteConfig';
import { SERVER_SKUS } from '../../supabase/functions/_shared/skus.ts';
import { AdminError, type AdminBackend, type ConfigVersion, type LevelOverride } from './backend';
import { checkLevel } from './levelCheck';
import type { Role } from './perms';
import { checkRemoteConfig } from './schemas';
import * as V from './views';

/** Marker the build check uses to prove the admin code never lands in the player bundle. */
export const ADMIN_MARKER = 'HIVESURGE_ADMIN_PANEL';

const DAY = 86_400_000;

/** Hash-routed admin app. All permissions are re-checked by the backend (server or mock). */
export class AdminApp {
  private role: Role | null = null;
  private email: string | null = null;
  private msg = '';
  private q = '';
  private days = 7;
  private pf: { status?: string; sku?: string } = {};
  private cfgDraft: string | null = null;
  private cfgErrors: string[] | null = null;
  private levelDraft: Record<string, string> = {};
  private levelCheck: { errors: string[]; notes: string[] } | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly be: AdminBackend,
    private readonly target: string,
  ) {
    root.dataset.app = ADMIN_MARKER;
    root.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target as HTMLFormElement;
      void this.onForm(f.dataset.form ?? '', new FormData(f), f);
    });
    root.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (b && !(b as HTMLButtonElement).disabled) void this.onAct(b.dataset.act!, b);
    });
    window.addEventListener('hashchange', () => {
      this.msg = '';
      void this.render();
    });
  }

  async start(): Promise<void> {
    const s = await this.be.session();
    if (s) await this.loadRole(s.email);
    await this.render();
  }

  private async loadRole(email: string | null) {
    this.email = email;
    try {
      this.role = await this.be.whoami();
    } catch {
      this.role = null;
    }
  }

  private route(): { tab: V.Tab; arg: string } {
    const [t, ...rest] = location.hash.replace(/^#/, '').split('/');
    if (t === 'player') return { tab: 'players', arg: rest.join('/') };
    const tab = (V.TABS as readonly string[]).includes(t) ? (t as V.Tab) : 'players';
    return { tab, arg: rest.join('/') };
  }

  private set(html: string) {
    this.root.innerHTML = html;
  }

  async render(): Promise<void> {
    const banner = V.bannerHtml(this.target, this.role, this.email);
    const s = await this.be.session();
    if (!s) return this.set(banner + V.loginHtml(this.be.mode === 'mock', this.msg));
    if (!this.role) return this.set(banner + V.forbiddenHtml());
    const { tab, arg } = this.route();
    let body: string;
    try {
      body = await this.view(tab, arg);
    } catch (e) {
      body = `<p class="error" data-testid="error">${V.esc(errText(e))}</p>`;
    }
    this.set(`${banner}${V.navHtml(tab)}<main>${body}</main>`);
  }

  private async view(tab: V.Tab, arg: string): Promise<string> {
    switch (tab) {
      case 'players': {
        if (arg) {
          const d = await this.be.playerDetail(arg);
          return d ? V.playerHtml(d, this.role, this.msg) : '<p>Player not found.</p>';
        }
        return V.playersHtml(this.q, await this.be.findPlayers(this.q));
      }
      case 'stats':
        return V.statsHtml(
          await this.be.stats(
            new Date(Date.now() - this.days * DAY),
            new Date(Date.now() + 60_000),
          ),
          this.days,
          LEVELS.map((l) => l.id),
        );
      case 'purchases':
        return V.purchasesHtml(await this.be.purchases(this.pf), this.pf, Object.keys(SERVER_SKUS));
      case 'config': {
        const versions = await this.be.configVersions();
        const live = liveConfig(versions);
        const draft = this.cfgDraft ?? JSON.stringify(live, null, 2);
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(draft);
        } catch {
          /* shown as a validation error */
        }
        return V.configHtml(
          versions,
          draft,
          this.cfgErrors,
          parsed ? V.jsonDiff(live, parsed) : [],
          this.role,
          this.msg,
        );
      }
      case 'levels': {
        const ov = await this.be.levelOverrides();
        const sel = arg && LEVELS.some((l) => l.id === arg) ? arg : '';
        const draft = sel
          ? (this.levelDraft[sel] ?? JSON.stringify(levelSource(sel, ov), null, 2))
          : '';
        return V.levelsHtml(
          LEVELS.map((l) => l.id),
          ov,
          sel,
          draft,
          sel ? this.levelCheck : null,
          this.role,
          this.msg,
        );
      }
      case 'audit':
        return V.auditHtml(await this.be.audit(200));
    }
  }

  private async onForm(form: string, fd: FormData, el: HTMLFormElement): Promise<void> {
    const str = (k: string) => String(fd.get(k) ?? '');
    const { arg } = this.route();
    try {
      switch (form) {
        case 'login':
          this.msg = await this.be.signIn(str('email').trim());
          if (await this.be.session()) await this.loadRole(str('email').trim() || null);
          break;
        case 'search':
          this.q = str('q');
          break;
        case 'grant': {
          const r = await this.be.grant(
            arg,
            Number(str('coins')),
            Number(str('gems')),
            str('reason'),
          );
          this.msg = `Granted. Balance now ${r.coins} coins / ${r.gems} gems (audit-logged).`;
          break;
        }
        case 'reset':
          await this.be.resetSave(arg, str('reason'), str('confirm'));
          this.msg = 'Save reset (audit-logged). The player gets a fresh save on next sync.';
          break;
        case 'range':
          this.days = Number(str('days')) || 7;
          break;
        case 'pfilter':
          this.pf = { status: str('status') || undefined, sku: str('sku') || undefined };
          break;
        case 'config': {
          this.cfgDraft = str('json');
          const c = await this.validateDraft();
          if (c) {
            const v = await this.be.publishConfig(c, str('note'));
            this.msg = `Published v${v}. Players get it on their next session.`;
            this.cfgDraft = null;
            this.cfgErrors = null;
          }
          break;
        }
        case 'level': {
          const id = arg;
          this.levelDraft[id] = str('json');
          const data = this.checkLevelDraft(id);
          if (data) {
            const v = await this.be.saveLevel(id, data, str('reason'));
            this.msg = `Saved level row ${id} v${v} (audit-logged).`;
          }
          break;
        }
      }
    } catch (e) {
      this.msg = errText(e);
    }
    void el;
    await this.render();
  }

  private async onAct(act: string, el: HTMLElement): Promise<void> {
    try {
      switch (act) {
        case 'signout':
          await this.be.signOut();
          this.role = null;
          this.email = null;
          break;
        case 'validate': {
          this.cfgDraft = (this.root.querySelector('[name=json]') as HTMLTextAreaElement).value;
          this.msg = '';
          await this.validateDraft();
          break;
        }
        case 'rollback': {
          const reason = prompt('Reason for rollback (min 5 chars)') ?? '';
          const v = await this.be.rollbackConfig(Number(el.dataset.v), reason);
          this.msg = `Rolled back: live is now v${v}.`;
          this.cfgDraft = null;
          this.cfgErrors = null;
          break;
        }
        case 'check-level': {
          const id = this.route().arg;
          this.levelDraft[id] = (
            this.root.querySelector('[name=json]') as HTMLTextAreaElement
          ).value;
          this.msg = '';
          this.checkLevelDraft(id);
          break;
        }
        case 'download-level': {
          const id = this.route().arg;
          const txt = (this.root.querySelector('[name=json]') as HTMLTextAreaElement).value;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(
            new Blob([txt.trimEnd() + '\n'], { type: 'application/json' }),
          );
          a.download = `${id}.json`;
          a.click();
          URL.revokeObjectURL(a.href);
          return;
        }
      }
    } catch (e) {
      this.msg = errText(e);
    }
    await this.render();
  }

  /** zod + publish check locally, then the server's own check. */
  private async validateDraft(): Promise<RemoteConfig | null> {
    let json: unknown;
    try {
      json = JSON.parse(this.cfgDraft ?? '');
    } catch (e) {
      this.cfgErrors = [`JSON: ${(e as Error).message}`];
      return null;
    }
    const r = checkRemoteConfig(json);
    if (!r.ok) {
      this.cfgErrors = r.errors;
      return null;
    }
    this.cfgErrors = await this.be.validateConfig(r.config);
    return this.cfgErrors.length ? null : r.config;
  }

  private checkLevelDraft(id: string): Record<string, unknown> | null {
    let json: unknown;
    try {
      json = JSON.parse(this.levelDraft[id] ?? '');
    } catch (e) {
      this.levelCheck = { errors: [`JSON: ${(e as Error).message}`], notes: [] };
      return null;
    }
    this.levelCheck = checkLevel(json, id);
    return this.levelCheck.errors.length ? null : (json as Record<string, unknown>);
  }
}

function errText(e: unknown): string {
  if (e instanceof AdminError) return `${e.status === 403 ? '403 ' : ''}${e.message}`;
  return (e as Error)?.message ?? String(e);
}

function liveConfig(v: ConfigVersion[]): RemoteConfig {
  return v[0]?.config ?? defaultRemoteConfig();
}

function levelSource(id: string, ov: LevelOverride[]): unknown {
  return ov.find((o) => o.level_id === id)?.data ?? LEVELS.find((l) => l.id === id);
}
