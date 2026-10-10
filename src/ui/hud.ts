import type { World } from '../sim/world';

/** DOM overlay for in-battle info. Updates are diffed to avoid layout churn. */
export class Hud {
  private readonly nestBar: HTMLElement;
  private readonly hiveBar: HTMLElement;
  private readonly timer: HTMLElement;
  private readonly nestPct: HTMLElement;
  private readonly count: HTMLElement;
  readonly queenBtn: HTMLButtonElement;
  readonly muteBtn: HTMLButtonElement;
  private readonly hint: HTMLElement;
  private lastCount = -1;
  private lastTime = -1;

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = `
      <div class="bar-wrap top"><span class="chip" data-nest>100%</span>
        <div class="bar nest"><i style="width:100%"></i></div><span class="chip" data-time>90</span></div>
      <div class="bar-wrap bottom"><span class="chip">🏠</span><div class="bar hive"><i style="width:100%"></i></div></div>
      <div class="count">0</div>
      <div class="hint">Hold &amp; drag to launch bees</div>
      <button class="hud-btn queen-btn" aria-label="Launch Queen" style="--p:0">👑</button>
      <button class="hud-btn mute-btn" aria-label="Toggle sound">🔊</button>`;
    this.nestBar = root.querySelector('.bar.nest > i')!;
    this.hiveBar = root.querySelector('.bar.hive > i')!;
    this.timer = root.querySelector('[data-time]')!;
    this.nestPct = root.querySelector('[data-nest]')!;
    this.count = root.querySelector('.count')!;
    this.queenBtn = root.querySelector('.queen-btn')!;
    this.muteBtn = root.querySelector('.mute-btn')!;
    this.hint = root.querySelector('.hint')!;
  }

  hideHint(): void {
    this.hint.style.display = 'none';
  }

  update(w: World): void {
    const nest = Math.max(0, w.nestHp / w.level.nestHp);
    this.nestBar.style.width = `${nest * 100}%`;
    this.nestPct.textContent = `${Math.ceil(nest * 100)}%`;
    this.hiveBar.style.width = `${Math.max(0, (w.hiveHp / w.level.hiveHp) * 100)}%`;
    const t = Math.ceil(w.timeLeft);
    if (t !== this.lastTime) {
      this.lastTime = t;
      this.timer.textContent = String(t);
      this.timer.style.color = t <= 10 ? '#e2557a' : '';
    }
    const c = w.bees.count;
    if (c !== this.lastCount) {
      if (c > this.lastCount + 3) {
        this.count.classList.remove('bump');
        void this.count.offsetWidth;
        this.count.classList.add('bump');
      }
      this.lastCount = c;
      this.count.textContent = `🐝 ${c}`;
    }
    const p = Math.round((w.queenCharge / w.level.queenCharge) * 100);
    this.queenBtn.style.setProperty('--p', String(p));
    this.queenBtn.classList.toggle('ready', w.queenReady);
  }

  floater(text: string, x: number, y: number): void {
    const el = document.createElement('div');
    el.className = 'floater';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }
}
