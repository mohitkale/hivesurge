import * as THREE from 'three';
import { haptic, Sfx } from './audio/sfx';
import { canOfferRewarded, canShowInterstitial } from './platform/adPolicy';
import { AdPacer } from './platform/adPacer';
import { applyPurchase } from './platform/entitlements';
import { ResultSession } from './platform/resultSession';
import { MockPlatform } from './platform/mockPlatform';
import { CATALOG, type Sku } from './platform/platform';
import { Analytics } from './analytics/analytics';
import type { SaveData, SaveStore } from './platform/save';
import { QualityScaler } from './render/quality';
import { applyTheme, palette } from './ui/theme';
import { GameScene } from './render/scene';
import { LEVELS } from './sim/levels';
import { nextLevelIndex } from './levels/progress';
import { autoTriggers } from './sim/triggers';
import { Ftue, FtueStep, shouldRunFtue } from './ftue/ftue';
import type { LevelDef } from './sim/types';
import { applyMultiplier, computeRewards, type Rewards } from './sim/rewards';
import { SIM_DT, World } from './sim/world';
import { Hud } from './ui/hud';
import { Input } from './ui/input';
import { PerfOverlay } from './ui/perfOverlay';
import { PerfStats, perfEnabledFromUrl, stressCountFromUrl } from './ui/perfStats';
import { UnitKind } from './sim/types';

type Phase = 'title' | 'battle' | 'result' | 'ad';

export class Game {
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
  private world: World;
  private scene: GameScene;
  private result = new ResultSession();
  private readonly pacer: AdPacer;
  private hud: Hud | null = null;
  private phase: Phase = 'title';
  private acc = 0;
  private last = performance.now();
  private fireSoundTimer = 0;
  private hitHapticAt = 0;
  private readonly proj = new THREE.Vector3();
  private ftue: Ftue | null = null;
  private readonly perf = new PerfStats();
  private readonly perfOverlay = new PerfOverlay(document.getElementById('app')!);
  private readonly stress = stressCountFromUrl(location.search);
  private ftueReported = 0;

  constructor(store: SaveStore) {
    this.store = store;
    this.save = store.data;
    // ftue-m2.md: FTUE counts as done on a later launch once a battle was played.
    if (!this.save.ftueDone && this.save.battlesCompleted > 0) this.save.ftueDone = true;
    this.world = new World(this.currentLevel());
    this.pacer = new AdPacer(this.save.adDay);
    applyTheme(document.documentElement, this.save.settings.colorBlind);
    this.sfx.setMuted(this.save.settings.muted);
    this.scene = this.makeScene();
    this.platform = new MockPlatform(this.overlay, {
      onAdStart: () => this.sfx.setMuted(true),
      onAdEnd: () => this.sfx.setMuted(this.save.settings.muted),
    });
    this.perfOverlay.visible = perfEnabledFromUrl(location.search);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3') this.perfOverlay.visible = !this.perfOverlay.visible;
    });
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.input.firing = false;
    });
    this.resize();
    // First launch: no menu, straight into the FTUE battle.
    if (shouldRunFtue(this.save.ftueDone, this.currentLevel().id)) this.startBattle();
    else this.showTitle();
    requestAnimationFrame(this.frame);
  }

  private resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.scene.resize(Math.max(1, r.width), Math.max(1, r.height));
  }

  private makeScene(): GameScene {
    const sc = new GameScene(this.canvas, this.world.level, palette(this.save.settings.colorBlind));
    sc.setPixelRatio(this.quality.pixelRatio);
    return sc;
  }

  private persist(): void {
    void this.store.commit();
  }

  private haptic(ms: number): void {
    if (this.save.settings.haptics) haptic(ms);
  }

  private updateFtueUi(w: World): void {
    const f = this.ftue!;
    for (; this.ftueReported < f.completed.length; this.ftueReported++) {
      const e = f.completed[this.ftueReported];
      this.analytics.track('ftue_step', {
        step: e.step,
        msSinceFirstInput: e.msSinceFirstInput,
        timedOut: e.timedOut,
      });
    }
    this.hud?.hideHint();
    this.hud?.setPrompt(f.prompt, f.emphasis);
    this.hud?.setQueenFocus(f.step === FtueStep.Queen && w.queenReady);
    const lx = f.leadTargetX(w);
    this.scene.setLeadLine(lx === null ? null : { x: lx, y: w.level.gates[1].y });
  }

  /**
   * Dev `?stress=N`: keep about N units alive (half bees from the hive, half wasps from the nest),
   * topping up every frame because units constantly destroy each other.
   */
  private spawnStress(n: number): void {
    const w = this.world;
    const half = w.level.laneWidth / 2 - 0.5;
    let k = w.stats.fired + w.wasps.count;
    while (w.bees.count + w.wasps.count < n) {
      const x = -half + ((k++ * 0.618) % 1) * 2 * half;
      const beeShort = w.bees.count < n / 2;
      const ok = beeShort
        ? w.bees.spawn(UnitKind.Worker, x, 1.2 + (k % 7) * 0.4)
        : w.wasps.spawn(UnitKind.Wasp, x, w.level.laneLength - 1 - (k % 7) * 0.4);
      if (ok < 0) break;
    }
  }

  private currentLevel(): LevelDef {
    return LEVELS[nextLevelIndex(LEVELS, this.save.bestStars)];
  }

  // ---------- screens ----------
  private showTitle(): void {
    this.phase = 'title';
    const level = this.currentLevel();
    const levelNo = LEVELS.indexOf(level) + 1;
    const best = this.save.bestStars[level.id] ?? 0;
    this.overlay.innerHTML = `
      <div class="modal"><div class="card">
        <div class="title-logo">HIVE<br/>SURGE</div>
        <p>Aim the honey cannon. Fly bees through flower gates to multiply the swarm. Break the wasp nest!</p>
        <p>Level ${levelNo}/${LEVELS.length} · <b>${level.name}</b> · best ${'★'.repeat(best)}${'☆'.repeat(3 - best)}</p>
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
          applyPurchase(this.save, k); // G6: any purchase removes forced ads
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
    this.world = new World(this.currentLevel());
    this.ftue = shouldRunFtue(this.save.ftueDone, this.world.level.id) ? new Ftue() : null;
    this.ftueReported = 0;
    this.scene = this.makeScene();
    this.resize();
    this.overlay.innerHTML = '';
    this.analytics.track('level_start', { level: this.world.level.id });
    this.hud = new Hud(this.hudRoot);
    // FTUE shows a single prompt: hide the generic launch hint from the first frame.
    if (this.ftue) this.hud.hideHint();
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
    if (this.ftue) {
      // Close the FTUE's final step so its ftue_step event is recorded.
      this.ftue.update(this.world, { aimX: 0, firing: false, queen: false }, 0);
      this.updateFtueUi(this.world);
      this.hud?.setPrompt('', false);
      this.scene.setLeadLine(null);
    }
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
      level: this.world.level.id,
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
    // G2 (no rewarded offers in FTUE) + G5 (caps).
    const offerDouble = canOfferRewarded(this.save) && this.pacer.canRewarded('win_double');
    const stars = [0, 1, 2]
      .map((i) => `<span class="${i < r.stars ? '' : 'off'}">★</span>`)
      .join('');
    this.overlay.innerHTML = `<div class="modal"><div class="card">
      <h1>Nest broken!</h1><div class="stars">${stars}</div>
      <p class="reward">🪙 ${r.coins}</p>
      <p class="small">Peak swarm ${this.world.stats.peakBees} · ${Math.ceil(this.world.timeLeft)}s left</p>
      <div class="row">${
        offerDouble
          ? `<button class="btn primary ad" data-a="double">2X 🪙 ${r.coins * 2}</button>
      <button class="btn" data-a="claim">No thanks</button>`
          : '<button class="btn primary" data-a="claim">Collect</button>'
      }</div></div></div>`;
    if (offerDouble)
      this.analytics.track('ad_offered', { placement: 'win_double', type: 'rewarded' });
    this.bind({
      double: async () => {
        if (this.result.isClaimed || !offerDouble) return;
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
    const canRevive =
      this.world.revives === 0 &&
      this.result.canOfferRevive &&
      r.nestDamage >= 0.5 &&
      canOfferRewarded(this.save) &&
      this.pacer.canRewarded('revive');
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
    const id = this.world.level.id;
    this.save.bestStars[id] = Math.max(this.save.bestStars[id] ?? 0, r.stars);
    this.save.battlesCompleted++;
    // FTUE is done after its first win (replays of level 1 run without prompts).
    if (this.ftue && this.world.outcome === 'won') this.save.ftueDone = true;
    const now = Date.now();
    if (canShowInterstitial(this.save, now, rewardedShown) && this.pacer.canInterstitial()) {
      this.save.lastInterstitialAt = now;
      this.pacer.recordInterstitial();
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
    this.pacer.recordRewarded(p);
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
    if (this.perfOverlay.visible) {
      const info = this.scene.renderer.info.render;
      this.perf.sample(frameMs, info.calls, info.triangles);
      const units = this.world.bees.count + this.world.wasps.count;
      this.perfOverlay.update(dt, this.perf, units, this.quality.pixelRatio);
    }
  };

  private tick(dt: number): void {
    const w = this.world;
    this.input.update(dt, w.maxCannonX, (x, y) => this.scene.pickLaneX(x, y));
    if (this.input.firing) this.hud?.hideHint();
    this.acc += dt;
    let steps = 0;
    const queen = this.input.takeQueen();
    while (this.acc >= SIM_DT && steps < 5) {
      const input = {
        aimX: this.input.aimX,
        firing: this.input.firing,
        queen: queen && steps === 0,
      };
      if (this.ftue) this.ftue.update(w, input, SIM_DT);
      else autoTriggers(w);
      w.step(input);
      this.acc -= SIM_DT;
      steps++;
    }
    if (steps === 5) this.acc = 0;
    if (this.stress > 0) this.spawnStress(this.stress);
    if (this.ftue) this.updateFtueUi(w);

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
