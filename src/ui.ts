import type { AudioEngine } from './audio';
import type { EnvironmentSystem } from './environment';
import {
  getBiomeName,
  getBiomeWarning,
  getItemCategoryLabel,
  getItemDescription,
  getItemEffectText,
  getItemName,
  getLanguage,
  getPoiName,
  getStatusEffectDisplay,
  getTitleAsciiLogo,
  getTravelerFarewells,
  getTravelerGreetings,
  getTravelerHistory,
  getTravelerName,
  getTravelerSurvival,
  getTravelerTitle,
  setLanguage,
  t,
  toggleLanguage,
  type Language,
  type TranslationKey,
} from './i18n';
import {
  HEALING_HERBS_TEMPLATE,
  OIL_FLASK_TEMPLATE,
  type Inventory,
} from './inventory';
import { getItemAsciiGlyph, getItemAsciiPreview } from './itemArt';
import type { LightingSystem } from './lighting';
import { MapOverlay } from './mapOverlay';
import type { Player } from './player';
import type { QuestManager } from './quests';
import { formatSaveTime, loadSavedGame } from './save';
import { TitleBackground } from './titleBackground';
import type {
  ActiveModal,
  ChartedMarker,
  CityPoiKind,
  InventoryItem,
  PoiKind,
  PointOfInterest,
  QuestEntry,
  QuestStatus,
  RoadsideNpc,
} from './types';
import { compassDir, type World } from './world';

declare const __APP_VERSION__: string;

const TRADABLE_LOOT_IDS = [
  'ember-shard',
  'ghoul-claw',
  'ancient-bone-shard',
  'ashen-chalice',
  'old-parchment',
] as const;

type NpcQuoteState =
  | { kind: 'greeting'; index: number }
  | { kind: 'history'; index: number }
  | { kind: 'survival'; index: number }
  | { kind: 'sketch'; poiId: PoiKind; x: number; y: number };

export interface MenuCallbacks {
  onNewGame: (customSeed: string) => void;
  onContinue: () => void;
  onSaveGame: () => void;
  onQuestAccepted: (questId: string) => void;
  onQuestTurnedIn: (questId: string) => void;
  onRevealMapSketch: (
    npc: RoadsideNpc,
    targetCity?: CityPoiKind
  ) => { poi: PointOfInterest | null; newlyRevealedChunks: number };
  onTradeCompleted: () => void;
}

function buildAsciiBar(current: number, max: number, slots = 10): string {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const filled = Math.round(ratio * slots);
  return `[${'|'.repeat(filled)}${'.'.repeat(slots - filled)}]`;
}

function questStatusTag(status: QuestStatus): {
  badge: string;
  tag: string;
  label: string;
  cls: string;
} {
  switch (status) {
    case 'ready':
      return { badge: '[✓]', tag: t('quest.tag.ready'), label: t('quest.status.ready'), cls: 'q-ready' };
    case 'active':
      return { badge: '[>]', tag: t('quest.tag.active'), label: t('quest.status.active'), cls: 'q-active' };
    case 'completed':
      return { badge: '[x]', tag: t('quest.tag.completed'), label: t('quest.status.completed'), cls: 'q-done' };
    case 'available':
    default:
      return { badge: '[!]', tag: t('quest.tag.available'), label: t('quest.status.available'), cls: 'q-avail' };
  }
}

export class UIManager {
  private readonly root: HTMLElement;
  private inventory: Inventory;
  private player: Player;
  private quests: QuestManager;
  private readonly audio: AudioEngine;
  private readonly menuCallbacks: MenuCallbacks;
  private readonly mapOverlay: MapOverlay;

  // HUD elements
  private readonly hudZoneEl: HTMLSpanElement;
  private readonly hudCoordsEl: HTMLSpanElement;
  private readonly hudHpBarEl: HTMLSpanElement;
  private readonly hudHpValEl: HTMLSpanElement;
  private readonly hudStBarEl: HTMLSpanElement;
  private readonly hudStValEl: HTMLSpanElement;
  private readonly hudOilBarEl: HTMLSpanElement;
  private readonly hudOilValEl: HTMLSpanElement;
  private readonly hudEnvEl: HTMLSpanElement;
  private readonly hudStatusEl: HTMLSpanElement;
  private readonly hudZoomEl: HTMLSpanElement;
  private readonly hudMuteEl: HTMLSpanElement;
  private readonly hudStealthEl: HTMLSpanElement;
  private readonly hudInvEl: HTMLSpanElement;
  private readonly toastEl: HTMLDivElement;
  private readonly interactPromptEl: HTMLDivElement;
  private readonly signpostEl: HTMLDivElement;
  private readonly deathBannerEl: HTMLDivElement;

  // Top-right Quest Tracker HUD
  private readonly hudQuestTitleEl: HTMLDivElement;
  private readonly hudQuestProgEl: HTMLDivElement;
  private readonly hudQuestNavEl: HTMLDivElement;

  // Title / Pause Menu elements
  private readonly menuBackdrop: HTMLDivElement;
  private readonly titleLogoEl: HTMLPreElement;
  private readonly titleBg: TitleBackground;
  private readonly menuContinueBtn: HTMLButtonElement;
  private readonly menuSaveInfoEl: HTMLDivElement;
  private readonly menuSeedDrawer: HTMLDivElement;
  private readonly menuSeedInput: HTMLInputElement;
  private readonly menuLangBtn: HTMLButtonElement;
  private readonly menuNavButtons: HTMLButtonElement[];
  private readonly chronicleBackdrop: HTMLDivElement;

  // Inventory modal elements
  private readonly invBackdrop: HTMLDivElement;
  private readonly invListEl: HTMLDivElement;
  private readonly invDetailArtEl: HTMLDivElement;
  private readonly invDetailTitleEl: HTMLDivElement;
  private readonly invDetailMetaEl: HTMLDivElement;
  private readonly invDetailDescEl: HTMLDivElement;
  private readonly invDetailEffectEl: HTMLDivElement;
  private readonly invActionBtn: HTMLButtonElement;
  private readonly invLogEl: HTMLDivElement;
  private readonly invStatsPanelEl: HTMLDivElement;
  private lastAmbientContext = { nightFactor: 0, fogIntensity: 0 };
  private lastInvStatsSignature = '';

  // Quest Board modal elements (E)
  private readonly qbBackdrop: HTMLDivElement;
  private readonly qbListEl: HTMLDivElement;
  private readonly qbDetailTitleEl: HTMLDivElement;
  private readonly qbDetailStatusEl: HTMLDivElement;
  private readonly qbDetailQuoteEl: HTMLDivElement;
  private readonly qbDetailObjectivesEl: HTMLDivElement;
  private readonly qbDetailRewardEl: HTMLDivElement;
  private readonly qbActionBtn: HTMLButtonElement;
  private readonly qbLogEl: HTMLDivElement;

  // Journal modal elements (J)
  private readonly journalBackdrop: HTMLDivElement;
  private readonly journalListEl: HTMLDivElement;
  private readonly journalDetailTitleEl: HTMLDivElement;
  private readonly journalDetailStatusEl: HTMLDivElement;
  private readonly journalDetailDescEl: HTMLDivElement;
  private readonly journalDetailObjectivesEl: HTMLDivElement;
  private readonly journalDetailRewardEl: HTMLDivElement;
  private readonly journalTrackBtn: HTMLButtonElement;

  // Roadside NPC dialogue / trade modal elements (E)
  private readonly npcBackdrop: HTMLDivElement;
  private readonly npcModalTitleEl: HTMLSpanElement;
  private readonly npcModalHintEl: HTMLSpanElement;
  private readonly npcPaneHeadingEl: HTMLDivElement;
  private readonly npcListEl: HTMLDivElement;
  private readonly npcDetailTitleEl: HTMLDivElement;
  private readonly npcDetailMetaEl: HTMLDivElement;
  private readonly npcDetailDescEl: HTMLDivElement;
  private readonly npcDetailStockEl: HTMLDivElement;
  private readonly npcDetailEffectEl: HTMLDivElement;
  private readonly npcActionBtn: HTMLButtonElement;
  private readonly npcLogEl: HTMLDivElement;

  private activeModal: ActiveModal = 'menu';
  private sessionActive = false;
  private menuSelectedIndex = 0;
  private seedDrawerOpen = false;
  private chronicleOpen = false;
  private toastTimer = 0;
  private lastHudSignature = '';
  private lastQuestSignature = '';
  private lastInteractText = '';
  private lastSignpostText = '';
  private invLogMessage = t('inv.default_log');
  private qbLogMessage = t('quest.board.default_log');
  private npcLogMessage = t('npc.default_log');
  private qbSelectedIndex = 0;
  private journalSelectedIndex = 0;
  private npcSelectedIndex = 0;
  private npcDialogMode: 'main' | 'trade' = 'main';
  private npcHistoryStep = 0;
  private npcSurvivalStep = 0;
  private activeNpc: RoadsideNpc | null = null;
  private npcQuoteState: NpcQuoteState | null = null;

  constructor(
    root: HTMLElement,
    world: World,
    inventory: Inventory,
    player: Player,
    quests: QuestManager,
    audio: AudioEngine,
    menuCallbacks: MenuCallbacks
  ) {
    this.root = root;
    this.inventory = inventory;
    this.player = player;
    this.quests = quests;
    this.audio = audio;
    this.menuCallbacks = menuCallbacks;

    // 1. Top-left dark fantasy ASCII HUD
    const hudTopLeft = document.createElement('div');
    hudTopLeft.id = 'hud-top-left';
    hudTopLeft.className = 'ascii-hud-box';
    hudTopLeft.innerHTML = `
      <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
      <div class="hud-line">
        <span class="ascii-pipe">|</span>
        <span id="hud-zone" class="hud-zone-title"></span>
        <span id="hud-coords" class="hud-coords">0,2</span>
        <span class="ascii-pipe">|</span>
      </div>
      <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
      <div class="hud-line">
        <span class="ascii-pipe">|</span>
        <span class="stat-label stat-hp" data-i18n="hud.stat.hp"></span>
        <span id="hud-hp-bar" class="stat-bar stat-hp">[||||||||..]</span>
        <span id="hud-hp-val" class="stat-val stat-hp"> 80/100</span>
        <span class="ascii-pipe">|</span>
      </div>
      <div class="hud-line">
        <span class="ascii-pipe">|</span>
        <span class="stat-label stat-st" data-i18n="hud.stat.st"></span>
        <span id="hud-st-bar" class="stat-bar stat-st">[||||||||||]</span>
        <span id="hud-st-val" class="stat-val stat-st">100/100</span>
        <span class="ascii-pipe">|</span>
      </div>
      <div class="hud-line">
        <span class="ascii-pipe">|</span>
        <span class="stat-label stat-oil" data-i18n="hud.stat.oil"></span>
        <span id="hud-oil-bar" class="stat-bar stat-oil">[||||||||||]</span>
        <span id="hud-oil-val" class="stat-val stat-oil">100/100</span>
        <span class="ascii-pipe">|</span>
      </div>
      <div class="hud-line hud-env-line">
        <span class="ascii-pipe">|</span>
        <span id="hud-env" class="hud-env-text"></span>
        <span class="ascii-pipe">|</span>
      </div>
      <div class="hud-line hud-status-line">
        <span class="ascii-pipe">|</span>
        <span id="hud-status" class="hud-status-text"></span>
        <span class="ascii-pipe">|</span>
      </div>
      <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
    `;

    // 1b. Top-right compact Quest Tracker HUD
    const hudTopRight = document.createElement('div');
    hudTopRight.id = 'hud-quest-tracker';
    hudTopRight.className = 'ascii-hud-box ascii-quest-box';
    hudTopRight.innerHTML = `
      <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
      <div class="hud-line">
        <span class="ascii-pipe">|</span>
        <span class="quest-hud-heading" data-i18n="hud.quest_heading"></span>
        <span class="hud-coords">[J]</span>
        <span class="ascii-pipe">|</span>
      </div>
      <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
      <div id="hud-quest-title" class="quest-hud-title"></div>
      <div id="hud-quest-prog" class="quest-hud-prog"></div>
      <div id="hud-quest-nav" class="quest-hud-nav"></div>
      <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
    `;

    // 2. Bottom-right controls hint
    const hudBottomRight = document.createElement('div');
    hudBottomRight.id = 'hud-bottom-right';
    hudBottomRight.className = 'ascii-controls-bar';
    hudBottomRight.innerHTML = `
      <span class="ctrl-item"><kbd>[LMB/Space]</kbd> <span data-i18n="hud.ctrl.attack"></span></span>
      <span class="ctrl-item"><kbd>[RMB]</kbd> <span data-i18n="hud.ctrl.dash"></span></span>
      <span class="ctrl-item"><kbd>[E]</kbd> <span data-i18n="hud.ctrl.action"></span></span>
      <span class="ctrl-item"><kbd>[J]</kbd> <span data-i18n="hud.ctrl.quests"></span></span>
      <span class="ctrl-item"><kbd>[F]</kbd> <span data-i18n="hud.ctrl.lantern"></span></span>
      <span id="hud-stealth" class="ctrl-item"></span>
      <span id="hud-inv" class="ctrl-item"></span>
      <span class="ctrl-item"><kbd>[M]</kbd> <span data-i18n="hud.ctrl.map"></span></span>
      <span class="ctrl-item"><kbd>[T/P]</kbd> <span data-i18n="hud.ctrl.time_weather"></span></span>
      <span class="ctrl-item"><kbd>[Esc]</kbd> <span data-i18n="hud.ctrl.menu"></span></span>
      <span id="hud-mute" class="ctrl-item"></span>
      <span class="ctrl-sep">·</span>
      <span class="ctrl-item"><span data-i18n="hud.ctrl.zoom"></span> <strong id="hud-zoom">1.00×</strong></span>
    `;

    // 2b. Floating combat & loot toast
    this.toastEl = document.createElement('div');
    this.toastEl.id = 'hud-toast';
    this.toastEl.className = 'hud-toast hidden';

    // 2c. Contextual interaction prompt ([E] Speak / Collect relic)
    this.interactPromptEl = document.createElement('div');
    this.interactPromptEl.id = 'interact-prompt';
    this.interactPromptEl.className = 'interact-prompt hidden';

    // 2d. Signpost directional readout plate
    this.signpostEl = document.createElement('div');
    this.signpostEl.id = 'signpost-plate';
    this.signpostEl.className = 'signpost-plate hidden';

    // 2e. Death / respawn banner
    this.deathBannerEl = document.createElement('div');
    this.deathBannerEl.id = 'death-banner';
    this.deathBannerEl.className = 'death-banner hidden';
    this.deathBannerEl.innerHTML = `
      <div class="death-title" data-i18n="death.title"></div>
      <div class="death-sub"><span data-i18n="death.sub_prefix"></span> <kbd>[R]</kbd> <span data-i18n="death.sub_suffix"></span></div>
    `;

    // 3. Fullscreen Title Screen / Pause Menu
    this.menuBackdrop = document.createElement('div');
    this.menuBackdrop.id = 'game-menu-modal';
    this.menuBackdrop.className = 'title-screen';
    this.menuBackdrop.setAttribute('role', 'dialog');
    this.menuBackdrop.setAttribute('data-i18n-aria', 'menu.aria_label');
    this.menuBackdrop.innerHTML = `
      <canvas id="title-bg-canvas" class="title-bg-canvas" aria-hidden="true"></canvas>
      <div class="title-screen-content">
        <div class="title-header-block">
          <pre id="title-ascii-logo" class="title-ascii-logo"></pre>
          <div class="title-lore-subtitle" data-i18n="menu.subtitle"></div>
        </div>
        <nav class="title-nav" data-i18n-aria="menu.nav_aria_label">
          <button id="menu-continue-btn" type="button" class="title-nav-item" data-menu-action="continue">
            <span class="title-item-main">
              <span class="title-cursor" aria-hidden="true"> </span>
              <span class="title-item-label" data-i18n="menu.continue"></span>
            </span>
            <div id="menu-save-info" class="title-item-sub"></div>
          </button>
          <button id="menu-new-game-btn" type="button" class="title-nav-item" data-menu-action="new_game">
            <span class="title-item-main">
              <span class="title-cursor" aria-hidden="true"> </span>
              <span class="title-item-label" data-i18n="menu.new_game"></span>
            </span>
          </button>
          <button id="menu-custom-seed-btn" type="button" class="title-nav-item" data-menu-action="custom_seed">
            <span class="title-item-main">
              <span class="title-cursor" aria-hidden="true"> </span>
              <span class="title-item-label" data-i18n="menu.custom_seed"></span>
            </span>
          </button>
          <div id="title-seed-drawer" class="title-seed-drawer hidden">
            <input id="menu-seed-input" type="text" maxlength="20" class="ascii-input title-seed-input" data-i18n-placeholder="menu.seed_placeholder" autocomplete="off" />
            <button id="menu-seed-launch-btn" type="button" class="ascii-btn ascii-btn-primary" data-i18n="menu.seed_launch"></button>
          </div>
          <button id="menu-language-btn" type="button" class="title-nav-item" data-menu-action="language">
            <span class="title-item-main">
              <span class="title-cursor" aria-hidden="true"> </span>
              <span class="title-item-label"><span data-i18n="menu.language_label"></span>:</span>
              <span class="title-lang-switch">
                <span class="title-lang-opt" data-lang="cs">Čeština</span>
                <span class="title-lang-sep">/</span>
                <span class="title-lang-opt" data-lang="en">English</span>
              </span>
            </span>
          </button>
          <button id="menu-chronicle-btn" type="button" class="title-nav-item" data-menu-action="chronicle">
            <span class="title-item-main">
              <span class="title-cursor" aria-hidden="true"> </span>
              <span class="title-item-label" data-i18n="menu.chronicle"></span>
            </span>
          </button>
          <button id="menu-quit-btn" type="button" class="title-nav-item" data-menu-action="quit">
            <span class="title-item-main">
              <span class="title-cursor" aria-hidden="true"> </span>
              <span class="title-item-label" data-i18n="menu.quit"></span>
            </span>
          </button>
        </nav>
        <div class="title-audio-panel" data-i18n-aria="menu.audio_aria_label">
          <div class="title-audio-heading" data-i18n="menu.audio_heading"></div>
          <label class="title-audio-row" for="menu-ambient-vol">
            <span class="title-audio-label" data-i18n="menu.audio_ambient"></span>
            <input id="menu-ambient-vol" type="range" min="0" max="100" step="1" class="title-audio-slider" />
            <span id="menu-ambient-vol-val" class="title-audio-val">80%</span>
          </label>
          <label class="title-audio-row" for="menu-sfx-vol">
            <span class="title-audio-label" data-i18n="menu.audio_sfx"></span>
            <input id="menu-sfx-vol" type="range" min="0" max="100" step="1" class="title-audio-slider" />
            <span id="menu-sfx-vol-val" class="title-audio-val">85%</span>
          </label>
        </div>
      </div>
      <div class="title-footer">
        <span class="title-version">v${__APP_VERSION__}</span>
        <span class="title-footer-sep">·</span>
        <span class="title-controls-hint" data-i18n="menu.footer_hint"></span>
      </div>
    `;

    this.titleLogoEl = this.menuBackdrop.querySelector('#title-ascii-logo') as HTMLPreElement;
    const titleBgCanvas = this.menuBackdrop.querySelector('#title-bg-canvas') as HTMLCanvasElement;
    this.titleBg = new TitleBackground(titleBgCanvas);

    // 3b. Chronicle & Controls ASCII modal (opened from Title Screen)
    this.chronicleBackdrop = document.createElement('div');
    this.chronicleBackdrop.id = 'chronicle-modal';
    this.chronicleBackdrop.className = 'ascii-modal-backdrop chronicle-backdrop hidden';
    this.chronicleBackdrop.setAttribute('role', 'dialog');
    this.chronicleBackdrop.setAttribute('data-i18n-aria', 'chronicle.aria_label');
    this.chronicleBackdrop.innerHTML = `
      <div class="ascii-modal chronicle-modal">
        <div class="modal-header">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div class="modal-title-row">
            <span class="modal-title"><span class="ascii-pipe">|</span> <span data-i18n="chronicle.title"></span></span>
            <span class="modal-close-hint"><span data-i18n="chronicle.close_hint"></span> <span class="ascii-pipe">|</span></span>
          </div>
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        </div>
        <div class="chronicle-body">
          <div class="pane-heading" data-i18n="chronicle.lore_heading"></div>
          <p class="chronicle-lore" data-i18n="chronicle.lore_p1"></p>
          <p class="chronicle-lore" data-i18n="chronicle.lore_p2"></p>
          <div class="pane-heading" data-i18n="chronicle.controls_heading"></div>
          <div class="chronicle-controls-grid">
            <div class="chronicle-ctrl-row"><kbd data-i18n="chronicle.ctrl_move_key"></kbd><span data-i18n="chronicle.ctrl_move"></span></div>
            <div class="chronicle-ctrl-row"><kbd data-i18n="chronicle.ctrl_sprint_key"></kbd><span data-i18n="chronicle.ctrl_sprint"></span></div>
            <div class="chronicle-ctrl-row"><kbd data-i18n="chronicle.ctrl_stealth_key"></kbd><span data-i18n="chronicle.ctrl_stealth"></span></div>
            <div class="chronicle-ctrl-row"><kbd data-i18n="chronicle.ctrl_attack_key"></kbd><span data-i18n="chronicle.ctrl_attack"></span></div>
            <div class="chronicle-ctrl-row"><kbd data-i18n="chronicle.ctrl_dash_key"></kbd><span data-i18n="chronicle.ctrl_dash"></span></div>
            <div class="chronicle-ctrl-row"><kbd data-i18n="chronicle.ctrl_lantern_key"></kbd><span data-i18n="chronicle.ctrl_lantern"></span></div>
            <div class="chronicle-ctrl-row"><kbd data-i18n="chronicle.ctrl_interact_key"></kbd><span data-i18n="chronicle.ctrl_interact"></span></div>
            <div class="chronicle-ctrl-row"><kbd data-i18n="chronicle.ctrl_inventory_key"></kbd><span data-i18n="chronicle.ctrl_inventory"></span></div>
            <div class="chronicle-ctrl-row"><kbd data-i18n="chronicle.ctrl_map_key"></kbd><span data-i18n="chronicle.ctrl_map"></span></div>
            <div class="chronicle-ctrl-row"><kbd data-i18n="chronicle.ctrl_journal_key"></kbd><span data-i18n="chronicle.ctrl_journal"></span></div>
            <div class="chronicle-ctrl-row"><kbd data-i18n="chronicle.ctrl_zoom_key"></kbd><span data-i18n="chronicle.ctrl_zoom"></span></div>
            <div class="chronicle-ctrl-row"><kbd data-i18n="chronicle.ctrl_mute_key"></kbd><span data-i18n="chronicle.ctrl_mute"></span></div>
          </div>
        </div>
        <div class="modal-footer chronicle-footer">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div class="chronicle-footer-actions">
            <button id="chronicle-close-btn" type="button" class="ascii-btn ascii-btn-primary" data-i18n="chronicle.close_btn"></button>
          </div>
        </div>
      </div>
    `;

    // 4. Inventory ASCII modal
    this.invBackdrop = document.createElement('div');
    this.invBackdrop.id = 'inventory-modal';
    this.invBackdrop.className = 'ascii-modal-backdrop hidden';
    this.invBackdrop.setAttribute('role', 'dialog');
    this.invBackdrop.setAttribute('data-i18n-aria', 'inv.aria_label');
    this.invBackdrop.innerHTML = `
      <div class="ascii-modal inventory-modal">
        <div class="modal-header">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div class="modal-title-row">
            <span class="modal-title"><span class="ascii-pipe">|</span> <span data-i18n="inv.title"></span></span>
            <span class="modal-close-hint"><span data-i18n="inv.close_hint"></span> <span class="ascii-pipe">|</span></span>
          </div>
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        </div>
        <div class="inventory-body">
          <div class="inventory-list-pane">
            <div class="pane-heading" data-i18n="inv.pane_bag"></div>
            <div id="inv-list" class="inv-list"></div>
          </div>
          <div class="inventory-divider"></div>
          <div class="inventory-detail-pane">
            <div class="pane-heading" data-i18n="inv.pane_detail"></div>
            <div class="inv-detail-header">
              <div id="inv-detail-art" class="inv-detail-art"></div>
              <div class="inv-detail-head-text">
                <div id="inv-detail-title" class="inv-detail-title"></div>
                <div id="inv-detail-meta" class="inv-detail-meta"></div>
              </div>
            </div>
            <div id="inv-detail-desc" class="inv-detail-desc"></div>
            <div id="inv-detail-effect" class="inv-detail-effect"></div>
            <div class="inv-detail-actions">
              <button id="inv-action-btn" type="button" class="ascii-btn ascii-btn-primary"></button>
              <button id="inv-close-btn" type="button" class="ascii-btn" data-i18n="inv.close_btn"></button>
            </div>
          </div>
          <div class="inventory-divider"></div>
          <div class="inventory-stats-pane">
            <div id="inv-stats-panel" class="inv-stats-panel"></div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div id="inv-log" class="inv-log"></div>
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        </div>
      </div>
    `;

    // 5. Quest Board modal (opened with E near [!])
    this.qbBackdrop = document.createElement('div');
    this.qbBackdrop.id = 'quest-board-modal';
    this.qbBackdrop.className = 'ascii-modal-backdrop hidden';
    this.qbBackdrop.setAttribute('role', 'dialog');
    this.qbBackdrop.setAttribute('data-i18n-aria', 'quest.board.aria_label');
    this.qbBackdrop.innerHTML = `
      <div class="ascii-modal quest-modal">
        <div class="modal-header">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div class="modal-title-row">
            <span class="modal-title"><span class="ascii-pipe">|</span> <span data-i18n="quest.board.title"></span></span>
            <span class="modal-close-hint"><span data-i18n="quest.board.close_hint"></span> <span class="ascii-pipe">|</span></span>
          </div>
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        </div>
        <div class="quest-modal-body">
          <div class="inventory-list-pane">
            <div class="pane-heading" data-i18n="quest.board.pane_list"></div>
            <div id="qb-list" class="inv-list"></div>
          </div>
          <div class="inventory-divider"></div>
          <div class="inventory-detail-pane">
            <div class="pane-heading" data-i18n="quest.board.pane_detail"></div>
            <div id="qb-detail-title" class="inv-detail-title"></div>
            <div class="quest-detail-giver" data-i18n="quest.giver_line"></div>
            <div id="qb-detail-status" class="inv-detail-meta"></div>
            <div id="qb-detail-quote" class="inv-detail-desc quest-detail-story"></div>
            <div id="qb-detail-objectives" class="quest-objectives-list"></div>
            <div id="qb-detail-reward" class="inv-detail-effect"></div>
            <div class="inv-detail-actions">
              <button id="qb-action-btn" type="button" class="ascii-btn ascii-btn-primary"></button>
              <button id="qb-close-btn" type="button" class="ascii-btn" data-i18n="quest.board.close_btn"></button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div id="qb-log" class="inv-log"></div>
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        </div>
      </div>
    `;

    // 6. Journal modal (opened with J)
    this.journalBackdrop = document.createElement('div');
    this.journalBackdrop.id = 'journal-modal';
    this.journalBackdrop.className = 'ascii-modal-backdrop hidden';
    this.journalBackdrop.setAttribute('role', 'dialog');
    this.journalBackdrop.setAttribute('data-i18n-aria', 'quest.journal.aria_label');
    this.journalBackdrop.innerHTML = `
      <div class="ascii-modal quest-modal">
        <div class="modal-header">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div class="modal-title-row">
            <span class="modal-title"><span class="ascii-pipe">|</span> <span data-i18n="quest.journal.title"></span></span>
            <span class="modal-close-hint"><span data-i18n="quest.journal.close_hint"></span> <span class="ascii-pipe">|</span></span>
          </div>
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        </div>
        <div class="quest-modal-body">
          <div class="inventory-list-pane">
            <div class="pane-heading" data-i18n="quest.journal.pane_list"></div>
            <div id="journal-list" class="inv-list"></div>
          </div>
          <div class="inventory-divider"></div>
          <div class="inventory-detail-pane">
            <div class="pane-heading" data-i18n="quest.journal.pane_detail"></div>
            <div id="journal-detail-title" class="inv-detail-title"></div>
            <div class="quest-detail-giver" data-i18n="quest.giver_line"></div>
            <div id="journal-detail-status" class="inv-detail-meta"></div>
            <div id="journal-detail-desc" class="inv-detail-desc quest-detail-story"></div>
            <div id="journal-detail-objectives" class="quest-objectives-list"></div>
            <div id="journal-detail-reward" class="inv-detail-effect"></div>
            <div class="inv-detail-actions">
              <button id="journal-track-btn" type="button" class="ascii-btn ascii-btn-primary"></button>
              <button id="journal-close-btn" type="button" class="ascii-btn" data-i18n="quest.journal.close_btn"></button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div class="inv-log" data-i18n="quest.journal.footer_tip"></div>
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        </div>
      </div>
    `;

    // 6b. Roadside NPC Dialogue / Trade modal (opened with E near @ / &)
    this.npcBackdrop = document.createElement('div');
    this.npcBackdrop.id = 'npc-dialog-modal';
    this.npcBackdrop.className = 'ascii-modal-backdrop hidden';
    this.npcBackdrop.setAttribute('role', 'dialog');
    this.npcBackdrop.setAttribute('data-i18n-aria', 'npc.aria_label');
    this.npcBackdrop.innerHTML = `
      <div class="ascii-modal npc-dialog-modal">
        <div class="modal-header">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div class="modal-title-row">
            <span class="modal-title"><span class="ascii-pipe">|</span> <span id="npc-modal-title"></span></span>
            <span class="modal-close-hint"><span id="npc-modal-hint"></span> <span class="ascii-pipe">|</span></span>
          </div>
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        </div>
        <div class="inventory-body npc-dialog-body">
          <div class="inventory-list-pane">
            <div id="npc-pane-heading" class="pane-heading"></div>
            <div id="npc-list" class="inv-list"></div>
          </div>
          <div class="inventory-divider"></div>
          <div class="inventory-detail-pane">
            <div class="pane-heading" data-i18n="npc.pane_reply"></div>
            <div id="npc-detail-title" class="inv-detail-title"></div>
            <div id="npc-detail-meta" class="inv-detail-meta"></div>
            <div id="npc-detail-desc" class="inv-detail-desc"></div>
            <div id="npc-detail-stock" class="quest-objectives-list"></div>
            <div id="npc-detail-effect" class="inv-detail-effect"></div>
            <div class="inv-detail-actions">
              <button id="npc-action-btn" type="button" class="ascii-btn ascii-btn-primary"></button>
              <button id="npc-close-btn" type="button" class="ascii-btn" data-i18n="npc.close_btn"></button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div id="npc-log" class="inv-log"></div>
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        </div>
      </div>
    `;

    // 7. World Map overlay
    this.mapOverlay = new MapOverlay(world, () => this.closeOverlayToGame());

    // Mount all UI panels
    this.root.innerHTML = '';
    this.root.appendChild(hudTopLeft);
    this.root.appendChild(hudTopRight);
    this.root.appendChild(hudBottomRight);
    this.root.appendChild(this.signpostEl);
    this.root.appendChild(this.interactPromptEl);
    this.root.appendChild(this.toastEl);
    this.root.appendChild(this.deathBannerEl);
    this.root.appendChild(this.invBackdrop);
    this.root.appendChild(this.qbBackdrop);
    this.root.appendChild(this.journalBackdrop);
    this.root.appendChild(this.npcBackdrop);
    this.root.appendChild(this.mapOverlay.getElement());
    this.root.appendChild(this.menuBackdrop);
    this.root.appendChild(this.chronicleBackdrop);

    // Cache DOM references
    this.hudZoneEl = hudTopLeft.querySelector('#hud-zone') as HTMLSpanElement;
    this.hudCoordsEl = hudTopLeft.querySelector('#hud-coords') as HTMLSpanElement;
    this.hudHpBarEl = hudTopLeft.querySelector('#hud-hp-bar') as HTMLSpanElement;
    this.hudHpValEl = hudTopLeft.querySelector('#hud-hp-val') as HTMLSpanElement;
    this.hudStBarEl = hudTopLeft.querySelector('#hud-st-bar') as HTMLSpanElement;
    this.hudStValEl = hudTopLeft.querySelector('#hud-st-val') as HTMLSpanElement;
    this.hudOilBarEl = hudTopLeft.querySelector('#hud-oil-bar') as HTMLSpanElement;
    this.hudOilValEl = hudTopLeft.querySelector('#hud-oil-val') as HTMLSpanElement;
    this.hudEnvEl = hudTopLeft.querySelector('#hud-env') as HTMLSpanElement;
    this.hudStatusEl = hudTopLeft.querySelector('#hud-status') as HTMLSpanElement;
    this.hudZoomEl = hudBottomRight.querySelector('#hud-zoom') as HTMLSpanElement;
    this.hudMuteEl = hudBottomRight.querySelector('#hud-mute') as HTMLSpanElement;
    this.hudStealthEl = hudBottomRight.querySelector('#hud-stealth') as HTMLSpanElement;
    this.hudInvEl = hudBottomRight.querySelector('#hud-inv') as HTMLSpanElement;

    this.hudQuestTitleEl = hudTopRight.querySelector('#hud-quest-title') as HTMLDivElement;
    this.hudQuestProgEl = hudTopRight.querySelector('#hud-quest-prog') as HTMLDivElement;
    this.hudQuestNavEl = hudTopRight.querySelector('#hud-quest-nav') as HTMLDivElement;

    this.menuContinueBtn = this.menuBackdrop.querySelector('#menu-continue-btn') as HTMLButtonElement;
    this.menuSaveInfoEl = this.menuBackdrop.querySelector('#menu-save-info') as HTMLDivElement;
    this.menuSeedDrawer = this.menuBackdrop.querySelector('#title-seed-drawer') as HTMLDivElement;
    this.menuSeedInput = this.menuBackdrop.querySelector('#menu-seed-input') as HTMLInputElement;
    this.menuLangBtn = this.menuBackdrop.querySelector('#menu-language-btn') as HTMLButtonElement;
    this.menuNavButtons = Array.from(
      this.menuBackdrop.querySelectorAll('.title-nav-item')
    ) as HTMLButtonElement[];

    const newGameBtn = this.menuBackdrop.querySelector('#menu-new-game-btn') as HTMLButtonElement;
    const customSeedBtn = this.menuBackdrop.querySelector('#menu-custom-seed-btn') as HTMLButtonElement;
    const seedLaunchBtn = this.menuBackdrop.querySelector('#menu-seed-launch-btn') as HTMLButtonElement;
    const chronicleBtn = this.menuBackdrop.querySelector('#menu-chronicle-btn') as HTMLButtonElement;
    const quitBtn = this.menuBackdrop.querySelector('#menu-quit-btn') as HTMLButtonElement;
    const chronicleCloseBtn = this.chronicleBackdrop.querySelector('#chronicle-close-btn') as HTMLButtonElement;

    this.menuNavButtons.forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        const visible = this.getVisibleMenuButtons();
        const idx = visible.indexOf(btn);
        if (idx !== -1 && idx !== this.menuSelectedIndex) {
          this.menuSelectedIndex = idx;
          this.renderMenuSelection();
        }
      });
    });

    this.menuContinueBtn.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.playUiClick('open');
      this.menuCallbacks.onContinue();
    });

    newGameBtn.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.playUiClick('open');
      this.menuSeedInput.value = '';
      this.menuCallbacks.onNewGame('');
    });

    customSeedBtn.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.playUiClick('select');
      this.toggleSeedDrawer();
    });

    seedLaunchBtn.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.playUiClick('open');
      this.menuCallbacks.onNewGame(this.menuSeedInput.value);
      this.menuSeedInput.value = '';
      this.toggleSeedDrawer(false);
    });

    this.menuSeedInput.addEventListener('keydown', (e) => {
      if (e.code === 'Enter') {
        e.preventDefault();
        this.audio.unlock();
        this.audio.playUiClick('open');
        this.menuCallbacks.onNewGame(this.menuSeedInput.value);
        this.menuSeedInput.value = '';
        this.toggleSeedDrawer(false);
      }
    });

    this.menuLangBtn.addEventListener('click', (e) => {
      this.audio.unlock();
      this.audio.playUiClick('select');
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-lang]');
      const explicitLang = target?.dataset.lang as Language | undefined;
      if (explicitLang === 'cs' || explicitLang === 'en') {
        if (explicitLang !== getLanguage()) {
          setLanguage(explicitLang);
        }
      } else {
        toggleLanguage();
      }
    });

    chronicleBtn.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.playUiClick('open');
      this.openChronicleModal();
    });

    chronicleCloseBtn.addEventListener('click', () => this.closeChronicleModal());
    this.chronicleBackdrop.addEventListener('click', (e) => {
      if (e.target === this.chronicleBackdrop) this.closeChronicleModal();
    });

    quitBtn.addEventListener('click', () => {
      this.audio.unlock();
      this.audio.playUiClick('close');
      this.handleQuitGame();
    });

    const ambientVolSlider = this.menuBackdrop.querySelector('#menu-ambient-vol') as HTMLInputElement;
    const ambientVolVal = this.menuBackdrop.querySelector('#menu-ambient-vol-val') as HTMLSpanElement;
    const sfxVolSlider = this.menuBackdrop.querySelector('#menu-sfx-vol') as HTMLInputElement;
    const sfxVolVal = this.menuBackdrop.querySelector('#menu-sfx-vol-val') as HTMLSpanElement;

    const syncAudioSliders = (): void => {
      const ambPct = Math.round(this.audio.getAmbientVolume() * 100);
      const sfxPct = Math.round(this.audio.getSfxVolume() * 100);
      ambientVolSlider.value = String(ambPct);
      ambientVolVal.textContent = `${ambPct}%`;
      sfxVolSlider.value = String(sfxPct);
      sfxVolVal.textContent = `${sfxPct}%`;
    };
    syncAudioSliders();

    ambientVolSlider.addEventListener('input', () => {
      this.audio.unlock();
      const pct = Number(ambientVolSlider.value);
      this.audio.setAmbientVolume(pct / 100);
      ambientVolVal.textContent = `${pct}%`;
    });

    sfxVolSlider.addEventListener('input', () => {
      this.audio.unlock();
      const pct = Number(sfxVolSlider.value);
      this.audio.setSfxVolume(pct / 100);
      sfxVolVal.textContent = `${pct}%`;
    });

    sfxVolSlider.addEventListener('change', () => {
      this.audio.unlock();
      this.audio.playUiClick('select');
    });

    this.invListEl = this.invBackdrop.querySelector('#inv-list') as HTMLDivElement;
    this.invDetailArtEl = this.invBackdrop.querySelector('#inv-detail-art') as HTMLDivElement;
    this.invDetailTitleEl = this.invBackdrop.querySelector('#inv-detail-title') as HTMLDivElement;
    this.invDetailMetaEl = this.invBackdrop.querySelector('#inv-detail-meta') as HTMLDivElement;
    this.invDetailDescEl = this.invBackdrop.querySelector('#inv-detail-desc') as HTMLDivElement;
    this.invDetailEffectEl = this.invBackdrop.querySelector('#inv-detail-effect') as HTMLDivElement;
    this.invActionBtn = this.invBackdrop.querySelector('#inv-action-btn') as HTMLButtonElement;
    this.invLogEl = this.invBackdrop.querySelector('#inv-log') as HTMLDivElement;
    this.invStatsPanelEl = this.invBackdrop.querySelector('#inv-stats-panel') as HTMLDivElement;

    const closeBtn = this.invBackdrop.querySelector('#inv-close-btn') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.closeOverlayToGame());
    this.invActionBtn.addEventListener('click', () => this.confirmListModal());
    this.invBackdrop.addEventListener('click', (e) => {
      if (e.target === this.invBackdrop) this.closeOverlayToGame();
    });

    // Quest Board bindings
    this.qbListEl = this.qbBackdrop.querySelector('#qb-list') as HTMLDivElement;
    this.qbDetailTitleEl = this.qbBackdrop.querySelector('#qb-detail-title') as HTMLDivElement;
    this.qbDetailStatusEl = this.qbBackdrop.querySelector('#qb-detail-status') as HTMLDivElement;
    this.qbDetailQuoteEl = this.qbBackdrop.querySelector('#qb-detail-quote') as HTMLDivElement;
    this.qbDetailObjectivesEl = this.qbBackdrop.querySelector('#qb-detail-objectives') as HTMLDivElement;
    this.qbDetailRewardEl = this.qbBackdrop.querySelector('#qb-detail-reward') as HTMLDivElement;
    this.qbActionBtn = this.qbBackdrop.querySelector('#qb-action-btn') as HTMLButtonElement;
    this.qbLogEl = this.qbBackdrop.querySelector('#qb-log') as HTMLDivElement;

    const qbCloseBtn = this.qbBackdrop.querySelector('#qb-close-btn') as HTMLButtonElement;
    qbCloseBtn.addEventListener('click', () => this.closeOverlayToGame());
    this.qbActionBtn.addEventListener('click', () => this.confirmQuestBoardAction());
    this.qbBackdrop.addEventListener('click', (e) => {
      if (e.target === this.qbBackdrop) this.closeOverlayToGame();
    });

    // Journal bindings
    this.journalListEl = this.journalBackdrop.querySelector('#journal-list') as HTMLDivElement;
    this.journalDetailTitleEl = this.journalBackdrop.querySelector('#journal-detail-title') as HTMLDivElement;
    this.journalDetailStatusEl = this.journalBackdrop.querySelector('#journal-detail-status') as HTMLDivElement;
    this.journalDetailDescEl = this.journalBackdrop.querySelector('#journal-detail-desc') as HTMLDivElement;
    this.journalDetailObjectivesEl = this.journalBackdrop.querySelector('#journal-detail-objectives') as HTMLDivElement;
    this.journalDetailRewardEl = this.journalBackdrop.querySelector('#journal-detail-reward') as HTMLDivElement;
    this.journalTrackBtn = this.journalBackdrop.querySelector('#journal-track-btn') as HTMLButtonElement;

    const journalCloseBtn = this.journalBackdrop.querySelector('#journal-close-btn') as HTMLButtonElement;
    journalCloseBtn.addEventListener('click', () => this.closeOverlayToGame());
    this.journalTrackBtn.addEventListener('click', () => this.confirmJournalTrack());
    this.journalBackdrop.addEventListener('click', (e) => {
      if (e.target === this.journalBackdrop) this.closeOverlayToGame();
    });

    // Roadside NPC bindings
    this.npcModalTitleEl = this.npcBackdrop.querySelector('#npc-modal-title') as HTMLSpanElement;
    this.npcModalHintEl = this.npcBackdrop.querySelector('#npc-modal-hint') as HTMLSpanElement;
    this.npcPaneHeadingEl = this.npcBackdrop.querySelector('#npc-pane-heading') as HTMLDivElement;
    this.npcListEl = this.npcBackdrop.querySelector('#npc-list') as HTMLDivElement;
    this.npcDetailTitleEl = this.npcBackdrop.querySelector('#npc-detail-title') as HTMLDivElement;
    this.npcDetailMetaEl = this.npcBackdrop.querySelector('#npc-detail-meta') as HTMLDivElement;
    this.npcDetailDescEl = this.npcBackdrop.querySelector('#npc-detail-desc') as HTMLDivElement;
    this.npcDetailStockEl = this.npcBackdrop.querySelector('#npc-detail-stock') as HTMLDivElement;
    this.npcDetailEffectEl = this.npcBackdrop.querySelector('#npc-detail-effect') as HTMLDivElement;
    this.npcActionBtn = this.npcBackdrop.querySelector('#npc-action-btn') as HTMLButtonElement;
    this.npcLogEl = this.npcBackdrop.querySelector('#npc-log') as HTMLDivElement;

    const npcCloseBtn = this.npcBackdrop.querySelector('#npc-close-btn') as HTMLButtonElement;
    npcCloseBtn.addEventListener('click', () => this.closeOverlayToGame());
    this.npcActionBtn.addEventListener('click', () => this.confirmNpcAction());
    this.npcBackdrop.addEventListener('click', (e) => {
      if (e.target === this.npcBackdrop) this.closeOverlayToGame();
    });

    this.applyTranslations(world.seed);
    this.refreshMenuState(world.seed);
    this.renderInventoryModal();
  }

  /** Immediately updates every UI panel and HUD label when the active language changes */
  public applyTranslations(currentWorldSeed: string): void {
    const lang = getLanguage();

    this.root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n as TranslationKey | undefined;
      if (key) el.textContent = t(key);
    });

    this.root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => {
      const key = el.dataset.i18nPlaceholder as TranslationKey | undefined;
      if (key) el.placeholder = t(key);
    });

    this.root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
      const key = el.dataset.i18nAria as TranslationKey | undefined;
      if (key) el.setAttribute('aria-label', t(key));
    });

    this.titleLogoEl.textContent = getTitleAsciiLogo();
    this.titleLogoEl.setAttribute('aria-label', t('app.title').toUpperCase());

    this.menuLangBtn.querySelectorAll<HTMLElement>('[data-lang]').forEach((opt) => {
      opt.classList.toggle('active', opt.dataset.lang === lang);
    });

    this.invLogMessage = t('inv.default_log');
    this.qbLogMessage = t('quest.board.default_log');
    this.npcLogMessage = t('npc.default_log');

    this.updateMenuSaveInfo(currentWorldSeed);
    this.mapOverlay.applyTranslations();

    this.lastHudSignature = '';
    this.lastQuestSignature = '';
    this.lastInteractText = '';
    this.lastSignpostText = '';
    this.lastInvStatsSignature = '';

    this.renderInventoryModal();
    if (this.activeModal === 'quest_board') this.renderQuestBoardModal();
    if (this.activeModal === 'journal') this.renderJournalModal();
    if (this.activeModal === 'npc_dialog') this.renderNpcDialogModal();
  }

  private updateMenuSaveInfo(currentWorldSeed: string): void {
    const save = loadSavedGame();
    const canContinue = this.sessionActive || Boolean(save);
    this.menuContinueBtn.classList.toggle('hidden', !canContinue);

    if (this.sessionActive) {
      this.menuSaveInfoEl.textContent = save
        ? t('menu.save_info', { seed: currentWorldSeed, time: formatSaveTime(save.savedAt) })
        : t('menu.save_active', { seed: currentWorldSeed });
    } else if (save) {
      this.menuSaveInfoEl.textContent = t('menu.save_info', {
        seed: save.seed,
        time: formatSaveTime(save.savedAt),
      });
    } else {
      this.menuSaveInfoEl.textContent = '';
    }
  }

  /** Rebinds UI state to a freshly generated or loaded world session */
  public rebindSession(
    world: World,
    inventory: Inventory,
    player: Player,
    quests: QuestManager
  ): void {
    this.inventory = inventory;
    this.player = player;
    this.quests = quests;
    this.sessionActive = true;
    this.lastHudSignature = '';
    this.lastQuestSignature = '';
    this.lastInteractText = '';
    this.lastSignpostText = '';
    this.qbSelectedIndex = 0;
    this.journalSelectedIndex = 0;
    this.npcSelectedIndex = 0;
    this.activeNpc = null;
    this.npcQuoteState = null;
    this.signpostEl.classList.add('hidden');
    this.interactPromptEl.classList.add('hidden');
    this.mapOverlay.rebuild(world);
    this.renderInventoryModal();
    this.closeAllModals();
  }

  private getVisibleMenuButtons(): HTMLButtonElement[] {
    return this.menuNavButtons.filter((btn) => !btn.classList.contains('hidden'));
  }

  private renderMenuSelection(): void {
    const visible = this.getVisibleMenuButtons();
    if (visible.length === 0) return;
    if (this.menuSelectedIndex >= visible.length) this.menuSelectedIndex = 0;
    if (this.menuSelectedIndex < 0) this.menuSelectedIndex = visible.length - 1;

    this.menuNavButtons.forEach((btn) => {
      btn.classList.remove('selected');
      const cursor = btn.querySelector('.title-cursor');
      if (cursor) cursor.textContent = ' ';
    });

    const activeBtn = visible[this.menuSelectedIndex];
    if (activeBtn) {
      activeBtn.classList.add('selected');
      const cursor = activeBtn.querySelector('.title-cursor');
      if (cursor) cursor.textContent = '>';
    }
  }

  public isMenuOpen(): boolean {
    return this.activeModal === 'menu' && !this.chronicleOpen;
  }

  public navigateMenu(delta: number): void {
    if (!this.isMenuOpen()) return;
    const visible = this.getVisibleMenuButtons();
    if (visible.length === 0) return;
    this.menuSelectedIndex =
      ((this.menuSelectedIndex + delta) % visible.length + visible.length) % visible.length;
    this.audio.playUiClick('select');
    this.renderMenuSelection();
  }

  public handleMenuHorizontal(delta: number): void {
    if (!this.isMenuOpen()) return;
    const visible = this.getVisibleMenuButtons();
    const activeBtn = visible[this.menuSelectedIndex];
    if (activeBtn?.dataset.menuAction === 'language') {
      const next: Language = delta < 0 ? 'cs' : 'en';
      if (next !== getLanguage()) {
        this.audio.unlock();
        this.audio.playUiClick('select');
        setLanguage(next);
      }
    }
  }

  public confirmMenu(): void {
    if (!this.isMenuOpen()) return;
    const visible = this.getVisibleMenuButtons();
    const activeBtn = visible[this.menuSelectedIndex];
    if (activeBtn) {
      activeBtn.click();
    }
  }

  private toggleSeedDrawer(forceOpen?: boolean): void {
    const next = forceOpen !== undefined ? forceOpen : !this.seedDrawerOpen;
    this.seedDrawerOpen = next;
    this.menuSeedDrawer.classList.toggle('hidden', !next);
    if (next) {
      window.setTimeout(() => this.menuSeedInput.focus(), 0);
    }
  }

  private openChronicleModal(): void {
    this.chronicleOpen = true;
    this.chronicleBackdrop.classList.remove('hidden');
  }

  private closeChronicleModal(): void {
    if (!this.chronicleOpen) return;
    this.chronicleOpen = false;
    this.chronicleBackdrop.classList.add('hidden');
    this.audio.playUiClick('close');
  }

  private handleQuitGame(): void {
    window.close();
    // Fallback if running in a regular browser tab where window.close() is blocked
    window.setTimeout(() => {
      if (!window.closed) {
        this.showToast(t('menu.quit_browser_toast'), 3.2);
      }
    }, 120);
  }

  public refreshMenuState(currentWorldSeed: string): void {
    this.updateMenuSaveInfo(currentWorldSeed);
    this.toggleSeedDrawer(false);
    this.chronicleOpen = false;
    this.chronicleBackdrop.classList.add('hidden');
    this.menuSelectedIndex = 0;
    this.renderMenuSelection();
  }

  public getActiveModal(): ActiveModal {
    return this.activeModal;
  }

  public isPaused(): boolean {
    return this.activeModal !== 'none';
  }

  public isListModalOpen(): boolean {
    return (
      this.activeModal === 'inventory' ||
      this.activeModal === 'journal' ||
      this.activeModal === 'quest_board' ||
      this.activeModal === 'npc_dialog'
    );
  }

  public openMenu(currentWorldSeed: string): void {
    this.activeModal = 'menu';
    this.invBackdrop.classList.add('hidden');
    this.qbBackdrop.classList.add('hidden');
    this.journalBackdrop.classList.add('hidden');
    this.npcBackdrop.classList.add('hidden');
    this.mapOverlay.setVisible(false);
    this.refreshMenuState(currentWorldSeed);
    this.menuBackdrop.classList.remove('hidden');
    this.audio.playUiClick('open');
  }

  public closeAllModals(): void {
    this.activeModal = 'none';
    this.chronicleOpen = false;
    this.chronicleBackdrop.classList.add('hidden');
    this.menuBackdrop.classList.add('hidden');
    this.invBackdrop.classList.add('hidden');
    this.qbBackdrop.classList.add('hidden');
    this.journalBackdrop.classList.add('hidden');
    this.npcBackdrop.classList.add('hidden');
    this.mapOverlay.setVisible(false);
  }

  public closeOverlayToGame(): void {
    if (this.activeModal === 'inventory') {
      this.inventory.clearAllNewItems();
    }
    if (this.activeModal !== 'none') {
      this.audio.playUiClick('close');
    }
    this.closeAllModals();
  }

  public handleEscape(currentWorldSeed: string): void {
    if (
      this.activeModal === 'inventory' ||
      this.activeModal === 'map' ||
      this.activeModal === 'journal' ||
      this.activeModal === 'quest_board' ||
      this.activeModal === 'npc_dialog'
    ) {
      this.closeOverlayToGame();
    } else if (this.activeModal === 'menu') {
      if (this.chronicleOpen) {
        this.closeChronicleModal();
      } else if (this.seedDrawerOpen) {
        this.toggleSeedDrawer(false);
      } else if (this.sessionActive) {
        this.closeOverlayToGame();
      }
    } else {
      this.openMenu(currentWorldSeed);
    }
  }

  public toggleInventory(): void {
    if (this.activeModal === 'menu') return;
    if (this.activeModal === 'inventory') {
      this.closeOverlayToGame();
    } else {
      this.closeAllModals();
      this.activeModal = 'inventory';
      this.invBackdrop.classList.remove('hidden');
      this.audio.playUiClick('open');
      this.renderInventoryModal();
    }
  }

  public toggleMap(): void {
    if (this.activeModal === 'menu') return;
    if (this.activeModal === 'map') {
      this.closeOverlayToGame();
    } else {
      this.closeAllModals();
      this.activeModal = 'map';
      this.mapOverlay.centerOn(this.player.x, this.player.y);
      this.mapOverlay.setVisible(true);
      this.audio.playUiClick('open');
    }
  }

  public toggleJournal(): void {
    if (this.activeModal === 'menu') return;
    if (this.activeModal === 'journal') {
      this.closeOverlayToGame();
    } else {
      this.closeAllModals();
      this.activeModal = 'journal';
      this.journalBackdrop.classList.remove('hidden');
      this.audio.playParchmentRustle();
      this.renderJournalModal();
    }
  }

  public openQuestBoard(): void {
    if (this.activeModal === 'menu') return;
    this.closeAllModals();
    this.activeModal = 'quest_board';
    this.qbBackdrop.classList.remove('hidden');
    this.audio.playParchmentRustle();
    this.renderQuestBoardModal();
  }

  public openNpcDialog(npc: RoadsideNpc): void {
    if (this.activeModal === 'menu') return;
    this.closeAllModals();
    this.activeNpc = npc;
    this.npcDialogMode = 'main';
    this.npcSelectedIndex = 0;
    this.npcHistoryStep = npc.loreIndex;
    this.npcSurvivalStep = npc.loreIndex;
    const greetings = getTravelerGreetings(npc.role);
    const greetIdx = Math.floor(Math.random() * greetings.length);
    this.npcQuoteState = { kind: 'greeting', index: greetIdx };
    this.npcLogMessage = t('npc.default_log');
    this.activeModal = 'npc_dialog';
    this.npcBackdrop.classList.remove('hidden');
    this.audio.playParchmentRustle();
    this.renderNpcDialogModal();
  }

  private resolveNpcQuote(npc: RoadsideNpc): string {
    const q = this.npcQuoteState;
    if (!q) return '';
    if (q.kind === 'greeting') {
      const list = getTravelerGreetings(npc.role);
      return list[q.index % list.length];
    }
    if (q.kind === 'history') {
      const list = getTravelerHistory(npc.role);
      return list[q.index % list.length];
    }
    if (q.kind === 'survival') {
      const list = getTravelerSurvival(npc.role);
      return `${list[q.index % list.length]} ${getBiomeWarning(npc.biome)}`;
    }
    const dir = compassDir(this.player.x, this.player.y, q.x, q.y);
    const dist = Math.round(Math.hypot(q.x - this.player.x, q.y - this.player.y));
    return t('npc.quote.sketch', { poi: getPoiName(q.poiId), dir, dist });
  }

  public triggerListModalChoice(index: number): void {
    if (this.activeModal !== 'npc_dialog') return;
    const options = this.getNpcDialogOptions();
    if (index < 0 || index >= options.length) return;
    this.npcSelectedIndex = index;
    this.confirmNpcAction();
  }

  public navigateListModal(delta: number): void {
    if (this.activeModal === 'inventory') {
      this.inventory.moveSelection(delta);
      this.audio.playUiClick('select');
      this.renderInventoryModal();
    } else if (this.activeModal === 'quest_board') {
      const len = this.quests.getQuests().length;
      if (len > 0) {
        this.qbSelectedIndex = ((this.qbSelectedIndex + delta) % len + len) % len;
        this.audio.playUiClick('select');
        this.renderQuestBoardModal();
      }
    } else if (this.activeModal === 'journal') {
      const list = this.getJournalQuests();
      if (list.length > 0) {
        this.journalSelectedIndex = ((this.journalSelectedIndex + delta) % list.length + list.length) % list.length;
        this.audio.playUiClick('select');
        this.renderJournalModal();
      }
    } else if (this.activeModal === 'npc_dialog') {
      const count = this.getNpcDialogOptions().length;
      if (count > 0) {
        this.npcSelectedIndex = ((this.npcSelectedIndex + delta) % count + count) % count;
        this.audio.playUiClick('select');
        this.renderNpcDialogModal();
      }
    }
  }

  public confirmListModal(): void {
    if (this.activeModal === 'inventory') {
      const selected = this.inventory.getSelectedItem();
      const result = this.inventory.useSelectedItem(this.player);
      if (result.ok && selected) {
        if (selected.category === 'consumable') this.audio.playUiClick('potion');
        else if (selected.equipable) this.audio.playUiClick('equip');
        else if (selected.id === 'old-parchment' || selected.category === 'lore') this.audio.playParchmentRustle();
        else this.audio.playUiClick('select');
      } else {
        this.audio.playUiClick('close');
      }
      this.invLogMessage = result.message;
      this.renderInventoryModal();
    } else if (this.activeModal === 'quest_board') {
      this.confirmQuestBoardAction();
    } else if (this.activeModal === 'journal') {
      this.confirmJournalTrack();
    } else if (this.activeModal === 'npc_dialog') {
      this.confirmNpcAction();
    }
  }

  private confirmQuestBoardAction(): void {
    const quests = this.quests.getQuests();
    const selected = quests[this.qbSelectedIndex];
    if (!selected) return;

    if (selected.status === 'available') {
      const res = this.quests.acceptQuest(selected.id);
      this.qbLogMessage = res.message;
      if (res.ok) {
        this.audio.playQuestAccept();
        this.showToast(res.message, 3.0);
        this.menuCallbacks.onQuestAccepted(selected.id);
      }
    } else if (selected.status === 'ready') {
      const res = this.quests.turnInQuest(selected.id, this.player, this.inventory);
      this.qbLogMessage = res.message;
      if (res.ok) {
        this.audio.playQuestComplete();
        this.showToast(res.message, 4.0);
        this.menuCallbacks.onQuestTurnedIn(selected.id);
        this.renderInventoryModal();
      }
    } else if (selected.status === 'active') {
      this.quests.setTrackedQuest(selected.id);
      this.audio.playUiClick('select');
      this.qbLogMessage = t('quest.board.tracking_log', { title: selected.title });
    }
    this.renderQuestBoardModal();
  }

  private confirmJournalTrack(): void {
    const list = this.getJournalQuests();
    const selected = list[this.journalSelectedIndex];
    if (!selected) return;
    if (selected.status === 'active' || selected.status === 'ready') {
      this.quests.setTrackedQuest(selected.id);
      this.audio.playUiClick('select');
      this.showToast(t('toast.tracked_quest', { title: selected.title }));
      this.renderJournalModal();
    }
  }

  private getJournalQuests(): QuestEntry[] {
    const all = this.quests.getQuests();
    const order: Record<QuestStatus, number> = {
      ready: 0,
      active: 1,
      completed: 2,
      available: 3,
    };
    return [...all].sort((a, b) => order[a.status] - order[b.status]);
  }

  private renderObjectivesHtml(quest: QuestEntry): string {
    const doneTotal = quest.objectives.reduce((acc, o) => acc + Math.min(o.current, o.target), 0);
    const targetTotal = quest.objectives.reduce((acc, o) => acc + o.target, 0);
    const heading = `<div class="q-obj-heading">${t('quest.objectives_heading', {
      done: doneTotal,
      total: targetTotal,
    })}</div>`;

    const rows = quest.objectives
      .map((obj) => {
        const mark = obj.done ? '[✓]' : '[ ]';
        const progress = ` (${obj.current}/${obj.target})`;
        let dirHint = '';
        if (!obj.done && obj.targetX !== undefined && obj.targetY !== undefined) {
          const dir = compassDir(this.player.x, this.player.y, obj.targetX, obj.targetY);
          const dist = Math.round(Math.hypot(obj.targetX - this.player.x, obj.targetY - this.player.y));
          dirHint = ` <span class="q-obj-dir">${t('quest.obj_dir', { dir, dist })}</span>`;
        }
        return `<div class="q-obj-row${obj.done ? ' q-obj-done' : ''}">${mark} ${obj.label}<span class="q-obj-count">${progress}</span>${dirHint}</div>`;
      })
      .join('');

    return `${heading}${rows}`;
  }

  private renderQuestBoardModal(): void {
    const quests = this.quests.getQuests();
    if (this.qbSelectedIndex >= quests.length) this.qbSelectedIndex = 0;

    this.qbListEl.innerHTML = '';
    quests.forEach((q, idx) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `inv-item-row quest-list-row${idx === this.qbSelectedIndex ? ' selected' : ''}`;
      const cursor = idx === this.qbSelectedIndex ? '>' : ' ';
      const st = questStatusTag(q.status);
      row.innerHTML = `<span class="inv-cursor">${cursor}</span><span class="inv-name">${q.title}</span><span class="quest-status-pill ${st.cls}">${st.tag}</span>`;
      row.addEventListener('click', () => {
        this.qbSelectedIndex = idx;
        this.audio.playUiClick('select');
        this.renderQuestBoardModal();
      });
      this.qbListEl.appendChild(row);
    });

    const selected = quests[this.qbSelectedIndex];
    if (!selected) return;

    const st = questStatusTag(selected.status);
    this.qbDetailTitleEl.textContent = `${st.badge} ${selected.title}`;
    const repeatText =
      selected.repeatable && selected.completionCount > 0
        ? t('quest.repeat_count', { count: selected.completionCount })
        : '';
    this.qbDetailStatusEl.textContent = t('quest.status_line', {
      status: st.label,
      extra: repeatText,
    });
    this.qbDetailQuoteEl.innerHTML = `<div class="quest-story-quote">${selected.giverQuote}</div><div class="quest-story-desc">${selected.description}</div>`;
    this.qbDetailObjectivesEl.innerHTML = this.renderObjectivesHtml(selected);
    this.qbDetailRewardEl.textContent = t('quest.reward_line', { reward: selected.rewardSummary });

    if (selected.status === 'available') {
      this.qbActionBtn.disabled = false;
      this.qbActionBtn.textContent = t('quest.board.btn_accept');
    } else if (selected.status === 'ready') {
      this.qbActionBtn.disabled = false;
      this.qbActionBtn.textContent = t('quest.board.btn_turn_in');
    } else if (selected.status === 'active') {
      this.qbActionBtn.disabled = false;
      this.qbActionBtn.textContent = t('quest.board.btn_track');
    } else {
      this.qbActionBtn.disabled = true;
      this.qbActionBtn.textContent = t('quest.board.btn_completed');
    }

    this.qbLogEl.textContent = `| ${this.qbLogMessage}`;
  }

  private getNpcDialogOptions(): {
    badge: string;
    label: string;
    title: string;
    effect: string;
    btnText: string;
    citySketch?: CityPoiKind;
  }[] {
    if (this.npcDialogMode === 'trade') {
      if (this.activeNpc?.role === 'cartographer') {
        return [
          {
            badge: '[1]',
            label: t('npc.trade.oil.label'),
            title: t('npc.trade.oil.title'),
            effect: t('npc.trade.oil.effect'),
            btnText: t('npc.trade.oil.btn'),
          },
          {
            badge: '[2]',
            label: t('npc.trade.herbs.label'),
            title: t('npc.trade.herbs.title'),
            effect: t('npc.trade.herbs.effect'),
            btnText: t('npc.trade.herbs.btn'),
          },
          {
            badge: '[3]',
            label: t('npc.trade.kaelvarr.label'),
            title: t('npc.trade.kaelvarr.title'),
            effect: t('npc.trade.kaelvarr.effect'),
            btnText: t('npc.trade.kaelvarr.btn'),
            citySketch: 'city_kaelvarr',
          },
          {
            badge: '[4]',
            label: t('npc.trade.siltmoor.label'),
            title: t('npc.trade.siltmoor.title'),
            effect: t('npc.trade.siltmoor.effect'),
            btnText: t('npc.trade.siltmoor.btn'),
            citySketch: 'city_siltmoor',
          },
          {
            badge: '[5]',
            label: t('npc.trade.aethelgard.label'),
            title: t('npc.trade.aethelgard.title'),
            effect: t('npc.trade.aethelgard.effect'),
            btnText: t('npc.trade.aethelgard.btn'),
            citySketch: 'city_aethelgard',
          },
          {
            badge: '[6]',
            label: t('npc.trade.back.label'),
            title: t('npc.trade.back.title'),
            effect: t('npc.trade.back.effect'),
            btnText: t('npc.trade.back.btn'),
          },
        ];
      }

      return [
        {
          badge: '[1]',
          label: t('npc.trade.oil.label'),
          title: t('npc.trade.oil.title'),
          effect: t('npc.trade.oil.effect'),
          btnText: t('npc.trade.oil.btn'),
        },
        {
          badge: '[2]',
          label: t('npc.trade.herbs.label'),
          title: t('npc.trade.herbs.title'),
          effect: t('npc.trade.herbs.effect'),
          btnText: t('npc.trade.herbs.btn'),
        },
        {
          badge: '[3]',
          label: t('npc.trade.sketch.label'),
          title: t('npc.trade.sketch.title'),
          effect: t('npc.trade.sketch.effect'),
          btnText: t('npc.trade.sketch.btn'),
        },
        {
          badge: '[4]',
          label: t('npc.trade.back.label'),
          title: t('npc.trade.back.title'),
          effect: t('npc.trade.back.effect'),
          btnText: t('npc.trade.back.btn'),
        },
      ];
    }

    return [
      {
        badge: '[1]',
        label: t('npc.opt.history.label'),
        title: t('npc.opt.history.title'),
        effect: t('npc.opt.history.effect'),
        btnText: t('npc.opt.history.btn'),
      },
      {
        badge: '[2]',
        label: t('npc.opt.survival.label'),
        title: t('npc.opt.survival.title'),
        effect: t('npc.opt.survival.effect'),
        btnText: t('npc.opt.survival.btn'),
      },
      {
        badge: '[3]',
        label: t('npc.opt.trade.label'),
        title: t('npc.opt.trade.title'),
        effect: t('npc.opt.trade.effect'),
        btnText: t('npc.opt.trade.btn'),
      },
      {
        badge: '[4]',
        label: t('npc.opt.farewell.label'),
        title: t('npc.opt.farewell.title'),
        effect: t('npc.opt.farewell.effect'),
        btnText: t('npc.opt.farewell.btn'),
      },
    ];
  }

  private renderNpcDialogModal(): void {
    const npc = this.activeNpc;
    if (!npc) return;

    const options = this.getNpcDialogOptions();
    if (this.npcSelectedIndex >= options.length) this.npcSelectedIndex = 0;

    const npcName = getTravelerName(npc.role);
    const npcTitle = getTravelerTitle(npc.role);

    this.npcModalTitleEl.textContent = `${npcName.toUpperCase()} (${npc.glyph})`;
    this.npcModalHintEl.textContent = t('npc.modal_hint', { count: options.length });
    this.npcPaneHeadingEl.textContent =
      this.npcDialogMode === 'trade' ? t('npc.pane_trade') : t('npc.pane_topics');
    this.npcListEl.innerHTML = '';

    options.forEach((opt, idx) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `inv-item-row${idx === this.npcSelectedIndex ? ' selected' : ''}`;
      const cursor = idx === this.npcSelectedIndex ? '>' : ' ';
      row.innerHTML = `<span class="inv-cursor">${cursor}</span> <span class="inv-badge">${opt.badge}</span> <span class="inv-name">${opt.label}</span>`;
      row.addEventListener('click', () => {
        this.npcSelectedIndex = idx;
        this.confirmNpcAction();
      });
      this.npcListEl.appendChild(row);
    });

    const selected = options[this.npcSelectedIndex];
    this.npcDetailTitleEl.textContent = `${selected.badge} ${selected.title}`;
    this.npcDetailMetaEl.textContent = t('npc.meta_biome', {
      title: npcTitle,
      biome: getBiomeName(npc.biome),
    });
    this.npcDetailDescEl.textContent = this.resolveNpcQuote(npc);

    const tradableCounts = TRADABLE_LOOT_IDS.map((id) => {
      const count = this.inventory.countItem(id);
      if (count <= 0) return null;
      const item = this.inventory.getItems().find((it) => it.id === id);
      return `${item ? getItemName(item) : id} ×${count}`;
    }).filter((x): x is string => x !== null);

    this.npcDetailStockEl.innerHTML = `<div class="q-obj-row">${t('npc.stock_label', {
      list: tradableCounts.length > 0 ? tradableCounts.join(' · ') : t('npc.stock_none'),
    })}</div>`;
    this.npcDetailEffectEl.textContent = selected.effect;

    const backIndex = options.length - 1;
    const needsPayment = this.npcDialogMode === 'trade' && this.npcSelectedIndex < backIndex;
    const canAfford = !needsPayment || Boolean(this.inventory.findFirstTradable(TRADABLE_LOOT_IDS));
    this.npcActionBtn.disabled = !canAfford;
    this.npcActionBtn.textContent = canAfford ? selected.btnText : t('npc.btn_no_payment');
    this.npcLogEl.textContent = `| ${this.npcLogMessage}`;
  }

  private confirmNpcAction(): void {
    const npc = this.activeNpc;
    if (!npc) return;

    const npcName = getTravelerName(npc.role);

    if (this.npcDialogMode === 'main') {
      if (this.npcSelectedIndex === 0) {
        this.npcQuoteState = { kind: 'history', index: this.npcHistoryStep };
        this.npcHistoryStep += 1;
        this.npcLogMessage = t('npc.log.history', { name: npcName });
        this.audio.playUiClick('select');
        this.renderNpcDialogModal();
        return;
      }

      if (this.npcSelectedIndex === 1) {
        this.npcQuoteState = { kind: 'survival', index: this.npcSurvivalStep };
        this.npcSurvivalStep += 1;
        this.npcLogMessage = t('npc.log.survival', { name: npcName });
        this.audio.playUiClick('select');
        this.renderNpcDialogModal();
        return;
      }

      if (this.npcSelectedIndex === 2) {
        this.npcDialogMode = 'trade';
        this.npcSelectedIndex = 0;
        const maxOpt = npc.role === 'cartographer' ? 5 : 3;
        this.npcLogMessage = t('npc.log.trade_open', { max: maxOpt, back: maxOpt + 1 });
        this.audio.playUiClick('open');
        this.renderNpcDialogModal();
        return;
      }

      const farewells = getTravelerFarewells(npc.role);
      const farewell = farewells[Math.floor(Math.random() * farewells.length)];
      this.closeOverlayToGame();
      this.showToast(`${npcName}: ${farewell}`, 3.0);
      return;
    }

    // Trade sub-menu
    const options = this.getNpcDialogOptions();
    const backIndex = options.length - 1;
    if (this.npcSelectedIndex === backIndex) {
      this.npcDialogMode = 'main';
      this.npcSelectedIndex = 0;
      this.npcLogMessage = t('npc.default_log');
      this.audio.playUiClick('select');
      this.renderNpcDialogModal();
      return;
    }

    const payment = this.inventory.findFirstTradable(TRADABLE_LOOT_IDS);
    if (!payment) {
      this.audio.playUiClick('close');
      this.npcLogMessage = t('npc.log.no_payment');
      this.renderNpcDialogModal();
      return;
    }

    const paymentName = getItemName(payment);

    if (this.npcSelectedIndex === 0) {
      const oilName = getItemName(OIL_FLASK_TEMPLATE);
      this.inventory.removeItem(payment.id, 1);
      this.inventory.addItem(OIL_FLASK_TEMPLATE, 1);
      this.audio.playUiClick('potion');
      this.npcLogMessage = t('npc.log.traded', { paid: paymentName, received: oilName });
      this.showToast(t('toast.gained_item', { name: oilName }), 2.6);
      this.menuCallbacks.onTradeCompleted();
      this.renderInventoryModal();
      this.renderNpcDialogModal();
      return;
    }

    if (this.npcSelectedIndex === 1) {
      const herbsName = getItemName(HEALING_HERBS_TEMPLATE);
      this.inventory.removeItem(payment.id, 1);
      this.inventory.addItem(HEALING_HERBS_TEMPLATE, 1);
      this.audio.playUiClick('potion');
      this.npcLogMessage = t('npc.log.traded', { paid: paymentName, received: herbsName });
      this.showToast(t('toast.gained_item', { name: herbsName }), 2.6);
      this.menuCallbacks.onTradeCompleted();
      this.renderInventoryModal();
      this.renderNpcDialogModal();
      return;
    }

    const chosenOpt = options[this.npcSelectedIndex];
    const res = this.menuCallbacks.onRevealMapSketch(npc, chosenOpt?.citySketch);
    if (!res.poi) {
      this.audio.playUiClick('close');
      this.npcLogMessage = t('npc.log.no_ruins');
      this.renderNpcDialogModal();
      return;
    }
    this.inventory.removeItem(payment.id, 1);
    this.audio.playParchmentRustle();
    const poiName = getPoiName(res.poi.id);
    const dir = compassDir(this.player.x, this.player.y, res.poi.x, res.poi.y);
    const dist = Math.round(Math.hypot(res.poi.x - this.player.x, res.poi.y - this.player.y));
    this.npcQuoteState = { kind: 'sketch', poiId: res.poi.id, x: res.poi.x, y: res.poi.y };
    this.npcLogMessage = t('npc.log.sketch', {
      poi: poiName,
      dir,
      dist,
      chunks: res.newlyRevealedChunks,
    });
    this.showToast(t('toast.sketch_revealed', { name: poiName }), 3.4);
    this.menuCallbacks.onTradeCompleted();
    this.renderInventoryModal();
    this.renderNpcDialogModal();
  }

  private renderJournalModal(): void {
    const list = this.getJournalQuests();
    if (this.journalSelectedIndex >= list.length) this.journalSelectedIndex = 0;

    const trackedId = this.quests.getTrackedQuest()?.id;
    this.journalListEl.innerHTML = '';

    list.forEach((q, idx) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `inv-item-row quest-list-row${idx === this.journalSelectedIndex ? ' selected' : ''}`;
      const cursor = idx === this.journalSelectedIndex ? '>' : ' ';
      const st = questStatusTag(q.status);
      const pin = q.id === trackedId ? ' *' : '';
      row.innerHTML = `<span class="inv-cursor">${cursor}</span><span class="inv-name">${q.title}${pin}</span><span class="quest-status-pill ${st.cls}">${st.tag}</span>`;
      row.addEventListener('click', () => {
        this.journalSelectedIndex = idx;
        this.audio.playUiClick('select');
        this.renderJournalModal();
      });
      this.journalListEl.appendChild(row);
    });

    const selected = list[this.journalSelectedIndex];
    if (!selected) return;

    const st = questStatusTag(selected.status);
    this.journalDetailTitleEl.textContent = `${st.badge} ${selected.title}`;
    const pinLabel = selected.id === trackedId ? t('quest.journal.pinned_tag') : '';
    this.journalDetailStatusEl.textContent = t('quest.status_line', {
      status: st.label,
      extra: pinLabel,
    });
    this.journalDetailDescEl.innerHTML = `<div class="quest-story-quote">${selected.giverQuote}</div><div class="quest-story-desc">${selected.description}</div>`;
    this.journalDetailObjectivesEl.innerHTML = this.renderObjectivesHtml(selected);
    this.journalDetailRewardEl.textContent = t('quest.reward_line', {
      reward: selected.rewardSummary,
    });

    if (selected.status === 'active' || selected.status === 'ready') {
      this.journalTrackBtn.disabled = false;
      this.journalTrackBtn.textContent =
        selected.id === trackedId
          ? t('quest.journal.btn_tracked')
          : t('quest.journal.btn_track');
    } else if (selected.status === 'available') {
      this.journalTrackBtn.disabled = true;
      this.journalTrackBtn.textContent = t('quest.journal.btn_accept_board');
    } else {
      this.journalTrackBtn.disabled = true;
      this.journalTrackBtn.textContent = t('quest.journal.btn_completed');
    }
  }

  private getInventoryGroupLabel(category: InventoryItem['category']): string {
    if (category === 'weapon' || category === 'light' || category === 'relic') {
      return t('inv.group.gear');
    }
    if (category === 'consumable') {
      return t('inv.group.consumables');
    }
    return t('inv.group.lore_loot');
  }

  private renderInventoryModal(): void {
    const items = this.inventory.getItems();
    const selectedIdx = this.inventory.getSelectedIndex();

    this.invListEl.innerHTML = '';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'inv-empty';
      empty.textContent = t('inv.empty_bag');
      this.invListEl.appendChild(empty);
    } else {
      let lastGroup = '';
      items.forEach((item, index) => {
        const groupLabel = this.getInventoryGroupLabel(item.category);
        if (groupLabel !== lastGroup) {
          lastGroup = groupLabel;
          const groupHeader = document.createElement('div');
          groupHeader.className = 'inv-group-heading';
          groupHeader.textContent = `── ${groupLabel} ──`;
          this.invListEl.appendChild(groupHeader);
        }

        const isNew = this.inventory.isItemNew(item.id);
        const row = document.createElement('button');
        row.type = 'button';
        row.className = `inv-item-row${index === selectedIdx ? ' selected' : ''}${isNew ? ' inv-item-new' : ''}`;
        row.dataset.itemId = item.id;

        const cursor = index === selectedIdx ? '>' : ' ';
        const glyphInfo = getItemAsciiGlyph(item);
        const isEquipped =
          item.category === 'relic' ? item.equipped !== false : Boolean(item.equipped);
        const newTag = isNew ? `<span class="inv-tag-new">${t('inv.tag_new')}</span>` : '';
        const rightTag = isEquipped
          ? `<span class="inv-tag-equipped">${t('inv.tag_equipped')}</span>`
          : item.quantity > 1
            ? `<span class="inv-tag-qty">×${item.quantity}</span>`
            : '';

        row.innerHTML = `<span class="inv-cursor">${cursor}</span><span class="inv-row-glyph" style="color:${glyphInfo.color}">${glyphInfo.glyph}</span><span class="inv-name">${getItemName(item)}</span>${newTag}${rightTag}`;
        row.addEventListener('mouseenter', () => {
          if (this.inventory.isItemNew(item.id)) {
            this.inventory.markItemSeen(item.id);
            row.classList.remove('inv-item-new');
            row.querySelector('.inv-tag-new')?.remove();
          }
        });
        row.addEventListener('click', () => {
          this.inventory.select(index);
          this.audio.playUiClick('select');
          this.renderInventoryModal();
        });
        row.addEventListener('dblclick', () => {
          this.inventory.select(index);
          this.confirmListModal();
        });

        this.invListEl.appendChild(row);
      });
    }

    const selected = this.inventory.getSelectedItem();
    if (!selected) {
      this.invDetailArtEl.innerHTML = '';
      this.invDetailTitleEl.textContent = t('inv.no_item');
      this.invDetailMetaEl.textContent = '';
      this.invDetailDescEl.textContent = t('inv.no_item_desc');
      this.invDetailEffectEl.textContent = '';
      this.invActionBtn.disabled = true;
      this.invActionBtn.textContent = '[Enter] —';
    } else {
      const preview = getItemAsciiPreview(selected);
      this.invDetailArtEl.innerHTML = `<pre class="inv-ascii-art" style="color:${preview.color}">${preview.art}</pre>`;
      this.invDetailTitleEl.textContent = getItemName(selected);
      const isEquipped =
        selected.category === 'relic' ? selected.equipped !== false : Boolean(selected.equipped);
      const statusPill = isEquipped
        ? `<span class="inv-meta-equipped">${t('inv.meta_equipped')}</span>`
        : selected.quantity > 1
          ? `<span class="inv-meta-qty">${t('inv.meta_qty', { qty: selected.quantity })}</span>`
          : `<span class="inv-meta-muted">${t('inv.meta_in_bag')}</span>`;
      this.invDetailMetaEl.innerHTML = `<span class="inv-meta-cat">[${selected.symbol}] ${getItemCategoryLabel(selected)}</span> · ${statusPill}`;
      this.invDetailDescEl.textContent = getItemDescription(selected);
      this.invDetailEffectEl.textContent = t('inv.effect_prefix', {
        text: getItemEffectText(selected),
      });
      this.invActionBtn.disabled = false;
      this.invActionBtn.textContent = `[Enter] ${this.inventory.getActionLabel(selected)}`;
    }

    this.invLogEl.textContent = `| ${this.invLogMessage}`;
    this.renderInventoryStatsAndBuffs(true);
  }

  private renderInventoryStatsAndBuffs(force = false): void {
    const p = this.player;
    const lang = getLanguage();

    const fmtBonus = (delta: number, digits = 0, unit = ''): string => {
      if (Math.abs(delta) < 0.05) return '';
      const sign = delta > 0 ? '+' : '-';
      const abs = Math.abs(delta);
      const num = digits > 0 ? abs.toFixed(digits) : String(Math.round(abs));
      const cls = delta > 0 ? 'inv-stat-bonus' : 'inv-stat-penalty';
      return ` <span class="${cls}">(${sign}${num}${unit})</span>`;
    };

    const hpBonus = p.maxHp - p.baseMaxHp;
    const hpVal = `${Math.round(p.hp)} / ${p.maxHp}${fmtBonus(hpBonus)}`;

    const stBonus = p.maxStamina - p.baseMaxStamina;
    const stRegen = p.getEffectiveStaminaRegenRate();
    const stRegenDelta = stRegen - p.staminaRegenRate;
    const stVal = `${Math.round(p.stamina)} / ${p.maxStamina}${fmtBonus(stBonus)}`;
    const stRegenVal = `${stRegen.toFixed(1)}/s${fmtBonus(stRegenDelta, 1, '/s')}`;

    const dmgTotal = p.getAttackDamage();
    const dmgVal = `${dmgTotal}${fmtBonus(p.weaponAttackBonus)}`;

    const armorPct = Math.round(p.damageReduction * 100);
    const armorVal = `${armorPct}%${fmtBonus(armorPct, 0, '%')}`;

    const unitCells = t('stats.unit_cells');
    const unitCellsSec = t('stats.unit_cells_sec');

    const light = p.getLanternLightRange();
    const lightVal = light.isLit
      ? `${light.total.toFixed(1)} ${unitCells}${fmtBonus(light.bonus, 1)}`
      : t('stats.light_off', {
          val: light.total.toFixed(1),
          bonus: fmtBonus(light.bonus, 1),
        });

    const oilDrain = p.getEffectiveOilDrainRate();
    const oilEfficiencyPct = Math.round((1 - p.oilDrainMultiplier) * 100);
    const oilOn = p.lanternOn && p.oil > 0;
    const oilBonusHtml =
      oilEfficiencyPct > 0
        ? ` <span class="inv-stat-bonus">(-${oilEfficiencyPct}%)</span>`
        : '';
    const oilVal = oilOn
      ? `${oilDrain.toFixed(2)}/s${oilBonusHtml}`
      : `0.00/s <span class="inv-stat-muted">${t('stats.oil_off_suffix')}</span>`;

    const walk = p.getEffectiveWalkSpeed();
    const walkVal = `${walk.total.toFixed(1)} ${unitCellsSec}${fmtBonus(walk.delta, 1)}`;

    const detect = p.getEnemyDetectionInfo(this.lastAmbientContext);
    const detectDelta = detect.total - detect.base;
    const detectCls =
      detectDelta <= -0.5 ? 'inv-stat-bonus' : detectDelta >= 0.5 ? 'inv-stat-penalty' : 'inv-stat-muted';
    const detectVal = `${detect.total.toFixed(1)} ${unitCells} <span class="${detectCls}">(${detect.label})</span>`;

    const effectSigParts: string[] = [];
    const effectRows: string[] = [];
    const passivePrefixRe = new RegExp(t('stats.passive_prefix_regex'), 'i');

    for (const item of this.inventory.getItems()) {
      if (item.category === 'relic' && item.quantity > 0 && item.equipped !== false) {
        const desc = getItemEffectText(item).replace(passivePrefixRe, '');
        effectSigParts.push(`r:${item.id}`);
        effectRows.push(
          `<div class="inv-buff-row inv-buff-relic"><div class="inv-buff-head"><span class="inv-buff-tag">[${item.symbol}]</span> <span class="inv-buff-name">${getItemName(item)}</span> <span class="inv-buff-meta">${t('stats.buff_relic_meta')}</span></div><div class="inv-buff-desc">${desc}</div></div>`
        );
      }
    }

    for (const eff of p.activeEffects) {
      const secs = Math.max(1, Math.ceil(eff.remainingSeconds));
      const cls = eff.kind === 'buff' ? 'inv-buff-pos' : 'inv-buff-neg';
      const tag = eff.kind === 'buff' ? '[+]' : '[-]';
      const disp = getStatusEffectDisplay(eff);
      effectSigParts.push(`e:${eff.id}:${eff.sourceItemId ?? ''}:${secs}`);
      effectRows.push(
        `<div class="inv-buff-row ${cls}"><div class="inv-buff-head"><span class="inv-buff-tag">${tag}</span> <span class="inv-buff-name">${disp.name}</span> <span class="inv-buff-time">${secs}s</span></div><div class="inv-buff-desc">${disp.description}</div></div>`
      );
    }

    if (p.exhausted) {
      effectSigParts.push('exhausted');
      effectRows.push(
        `<div class="inv-buff-row inv-buff-neg"><div class="inv-buff-head"><span class="inv-buff-tag">[!]</span> <span class="inv-buff-name">${t('buff.exhausted.name')}</span> <span class="inv-buff-time">${t('buff.exhausted.time')}</span></div><div class="inv-buff-desc">${t('buff.exhausted.desc')}</div></div>`
      );
    }

    if (p.inColdBiome) {
      effectSigParts.push('cold');
      effectRows.push(
        `<div class="inv-buff-row inv-buff-neg"><div class="inv-buff-head"><span class="inv-buff-tag">[!]</span> <span class="inv-buff-name">${t('buff.frost.name')}</span> <span class="inv-buff-time">${t('buff.frost.time')}</span></div><div class="inv-buff-desc">${t('buff.frost.desc')}</div></div>`
      );
    }

    if (p.isSneaking) {
      effectSigParts.push(`sneak:${p.inUndergrowth ? 1 : 0}`);
      const sneakName = p.inUndergrowth ? t('buff.sneak.name_cover') : t('buff.sneak.name');
      const sneakDesc = p.inUndergrowth ? t('buff.sneak.desc_cover') : t('buff.sneak.desc');
      effectRows.push(
        `<div class="inv-buff-row inv-buff-pos"><div class="inv-buff-head"><span class="inv-buff-tag">[C]</span> <span class="inv-buff-name">${sneakName}</span></div><div class="inv-buff-desc">${sneakDesc}</div></div>`
      );
    }

    const signature = `${lang}|${hpVal}|${stVal}|${stRegenVal}|${dmgVal}|${armorVal}|${lightVal}|${oilVal}|${walkVal}|${detectVal}|${effectSigParts.join(',')}`;
    if (!force && signature === this.lastInvStatsSignature) {
      return;
    }
    this.lastInvStatsSignature = signature;

    const buffsHtml =
      effectRows.length > 0
        ? effectRows.join('')
        : `<div class="inv-buff-empty">${t('stats.buff_empty')}</div>`;

    const statLine = (label: string, val: string): string =>
      `<div class="inv-stat-line"><span class="inv-stat-label">${label}</span><span class="inv-stat-val">${val}</span></div>`;

    this.invStatsPanelEl.innerHTML = `
      <div class="ascii-box">
        <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        <div class="ascii-box-title"><span class="ascii-pipe">|</span><span>${t('stats.heading')}</span><span class="ascii-pipe">|</span></div>
        <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        <div class="ascii-box-frame">
          <div class="inv-stat-group">
            ${statLine(t('stats.hp'), hpVal)}
            ${statLine(t('stats.stamina'), stVal)}
            ${statLine(t('stats.stamina_regen'), stRegenVal)}
          </div>
          <div class="inv-stat-sep"></div>
          <div class="inv-stat-group">
            ${statLine(t('stats.attack'), dmgVal)}
            ${statLine(t('stats.defense'), armorVal)}
          </div>
          <div class="inv-stat-sep"></div>
          <div class="inv-stat-group">
            ${statLine(t('stats.light_range'), lightVal)}
            ${statLine(t('stats.oil_drain'), oilVal)}
            ${statLine(t('stats.walk_speed'), walkVal)}
            ${statLine(t('stats.detection'), detectVal)}
          </div>
        </div>
        <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
      </div>
      <div class="ascii-box">
        <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        <div class="ascii-box-title"><span class="ascii-pipe">|</span><span>${t('stats.buffs_heading')}</span><span class="ascii-pipe">|</span></div>
        <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        <div class="ascii-box-frame inv-buff-list">
          ${buffsHtml}
        </div>
        <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
      </div>
    `;
  }

  public showToast(message: string, duration = 2.6): void {
    this.toastEl.textContent = `[ ${message} ]`;
    this.toastEl.classList.remove('hidden');
    this.toastTimer = duration;
  }

  public update(
    world: World,
    lighting: LightingSystem,
    environment: EnvironmentSystem,
    zoom: number,
    elapsedTime: number,
    dt: number,
    chartedMarkers: readonly ChartedMarker[] = []
  ): void {
    const lang = getLanguage();

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        this.toastEl.classList.add('hidden');
      }
    }

    this.lastAmbientContext = {
      nightFactor: environment.getAmbientProfile().nightFactor,
      fogIntensity: environment.fogIntensity,
    };

    if (this.activeModal === 'menu') {
      this.titleBg.updateAndRender(dt, elapsedTime);
    }

    if (this.activeModal === 'inventory') {
      this.renderInventoryStatsAndBuffs();
    }

    this.deathBannerEl.classList.toggle('hidden', !this.player.isDead || this.activeModal !== 'none');

    // Contextual interaction prompt ([E] Relic, Roadside NPC, or Quest Board)
    let promptText = '';
    if (this.activeModal === 'none' && !this.player.isDead) {
      const nearbyRelic = this.quests.getNearbyRelic(this.player.x, this.player.y);
      const nearbyNpc = world.getNearbyTraveler(this.player.x, this.player.y);
      if (nearbyRelic) {
        promptText = t('prompt.collect_relic', { name: getItemName(nearbyRelic) });
      } else if (nearbyNpc) {
        promptText = t('prompt.talk_npc', {
          name: getTravelerName(nearbyNpc.role),
          glyph: nearbyNpc.glyph,
        });
      } else if (world.isNearQuestGiver(this.player.x, this.player.y)) {
        const hasReady = this.quests.getQuests().some((q) => q.status === 'ready');
        promptText = hasReady ? t('prompt.quest_turn_in') : t('prompt.quest_board');
      }
    }

    if (promptText !== this.lastInteractText) {
      this.lastInteractText = promptText;
      if (promptText) {
        this.interactPromptEl.textContent = promptText;
        this.interactPromptEl.classList.remove('hidden');
      } else {
        this.interactPromptEl.classList.add('hidden');
      }
    }

    // Update nearby signpost direction readout plate
    const nearbySign =
      this.activeModal === 'none' ? world.getNearbySignpost(this.player.x, this.player.y, 4.4) : null;
    if (nearbySign) {
      const lines = nearbySign.resolveLines ? nearbySign.resolveLines() : nearbySign.lines;
      const signText = `${t('signpost.header')}  ${lines.join('  ·  ')}`;
      if (signText !== this.lastSignpostText) {
        this.lastSignpostText = signText;
        this.signpostEl.textContent = signText;
      }
      this.signpostEl.classList.remove('hidden');
    } else if (this.lastSignpostText !== '') {
      this.lastSignpostText = '';
      this.signpostEl.classList.add('hidden');
    }

    const zone = world.getZoneName(this.player.x, this.player.y).toUpperCase();
    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);
    const hp = Math.round(this.player.hp);
    const maxHp = this.player.maxHp;
    const st = Math.round(this.player.stamina);
    const maxSt = this.player.maxStamina;
    const oil = Math.round(this.player.oil);
    const maxOil = this.player.maxOil;
    const lanternLit = this.player.lanternOn && this.player.oil > 0;
    const isMuted = this.audio.isMuted();
    const zoomStr = `${zoom.toFixed(2)}×`;
    const envText = `${environment.getClockText()} · ${environment.getPhaseLabel()} · ${environment.getWeatherLabel()}`;

    const tags: string[] = [];
    if (this.player.isDead) tags.push(t('hud.tag.fallen'));
    else if (this.player.isDashing) tags.push(t('hud.tag.dash'));
    else if (oil <= 0) tags.push(t('hud.tag.no_oil'));
    else if (lanternLit) tags.push(t('hud.tag.lantern'));
    else tags.push(t('hud.tag.lantern_off'));
    if (!this.player.isDead) {
      if (this.player.isSneaking) {
        tags.push(this.player.inUndergrowth ? t('hud.tag.sneak_cover') : t('hud.tag.sneak'));
      } else if (this.player.isSprinting) {
        tags.push(t('hud.tag.sprint'));
      } else if (this.player.exhausted) {
        tags.push(t('hud.tag.exhausted'));
      }
    }
    if (this.player.inColdBiome) tags.push(t('hud.tag.frost'));
    if (this.player.hasTorchLit) tags.push(t('hud.tag.torch'));
    if (this.player.equippedWeapon) tags.push(t('hud.tag.blade'));
    if (this.player.activeRelicCount > 0) {
      tags.push(
        this.player.activeRelicCount > 1
          ? t('hud.tag.relic_multi', { count: this.player.activeRelicCount })
          : t('hud.tag.relic')
      );
    }
    if (isMuted) tags.push(t('hud.tag.mute'));
    const statusText = tags.join(' · ');
    const sneaking = !this.player.isDead && this.player.isSneaking;
    const hasNewInv = this.inventory.hasNewItems();

    const signature = `${lang}|${zone}|${x}|${y}|${hp}/${maxHp}|${st}/${maxSt}|${oil}|${lanternLit}|${isMuted}|${envText}|${statusText}|${zoomStr}|${this.player.exhausted}|${this.player.inColdBiome}|${sneaking}|${this.player.inUndergrowth}|${this.player.activeRelicCount}|${hasNewInv}`;
    if (signature !== this.lastHudSignature) {
      this.lastHudSignature = signature;

      this.hudZoneEl.textContent = zone;
      this.hudCoordsEl.textContent = `${x},${y}`;
      this.hudHpBarEl.textContent = buildAsciiBar(hp, maxHp, 10);
      this.hudHpValEl.textContent = `${String(hp).padStart(3, ' ')}/${maxHp}`;
      this.hudStBarEl.textContent = buildAsciiBar(st, maxSt, 10);
      this.hudStValEl.textContent = `${String(st).padStart(3, ' ')}/${maxSt}`;
      this.hudStBarEl.classList.toggle('stat-exhausted', this.player.exhausted);
      this.hudOilBarEl.textContent = buildAsciiBar(oil, maxOil, 10);
      this.hudOilValEl.textContent = `${String(oil).padStart(3, ' ')}/${maxOil}`;
      this.hudOilBarEl.classList.toggle('stat-oil-off', !lanternLit);
      this.hudOilValEl.classList.toggle('stat-oil-off', !lanternLit);
      this.hudEnvEl.textContent = envText;
      this.hudStatusEl.textContent = statusText;
      this.hudZoomEl.textContent = zoomStr;
      this.hudMuteEl.innerHTML = isMuted
        ? `<kbd>[N]</kbd> ${t('hud.ctrl.mute_active')}`
        : `<kbd>[N]</kbd> ${t('hud.ctrl.mute')}`;
      this.hudMuteEl.classList.toggle('ctrl-muted', isMuted);
      this.hudStealthEl.innerHTML = sneaking
        ? `<kbd>[C/Shift]</kbd> ${t('hud.ctrl.sneak_active')}`
        : `<kbd>[C/Shift]</kbd> ${t('hud.ctrl.sneak')}`;
      this.hudStealthEl.classList.toggle('ctrl-stealth-active', sneaking);
      this.hudInvEl.innerHTML = hasNewInv
        ? `<kbd>[I*]</kbd> ${t('hud.ctrl.inventory')}`
        : `<kbd>[I]</kbd> ${t('hud.ctrl.inventory')}`;
      this.hudInvEl.classList.toggle('ctrl-inv-new', hasNewInv);
    }

    // Update top-right Quest Tracker HUD
    const tracker = this.quests.getHudTrackerInfo(this.player.x, this.player.y, world);
    const qSig = tracker
      ? `${lang}|${tracker.title}|${tracker.progressLine}|${tracker.navLine}|${tracker.isReady}`
      : `${lang}|NONE|${Math.round(this.player.x / 4)}|${Math.round(this.player.y / 4)}`;
    if (qSig !== this.lastQuestSignature) {
      this.lastQuestSignature = qSig;
      if (tracker) {
        this.hudQuestTitleEl.textContent = tracker.title;
        this.hudQuestTitleEl.classList.toggle('quest-ready-title', tracker.isReady);
        this.hudQuestProgEl.textContent = tracker.progressLine;
        this.hudQuestNavEl.textContent = tracker.navLine;
      } else {
        const allCompleted = this.quests.getQuests().every((q) => q.status === 'completed');
        this.hudQuestTitleEl.textContent = allCompleted
          ? t('hud.quest_all_done')
          : t('hud.quest_none');
        this.hudQuestTitleEl.classList.remove('quest-ready-title');
        this.hudQuestProgEl.textContent = t('hud.quest_board_hint');
        const dir = compassDir(this.player.x, this.player.y, world.questGiver.x, world.questGiver.y);
        const dist = Math.round(Math.hypot(world.questGiver.x - this.player.x, world.questGiver.y - this.player.y));
        this.hudQuestNavEl.textContent =
          dist <= 5 ? t('hud.quest_board_inspect') : t('hud.quest_board_dir', { dir, dist });
      }
    }

    if (this.activeModal === 'map') {
      this.mapOverlay.render(
        world,
        this.player,
        lighting,
        elapsedTime,
        this.quests.getActiveMapMarkers(world),
        chartedMarkers
      );
    }
  }
}
