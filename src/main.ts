import './style.css';
import { AudioEngine, type AmbientBiomeId, type StepSurface } from './audio';
import { CombatSystem } from './combat';
import { EnemyManager } from './enemies';
import { EnvironmentSystem, normalizeWeatherKind } from './environment';
import { InputManager } from './input';
import { Inventory } from './inventory';
import { LightingSystem } from './lighting';
import { Player } from './player';
import { QuestManager } from './quests';
import { AsciiRenderer } from './renderer';
import { generateRandomSeed, loadSavedGame, normalizeSeed, writeSavedGame } from './save';
import type {
  ChartedMarker,
  CityPoiKind,
  GameDebugState,
  PointOfInterest,
  QuestBossSpec,
  RoadsideNpc,
} from './types';
import { UIManager } from './ui';
import { CHUNK_SIZE, World } from './world';

declare global {
  interface Window {
    __GAME__?: {
      getState: () => GameDebugState;
      startNewGame: (customSeed?: string) => void;
      continueGame: () => void;
      saveGame: () => boolean;
      world: World;
      player: Player;
      inventory: Inventory;
      lighting: LightingSystem;
      environment: EnvironmentSystem;
      audio: AudioEngine;
      enemies: EnemyManager;
      combat: CombatSystem;
      quests: QuestManager;
      ui: UIManager;
      renderer: AsciiRenderer;
    };
  }
}

class Game {
  private world: World;
  private player: Player;
  private inventory: Inventory;
  private lighting: LightingSystem;
  private environment: EnvironmentSystem;
  private readonly audio: AudioEngine;
  private quests: QuestManager;
  private enemies: EnemyManager;
  private combat: CombatSystem;
  private readonly renderer: AsciiRenderer;
  private readonly ui: UIManager;
  private readonly input: InputManager;

  private rafId = 0;
  private lastTimestamp = 0;
  private elapsedTime = 0;
  private fps = 60;
  private lastStepHalfPhase = 0;
  private stepCounter = 0;
  private autosaveTimer = 10;
  private sessionStarted = false;
  private chartedMarkers: ChartedMarker[] = [];

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    const existingSave = loadSavedGame();
    const previewSeed = existingSave?.seed ?? generateRandomSeed();

    this.world = new World(previewSeed);
    this.player = new Player(this.world.spawnPoint);
    this.inventory = new Inventory();
    this.lighting = new LightingSystem();
    this.environment = new EnvironmentSystem();
    this.audio = new AudioEngine();
    this.quests = new QuestManager(this.world);
    this.enemies = new EnemyManager(this.world, this.getAllBossSpecs());
    this.player.syncRelicBonuses(this.inventory);
    this.renderer = new AsciiRenderer(canvas, this.world.spawnPoint);
    this.ui = new UIManager(uiRoot, this.world, this.inventory, this.player, this.quests, this.audio, {
      onNewGame: (customSeed) => this.startNewGame(customSeed),
      onContinue: () => this.continueGame(),
      onSaveGame: () => {
        if (this.saveGame()) {
          this.ui.showToast(`Uloženo (Seed: ${this.world.seed})`);
        }
      },
      onQuestAccepted: () => {
        this.saveGame();
      },
      onQuestTurnedIn: () => {
        this.saveGame();
      },
      onRevealMapSketch: (npc, targetCity) => this.handleRevealMapSketch(npc, targetCity),
      onTradeCompleted: () => {
        this.player.syncRelicBonuses(this.inventory);
        this.saveGame();
      },
    });
    this.combat = this.createCombatSystem();

    this.input = new InputManager(canvas, {
      onUserGesture: () => this.audio.unlock(),
      onZoom: (deltaSteps) => this.renderer.adjustZoom(deltaSteps),
      onToggleInventory: () => this.ui.toggleInventory(),
      onToggleMap: () => this.ui.toggleMap(),
      onToggleJournal: () => this.ui.toggleJournal(),
      onInteract: () => this.handleInteract(),
      onToggleLantern: () => {
        const before = this.player.lanternOn;
        const after = this.player.toggleLantern();
        if (before !== after) {
          this.audio.playLanternToggle(after);
        }
      },
      onToggleStealth: () => {
        if (this.player.isDead) return;
        const active = this.player.toggleStealth();
        this.audio.playUiClick(active ? 'close' : 'select');
        this.ui.showToast(active ? 'Plížení zapnuto (tichý krok)' : 'Plížení vypnuto', 1.8);
      },
      onToggleMute: () => {
        const muted = this.audio.toggleMute();
        this.ui.showToast(muted ? 'Zvuk ztlumen' : 'Zvuk zapnut');
      },
      onCycleTime: () => {
        const label = this.environment.cycleTimeOfDay();
        this.ui.showToast(`Denní doba: ${label}`);
      },
      onCycleWeather: () => {
        const label = this.environment.cycleWeather();
        this.ui.showToast(`Počasí: ${label}`);
      },
      onAttack: (aimClientX, aimClientY) => {
        const aimWorld =
          aimClientX !== undefined && aimClientY !== undefined
            ? this.renderer.screenToWorld(aimClientX, aimClientY)
            : undefined;
        this.combat.tryPlayerAttack(this.player, this.enemies, aimWorld);
      },
      onDash: (aimClientX, aimClientY) => {
        const moveDir = this.input.getMovementVector();
        const aimWorld =
          aimClientX !== undefined && aimClientY !== undefined
            ? this.renderer.screenToWorld(aimClientX, aimClientY)
            : undefined;
        this.combat.tryPlayerDash(this.player, moveDir, this.enemies, aimWorld);
      },
      onRespawn: () => {
        if (this.player.isDead) {
          this.player.respawn(this.world.spawnPoint);
          if (this.world.updateActiveChunks(this.player.x, this.player.y)) {
            this.enemies.syncChunks(this.world, this.getAllBossSpecs());
            this.combat.syncChunkLoot(this.world);
          }
          this.lighting.forceShadowcastRefresh();
          this.audio.playUiClick('open');
          this.ui.showToast('Povstal jsi u startovního útočiště.');
          this.saveGame();
        }
      },
      onEscape: () => {
        if (this.sessionStarted && this.ui.getActiveModal() === 'none') {
          this.saveGame();
        }
        this.ui.handleEscape(this.world.seed);
      },
      onModalNavigate: (delta) => this.ui.navigateListModal(delta),
      onModalConfirm: () => {
        this.ui.confirmListModal();
        if (this.sessionStarted) this.saveGame();
      },
      onModalQuickChoice: (index) => {
        this.ui.triggerListModalChoice(index);
        if (this.sessionStarted) this.saveGame();
      },
      onMenuNavigate: (delta) => this.ui.navigateMenu(delta),
      onMenuConfirm: () => this.ui.confirmMenu(),
      isModalOpen: () => this.ui.isPaused(),
      isListModalOpen: () => this.ui.isListModalOpen(),
      isMenuOpen: () => this.ui.isMenuOpen(),
    });

    window.addEventListener('beforeunload', () => {
      if (this.sessionStarted) this.saveGame();
    });

    this.lighting.update(this.world, this.player, 0, this.environment.getAmbientProfile());
    this.syncWindowDebugRef();
  }

  private createCombatSystem(): CombatSystem {
    return new CombatSystem(
      this.audio,
      (msg) => this.ui.showToast(msg),
      this.world,
      () => this.saveGame(),
      (enemy) => {
        const res = this.quests.onEnemyKilled(enemy);
        if (res.toast) {
          this.ui.showToast(res.toast, 3.2);
        }
        if (res.becameReady) {
          this.audio.playQuestAccept();
        }
      }
    );
  }

  private handleInteract(): void {
    if (this.player.isDead) return;

    // 1. Collect nearby glowing Quest Relic (*)
    const nearbyRelic = this.quests.getNearbyRelic(this.player.x, this.player.y);
    if (nearbyRelic) {
      const res = this.quests.collectRelic(nearbyRelic, this.inventory);
      if (res.message) {
        if (res.questReady) this.audio.playQuestAccept();
        else this.audio.playLootPickup();
        this.ui.showToast(res.message, 3.4);
      }
      this.saveGame();
      return;
    }

    // 2. Talk / trade with nearby Roadside Traveler (@ or &)
    const nearbyNpc = this.world.getNearbyTraveler(this.player.x, this.player.y);
    if (nearbyNpc) {
      this.ui.openNpcDialog(nearbyNpc);
      return;
    }

    // 3. Open Quest Board [!] at starting clearing
    if (this.world.isNearQuestGiver(this.player.x, this.player.y)) {
      this.ui.openQuestBoard();
    }
  }

  private getAllBossSpecs(): QuestBossSpec[] {
    return [...this.quests.getBossSpecs(), ...this.world.getCityBossSpecs()];
  }

  private handleRevealMapSketch(
    npc: RoadsideNpc,
    targetCity?: CityPoiKind
  ): {
    poi: PointOfInterest | null;
    newlyRevealedChunks: number;
  } {
    const existingIds = new Set(this.chartedMarkers.map((m) => m.id));
    const poi = targetCity
      ? this.world.getImperialCityByKind(targetCity)
      : this.world.findNearestMajorPoi(npc.x, npc.y, existingIds);
    if (!poi) {
      return { poi: null, newlyRevealedChunks: 0 };
    }
    const newlyRevealedChunks = this.lighting.revealChunkArea(poi.chunkX, poi.chunkY, 1);
    if (!existingIds.has(poi.uid)) {
      const cityColor =
        poi.id === 'city_kaelvarr'
          ? '#ff8c42'
          : poi.id === 'city_siltmoor'
            ? '#64f0b0'
            : poi.id === 'city_aethelgard'
              ? '#f5eedc'
              : undefined;
      this.chartedMarkers.push({
        id: poi.uid,
        x: poi.x,
        y: poi.y,
        label: poi.shortLabel,
        poiId: poi.id,
        color: cityColor,
        isCity: poi.id.startsWith('city_'),
      });
    }
    return { poi, newlyRevealedChunks };
  }

  private syncWindowDebugRef(): void {
    window.__GAME__ = {
      getState: () => this.getDebugState(),
      startNewGame: (seed?: string) => this.startNewGame(seed),
      continueGame: () => this.continueGame(),
      saveGame: () => this.saveGame(),
      world: this.world,
      player: this.player,
      inventory: this.inventory,
      lighting: this.lighting,
      environment: this.environment,
      audio: this.audio,
      enemies: this.enemies,
      combat: this.combat,
      quests: this.quests,
      ui: this.ui,
      renderer: this.renderer,
    };
  }

  public startNewGame(customSeed = ''): void {
    const seed = customSeed.trim().length > 0 ? normalizeSeed(customSeed) : generateRandomSeed();

    this.world = new World(seed);
    this.player = new Player(this.world.spawnPoint);
    this.inventory = new Inventory();
    this.lighting = new LightingSystem();
    this.environment = new EnvironmentSystem();
    this.quests = new QuestManager(this.world);
    this.enemies = new EnemyManager(this.world, this.getAllBossSpecs());
    this.combat = this.createCombatSystem();
    this.player.syncRelicBonuses(this.inventory);

    this.sessionStarted = true;
    this.autosaveTimer = 10;
    this.lastStepHalfPhase = -1;
    this.stepCounter = 0;
    this.chartedMarkers = [];

    this.renderer.snapCameraTo(this.player);
    this.lighting.update(this.world, this.player, this.elapsedTime, this.environment.getAmbientProfile());
    this.ui.rebindSession(this.world, this.inventory, this.player, this.quests);
    this.saveGame();
    this.syncWindowDebugRef();
    this.ui.showToast(`Nový svět vygenerován · Seed: ${this.world.seed}`, 3.2);
  }

  public continueGame(): void {
    if (this.sessionStarted) {
      this.ui.closeOverlayToGame();
      return;
    }

    const save = loadSavedGame();
    if (!save) {
      this.startNewGame();
      return;
    }

    if (this.world.seed !== save.seed) {
      this.world = new World(save.seed);
    }

    this.player = new Player(this.world.spawnPoint);
    this.player.x = save.player.x;
    this.player.y = save.player.y;
    this.player.maxHp = save.player.maxHp ?? 100;
    this.player.hp = Math.min(this.player.maxHp, save.player.hp);
    this.player.maxStamina = save.player.maxStamina ?? 100;
    this.player.stamina = Math.min(this.player.maxStamina, save.player.stamina);
    this.player.oil = save.player.oil;
    this.player.lanternOn = save.player.lanternOn;
    this.player.facing = save.player.facing;
    this.player.hasTorchLit = save.player.hasTorchLit;
    this.player.equippedWeapon = save.player.equippedWeapon;
    this.player.weaponAttackBonus = save.player.weaponAttackBonus ?? 0;
    this.player.isSneaking = Boolean(save.player.isSneaking);

    this.inventory = new Inventory();
    this.inventory.restore(save.inventory);
    this.player.syncRelicBonuses(this.inventory);

    this.world.updateActiveChunks(this.player.x, this.player.y);

    this.lighting = new LightingSystem();
    if (Array.isArray(save.exploredChunks) && save.exploredChunks.length > 0) {
      this.lighting.importExploredChunks(save.exploredChunks);
    }

    this.environment = new EnvironmentSystem();
    if (save.environment) {
      this.environment.timeOfDay = save.environment.timeOfDay ?? this.environment.timeOfDay;
      this.environment.targetWeather = normalizeWeatherKind(save.environment.targetWeather);
      this.environment.snapWeatherToTarget();
    }

    this.quests = new QuestManager(this.world);
    if (save.quests) {
      this.quests.restore(save.quests);
    }

    this.enemies = new EnemyManager(this.world, this.getAllBossSpecs());
    if (Array.isArray(save.defeatedEnemyIds)) {
      this.enemies.applyDefeatedIds(save.defeatedEnemyIds);
    }

    this.combat = this.createCombatSystem();
    if (Array.isArray(save.collectedCacheIds)) {
      this.combat.applyCollectedCacheIds(save.collectedCacheIds);
    }
    this.combat.enemiesDefeated = save.defeatedEnemyIds?.length ?? 0;
    this.chartedMarkers = Array.isArray(save.chartedMarkers)
      ? save.chartedMarkers.map((m) => ({ ...m }))
      : [];
    this.stepCounter = 0;

    this.sessionStarted = true;
    this.autosaveTimer = 10;
    this.renderer.snapCameraTo(this.player);
    this.lighting.update(this.world, this.player, this.elapsedTime, this.environment.getAmbientProfile());
    this.ui.rebindSession(this.world, this.inventory, this.player, this.quests);
    this.syncWindowDebugRef();
    this.ui.showToast(`Načtena hra · Seed: ${this.world.seed}`, 2.8);
  }

  public saveGame(): boolean {
    if (!this.sessionStarted) return false;
    return writeSavedGame({
      seed: this.world.seed,
      player: {
        x: this.player.x,
        y: this.player.y,
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        stamina: this.player.stamina,
        maxStamina: this.player.maxStamina,
        oil: this.player.oil,
        lanternOn: this.player.lanternOn,
        facing: this.player.facing,
        hasTorchLit: this.player.hasTorchLit,
        equippedWeapon: this.player.equippedWeapon,
        weaponAttackBonus: this.player.weaponAttackBonus,
        isSneaking: this.player.isSneaking,
      },
      inventory: this.inventory.serialize(),
      defeatedEnemyIds: this.enemies.getDefeatedIds(),
      collectedCacheIds: this.combat.getCollectedCacheIds(),
      exploredChunks: this.lighting.exportExploredChunks(),
      chartedMarkers: this.chartedMarkers.map((m) => ({ ...m })),
      environment: {
        timeOfDay: this.environment.timeOfDay,
        targetWeather: this.environment.targetWeather,
      },
      quests: this.quests.serialize(),
    });
  }

  public start(): void {
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private getCurrentStepSurface(): StepSurface {
    const cell = this.world.getCell(Math.floor(this.player.x), Math.floor(this.player.y));
    if (!cell) return 'grass';
    if (cell.kind === 'bridge') {
      return 'wood';
    }
    if (cell.kind === 'river_water' || cell.kind === 'marsh_water') {
      return 'water';
    }
    if (
      cell.kind === 'ruin_floor' ||
      cell.kind === 'crypt_floor' ||
      cell.kind === 'passage' ||
      cell.kind === 'quarry_ground' ||
      cell.kind === 'basalt' ||
      cell.kind === 'ice' ||
      cell.kind === 'ford'
    ) {
      return 'stone';
    }
    if (cell.kind === 'marsh_ground' || cell.kind === 'lava') {
      return 'marsh';
    }
    return 'grass';
  }

  private resolveAmbientBiome(): AmbientBiomeId {
    const kind = this.world.getAmbientZoneKind(this.player.x, this.player.y);
    switch (kind) {
      case 'city_kaelvarr':
      case 'volcanic':
        return 'volcanic_forge';
      case 'city_siltmoor':
        return 'siltmoor';
      case 'city_aethelgard':
        return 'aethelgard';
      case 'blood_forest':
        return 'forest';
      case 'marsh':
        return 'marsh';
      case 'quarry':
        return 'quarry';
      case 'frost':
        return 'frost';
      case 'ash':
      case 'bone_plain':
        return 'ash_wasteland';
      case 'moor_forest':
      default:
        return 'meadow';
    }
  }

  private readonly loop = (timestamp: number): void => {
    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    const dt = Math.min(Math.max(rawDt, 0), 0.05);
    this.elapsedTime += dt;

    if (rawDt > 0) {
      const instantFps = 1 / rawDt;
      this.fps += (instantFps - this.fps) * 0.1;
    }

    if (!this.ui.isPaused()) {
      const moveVec = this.input.getMovementVector();
      const wantsSprint = this.input.isSprintHeld();
      const zone = this.world.getZoneName(this.player.x, this.player.y);
      this.player.update(
        moveVec,
        wantsSprint,
        dt,
        this.world,
        (dmg, label) => {
          this.audio.playPlayerHurt();
          this.combat.spawnFloatingText(this.player.x, this.player.y - 3.8, `-${dmg} (${label})`, '#ff6338');
          if (this.player.isDead) {
            this.ui.showToast('Spálila tě láva… Stiskni [R] pro návrat k rozcestí.');
          }
        },
        (msg) => {
          this.ui.showToast(msg, 2.6);
        }
      );

      if (this.world.updateActiveChunks(this.player.x, this.player.y)) {
        this.enemies.syncChunks(this.world, this.getAllBossSpecs());
        this.combat.syncChunkLoot(this.world);
      }

      this.environment.update(dt, zone);
      const loopAmbient = this.environment.getAmbientProfile();
      this.combat.update(dt, this.world, this.player, this.enemies, this.inventory, {
        nightFactor: loopAmbient.nightFactor,
        fogIntensity: this.environment.fogIntensity,
      });
      this.renderer.updateCamera(this.player, dt);

      if (this.player.isMoving && !this.player.isDashing && Math.hypot(this.player.vx, this.player.vy) > 1) {
        const halfPhase = Math.floor(this.player.walkPhase / 2);
        if (halfPhase !== this.lastStepHalfPhase) {
          this.lastStepHalfPhase = halfPhase;
          this.stepCounter += 1;
          this.audio.playStep(this.player.isSprinting, this.getCurrentStepSurface(), this.player.isSneaking);

          if (this.player.inWater) {
            if (!this.player.isSneaking || this.stepCounter % 3 === 0) {
              this.combat.emitSoundWave(this.player.x, this.player.y, 'wade', this.enemies);
            }
          } else if (this.player.isSprinting) {
            this.combat.emitSoundWave(this.player.x, this.player.y, 'sprint', this.enemies);
          } else if (!this.player.isSneaking && this.stepCounter % 2 === 0) {
            this.combat.emitSoundWave(this.player.x, this.player.y, 'run', this.enemies);
          }
        }
      } else {
        this.lastStepHalfPhase = -1;
      }

      if (this.sessionStarted) {
        this.autosaveTimer -= dt;
        if (this.autosaveTimer <= 0) {
          this.autosaveTimer = 10;
          this.saveGame();
        }
      }
    }

    this.audio.setRainIntensity(this.environment.rainIntensity);
    this.audio.setBiome(this.resolveAmbientBiome());
    this.audio.update(dt);

    const ambient = this.environment.getAmbientProfile();
    this.lighting.update(this.world, this.player, this.elapsedTime, ambient);
    this.renderer.render(
      this.world,
      this.player,
      this.lighting,
      this.enemies,
      this.combat,
      this.environment,
      this.quests,
      this.elapsedTime
    );
    this.ui.update(
      this.world,
      this.lighting,
      this.environment,
      this.renderer.camera.zoom,
      this.elapsedTime,
      dt,
      this.chartedMarkers
    );

    this.rafId = requestAnimationFrame(this.loop);
  };

  public getDebugState(): GameDebugState {
    const ambient = this.environment.getAmbientProfile();
    return {
      seed: this.world.seed,
      pois: this.world.getKnownNearPois().map((p) => ({ uid: p.uid, id: p.id, name: p.name, x: p.x, y: p.y })),
      cities: this.world
        .getImperialCities()
        .map((c) => ({ uid: c.uid, id: c.id as CityPoiKind, name: c.name, x: c.x, y: c.y })),
      player: {
        x: this.player.x,
        y: this.player.y,
        vx: this.player.vx,
        vy: this.player.vy,
        facing: this.player.facing,
        isMoving: this.player.isMoving,
        isSprinting: this.player.isSprinting,
        isSneaking: this.player.isSneaking,
        inUndergrowth: this.player.inUndergrowth,
        isDashing: this.player.isDashing,
        isDead: this.player.isDead,
        inColdBiome: this.player.inColdBiome,
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        stamina: this.player.stamina,
        maxStamina: this.player.maxStamina,
        oil: this.player.oil,
        maxOil: this.player.maxOil,
        lanternOn: this.player.lanternOn,
        exhausted: this.player.exhausted,
        hasTorchLit: this.player.hasTorchLit,
        equippedWeapon: this.player.equippedWeapon,
        attackDamage: this.player.getAttackDamage(),
        collidedX: this.player.collidedX,
        collidedY: this.player.collidedY,
        hitbox: this.player.getHitboxAt(),
      },
      combat: {
        aliveEnemies: this.enemies.getAliveCount(),
        totalEnemies: this.enemies.enemies.length,
        lootDropsCount: this.combat.lootDrops.length,
        activeSlashes: this.combat.slashes.length,
        soundWavesCount: this.combat.soundWaves.length,
        enemiesDefeated: this.combat.enemiesDefeated,
      },
      activeTravelersCount: this.world.getActiveTravelers().length,
      environment: {
        clock: this.environment.getClockText(),
        phase: this.environment.getPhaseLabel(),
        weather: this.environment.targetWeather,
        weatherLabel: this.environment.getWeatherLabel(),
        sunIntensity: this.environment.sunIntensity,
        overcastIntensity: this.environment.overcastIntensity,
        rainIntensity: this.environment.rainIntensity,
        fogIntensity: this.environment.fogIntensity,
        nightFactor: ambient.nightFactor,
      },
      audio: {
        unlocked: this.audio.isUnlocked(),
        muted: this.audio.isMuted(),
        ambientVolume: this.audio.getAmbientVolume(),
        sfxVolume: this.audio.getSfxVolume(),
        currentBiome: this.audio.getCurrentBiome(),
      },
      quests: this.quests.getDebugSummary(),
      camera: { ...this.renderer.camera },
      activeModal: this.ui.getActiveModal(),
      inventoryCount: this.inventory.getItems().length,
      exploredCells: this.lighting.getExploredCount(),
      biome: this.world.getBiomeAt(Math.floor(this.player.x), Math.floor(this.player.y)),
      zone: this.world.getZoneName(this.player.x, this.player.y),
      chunkStats: {
        chunkSize: CHUNK_SIZE,
        loadedChunks: this.world.getLoadedChunkCount(),
        exploredChunks: this.lighting.getExploredChunkCount(),
        currentChunk: this.world.getCurrentChunkCoords(),
      },
      fps: Math.round(this.fps),
    };
  }

  public dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.input.dispose();
    this.renderer.dispose();
    this.audio.dispose();
  }
}

const canvas = document.getElementById('game-canvas');
const uiRoot = document.getElementById('ui-root');
if (!(canvas instanceof HTMLCanvasElement) || !uiRoot) {
  throw new Error('Missing #game-canvas or #ui-root element.');
}

const game = new Game(canvas, uiRoot);
game.start();
