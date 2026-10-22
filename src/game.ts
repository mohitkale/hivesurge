import { DeferredAssets, FIRST_BATTLE_MARK } from './platform/deferredAssets';
import {
  glbEnabledFromUrl,
  loadModelLibrary,
  MODEL_BASE_URL,
  type ModelLibrary,
} from './art/glbLoader';
import * as THREE from 'three';
import { haptic, Sfx } from './audio/sfx';
import { GemReviveCaps, isEventFinalLevel, reviveGemConfig } from './platform/reviveGems';
import { canOfferRewarded, shouldShowInterstitialOnClaim } from './platform/adPolicy';
import { AdPacer } from './platform/adPacer';
import { applyRemoteConfig, cachedRemoteConfig } from './platform/remoteConfig';
import { starterOfferEligible } from './platform/offers';
import { gameClock } from './platform/clock';
import { CHESTS, XP } from './meta/defs';
import {
  addXp,
  awardChest,
  claimFreeChest,
  collectHoney,
  equip,
  openChest,
  recordResult,
  rollLossChest,
  rollWinChest,
  rushBuild,
  settleBuilds,
  skipChestWithGems,
  startBuild,
  startUnlock,
  unlockedSlots,
  upgradeBee,
  chestSkipAllowed,
  useSkipTicket,
  openDailyPack,
  collectHoneyAway,
  honeyPending,
  AWAY_DOUBLE_MIN,
  halveChestTime,
} from './meta/economy';
import { metaMods } from './meta/mods';
import type { RoomId } from './meta/defs';
import {
  beesHtml,
  chestInfoHtml,
  chestOpenHtml,
  chestRowHtml,
  fmtDuration,
  goalBarHtml,
  hiveHtml,
  nextGoal,
  awayOfferHtml,
  dailyPackButtonHtml,
} from './ui/meta';
import { checkoutReturn, purchaseMode } from './purchases/config';
import { recordGems } from './platform/gemLedger';
import { ResultSession } from './platform/resultSession';
import { adModeFromUrl, MockPlatform } from './platform/mockPlatform';
import type { RewardedPlacement, RewardedResult, Sku } from './platform/platform';
import {
  ReviveOffer,
  ReviveSession,
  reviveMinNestDamage,
  shouldOfferRevive,
  UNAVAILABLE_MS,
  type ReviveStep,
} from './platform/revive';
import {
  CATALOG,
  countryFromLocale,
  currencyFor,
  formatPrice,
  visibleSkus,
} from './platform/platform';
import { Analytics } from './analytics/analytics';
import type { SaveData, SaveStore } from './platform/save';
import { AutoQuality, initialTier, qualityOverrideFromUrl } from './render/quality';
import { FixedStepper, startSimTimer } from './sim/fixedStep';
import { FloaterLimiter } from './ui/floaterLimiter';
import { applyTheme, palette } from './ui/theme';
import { GameScene } from './render/scene';
import { LEVELS } from './sim/levels';
import { biomeForLevel, bandTheme } from './art/biomes';
import { SKINS, skinById } from './art/skins';
import { equipSkin, equippedSkinId, pickerEntries } from './platform/skinSelect';
import {
  campaignIndexOf,
  campaignLevel,
  campaignNextIndex,
  levelStrength,
  worldBand,
} from './levels/campaign';
import {
  debugParamsFromUrl,
  NO_DEBUG,
  seedSaveForBattle,
  type DebugParams,
} from './debug/debugParams';
import { aimTraceEnabledFromUrl } from './debug/aimTraceFlag';
import { MISS_CUE, MissCue } from './ui/missCue';
import { shouldShowTrapTip, TRAP_TIP } from './ui/trapTelegraph';
import { autoTriggers } from './sim/triggers';
import { Ftue, FtueStep, ftueDoneOnWin, ftueForLevel, shouldRunFtue } from './ftue/ftue';
import type { LevelDef } from './sim/types';
import { applyMultiplier, computeRewards, type Rewards } from './sim/rewards';
import { SIM_DT, World } from './sim/world';
import { Hud } from './ui/hud';
import { BOOSTS, boostById, DOUBLE_CANNON_DX, type BattleBoosts, type BoostId } from './sim/boosts';
import { mapHtml, mapNodes, starGain, totalStars, type EarnedRewards } from './ui/homeMap';
import { METER_INTRO_S } from './ui/meters';
import { Input } from './ui/input';
import { starRowHtml } from './ui/stars';
import { defeatHeadline } from './ui/defeatCopy';
import { PerfOverlay } from './ui/perfOverlay';
import { collection, homeHtml, mockLeaderboard } from './ui/home';
import { homeChallenges, liveBannerHtml, liveopsHtml } from './ui/liveops';
import { afterBattle, nextEventLevel, openLive, type LiveCtx } from './meta/liveGame';
import {
  claimDaily,
  claimDailyBonus,
  claimMilestone,
  claimTier,
  claimWeekly,
  nextEvent,
  recordAction,
  rerollDaily,
} from './meta/liveops';

import { shakeEnabled } from './render/shake';

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
import { PerfStats, perfEnabledFromUrl, spawnStress, stressCountFromUrl } from './ui/perfStats';
import { gemConfirmHtml, reviveRowHtml } from './ui/reviveOffer';

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
  /** M4-4/5: account + cloud save controller, lazy chunk (null until first needed). */
  private cloud: Promise<import('./platform/cloud/controller').CloudController> | null = null;
  /** M5-7: purchase flow, lazy chunk (null until the shop or a Checkout return needs it). */
  private purchases: Promise<import('./purchases/service').PurchaseService> | null = null;
  /** G13: pop-up IAP offers shown this session (max 1). */
  private popupOffersShown = 0;
  private accountOpen = false;
  /** fix/perf-lowend: auto quality tiers (?quality=low|med|high pins one). */
  private readonly quality: AutoQuality;
  private readonly qualityPinned = qualityOverrideFromUrl(location.search);
  private readonly rendererName = GameScene.probeRendererName();
  /** Fixed-step sim on real time, pumped by rAF and by a timer (not tied to render fps). */
  private readonly stepper = new FixedStepper(SIM_DT);
  private simLast = performance.now();
  private world: World;
  private scene: GameScene;
  /** M3-5 GLB models once loaded (null until then, or if loading failed). */
  private models: ModelLibrary | null = null;
  private result = new ResultSession();
  private readonly pacer: AdPacer;
  private hud: Hud | null = null;
  private phase: Phase = 'title';
  private last = performance.now();
  private fireSoundTimer = 0;
  private hitHapticAt = 0;
  private readonly proj = new THREE.Vector3();
  private ftue: Ftue | null = null;
  /** revive-m2.md: per app session, never saved. */
  private readonly reviveSession = new ReviveSession();
  /** Dev-only QA params (?level, ?revive=force, ?battle=N); production ignores them. */
  private readonly debug: DebugParams = import.meta.env.DEV
    ? debugParamsFromUrl(
        location.search,
        true,
        LEVELS.map((l) => l.id),
      )
    : NO_DEBUG; // production: the parser is tree-shaken out
  private reviveOffer: ReviveOffer | null = null;
  /** M2-21c: gem revive config (C8 remote config seam; defaults = revive-gem.json). */
  private readonly gemConfig = reviveGemConfig();
  /** C2: session cap in memory, daily cap persisted in the save. */
  private readonly gemCaps: GemReviveCaps;
  /** Remote config `revive.minNestDamage` (PR 049); no remote config client yet, so the default. */
  private readonly reviveMinNestDamage = reviveMinNestDamage();
  private reviveTimer = 0;
  private readonly perf = new PerfStats();
  /** Dev-only perf overlay (?debug / F3); null and tree-shaken out of production builds. */
  private readonly perfOverlay: PerfOverlay | null = import.meta.env.DEV
    ? new PerfOverlay(document.getElementById('app')!)
    : null;
  /** Dev-only `?stress=N`; 0 and tree-shaken out of production builds (like the overlay). */
  private readonly stress = import.meta.env.DEV ? stressCountFromUrl(location.search, true) : 0;
  private ftueReported = 0;
  private missCue: MissCue | null = null;
  /** M2-32: sim time when the trap tip hides (0 = not showing). */
  private trapTipUntil = 0;
  /** M2-28d `?trace=aim` (production too, see aimTraceFlag.ts); recorder lazy-loaded. */
  private readonly aimTraceOn = aimTraceEnabledFromUrl(location.search);
  private aimTraceMod: Promise<typeof import('./debug/aimTrace')> | null = null;
  private aimTrace: import('./debug/aimTrace').AimTrace | null = null;
  private aimTraceUnmount: (() => void) | null = null;

  constructor(store: SaveStore) {
    this.store = store;
    this.save = store.data;
    // Dev-only ?battle=N (QA M2-19a): jump to battle N; this.debug is NO_DEBUG in production.
    if (import.meta.env.DEV && this.debug.battle)
      seedSaveForBattle(
        this.save,
        this.debug.battle,
        LEVELS.map((l) => l.id),
      );
    // ftue-m2.md: FTUE counts as done on a later launch once a battle was played. Decision 40:
    // not when FTUE progress is saved (ftueStep > 0); those steps carry on. Old saves have 0.
    if (!this.save.ftueDone && this.save.battlesCompleted > 0 && this.save.ftueStep === 0)
      this.save.ftueDone = true;
    this.world = new World(this.currentLevel());
    // M5-6g: last fetched remote config (validated) drives caps, chest odds and difficulty.
    const rc = cachedRemoteConfig();
    applyRemoteConfig(rc);
    this.pacer = new AdPacer(this.save.adDay, Date.now, rc.ads);
    this.gemCaps = new GemReviveCaps(this.save.reviveGemDay, this.gemConfig.gemCaps);
    applyTheme(document.documentElement, this.save.settings.colorBlind);
    this.sfx.setMuted(this.save.settings.muted);
    this.quality = new AutoQuality(
      initialTier(this.qualityPinned, this.rendererName),
      this.qualityPinned !== null,
      window.devicePixelRatio || 1,
    );
    this.scene = this.makeScene();
    this.input.setPicker((x, y) => this.scene.pickLaneX(x, y), this.world.maxCannonX);
    if (import.meta.env.DEV) (window as unknown as { __hsGame: Game }).__hsGame = this;
    this.platform = new MockPlatform(
      this.overlay,
      {
        onAdStart: () => this.sfx.setMuted(true),
        onAdEnd: () => this.sfx.setMuted(this.save.settings.muted),
      },
      adModeFromUrl(location.search),
    );
    if (import.meta.env.DEV && this.perfOverlay) {
      const overlay = this.perfOverlay;
      overlay.visible = perfEnabledFromUrl(location.search, true);
      window.addEventListener('keydown', (e) => {
        if (e.key === 'F3') overlay.visible = !overlay.visible;
      });
    }
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.input.firing = false;
    });
    this.resize();
    // Round 3 (Mohit): the home screen ALWAYS comes first, first launch / FTUE included.
    this.startMetaTicker();
    this.showTitle();
    this.rafId = requestAnimationFrame(this.frame);
    // Keeps the sim (and input) moving even when frames take longer than a sim step.
    this.stopSimTimer = startSimTimer(this.pumpSim, SIM_DT);
  }

  private rafId = 0;
  private stopSimTimer: () => void = () => {};
  private disposed = false;
  private readonly floaters = new FloaterLimiter();

  /** Teardown (HMR / tests): stop the frame loop and the 60 Hz sim timer, free the GL context. */
  dispose(): void {
    this.disposed = true;
    clearInterval(this.metaTimer);
    cancelAnimationFrame(this.rafId);
    this.stopSimTimer();
    this.scene.dispose();
  }

  /** Current quality tier (debug overlay, perf bench). */
  get qualityTier(): string {
    return this.quality.label;
  }

  private resize(): void {
    const r = this.canvas.getBoundingClientRect();
    this.scene.resize(Math.max(1, r.width), Math.max(1, r.height));
  }

  private makeScene(): GameScene {
    const sc = new GameScene(
      this.canvas,
      this.world.level,
      palette(this.save.settings.colorBlind),
      this.models,
      biomeForLevel(this.levelNo(this.world.level), this.world.level.id, location.search),
      skinById(this.equippedSkin()) ?? null,
      {
        // MSAA only for the high tier on a hardware renderer; fixed per GL context.
        antialias: this.quality.tier === 'high',
        settings: this.quality.settings,
      },
    );
    // Feedback 2026-10-15: stronger nests (later bands, boss) are drawn bigger.
    const no = this.levelNo(this.world.level);
    sc.nestSize = Math.min(1.35, levelStrength(no) * (1 + 0.05 * Math.min(4, worldBand(no))));
    if (this.world.level.bossPhases) sc.nestSize = Math.max(sc.nestSize, 1.25);
    // Dev-only hook for art/QA measurement scripts (stripped from production builds).
    if (import.meta.env.DEV) (window as unknown as { __hsScene: GameScene }).__hsScene = sc;
    sc.setTwinBarrels(!!this.world.boosts.doubleCannon, DOUBLE_CANNON_DX);
    sc.shake.enabled = shakeEnabled(this.save.settings.shake, prefersReducedMotion());
    sc.setPixelRatio(this.quality.pixelRatio);
    return sc;
  }

  private equippedSkin(): string {
    return equippedSkinId(
      this.save,
      SKINS.map((s) => s.id),
    );
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
      // M2-30/M2-33: remember learned steps so a retry does not re-gate or re-prompt them.
      if (e.step > this.save.ftueStep) {
        this.save.ftueStep = e.step;
        this.persist();
      }
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
    this.scene.setLeadLine(lx === null ? null : { x: lx, y: w.level.gates[f.movingGateIndex].y });
    this.scene.setDemoGhost(f.demoX(w)); // M2-30b
  }

  /** M7-3: live-ops context for the current screen (season, running event). */
  private live: LiveCtx = { now: 0, season: null, event: null };
  /** M7-3: set while the player is in an event battle (event level index). */
  private eventPlay: { k: number } | null = null;
  private loginNote = '';

  private refreshLive(): LiveCtx {
    const { ctx, loginDay } = openLive(
      this.save,
      cachedRemoteConfig(),
      gameClock().now(),
      this.stage(),
      Math.random,
    );
    if (loginDay) {
      this.loginNote = `Day ${loginDay} login reward collected`;
      this.persist();
    }
    this.live = ctx;
    return ctx;
  }

  private currentLevel(): LevelDef {
    if (this.eventPlay && this.live.event) return nextEventLevel(this.save, this.live.event).level;
    const dbgIndex = this.debug.level ? campaignIndexOf(this.debug.level) : -1;
    if (dbgIndex >= 0) return campaignLevel(dbgIndex);
    return campaignLevel(campaignNextIndex(this.save.bestStars));
  }

  /** 1-based campaign level number (authored + generated levels). */
  private levelNo(level: LevelDef): number {
    return campaignIndexOf(level.id) + 1;
  }

  // ---------- screens ----------
  /** Feedback 2026-10-15: what the last battle paid (shown once on the home map). */
  private lastEarned: EarnedRewards | null = null;

  /**
   * Round 3 home screen (Mohit playtest 2026-10-16): logo, progress, mode tiles, collection,
   * daily challenges and a mock leaderboard. Shown on EVERY launch (FTUE included) and after
   * every level; Story opens the level map, PLAY goes straight to the boost pick / battle.
   */
  private showTitle(): void {
    this.phase = 'title';
    this.hudRoot.innerHTML = '';
    this.eventPlay = null;
    const live = this.refreshLive();
    const no = this.levelNo(this.currentLevel());
    const stars = totalStars(this.save.bestStars);
    const known = SKINS.map((s) => s.id);
    const sources: Record<string, string> = {};
    for (const sku of Object.values(CATALOG))
      if (sku.grants.skin) sources[sku.grants.skin] = sku.title;
    const bees = pickerEntries(this.save, known, sources).map((e) => ({
      ...e,
      name: skinById(e.id)?.name ?? 'Classic',
    }));
    this.overlay.innerHTML = homeHtml({
      levelNo: no,
      stars,
      coins: this.save.coins,
      gems: this.save.gems,
      earned: this.lastEarned,
      collection: collection(no, bees),
      challenges: homeChallenges(this.save),
      ranks: mockLeaderboard(stars, no),
      meta: `${this.loginNote ? `<p class="small login-note" role="status">🎁 ${this.loginNote}</p>` : ''}${liveBannerHtml(this.save, live, nextEvent(cachedRemoteConfig().events, live.now))}${this.homeMetaHtml()}`,
    });
    this.loginNote = '';
    this.lastEarned = null;
    this.metaScreen = () => this.showTitle();
    this.bind({
      ...this.metaHandlers(),
      play: () => this.showBoosts(),
      'event:play': () => {
        if (!this.live.event) return this.showTitle();
        this.eventPlay = { k: nextEventLevel(this.save, this.live.event).k };
        this.startBattle();
      },
      liveops: () => this.showLiveops(),
      'mode:story': () => this.showMap(),
      shop: () => this.showShop(),
      skin: () => this.showSkins(),
      settings: () => this.showSettings(),
    });
    if (this.save.ftueDone) this.maybeAwayOffer();
  }

  /** Campaign stage n = levels cleared in order (loadout slots, expectedP). */
  private stage(): number {
    return campaignNextIndex(this.save.bestStars);
  }

  /** M5-4/M5-12 home block: next-goal bar, chest row, Bees / Hive buttons. */
  private homeMetaHtml(): string {
    const now = gameClock().now();
    settleBuilds(this.save, now);
    return `${goalBarHtml(nextGoal(this.save, this.stage(), now))}${chestRowHtml(this.save, now)}
      <div class="row"><button class="btn" data-a="bees">🐝 Bees</button><button class="btn" data-a="hive">🏠 Hive</button></div>${this.dailyPackOk() ? `<div class="row">${dailyPackButtonHtml()}</div>` : ''}`;
  }

  private dailyPackOk(): boolean {
    return (
      chestSkipAllowed(this.save) &&
      canOfferRewarded(this.save) &&
      this.pacer.canRewarded('daily_pack')
    );
  }

  /** Away doubler: offered once, at session start only, when idle honey is worth it. */
  private awayChecked = false;
  private maybeAwayOffer(): boolean {
    if (this.awayChecked) return false;
    this.awayChecked = true;
    const now = gameClock().now();
    const coins = honeyPending(this.save, now);
    if (
      coins < AWAY_DOUBLE_MIN ||
      !canOfferRewarded(this.save) ||
      !this.pacer.canRewarded('away_doubler')
    )
      return false;
    this.overlay.insertAdjacentHTML('beforeend', awayOfferHtml(coins));
    this.analytics.track('offer_shown', { offer: 'away_doubler' });
    this.bind({
      'away:double': () => {
        void this.watchRewarded('away_doubler').then((res) => {
          collectHoneyAway(this.save, gameClock().now(), res === 'completed');
          this.persist();
          this.showTitle();
        });
      },
      'away:collect': () => {
        this.analytics.track('offer_declined', { offer: 'away_doubler' });
        collectHoneyAway(this.save, gameClock().now(), false);
        this.persist();
        this.showTitle();
      },
    });
    return true;
  }

  private metaHandlers(): Record<string, () => void> {
    const h: Record<string, () => void> = {
      bees: () => this.showBees(),
      hive: () => this.showHive(),
      dailypack: () => {
        void this.watchRewarded('daily_pack').then((res) => {
          if (res !== 'completed') return this.showTitle();
          const r = openDailyPack(this.save, Math.random);
          this.persist();
          this.metaScreen = null;
          this.overlay.innerHTML = chestOpenHtml(r);
          this.bind({ collect: () => this.showTitle() });
        });
      },
      freechest: () => {
        if (claimFreeChest(this.save, gameClock().now(), Math.random)) this.persist();
        this.showTitle();
      },
    };
    for (const c of this.save.meta.chests) h[`chest:${c.id}`] = () => this.showChest(c.id);
    return h;
  }

  /** Re-render the open meta screen when a timer finishes (null outside meta screens). */
  private metaScreen: (() => void) | null = null;
  private metaTimer = 0;

  private startMetaTicker(): void {
    if (this.metaTimer) return;
    this.metaTimer = window.setInterval(() => {
      if (this.phase !== 'title' || !this.metaScreen) return;
      const now = gameClock().now();
      let done = false;
      this.overlay.querySelectorAll<HTMLElement>('[data-until]').forEach((el) => {
        const left = Number(el.dataset.until) - now;
        if (left <= 0) done = true;
        el.textContent = fmtDuration(left);
      });
      if (done && !this.overlay.querySelector('.checkout-mock, .offer')) this.metaScreen();
    }, 1000);
  }

  private showChest(id: string): void {
    const c = this.save.meta.chests.find((x) => x.id === id);
    if (!c) return this.showTitle();
    const skipOk = chestSkipAllowed(this.save);
    this.overlay.innerHTML = chestInfoHtml(this.save, c, gameClock().now(), {
      canHalve: skipOk && canOfferRewarded(this.save) && this.pacer.canRewarded('chest_skip'),
      canTicket: skipOk,
      tickets: this.save.skipTickets,
    });
    this.metaScreen = () => this.showChest(id);
    this.bind({
      back: () => this.showTitle(),
      halve: () => {
        void this.watchRewarded('chest_skip').then((res) => {
          if (res === 'completed' && halveChestTime(this.save, id, gameClock().now()))
            this.persist();
          this.showChest(id);
        });
      },
      ticket: () => {
        if (useSkipTicket(this.save, id, gameClock().now())) {
          this.analytics.track('ad_watched', {
            placement: 'chest_skip',
            completed: true,
            type: 'ticket',
          });
          this.persist();
        }
        this.showChest(id);
      },
      unlock: () => {
        if (startUnlock(this.save, id, gameClock().now())) this.persist();
        this.showChest(id);
      },
      skip: () => {
        if (skipChestWithGems(this.save, id, gameClock().now())) {
          this.analytics.track('gems_spent', { reason: `chest_skip:${c.type}` });
          this.persist();
        }
        this.showChest(id);
      },
      open: () => {
        const r = openChest(this.save, id, gameClock().now());
        if (!r) return this.showChest(id);
        recordAction(this.save.meta.liveops, 'chest');
        this.persist();
        this.metaScreen = null;
        this.overlay.innerHTML = chestOpenHtml(r);
        this.bind({ collect: () => this.showTitle() });
      },
    });
  }

  private showBees(): void {
    const stage = this.stage();
    this.overlay.innerHTML = beesHtml(this.save, stage);
    this.metaScreen = null;
    const h: Record<string, () => void> = { back: () => this.showTitle() };
    for (const id of Object.keys(this.save.meta.bees)) {
      h[`upgrade:${id}`] = () => {
        if (upgradeBee(this.save, id)) {
          recordAction(this.save.meta.liveops, 'upgrade');
          this.persist();
        }
        this.showBees();
      };
      h[`equip:${id}`] = () => {
        const slots = unlockedSlots(stage);
        let slot = this.save.meta.loadout.findIndex((x, i) => i < slots && !x);
        if (slot < 0) slot = slots - 1; // all full: replace the last slot
        if (slot >= 0 && equip(this.save, slot, id, stage)) this.persist();
        this.showBees();
      };
    }
    for (let i = 0; i < 4; i++)
      h[`unequip:${i}`] = () => {
        if (equip(this.save, i, '', stage)) this.persist();
        this.showBees();
      };
    this.bind(h);
  }

  private showHive(): void {
    const now = gameClock().now();
    settleBuilds(this.save, now);
    this.overlay.innerHTML = hiveHtml(this.save, now);
    this.metaScreen = () => this.showHive();
    const h: Record<string, () => void> = {
      back: () => this.showTitle(),
      rush: () => {
        if (rushBuild(this.save, gameClock().now())) this.persist();
        this.showHive();
      },
      honey: () => {
        collectHoney(this.save, gameClock().now());
        this.persist();
        this.showHive();
      },
    };
    for (const id of ['honey', 'brood', 'wax', 'lab'] as RoomId[])
      h[`build:${id}`] = () => {
        if (startBuild(this.save, id, gameClock().now())) this.persist();
        this.showHive();
      };
    this.bind(h);
  }

  /** M5-4: chest, XP and loss streak after a battle. Returns the banner note. */
  private awardMeta(r: Rewards, won: boolean, levelId: string): string {
    const now = gameClock().now();
    recordResult(this.save, levelId, won);
    const levels = addXp(this.save, won ? XP.win : XP.loss, now);
    const boss = (this.world.level.bossPhases?.length ?? 0) > 0;
    const type = won ? rollWinChest(Math.random, boss) : rollLossChest(Math.random, r.nestDamage);
    const notes: string[] = [];
    if (type) {
      if (awardChest(this.save, type, now, Math.random, { firstWinInstant: won }))
        notes.push(`+${CHESTS[type].name} chest`);
      else if (won) {
        // Flow 2: all slots full, no lost value: coins x1.5 instead of the chest.
        const extra = Math.round(r.coins * 0.5);
        this.save.coins += extra;
        notes.push(`Chest slots full: +🪙 ${extra}`);
      }
    }
    if (levels.length) notes.push(`Account level ${levels[levels.length - 1]}!`);
    return notes.join(' · ');
  }

  /** Story mode level map (feedback 2026-10-15): progress path, Play, back to Home. */
  private showMap(): void {
    this.phase = 'title';
    const idx = campaignIndexOf(this.currentLevel().id);
    const nodes = mapNodes(idx, this.save.bestStars);
    this.overlay.innerHTML = mapHtml({
      nodes,
      coins: this.save.coins,
      gems: this.save.gems,
      stars: totalStars(this.save.bestStars),
      earned: null,
      current: nodes.find((n) => n.state === 'current')!,
    });
    this.bind({
      play: () => this.showBoosts(),
      home: () => this.showTitle(),
      shop: () => this.showShop(),
      skin: () => this.showSkins(),
      settings: () => this.showSettings(),
    });
  }

  /** M4: load the cloud controller once (Supabase client only if env vars are set). */
  private cloudController(): Promise<import('./platform/cloud/controller').CloudController> {
    this.cloud ??= import('./platform/cloud/controller').then(({ CloudController }) =>
      CloudController.create(this.store, {
        events: () => this.analytics.events(),
        onApplied: () => this.onCloudApplied(),
        onChange: () => {
          if (this.accountOpen) void this.showAccount();
        },
      }),
    );
    return this.cloud;
  }

  /** Boot hook (main.ts): a returning signed-in player syncs without opening Account. */
  startCloud(): void {
    this.cloudController().catch((e: unknown) => {
      console.warn('cloud unavailable, playing offline', e);
      this.cloud = null;
    });
  }

  /** A sync merged the cloud save into the running one: refresh what is on screen. */
  private onCloudApplied(): void {
    applyTheme(document.documentElement, this.save.settings.colorBlind);
    this.sfx.setMuted(this.save.settings.muted);
    if (this.phase === 'title' && !this.accountOpen && this.overlay.querySelector('.home'))
      this.showTitle();
  }

  private async showAccount(): Promise<void> {
    this.accountOpen = true;
    const { accountHtml } = await import('./ui/account');
    if (!this.accountOpen) return;
    if (!this.cloud) this.overlay.innerHTML = accountHtml(null);
    let c;
    try {
      c = await this.cloudController();
    } catch {
      this.cloud = null;
      this.overlay.innerHTML = `<div class="modal"><div class="card"><h2>Account</h2>
        <p class="small">Cloud save is unavailable right now. Your progress is saved on this device.</p>
        <div class="row"><button class="btn primary" data-a="back">Back</button></div></div></div>`;
      this.bind({ back: () => this.closeAccount() });
      return;
    }
    if (!this.accountOpen) return;
    const prevEmail = this.overlay.querySelector<HTMLInputElement>('#acct-email')?.value ?? '';
    this.overlay.innerHTML = accountHtml(c.state());
    const input = this.overlay.querySelector<HTMLInputElement>('#acct-email');
    if (input) input.value = prevEmail;
    const email = () => input?.value ?? '';
    this.bind({
      back: () => this.closeAccount(),
      'acct:guest': () => void c.playAsGuest(),
      'acct:magic': () => void c.sendMagicLink(email()),
      'acct:link': () => void c.linkEmail(email()),
      'acct:sync': () => void c.syncNow(),
      'acct:signout': () => void c.signOut(),
    });
  }

  private closeAccount(): void {
    this.accountOpen = false;
    this.showSettings();
  }

  private showSettings(): void {
    this.overlay.innerHTML = `
      <div class="modal"><div class="card"><h2>Settings</h2>
        <div class="row"><button class="btn" data-a="cb">Colour-blind: ${this.save.settings.colorBlind ? 'on' : 'off'}</button>
        <button class="btn" data-a="hap">Haptics: ${this.save.settings.haptics ? 'on' : 'off'}</button>
        <button class="btn" data-a="shake">Screen shake: ${this.save.settings.shake ? 'low' : 'off'}</button></div>
        ${prefersReducedMotion() ? '<p class="small">Reduced motion is on: no screen shake.</p>' : ''}
        <p class="small">Mouse/touch: hold &amp; drag · Keys: ←/→ or A/D, Space fires, Q = Queen</p>
        <p class="small">🪙 ${this.save.coins} · 💎 ${this.save.gems}${this.save.noAds ? ' · no forced ads' : ''}</p>
        <div class="row"><button class="btn" data-a="account">☁️ Account &amp; cloud save</button></div>
        <div class="row"><button class="btn primary" data-a="back">Back</button></div>
      </div></div>`;
    this.bind({
      back: () => this.showTitle(),
      account: () => void this.showAccount(),
      cb: () => {
        this.save.settings.colorBlind = !this.save.settings.colorBlind;
        applyTheme(document.documentElement, this.save.settings.colorBlind);
        this.rebuildScene();
      },
      shake: () => {
        this.save.settings.shake = !this.save.settings.shake;
        this.scene.shake.enabled = shakeEnabled(this.save.settings.shake, prefersReducedMotion());
        this.persist();
        this.showSettings();
      },
      hap: () => {
        this.save.settings.haptics = !this.save.settings.haptics;
        this.persist();
        this.showSettings();
      },
    });
  }

  /**
   * Feedback 2026-10-15: pre-level boost screen. Each boost costs one mock rewarded ad through
   * the platform interface (placement `boost`); one boost per battle. Never offered where
   * rewarded ads are not allowed (G2: FTUE) or over the caps (G5); then Play starts directly.
   */
  private showBoosts(note = '', picked: BoostId | null = null): void {
    if (!canOfferRewarded(this.save) || !this.pacer.canRewarded('boost')) {
      this.startBattle();
      return;
    }
    const no = this.levelNo(this.currentLevel());
    const cards = BOOSTS.map(
      (
        b,
      ) => `<button class="boost${picked === b.id ? ' on' : ''}" data-a="boost:${b.id}" ${picked ? 'disabled' : ''}>
        <span class="bi">${b.icon}</span><b>${b.title}</b><small>${b.desc}</small>
        <span class="watch">${picked === b.id ? '✓ Ready' : '▶ Watch ad'}</span></button>`,
    ).join('');
    this.overlay.innerHTML = `<div class="modal"><div class="card">
      <h2>Level ${no} boosts</h2><p class="small">Watch a short ad to start with one boost.</p>
      <div class="boost-grid">${cards}</div><p class="boost-note" role="status">${note}</p>
      <div class="row"><button class="btn primary" data-a="go">${picked ? 'Start with boost' : 'Start'}</button>
      <button class="btn" data-a="back">Back</button></div></div></div>`;
    const h: Record<string, () => void> = {
      go: () => this.startBattle(picked ? { [picked]: true } : {}),
      back: () => this.showTitle(),
    };
    for (const b of BOOSTS)
      h[`boost:${b.id}`] = async () => {
        if (picked) return;
        this.disableResultButtons();
        this.analytics.track('ad_offered', { placement: 'boost', type: 'rewarded', boost: b.id });
        const res = await this.watchRewarded('boost');
        if (res === 'completed') {
          this.analytics.track('boost_granted', { boost: b.id, level: this.currentLevel().id });
          this.showBoosts(`${b.icon} ${b.title} unlocked!`, b.id);
        } else
          this.showBoosts(
            res === 'closed' ? 'Ad closed early: no boost.' : 'No ad available right now.',
          );
      };
    this.bind(h);
  }

  /** Skin picker (PR 069): owned skins, tap to equip (saved; the battle scene is rebuilt). */
  private showSkins(): void {
    const known = SKINS.map((s) => s.id);
    const current = this.equippedSkin();
    const sources: Record<string, string> = {};
    for (const sku of Object.values(CATALOG))
      if (sku.grants.skin) sources[sku.grants.skin] = sku.title;
    const entries = pickerEntries(this.save, known, sources);
    const rows = entries
      .map(({ id, owned, unlock }) => {
        const on = id === current;
        const name = skinById(id)?.name ?? 'Classic';
        const preview = `<img class="skin-preview" src="${import.meta.env.BASE_URL}assets/skins/${id}.png" alt="" width="40" height="40" onerror="this.style.visibility='hidden'">`;
        return owned
          ? `<div class="row"><button class="btn skin-row${on ? ' primary' : ''}" data-a="skin:${id}" aria-pressed="${on}">${preview}<span>${on ? '✓ ' : ''}${name}</span></button></div>`
          : `<div class="row"><button class="btn skin-row skin-locked" data-a="locked:${id}" disabled aria-disabled="true">${preview}<span>🔒 ${name}<small>${unlock}</small></span></button></div>`;
      })
      .join('');
    this.overlay.innerHTML = `<div class="modal"><div class="card"><h2>Bee skins</h2>${rows}
      <p class="small">Your bees wear the selected skin in battle.</p>
      <div class="row"><button class="btn primary" data-a="back">Back</button></div></div></div>`;
    const handlers: Record<string, () => void> = { back: () => this.showTitle() };
    for (const { id, owned } of entries)
      if (owned)
        handlers[`skin:${id}`] = () => {
          if (equipSkin(this.save, id, known) !== current) {
            this.scene.dispose();
            this.scene = this.makeScene();
            this.resize();
          }
          this.persist();
          this.showSkins();
        };
    this.bind(handlers);
  }

  private rebuildScene(): void {
    this.scene.dispose();
    this.scene = this.makeScene();
    this.resize();
    this.persist();
    this.showTitle();
  }

  /** M5-7: load the purchase flow once (Stripe test mode needs Supabase + a pk_test_ key). */
  private purchaseService(): Promise<import('./purchases/service').PurchaseService> {
    this.purchases ??= (async () => {
      const [{ PurchaseService }, { DomCheckoutUi }] = await Promise.all([
        import('./purchases/service'),
        import('./purchases/checkoutUi'),
      ]);
      const stripe = purchaseMode() === 'stripe';
      const cloud = stripe || this.cloud ? await this.cloudController().catch(() => null) : null;
      return new PurchaseService({
        save: () => this.save,
        device: this.store.device,
        userId: async () => (this.cloud ? ((await this.cloud).user?.id ?? null) : null),
        returnUrl: `${location.origin}${location.pathname}`,
        allowedOrigins: [location.origin],
        kv: localStorage,
        ui: new DomCheckoutUi(this.overlay),
        remote: stripe ? (cloud?.backend.purchases ?? null) : null,
        now: Date.now,
      });
    })();
    return this.purchases;
  }

  /** Buy a SKU through the purchase flow; true when a server-confirmed grant was applied. */
  private async buy(sku: Sku, cur: 'usd' | 'inr', source: string): Promise<boolean> {
    const svc = await this.purchaseService();
    this.analytics.track('purchase_started', { sku, source, mode: svc.mode });
    const out = await svc.buy(sku, cur);
    if (out.status === 'granted') {
      this.analytics.track('purchase', {
        sku,
        price: formatPrice(CATALOG[sku].price, cur),
        sandbox: true,
        provider: out.record.provider,
        source,
      });
      this.afterGrant();
      return true;
    }
    this.analytics.track(out.status === 'cancelled' ? 'purchase_cancelled' : 'purchase_failed', {
      sku,
      reason: out.status === 'failed' ? out.reason : out.status,
    });
    if (out.status === 'failed')
      this.shopMessage =
        out.reason === 'sign_in_required'
          ? 'Sign in first (Settings → Account) to buy with Stripe test mode.'
          : 'Purchase failed. Nothing was charged.';
    else if (out.status === 'pending')
      this.shopMessage = 'Payment received. Your items arrive in a moment (use Restore).';
    else if (out.status === 'cancelled') this.shopMessage = 'Purchase cancelled.';
    return false;
  }

  private shopMessage = '';
  private lastSkin = '';

  /** A purchase grant landed: persist, and rebuild the scene if a skin was auto-equipped. */
  private afterGrant(): void {
    const skin = this.equippedSkin();
    if (skin !== this.lastSkin) {
      this.lastSkin = skin;
      this.scene.dispose();
      this.scene = this.makeScene();
      this.resize();
    }
    this.persist();
  }

  /** Boot hook (main.ts): back from hosted Stripe Checkout (`?checkout=...`). */
  async resumeCheckout(search: string): Promise<void> {
    const ret = checkoutReturn(search);
    if (!ret) return;
    history.replaceState(null, '', location.pathname);
    if (ret.kind === 'cancel') {
      this.analytics.track('purchase_cancelled', { reason: 'checkout_cancel' });
      return;
    }
    const svc = await this.purchaseService();
    this.lastSkin = this.equippedSkin();
    const out = await svc.collect(ret.sessionId, 15);
    if (out.status === 'granted') {
      this.analytics.track('purchase', {
        sku: out.record.sku,
        sandbox: true,
        provider: out.record.provider,
      });
      this.afterGrant();
      if (this.phase === 'title') this.showTitle();
    }
  }

  /** M7-3 Targets & Pass screen (daily, weekly, event milestones, season pass). */
  private showLiveops(note = ''): void {
    const live = this.refreshLive();
    const cur = currencyFor(navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone);
    const sku = CATALOG.season_pass;
    const price = sku.available && live.season ? formatPrice(sku.price, cur) : null;
    this.overlay.innerHTML = liveopsHtml(this.save, live, price);
    if (note)
      this.overlay
        .querySelector('h2')
        ?.insertAdjacentHTML('afterend', `<p class="small" role="status">${note}</p>`);
    this.metaScreen = null;
    const now = live.now;
    const done = (ok: boolean, fail = 'Free a chest slot first.') => {
      if (ok) this.persist();
      this.showLiveops(ok ? '' : fail);
    };
    const h: Record<string, () => void> = {
      back: () => this.showTitle(),
      'claim:bonus': () =>
        done(claimDailyBonus(this.save, now, Math.random, live.season ?? undefined)),
      'buy:season_pass': async () => {
        await this.buy('season_pass', cur, 'liveops');
        this.showLiveops();
      },
    };
    for (let i = 0; i < 3; i++) {
      h[`claim:daily:${i}`] = () =>
        done(claimDaily(this.save, i, now, Math.random, live.season ?? undefined));
      h[`reroll:${i}`] = () =>
        done(rerollDaily(this.save.meta.liveops, i, this.stage()), 'No other target to swap in.');
    }
    for (let i = 0; i < 5; i++)
      h[`claim:weekly:${i}`] = () =>
        done(claimWeekly(this.save, i, now, Math.random, live.season ?? undefined));
    for (let i = 0; i < 10; i++)
      h[`claim:event:${i}`] = () =>
        done(!!live.event && claimMilestone(this.save, live.event, i, now, Math.random));
    for (let t = 1; t <= 30; t++)
      for (const track of ['free', 'premium'] as const)
        h[`tier:${track}:${t}`] = () =>
          done(claimTier(this.save, live.season, t, track, now, Math.random));
    this.bind(h);
  }

  private showShop(): void {
    const cur = currencyFor(navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone);
    const shown = visibleSkus(Object.values(CATALOG), countryFromLocale(navigator.language));
    const items = shown
      .map(
        (s) =>
          `<div class="row"><button class="btn" data-a="buy:${s.id}">${s.title} · ${formatPrice(s.price, cur)}</button></div>`,
      )
      .join('');
    const mode = purchaseMode();
    const tag =
      mode === 'stripe'
        ? 'STRIPE TEST MODE · test cards only, nothing is charged'
        : 'SANDBOX · mock Stripe Checkout, nothing is charged';
    const msg = this.shopMessage ? `<p class="small" role="status">${this.shopMessage}</p>` : '';
    this.shopMessage = '';
    this.overlay.innerHTML = `<div class="modal"><div class="card">
      <span class="ad-tag">${tag}</span><h2>Shop</h2>${items}
      <p class="small">Prices include taxes where applicable. Any purchase removes forced ads. Rewarded ads stay optional.</p>${msg}
      <div class="row"><button class="btn" data-a="restore">Restore purchases</button>
      <button class="btn primary" data-a="back">Back</button></div></div></div>`;
    const handlers: Record<string, () => void> = {
      back: () => this.showTitle(),
      restore: async () => {
        const svc = await this.purchaseService();
        this.lastSkin = this.equippedSkin();
        try {
          const got = await svc.restore();
          this.afterGrant();
          this.shopMessage = got.length
            ? `Restored ${got.length} purchase${got.length > 1 ? 's' : ''}.`
            : 'Everything is already restored.';
        } catch {
          this.shopMessage = 'Could not reach the store. Try again later.';
        }
        this.showShop();
      },
    };
    for (const k of shown.map((s) => s.id)) {
      handlers[`buy:${k}`] = async () => {
        this.lastSkin = this.equippedSkin();
        await this.buy(k, cur, 'shop');
        this.showShop();
      };
    }
    this.bind(handlers);
  }

  private startBattle(boosts: BattleBoosts = {}): void {
    this.sfx.unlock();
    this.scene.dispose();
    this.metaScreen = null;
    const level = this.currentLevel();
    this.world = new World(level, boosts, metaMods(this.save, this.stage(), level.id));
    this.ftue = shouldRunFtue(this.save.ftueDone, this.world.level.id)
      ? ftueForLevel(this.world.level.id, this.save.ftueStep, this.save.ftueStep2Fails + 1)
      : null;
    this.ftueReported = 0;
    this.missCue = new MissCue(this.world.gateRowY.length);
    this.trapTipUntil = 0;
    if (this.aimTraceOn) this.startAimTrace();
    this.scene = this.makeScene();
    this.resize();
    this.overlay.innerHTML = '';
    this.analytics.track('level_start', { level: this.world.level.id });
    this.hud = new Hud(this.hudRoot);
    {
      const ev = this.eventPlay;
      const no = ev ? ev.k + 1 : this.levelNo(this.world.level);
      const world = ev ? 'Event' : (bandTheme(worldBand(no))?.name ?? 'Meadow');
      this.hud.showLevel(no, this.world.level.name, world, !!this.world.level.bossPhases);
      const active = Object.keys(boosts).map((id) => boostById(id));
      if (active.length)
        this.hud.showBoosts(
          `BOOST · ${active.map((b) => `${b!.icon} ${b!.title}`).join(' · ')} · whole level`,
        );
    }
    // FTUE shows a single prompt: hide the generic launch hint from the first frame.
    if (this.ftue || this.save.holdUsed) this.hud.hideHint();
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
    this.input.reset();
    this.input.setPicker((x, y) => this.scene.pickLaneX(x, y), this.world.maxCannonX);
    this.input.enabled = true;
    this.stepper.reset();
    this.quality.onBattleStart();
    this.simLast = performance.now();
    this.phase = 'battle';
    this.platform.gameplayStart();
    if (!this.deferred.isStarted) performance.mark(FIRST_BATTLE_MARK);
    this.deferred.onGameplayStart();
  }

  /**
   * M3-7: M3 art and audio are requested only after the first gameplayStart. The battle
   * starts on procedural models + synth audio; GLBs are swapped into the running scene
   * when they arrive (M3-5: any failure keeps the procedural models).
   */
  private readonly deferred = new DeferredAssets([
    () => {
      if (!glbEnabledFromUrl(location.search)) return;
      void loadModelLibrary({
        baseUrl: `${import.meta.env.BASE_URL}${MODEL_BASE_URL}`,
        onError: (name, err) => console.warn(`[assets] ${name}: procedural fallback`, err),
      }).then((lib) => {
        this.models = lib;
        this.scene.applyModels(lib);
      });
    },
    () => this.sfx.loadCues(),
  ]);

  /** M2-28d: a fresh trace per battle; the module loads once, on the first traced battle. */
  private startAimTrace(): void {
    this.aimTraceUnmount?.();
    this.aimTraceUnmount = null;
    this.aimTrace = null;
    const w = this.world;
    this.aimTraceMod ??= import('./debug/aimTrace');
    void this.aimTraceMod.then((m) => {
      if (this.world !== w) return; // a newer battle started while loading
      this.aimTrace = new m.AimTrace(
        {
          level: w.level.id,
          seed: w.level.seed ?? null,
          viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
        },
        w,
      );
    });
  }

  private endAimTrace(): void {
    const w = this.world;
    const t = this.aimTrace!;
    t.end(
      w.time * 1000,
      w.outcome === 'won' ? 'won' : 'lost',
      Math.round((w.nestHp / w.level.nestHp) * 100),
      w.hiveHp,
    );
    this.aimTraceUnmount?.();
    void this.aimTraceMod!.then((m) => (this.aimTraceUnmount = m.mountTraceExport(t)));
  }

  private endBattle(): void {
    if (this.ftue) {
      // Close the FTUE's final step so its ftue_step event is recorded.
      this.ftue.update(this.world, { aimX: 0, firing: false, queen: false }, 0);
      this.updateFtueUi(this.world);
      this.hud?.setPrompt('', false);
      this.scene.setLeadLine(null);
      this.scene.setDemoGhost(null);
      // M2-30b: count FTUE attempts that ended with step 2 still not learned.
      if (this.ftue.step === FtueStep.Gate && !this.ftue.stepKnown) {
        this.save.ftueStep2Fails++;
        this.persist();
      }
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
    if (this.aimTrace) this.endAimTrace();
    this.analytics.track(won ? 'level_win' : 'level_fail', {
      level: this.world.level.id,
      time: Math.round(w.time),
      nestLeft: Math.round((w.nestHp / w.level.nestHp) * 100),
      hiveLeft: w.hiveHp,
      peakBees: w.stats.peakBees,
      revives: w.revives,
    });
    this.phase = 'result';
    // G4: keep "rewarded ad shown" across a revive (same transition), else start clean.
    this.result = ResultSession.forBattleEnd(this.result, w.revives > 0);
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
    this.overlay.innerHTML = `<div class="modal"><div class="card">
      <h1>Nest broken!</h1>${starRowHtml(r.stars)}
      <p class="reward">🪙 ${r.coins}</p>
      <p class="small">Peak swarm ${this.world.stats.peakBees} · ${Math.ceil(this.world.timeLeft)}s left</p>
      <div class="row">${
        offerDouble
          ? `<button class="btn primary ad" data-a="double">2X 🪙 ${r.coins * 2}</button>
      <button class="btn" data-a="decline">No thanks</button>`
          : '<button class="btn primary" data-a="claim">Collect</button>'
      }</div></div></div>`;
    if (offerDouble)
      this.analytics.track('ad_offered', { placement: 'win_double', type: 'rewarded' });
    this.maybeStarterOffer(r);
    this.bind({
      double: async () => {
        if (this.result.isClaimed || !offerDouble) return;
        this.disableResultButtons();
        const ok = (await this.watchRewarded('win_double')) === 'completed';
        this.claim(ok ? applyMultiplier(r, 2) : r);
      },
      claim: () => this.claim(r),
      // Decision 43: declining the 2X offer blocks the interstitial on this transition.
      decline: () => {
        if (this.result.isClaimed) return;
        this.result.markRewardedDeclined();
        this.claim(r);
      },
    });
  }

  /**
   * M5-7 Starter Pack pop-up over the win screen (G13: max 1 per session, no countdown, equal
   * "No thanks"). Declining blocks the interstitial on this transition (decision 43 / G4).
   */
  private maybeStarterOffer(r: Rewards): void {
    if (!starterOfferEligible(this.save, this.popupOffersShown, CATALOG.starter_pack.available))
      return;
    this.popupOffersShown++;
    const cur = currencyFor(navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone);
    const el = document.createElement('div');
    el.className = 'modal offer';
    el.innerHTML = `<div class="card"><span class="ad-tag">OFFER · sandbox</span>
      <h2>Starter Pack</h2><p>500 🪙 · 50 💎 · Starter bee skin · no forced ads</p>
      <p class="price">${formatPrice(CATALOG.starter_pack.price, cur)}</p>
      <div class="row"><button class="btn" data-o="no">No thanks</button>
      <button class="btn" data-o="buy">View offer</button></div></div>`;
    this.overlay.appendChild(el);
    this.analytics.track('offer_shown', { offer: 'starter_pack', screen: 'win' });
    el.addEventListener('click', async (e) => {
      const o = (e.target as HTMLElement).closest<HTMLElement>('[data-o]')?.dataset.o;
      if (!o) return;
      el.remove();
      if (o === 'no') {
        this.result.markOfferDeclined();
        this.analytics.track('offer_declined', { offer: 'starter_pack' });
        return;
      }
      this.lastSkin = this.equippedSkin();
      const bought = await this.buy('starter_pack', cur, 'offer');
      if (!bought) this.result.markOfferDeclined();
      if (this.phase === 'result' && !this.result.isClaimed) this.showWin(r);
    });
  }

  private showLoss(r: Rewards): void {
    // revive-m2.md: offer only outside FTUE (G2), within caps (G5), on a close call, and
    // only while this battle has not been revived. One ReviveOffer per defeat.
    this.reviveOffer = null;
    const force = this.debug.reviveForce && this.world.revives === 0; // dev-only ?revive=force
    if (
      this.result.canOfferRevive &&
      (force ||
        shouldOfferRevive({
          rewardedAllowed: canOfferRewarded(this.save),
          capsOk: this.pacer.canRewarded('revive'),
          revives: this.world.revives,
          nestDamage: r.nestDamage,
          minNestDamage: this.reviveMinNestDamage,
        }))
    ) {
      this.reviveOffer = new ReviveOffer(this.reviveSession, {
        wallet: this.save,
        price: this.gemConfig.gemPrice,
        caps: this.gemCaps,
        eventFinalLevel: isEventFinalLevel(this.world.level),
      });
      this.analytics.track('ad_offered', {
        placement: 'revive',
        type: 'rewarded',
        nestDamage: r.nestDamage,
        levelId: this.world.level.id,
      });
      this.startReviveCountdown(r);
    }
    this.renderLoss(r);
  }

  private renderLoss(r: Rewards): void {
    const pct = Math.ceil((1 - r.nestDamage) * 100);
    const o = this.reviveOffer;
    let reviveRow = '';
    if (o && o.open)
      reviveRow = o.confirmOpen
        ? gemConfirmHtml(o.gemPrice, this.save.gems)
        : reviveRowHtml({
            button: o.button,
            gemState: o.gemState,
            price: o.gemPrice,
            balance: this.save.gems,
            countdown: o.countdown,
            gemCapNote: o.gemCapNote,
          });
    this.overlay.innerHTML = `<div class="modal"><div class="card">
      <h1 tabindex="-1">${defeatHeadline(r.nestDamage)}</h1><p class="reward">Nest at ${pct}% health</p>
      <p class="small">Tip: chain ×2 into ×3 and send the Queen ahead of big waves.</p>
      ${reviveRow}
      <div class="row"><button class="btn" data-a="retry">Retry (free)</button>
      <button class="btn" data-a="home">Home · 🪙 ${r.coins}</button></div></div></div>`;
    this.bind({
      revive: () => void this.requestRevive(r),
      reviveFree: () => {
        const step = this.reviveOffer?.takeFree();
        if (step) this.applyReviveStep(step, r);
      },
      noThanks: () => {
        const o2 = this.reviveOffer;
        if (!o2 || !o2.open) return;
        this.analytics.track('revive_declined', {
          reason: 'button',
          closesBefore: o2.closes,
          gemBalance: this.save.gems,
          gemButtonState: o2.gemState,
        });
        // Decision 43: a declined revive offer blocks the interstitial on this transition.
        this.result.markRewardedDeclined();
        this.applyReviveStep(o2.decline(), r);
      },
      reviveGems: () => {
        const o2 = this.reviveOffer;
        if (!o2?.openGemConfirm()) return;
        this.analytics.track('revive_gem_confirm', { action: 'open', balance: this.save.gems });
        this.renderLoss(r);
      },
      gemBack: () => {
        const o2 = this.reviveOffer;
        if (!o2?.confirmOpen) return;
        o2.backFromConfirm();
        this.analytics.track('revive_gem_confirm', { action: 'back', balance: this.save.gems });
        this.renderLoss(r);
      },
      gemSpend: () => {
        const o2 = this.reviveOffer;
        const step = o2?.takeGems(this.world.revives);
        if (!step) return;
        this.analytics.track('gems_spent', {
          sink: 'revive',
          amount: step.kind === 'grant' ? (step.price ?? 0) : 0,
          balanceAfter: this.save.gems,
        });
        this.persist(); // debit + daily cap saved before the battle resumes
        this.applyReviveStep(step, r);
      },
      retry: () => this.claim(r, true),
      home: () => this.claim(r),
    });
    // Focus starts on the panel title, never on a button (no default choice).
    this.overlay.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }

  private async requestRevive(r: Rewards): Promise<void> {
    const o = this.reviveOffer;
    if (!o || this.result.isClaimed || !this.result.canOfferRevive) return;
    const attempt = o.request();
    if (!attempt) return;
    this.disableResultButtons();
    this.analytics.track('ad_requested', { placement: 'revive', attempt });
    const res = await this.watchRewarded('revive');
    if (this.reviveOffer !== o || this.result.isClaimed) return;
    const step = o.onAdResult(res);
    if (step.kind === 'closed')
      this.analytics.track('revive_declined', {
        reason: 'no_option',
        closesBefore: o.closes,
        gemBalance: this.save.gems,
        gemButtonState: o.gemState,
      });
    this.applyReviveStep(step, r);
  }

  private applyReviveStep(step: ReviveStep, r: Rewards): void {
    if (step.kind === 'grant') {
      // The grant comes only from the platform result or the free slot; world.revive()
      // still refuses a second revive.
      if (!this.world.revive()) {
        this.stopReviveCountdown();
        this.reviveOffer = null;
        this.renderLoss(r);
        return;
      }
      this.result.markReviveGranted();
      this.analytics.track('revive_granted', {
        source: step.source,
        attempt: step.attempt,
        ...(step.price ? { price: step.price } : {}),
      });
      this.stopReviveCountdown();
      this.reviveOffer = null;
      // A fresh result for the next battle end; keep the "rewarded ad shown" block (G4).
      // A gem revive blocks the interstitial like a rewarded ad (revive-m2.md, G4).
      this.result = ResultSession.afterRevive(this.result, step.source);
      this.overlay.innerHTML = '';
      this.input.enabled = true;
      this.phase = 'battle';
      this.platform.gameplayStart(); // G18: only after a granted revive
      return;
    }
    if (step.kind === 'unavailable') {
      this.renderLoss(r);
      const o = this.reviveOffer;
      setTimeout(() => {
        if (this.reviveOffer !== o || !o?.open) return;
        // Stays open only while gems are valid (revive-m2.md); otherwise "no_option".
        const next = o.afterNotice();
        if (next.kind === 'closed')
          this.analytics.track('revive_declined', {
            reason: 'no_option',
            closesBefore: o.closes,
            gemBalance: this.save.gems,
            gemButtonState: o.gemState,
          });
        this.applyReviveStep(next, r);
      }, UNAVAILABLE_MS);
      return;
    }
    if (step.kind === 'closed') {
      this.stopReviveCountdown();
      this.closeReviveRow(r);
      return;
    }
    this.renderLoss(r);
  }

  /**
   * The revive offer closed: drop its row in place instead of rebuilding the defeat screen,
   * so a Retry/Home press in progress is not lost (QA: "Retry needs two clicks" when the
   * countdown ran out under the pointer: the rebuild, or the layout shift, moved the target).
   */
  private closeReviveRow(r: Rewards): void {
    const row = this.overlay.querySelector('.revive-row');
    if (
      row instanceof HTMLElement &&
      this.overlay.querySelector('[data-a="retry"]:not([disabled])')
    ) {
      // Keep its space so Retry/Home do not jump under the finger.
      row.querySelectorAll('button').forEach((b) => (b.disabled = true));
      row.style.visibility = 'hidden';
      row.setAttribute('aria-hidden', 'true');
    } else this.renderLoss(r);
  }

  private startReviveCountdown(r: Rewards): void {
    this.stopReviveCountdown();
    let last = performance.now();
    this.reviveTimer = window.setInterval(() => {
      const o = this.reviveOffer;
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (!o) return this.stopReviveCountdown();
      if (o.tick(dt)) {
        this.analytics.track('revive_declined', { reason: 'timeout', closesBefore: o.closes });
        this.stopReviveCountdown();
        if (!this.result.isClaimed) this.closeReviveRow(r);
        return;
      }
      const el = this.overlay.querySelector('.revive-count');
      if (el) el.textContent = String(Math.ceil(o.countdown));
    }, 250);
  }

  private stopReviveCountdown(): void {
    if (this.reviveTimer) clearInterval(this.reviveTimer);
    this.reviveTimer = 0;
  }

  private async claim(r: Rewards, replay = false): Promise<void> {
    // Idempotent per battle: a second click (or 2X then "No thanks") never credits again.
    if (!this.result.tryClaim()) return;
    this.stopReviveCountdown();
    this.reviveOffer = null;
    this.disableResultButtons();
    // G4 + decision 43: a rewarded ad shown, or a rewarded offer declined, blocks it.
    const rewardedShown = this.result.blocksInterstitial;
    const id = this.world.level.id;
    // M7-3: targets, streaks, pass XP; event battles earn event points instead of stars/chests.
    const ev = this.eventPlay;
    this.live = { ...this.live, now: gameClock().now() };
    const lo = afterBattle(this.save, this.world, this.live, r.stars, ev ? ev.k : null);
    const coins = Math.round(r.coins * lo.coinMul);
    this.save.coins += coins;
    if (ev) {
      this.lastEarned = {
        levelNo: ev.k + 1,
        won: this.world.outcome === 'won',
        coins,
        stars: 0,
        newStars: 0,
        gems: 0,
        meta: `🎪 +${lo.eventPts} event pts`,
      };
    } else {
      // Feedback 2026-10-15: new-best stars also pay gems; the map shows what was earned.
      const gain = starGain(this.save.bestStars[id] ?? 0, r.stars);
      recordGems(this.save, gain.gems, `stars:${id}`); // M4-5a ledger entry
      const streak = lo.coinMul > 1 ? `🔥 +${Math.round((lo.coinMul - 1) * 100)}% coins` : '';
      this.lastEarned = {
        levelNo: this.levelNo(this.world.level),
        won: this.world.outcome === 'won',
        coins,
        stars: r.stars,
        ...gain,
        meta: [streak, this.awardMeta(r, this.world.outcome === 'won', id)]
          .filter(Boolean)
          .join(' · '),
      };
      this.save.bestStars[id] = Math.max(this.save.bestStars[id] ?? 0, r.stars);
    }
    this.save.battlesCompleted++;
    // M4-6: lifetime stats for the cloud player_stats / level_progress sync.
    const st = this.save.stats;
    if (this.world.outcome === 'won') st.wins++;
    else st.losses++;
    st.coinsEarned += coins;
    if (!ev) st.bestCoins[id] = Math.max(st.bestCoins[id] ?? 0, coins);
    // FTUE is done after its first win (replays of level 1 run without prompts).
    // Decision 40: a win finishes the FTUE only once step 5 is done (or on the L2 carry, the
    // last FTUE level); otherwise the remaining steps carry into the next battle.
    if (this.ftue && this.world.outcome === 'won' && ftueDoneOnWin(this.ftue, id))
      this.save.ftueDone = true;
    const now = Date.now();
    // G3: interstitials only at level transitions. Retry replays the same level, so it is not one.
    if (shouldShowInterstitialOnClaim(this.save, now, rewardedShown, replay, this.pacer)) {
      this.save.lastInterstitialAt = now;
      this.pacer.recordInterstitial();
      this.persist();
      this.phase = 'ad';
      this.analytics.track('ad_offered', { placement: 'level_transition', type: 'interstitial' });
      // revive-m2.md: only an ad that actually loaded counts for the free-revive eligibility.
      const shown = await this.platform.showInterstitial('level_transition');
      this.reviveSession.noteInterstitial(shown);
      if (shown) {
        this.analytics.track('ad_watched', {
          placement: 'level_transition',
          type: 'interstitial',
          completed: true,
        });
      } else
        this.analytics.track('ad_failed', { placement: 'level_transition', reason: 'no_fill' });
    }
    this.persist();
    // Round 3 (Mohit): Home after EVERY level, retries included; PLAY there replays it.
    this.hudRoot.innerHTML = '';
    this.showTitle();
  }

  /** Rewarded ad via the platform; only real impressions count toward caps (G5). */
  private async watchRewarded(p: RewardedPlacement): Promise<RewardedResult> {
    const prev = this.phase;
    this.phase = 'ad';
    this.platform.gameplayStop(); // G18
    const res = await this.platform.requestRewarded(p);
    if (res === 'completed' || res === 'closed') {
      // Any rewarded ad shown (even closed early) blocks an interstitial on this transition.
      this.result.markRewardedShown();
      this.pacer.recordRewarded(p);
      this.reviveSession.noteAdLoaded();
      this.analytics.track('ad_watched', {
        placement: p,
        completed: res === 'completed',
        type: 'rewarded',
      });
    } else this.analytics.track('ad_failed', { placement: p, reason: res });
    this.phase = prev;
    return res;
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
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.frame);
    const frameMs = now - this.last;
    const dt = Math.min(0.1, frameMs / 1000);
    if (this.phase === 'battle' && this.quality.sample(frameMs)) {
      this.scene.applyQuality(this.quality.settings);
      this.scene.setPixelRatio(this.quality.pixelRatio);
    }
    this.last = now;
    this.pumpSim();
    this.scene.render(this.world, this.phase === 'ad' ? 0 : dt);
    if (import.meta.env.DEV && this.perfOverlay?.visible) {
      const info = this.scene.renderer.info.render;
      this.perf.sample(frameMs, info.calls, info.triangles);
      const units = this.world.bees.count + this.world.wasps.count;
      this.perfOverlay.update(
        dt,
        this.perf,
        units,
        this.quality.pixelRatio,
        this.quality.label,
        () => this.scene.countVertices(),
      );
    }
  };

  /** Advance the battle sim to real time (fixed SIM_DT steps). Safe to call any time. */
  private pumpSim = () => {
    const now = performance.now();
    const elapsed = (now - this.simLast) / 1000;
    this.simLast = now;
    if (this.phase !== 'battle' || document.hidden) return;
    this.tick(elapsed);
  };

  private tick(dt: number): void {
    const w = this.world;
    const queen = this.input.takeQueen();
    const steps = this.stepper.advance(dt, (i) => {
      this.input.update(SIM_DT, w.maxCannonX);
      const input = {
        aimX: this.input.aimX,
        firing: this.input.takeFire(),
        queen: queen && i === 0,
      };
      if (this.ftue) this.ftue.update(w, input, SIM_DT);
      else autoTriggers(w);
      w.step(input);
      if (this.aimTrace) this.aimTrace.afterStep(w);
      return w.outcome === 'playing';
    });
    if (steps === 0 && queen) this.input.queueQueen(); // keep the press for the next step
    if (this.input.firing) {
      this.hud?.hideHint();
      // M2-33: the generic hold hint is shown only until the player has used hold once.
      if (!this.save.holdUsed) {
        this.save.holdUsed = true;
        this.persist();
      }
    }
    if (import.meta.env.DEV && this.stress > 0) spawnStress(this.world, this.stress);
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
    if (this.trapTipUntil > 0 && w.time >= this.trapTipUntil) {
      this.trapTipUntil = 0;
      this.hud?.setPrompt('', false);
    }
    // M2-31: brief "Missed!" on a gate row a run of bees flew past (MISS_CUE, design-confirmed).
    // Suppressed while an FTUE prompt is on screen.
    const missRow =
      this.missCue?.update(w.rowMisses, dt, !!this.ftue && this.ftue.prompt !== '') ?? -1;
    if (missRow >= 0) this.float(MISS_CUE.text, w.cannonX, w.gateRowY[missRow], 'miss', 1);
    let nestDmg = 0;
    for (const e of w.drainEvents()) {
      switch (e.type) {
        case 'gate':
          this.scene.onGate(e.gate, e.x, e.y, e.spawned);
          this.sfx.pop(w.bees.count);
          if (
            e.spawned >= 2 &&
            Math.random() < 0.15 &&
            this.floaters.allow(e.gate, performance.now())
          )
            this.float(`+${e.spawned}`, e.x, e.y);
          break;
        case 'trap':
          this.scene.onTrap(e.gate, e.x, e.y);
          if (shouldShowTrapTip(w.level.id, this.save.trapTipShown)) {
            // M2-32: one-time tip on L2's first trap hit (saved, never repeats on this device).
            this.save.trapTipShown = true;
            this.persist();
            this.trapTipUntil = w.time + TRAP_TIP.durationS;
            this.hud?.setPrompt(TRAP_TIP.text, false);
          }
          break;
        case 'clash':
          this.scene.onClash(e.x, e.y);
          break;
        case 'nestHit':
          nestDmg += e.damage;
          this.hud?.nestDamaged(e.damage);
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
        // M7 bee effects: a short floater so the player sees the bee working.
        case 'frost':
          this.float('❄️ Frost', e.x, 4);
          break;
        case 'volley':
          this.float(`☀️ +${e.count}`, e.x, 3);
          break;
        case 'honeyBlock':
          if (this.floaters.allow(-1, performance.now())) this.float('🍯 Blocked', e.x, 1, '', 1);
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
    // Feedback 2026-10-15: level 1 introduces the two energy meters with a short pulse.
    this.hud?.setMeterIntro(LEVELS.indexOf(w.level) === 0 && w.time < METER_INTRO_S);
    this.hud?.update(w);
    if (w.outcome !== 'playing') this.endBattle();
  }

  private float(text: string, x: number, y: number, variant: '' | 'miss' = '', h = 1.5): void {
    this.proj.set(x, h, -y).project(this.scene.camera);
    const r = this.canvas.getBoundingClientRect();
    const sx = ((this.proj.x + 1) / 2) * r.width;
    this.hud?.floater(text, sx, ((1 - this.proj.y) / 2) * r.height, variant);
  }
}
