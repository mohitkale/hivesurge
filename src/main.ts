import * as THREE from 'three';
import { haptic, Sfx } from './audio/sfx';
import { canShowInterstitial } from './platform/adPolicy';
import { ResultSession } from './platform/resultSession';
import { MockPlatform } from './platform/mockPlatform';
import { CATALOG, type Sku } from './platform/platform';
import { Analytics } from './analytics/analytics';
import { LocalSaveBackend, SaveStore, type SaveData } from './platform/save';
import { QualityScaler } from './render/quality';
import { applyTheme, palette } from './ui/theme';
import { GameScene } from './render/scene';
import { CLOVER_RUN } from './sim/levels';
import { applyMultiplier, computeRewards, type Rewards } from './sim/rewards';
import { SIM_DT, World } from './sim/world';
import { Hud } from './ui/hud';
import { Input } from './ui/input';

type Phase = 'title' | 'battle' | 'result' | 'ad';

class Game {
  private readonly canvas = document.getElementById('game') as HTMLCanvasElement;
  private readonly hudRoot = document.getElementById('hud')!;
  private readonly overlay = document.getElementById('overlay')!;
  private readonly sfx = new Sfx();
  private readonly input = new Input(this.canvas);
  private readonly platform: MockPlatform;
  private readonly store: SaveStore;
  private readonly save: SaveData;
  private readonly analytics = new Analytics(localStorage);
  private readonly quality = new QualityScaler(window.devicePixelRatio || 1);
  private world = new World(CLOVER_RUN);
  private scene: GameScene;
  private result = new ResultSession();
  private hud: Hud | null = null;
  private phase: Phase = 'title';
  private acc = 0;
  private last = performance.now();
  private fireSoundTimer = 0;
  private hitHapticAt = 0;
  private readonly proj = new THREE.Vector3();

  constructor(store: SaveStore) {
    this.store = store;
    this.save = store.data;
    applyTheme(document.documentElement, this.save.settings.colorBlind);
    this.sfx.setMuted(this.save.settings.muted);
    this.scene = this.makeScene();
    this.platform = new MockPlatform(this.overlay, {
      onAdStart: () => this.sfx.setMuted(true),
      onAdEnd: () => this.sfx.setMuted(this.save.settings.muted),
    });
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.input.firing = false;
    });
    this.resize();
    this.showTitle();
    requestAnimationFrame(this.frame);
  }

  private resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.scene.resize(Math.max(1, r.width), Math.max(1, r.height));
  }

  private makeScene(): GameScene {
    const sc = new GameScene(this.canvas, CLOVER_RUN, palette(this.save.settings.colorBlind));
    // Dev-only hook for art/QA measurement scripts (stripped from production builds).
    if (import.meta.env.DEV) (window as unknown as { __hsScene: GameScene }).__hsScene = sc;
    sc.setPixelRatio(this.quality.pixelRatio);
    return sc;
  }

  private persist(): void {
    void this.store.commit();
  }

  private haptic(ms: number): void {
    if (this.save.settings.haptics) haptic(ms);
  }

  // ---------- screens ----------
  private showTitle(): void {
    this.phase = 'title';
    const best = this.save.bestStars[CLOVER_RUN.id] ?? 0;
    this.overlay.innerHTML = `
      <div class="modal"><div class="card">
        <div class="title-logo">HIVE<br/>SURGE</div>
        <p>Aim the honey cannon. Fly bees through flower gates to multiply the swarm. Break the wasp nest!</p>
        <p><b>${CLOVER_RUN.name}</b> · best ${'★'.repeat(best)}${'☆'.repeat(3 - best)}</p>
        <p class="small">🪙 ${this.save.coins} · 💎 ${this.save.gems}${this.save.noAds ? ' · no forced ads' : ''}</p>
        <div class="row"><button class="btn primary" data-a="play">PLAY</button></div>
        <div class="row"><button class="btn" data-a="shop">Shop (sandbox)</button></div>
        <div class="row"><button class="btn" data-a="cb">Colour-blind: ${this.save.settings.colorBlind ? 'on' : 'off'}</button>
        <button class="btn" data-a="hap">Haptics: ${this.save.settings.haptics ? 'on' : 'off'}</button></div>
        <p class="small">Mouse/touch: hold &amp; drag · Keys: ←/→ or A/D, Space fires, Q = Queen</p>
      </div></div>`;
    this.bind({
      play: () => this.startBattle(),
      shop: () => this.showShop(),
      cb: () => {
        this.save.settings.colorBlind = !this.save.settings.colorBlind;
        applyTheme(document.documentElement, this.save.settings.colorBlind);
        this.scene.dispose();
        this.scene = this.makeScene();
        this.resize();
        this.persist();
        this.showTitle();
      },
      hap: () => {
        this.save.settings.haptics = !this.save.settings.haptics;
        this.persist();
        this.showTitle();
      },
    });
  }

  private showShop(): void {
    const items = (Object.keys(CATALOG) as Sku[])
      .map(
        (k) =>
          `<div class="row"><button class="btn" data-a="buy:${k}">${CATALOG[k].title} · ${CATALOG[k].price}</button></div>`,
      )
      .join('');
    this.overlay.innerHTML = `<div class="modal"><div class="card">
      <span class="ad-tag">SANDBOX · nothing is charged</span><h2>Shop</h2>${items}
      <p class="small">Any purchase removes forced ads. Rewarded ads stay optional.</p>
      <div class="row"><button class="btn primary" data-a="back">Back</button></div></div></div>`;
    const handlers: Record<string, () => void> = { back: () => this.showTitle() };
    for (const k of Object.keys(CATALOG) as Sku[]) {
      handlers[`buy:${k}`] = async () => {
        if (await this.platform.purchase(k)) {
          this.analytics.track('purchase', { sku: k, price: CATALOG[k].price, sandbox: true });
          const g = CATALOG[k].grants;
          this.save.coins += g.coins ?? 0;
          this.save.gems += g.gems ?? 0;
          this.save.noAds = true; // any purchase removes forced ads
          this.persist();
        }
        this.showTitle();
      };
    }
    this.bind(handlers);
  }

  private startBattle(): void {
    this.sfx.unlock();
    this.scene.dispose();
    this.world = new World(CLOVER_RUN);
    this.scene = this.makeScene();
    this.resize();
    this.overlay.innerHTML = '';
    this.analytics.track('level_start', { level: CLOVER_RUN.id });
    this.hud = new Hud(this.hudRoot);
    this.hud.queenBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.input.queueQueen();
    });
    this.hud.muteBtn.addEventListener('click', () => {
      this.save.settings.muted = !this.save.settings.muted;
      this.sfx.setMuted(this.save.settings.muted);
      this.hud!.muteBtn.textContent = this.save.settings.muted ? '🔇' : '🔊';
      this.persist();
    });
    this.hud.muteBtn.textContent = this.save.settings.muted ? '🔇' : '🔊';
    this.input.aimX = 0;
    this.input.firing = false;
    this.input.enabled = true;
    this.acc = 0;
    this.phase = 'battle';
    this.platform.gameplayStart();
  }

  private endBattle(): void {
    this.platform.gameplayStop();
    this.input.enabled = false;
    this.input.firing = false;
    const w = this.world;
    const won = w.outcome === 'won';
    this.scene.onEnd(won);
    if (won) this.sfx.win();
    else this.sfx.lose();
    this.haptic(won ? 120 : 250);
    this.analytics.track(won ? 'level_win' : 'level_fail', {
      level: CLOVER_RUN.id,
      time: Math.round(w.time),
      nestLeft: Math.round((w.nestHp / w.level.nestHp) * 100),
      hiveLeft: w.hiveHp,
      peakBees: w.stats.peakBees,
      revives: w.revives,
    });
    this.phase = 'result';
    this.result = new ResultSession();
    const rewards = computeRewards({
      outcome: w.outcome,
      nestHp: w.nestHp,
      nestMax: w.level.nestHp,
      hiveHp: w.hiveHp,
      hiveMax: w.level.hiveHp,
      timeLeft: w.timeLeft,
    });
    setTimeout(() => (won ? this.showWin(rewards) : this.showLoss(rewards)), 900);
  }

  private showWin(r: Rewards): void {
    const stars = [0, 1, 2]
      .map((i) => `<span class="${i < r.stars ? '' : 'off'}">★</span>`)
      .join('');
    this.overlay.innerHTML = `<div class="modal"><div class="card">
      <h1>Nest broken!</h1><div class="stars">${stars}</div>
      <p class="reward">🪙 ${r.coins}</p>
      <p class="small">Peak swarm ${this.world.stats.peakBees} · ${Math.ceil(this.world.timeLeft)}s left</p>
      <div class="row"><button class="btn primary ad" data-a="double">2X 🪙 ${r.coins * 2}</button>
      <button class="btn" data-a="claim">No thanks</button></div></div></div>`;
    this.analytics.track('ad_offered', { placement: 'win_double', type: 'rewarded' });
    this.bind({
      double: async () => {
        if (this.result.isClaimed) return;
        this.disableResultButtons();
        const ok = await this.watchRewarded('win_double');
        this.claim(ok ? applyMultiplier(r, 2) : r);
      },
      claim: () => this.claim(r),
    });
  }

  private showLoss(r: Rewards): void {
    const pct = Math.ceil((1 - r.nestDamage) * 100);
    // Revive is offered only for close calls and once per battle (no offer on every loss).
    const canRevive = this.world.revives === 0 && this.result.canOfferRevive && r.nestDamage >= 0.5;
    this.overlay.innerHTML = `<div class="modal"><div class="card">
      <h1>So close!</h1><p class="reward">Nest at ${pct}% health</p>
      <p class="small">Tip: chain ×2 into ×3 and send the Queen ahead of big waves.</p>
      ${canRevive ? '<div class="row"><button class="btn primary ad" data-a="revive">Revive the hive</button></div>' : ''}
      <div class="row"><button class="btn" data-a="retry">Retry (free)</button>
      <button class="btn" data-a="home">Home · 🪙 ${r.coins}</button></div></div></div>`;
    if (canRevive) this.analytics.track('ad_offered', { placement: 'revive', type: 'rewarded' });
    this.bind({
      revive: async () => {
        if (this.result.isClaimed || !this.result.canOfferRevive) return;
        this.result.markReviveAttempted();
        this.disableResultButtons();
        if ((await this.watchRewarded('revive')) && this.world.revive()) {
          this.result = new ResultSession();
          this.overlay.innerHTML = '';
          this.input.enabled = true;
          this.phase = 'battle';
          this.platform.gameplayStart();
        } else this.showLoss(r);
      },
      retry: () => this.claim(r, true),
      home: () => this.claim(r),
    });
  }

  private async claim(r: Rewards, replay = false): Promise<void> {
    // Idempotent per battle: a second click (or 2X then "No thanks") never credits again.
    if (!this.result.tryClaim()) return;
    this.disableResultButtons();
    const rewardedShown = this.result.rewardedShown;
    this.save.coins += r.coins;
    const prev = this.save.bestStars[CLOVER_RUN.id] ?? 0;
    this.save.bestStars[CLOVER_RUN.id] = Math.max(prev, r.stars);
    this.save.battlesCompleted++;
    const now = Date.now();
    if (canShowInterstitial(this.save, now, rewardedShown)) {
      this.save.lastInterstitialAt = now;
      this.persist();
      this.phase = 'ad';
      this.analytics.track('ad_offered', { placement: 'level_transition', type: 'interstitial' });
      await this.platform.showInterstitial('level_transition');
      this.analytics.track('ad_watched', {
        placement: 'level_transition',
        type: 'interstitial',
        completed: true,
      });
    }
    this.persist();
    if (replay) this.startBattle();
    else {
      this.hudRoot.innerHTML = '';
      this.showTitle();
    }
  }

  private async watchRewarded(p: 'win_double' | 'revive'): Promise<boolean> {
    const prev = this.phase;
    this.phase = 'ad';
    // Any rewarded ad shown (even closed early) blocks an interstitial on this transition.
    this.result.markRewardedShown();
    const ok = await this.platform.showRewarded(p);
    this.analytics.track('ad_watched', { placement: p, completed: ok, type: 'rewarded' });
    this.phase = prev;
    return ok;
  }

  private disableResultButtons(): void {
    this.overlay
      .querySelectorAll<HTMLButtonElement>('[data-a]')
      .forEach((b) => (b.disabled = true));
  }

  private bind(handlers: Record<string, () => void>): void {
    this.overlay.querySelectorAll<HTMLButtonElement>('[data-a]').forEach((b) => {
      const h = handlers[b.dataset.a!];
      if (h)
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          this.sfx.unlock();
          h();
        });
    });
  }

  // ---------- loop ----------
  private frame = (now: number) => {
    requestAnimationFrame(this.frame);
    const frameMs = now - this.last;
    const dt = Math.min(0.1, frameMs / 1000);
    if (this.phase === 'battle' && this.quality.sample(frameMs))
      this.scene.setPixelRatio(this.quality.pixelRatio);
    this.last = now;
    if (this.phase === 'battle') this.tick(dt);
    this.scene.render(this.world, this.phase === 'ad' ? 0 : dt);
  };

  private tick(dt: number): void {
    const w = this.world;
    this.input.update(dt, w.maxCannonX, (x, y) => this.scene.pickLaneX(x, y));
    if (this.input.firing) this.hud?.hideHint();
    this.acc += dt;
    let steps = 0;
    const queen = this.input.takeQueen();
    while (this.acc >= SIM_DT && steps < 5) {
      w.step({ aimX: this.input.aimX, firing: this.input.firing, queen: queen && steps === 0 });
      this.acc -= SIM_DT;
      steps++;
    }
    if (steps === 5) this.acc = 0;

    if (this.input.firing) {
      this.fireSoundTimer -= dt;
      if (this.fireSoundTimer <= 0) {
        this.fireSoundTimer = 0.12;
        this.scene.onFire();
        this.sfx.fire();
      }
    }
    this.sfx.swarm(w.bees.count);
    let nestDmg = 0;
    for (const e of w.drainEvents()) {
      switch (e.type) {
        case 'gate':
          this.scene.onGate(e.gate, e.x, e.y, e.spawned);
          this.sfx.pop(w.bees.count);
          if (e.spawned >= 2 && Math.random() < 0.15) this.float(`+${e.spawned}`, e.x, e.y);
          break;
        case 'trap':
          this.scene.onTrap(e.gate, e.x, e.y);
          break;
        case 'clash':
          this.scene.onClash(e.x, e.y);
          break;
        case 'nestHit':
          nestDmg += e.damage;
          this.scene.onNestHit(e.x, e.damage);
          break;
        case 'hiveHit':
          this.scene.onHiveHit(e.x);
          this.sfx.hurt();
          this.haptic(40);
          break;
        case 'queen':
          this.sfx.queen();
          break;
        case 'end':
          break;
      }
    }
    if (nestDmg > 0) {
      this.sfx.thud();
      if (performance.now() - this.hitHapticAt > 150) {
        this.hitHapticAt = performance.now();
        this.haptic(15);
      }
    }
    this.hud?.update(w);
    if (w.outcome !== 'playing') this.endBattle();
  }

  private float(text: string, x: number, y: number): void {
    this.proj.set(x, 1.5, -y).project(this.scene.camera);
    const r = this.canvas.getBoundingClientRect();
    this.hud?.floater(text, ((this.proj.x + 1) / 2) * r.width, ((1 - this.proj.y) / 2) * r.height);
  }
}

const store = new SaveStore(new LocalSaveBackend(localStorage));
void store.load().then(() => new Game(store));
