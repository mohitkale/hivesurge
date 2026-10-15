import type { World } from '../sim/world';
import { DamagePops, enemyMeter, fmtInt, hiveMeter } from './meters';

/** DOM overlay for in-battle info. Updates are diffed to avoid layout churn. */
export class Hud {
  private readonly nestBar: HTMLElement;
  private readonly hiveBar: HTMLElement;
  private readonly timer: HTMLElement;
  private readonly nestPct: HTMLElement;
  private readonly nestGhost: HTMLElement;
  private readonly nestWrap: HTMLElement;
  private readonly defenders: HTMLElement;
  private readonly hivePct: HTMLElement;
  private readonly hiveWrap: HTMLElement;
  private readonly pops = new DamagePops();
  private lastNest = -1;
  private lastHive = -1;
  private lastDefenders = -1;
  private readonly count: HTMLElement;
  readonly queenBtn: HTMLButtonElement;
  readonly muteBtn: HTMLButtonElement;
  private readonly hint: HTMLElement;
  private readonly prompt: HTMLElement;
  private lastPrompt = '';
  private lastCount = -1;
  private lastTime = -1;

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = `
      <div class="meter enemy bar-wrap top" role="group" aria-label="Enemy nest energy">
        <div class="meter-head"><span class="level-chip" data-lv>LV 1</span><span class="meter-label">🪺 ENEMY NEST</span>
          <span class="meter-def" data-def title="Wasps defending the nest">⚔️ 0</span>
          <span class="chip timer" data-time aria-label="Seconds left">90</span></div>
        <div class="meter-row"><div class="bar nest"><b class="ghost" style="width:100%"></b><i style="width:100%"></i></div>
          <span class="meter-num" data-nest aria-live="off">0</span></div>
        <div class="meter-tip">Enemy energy: hit it with bees!</div></div>
      <div class="meter mine bar-wrap bottom" role="group" aria-label="Your hive energy">
        <div class="meter-tip">Your energy: stop the wasps!</div>
        <div class="meter-row"><span class="meter-label">🍯 YOUR HIVE</span>
          <div class="bar hive"><i style="width:100%"></i></div><span class="meter-num" data-hive>0</span></div></div>
      <div class="level-banner" aria-live="polite"></div>
      <div class="count">0</div>
      <div class="hint">Hold &amp; drag to launch bees</div>
      <div class="ftue-prompt" role="status" aria-live="polite"></div>
      <button class="hud-btn queen-btn" aria-label="Launch Queen" style="--p:0">👑</button>
      <button class="hud-btn mute-btn" aria-label="Toggle sound">🔊</button>`;
    this.nestGhost = root.querySelector('.bar.nest > .ghost')!;
    this.nestWrap = root.querySelector('.meter.enemy')!;
    this.hiveWrap = root.querySelector('.meter.mine')!;
    this.defenders = root.querySelector('[data-def]')!;
    this.hivePct = root.querySelector('[data-hive]')!;
    this.nestBar = root.querySelector('.bar.nest > i')!;
    this.hiveBar = root.querySelector('.bar.hive > i')!;
    this.timer = root.querySelector('[data-time]')!;
    this.nestPct = root.querySelector('[data-nest]')!;
    this.count = root.querySelector('.count')!;
    this.queenBtn = root.querySelector('.queen-btn')!;
    this.muteBtn = root.querySelector('.mute-btn')!;
    this.hint = root.querySelector('.hint')!;
    this.prompt = root.querySelector('.ftue-prompt')!;
  }

  /** FTUE prompt (one line, top third). `emphasis` = timeout fallback pulse. */
  setPrompt(text: string, emphasis: boolean): void {
    if (text !== this.lastPrompt) {
      this.lastPrompt = text;
      this.prompt.textContent = text;
      this.prompt.classList.toggle('show', text !== '');
    }
    this.prompt.classList.toggle('emph', emphasis);
  }

  /** FTUE step 4: bounce the queen button and dim the rest of the HUD. */
  setQueenFocus(on: boolean): void {
    this.root.classList.toggle('queen-focus', on);
  }

  hideHint(): void {
    this.hint.style.display = 'none';
  }

  /** Feedback 2026-10-15: prominent level number (chip + 2 s start banner). */
  showLevel(no: number, name: string, world: string, boss: boolean): void {
    this.root.querySelector('[data-lv]')!.textContent = `LV ${no}`;
    const b = this.root.querySelector<HTMLElement>('.level-banner')!;
    b.innerHTML = `<small>${world}</small><b>LEVEL ${no}</b><span>${boss ? '👑 BOSS · ' : ''}${name}</span>`;
    b.classList.add('show');
    setTimeout(() => b.classList.remove('show'), 2200);
  }

  /** Level 1 tutorial: pulse both meters and show their captions (`on` = intro running). */
  setMeterIntro(on: boolean): void {
    this.root.classList.toggle('meter-intro', on);
  }

  /** Nest damage this tick: drives the "-N" pop, the bar drain ghost and a short shake. */
  nestDamaged(damage: number): void {
    this.pops.add(damage);
  }

  update(w: World): void {
    const nest = enemyMeter(w);
    if (nest.value !== this.lastNest) {
      const drop = this.lastNest >= 0 && nest.value < this.lastNest;
      this.lastNest = nest.value;
      this.nestBar.style.width = `${nest.frac * 100}%`;
      this.nestPct.textContent = fmtInt(nest.value);
      this.nestWrap.setAttribute('aria-label', `Enemy nest energy ${nest.value} of ${nest.max}`);
      if (drop) {
        // The white ghost bar lags behind (CSS transition delay), so hits visibly "drain" it.
        this.nestGhost.style.width = this.nestBar.style.width;
        this.restartAnim(this.nestWrap, 'hit');
      }
    }
    const d = this.pops.take(performance.now());
    if (d > 0) this.pop(`-${fmtInt(d)}`);
    if (nest.defenders !== this.lastDefenders) {
      this.lastDefenders = nest.defenders;
      this.defenders.textContent = `⚔️ ${fmtInt(nest.defenders)}`;
    }
    const hive = hiveMeter(w);
    if (hive.value !== this.lastHive) {
      const drop = this.lastHive >= 0 && hive.value < this.lastHive;
      this.lastHive = hive.value;
      this.hiveBar.style.width = `${hive.frac * 100}%`;
      this.hivePct.textContent = fmtInt(hive.value);
      if (drop) this.restartAnim(this.hiveWrap, 'hit');
    }
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

  private restartAnim(el: HTMLElement, cls: string): void {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  private pop(text: string): void {
    const el = document.createElement('div');
    el.className = 'meter-pop';
    el.textContent = text;
    el.style.left = `${30 + Math.random() * 40}%`;
    this.nestWrap.appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  floater(text: string, x: number, y: number, variant: '' | 'miss' = ''): void {
    const el = document.createElement('div');
    el.className = variant ? `floater ${variant}` : 'floater';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.root.appendChild(el);
    setTimeout(() => el.remove(), variant === 'miss' ? 1000 : 700);
  }
}
