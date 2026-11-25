import type { AudioEngine } from './audio';
import type { EnvironmentSystem } from './environment';
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
  BiomeKind,
  ChartedMarker,
  CityPoiKind,
  InventoryItem,
  PointOfInterest,
  QuestEntry,
  QuestStatus,
  RoadsideNpc,
  TravelerRole,
} from './types';
import { BIOME_NAMES, compassDir, type World } from './world';

declare const __APP_VERSION__: string;

const TRADABLE_LOOT_IDS = [
  'ember-shard',
  'ghoul-claw',
  'ancient-bone-shard',
  'ashen-chalice',
  'old-parchment',
] as const;

const TITLE_ASCII_LOGO = String.raw`
 _   _ _   _ _     ___ _  ____   __  __     ___    _____ _     _   _ 
| | | | | | | |   |_ _| |/ /\ \ / /  \ \   / / \  | ____| |   | | | |
| | | | |_| | |    | || ' /  \ V /    \ \ / / _ \ |  _| | |   | | | |
| |_| |  _  | |___ | || . \   | |      \ V / ___ \| |___| |___| |_| |
 \___/|_| |_|_____|___|_|\_\  |_|       \_/_/   \_\_____|_____|\___/ 
`.replace(/^\n|\n$/g, '');

const ROLE_GREETINGS: Record<TravelerRole, readonly string[]> = {
  pilgrim: [
    '„Pokoj tvému kroku, poutníku. Přisedni na chvíli k ohni, než noc znovu probudí stíny Vaelu.“',
    '„Tvá lucerna ještě hoří… To je v těchto končinách vzácné znamení. Co tě vede po starých cestách?“',
    '„Dlouho jsem nepotkal živou duši, která by nepatřila k těm prokletým hlídkám. Pověz, co hledáš?“',
  ],
  ember_gatherer: [
    '„Stůj, příteli — u mého ohniště jsi v bezpečí. Máš v batohu nějaké uhlíky či staré relikvie?“',
    '„Popel ještě nevychladl a v troskách se pořád leskne olej i železo. Chceš si odpočinout, nebo směnit zásoby?“',
    '„Tiše, ať nepřilákáme ghúly z remízku. Ohřej se u plamene a řekni, co potřebuješ na další cestu.“',
  ],
  cartographer: [
    '„Vítej u mého táboráku! Pergamen mi vlhne mlhou, ale staré cesty Vaelu mám stále v oku.“',
    '„Pozoruhodné, že jsi došel až sem bez škrábance. Zajímá tě historie této říše, nebo chceš zakreslit ruiny?“',
    '„Mapy zlatého věku už jsou jen cáry papíru, přesto v nich čtu stopy dávných staveb. Ptej se, pocestný.“',
  ],
};

const ROLE_HISTORY_LORE: Record<TravelerRole, readonly string[]> = {
  pilgrim: [
    '„Kdysi byl Vael říší kamenných silnic, učených měst a věží, jejichž lucerny zářily do noci jako hvězdy. Lidé tu žili v hojnosti a míru.“',
    '„Tři klenoty říše — železná metropole Kael’Varr, přístav Siltmoor a bílý Aethelgard — nesly světlo Vaelu. Pak přišla bitva s nestvůrami a všechna tři města padla.“',
    '„Jakmile utichly zvony, příroda, popel a nestvůry si zemi vzaly zpět. V Aethelgardu prý Poslední inkvizitor stále střeží relikvii starého světla.“',
  ],
  ember_gatherer: [
    '„Před válkou tu stály bohaté dílny, kovárny a sklady oleje. V železné výhni Kael’Varru kovali zbroj i lampy pro celé království.“',
    '„Když se valily hordy nestvůr, obránci zapálili zásobárny a prchali do útočišť. V Kael’Varru u vyhaslých pecí prý stále duní kladivo Železného slévače.“',
    '„Dnes bohaté rozvaliny hlídají stíny a nemrtví z oné bitvy — v bažinách Siltmooru se pak skrývá šílený alchymista se svými jedovatými výpary.“',
  ],
  cartographer: [
    '„Moje staré mapy kvetoucího Vaelu už neplatí. Kde bývaly rušné obchodní stezky do Kael’Varru, Siltmooru a Aethelgardu, tam dnes roste jen trní a křoví.“',
    '„Bitva s nestvůrami rozbila kamenné mosty přes řeky a zaplavila přístav Siltmoor. Dnes nad černou vodou vedou jen ztrouchnivělé lávky se zelenými lucernami.“',
    '„Na severu stojí Aethelgard — Bílý relikviář z bledého mramoru, zatímco na východě doutná Kael’Varr. Přineseš-li uhlík či relikvii, zakreslím ti cestu k nim do mapy [M].“',
  ],
};

const ROLE_SURVIVAL_TIPS: Record<TravelerRole, readonly string[]> = {
  pilgrim: [
    '„Když spatříš hlídku nestvůr, zhasni lucernu [F] a přikrč se klávesou [C]. V tichém plížení v podrostu (♣, ♠, ↟) kolem nich proklouzneš bez boje.“',
    '„Rozsvícená lucerna [F] v noci a husté mlze září daleko — nestvůry tě pak zpozorují mnohem dříve než za dne.“',
    '„Dávej pozor na zvuk svých kroků! Rychlý běh [Shift], boj i úskok [RMB] šíří vlny hluku, které přilákají nepřátele z okolí.“',
  ],
  ember_gatherer: [
    '„Při přebrodění řeky bez mostu šetři výdrž a neplýtvej silami — voda zpomaluje krok a hlasité šplouchání budí ghúly daleko od břehu.“',
    '„Potřebuješ-li projít kolem přesily, zhasni lucernu [F], skloň se do plížení [C] a drž se lesního podrostu.“',
    '„Každý úder mečem i prudký úskok [RMB] dělá hluk. V ruinách nejprve poslouchej, než vyvoláš zbytečný souboj.“',
  ],
  cartographer: [
    '„V neznámém terénu sleduj směrovky a šetři síly před broděním řek — vyčerpaný poutník v proudu se stává snadnou kořistí.“',
    '„Klávesou [C] nebo krátkým klepnutím na [Shift] přepneš tiché plížení. Bez světla lucerny [F] v noci téměř zmizíš ze zraku hlídek.“',
    '„Pokud uslyšíš či zahlédneš zvukové vlny z běhu nebo boje, počítej s tím, že nejbližší stvůry vyrazí místo prozkoumat.“',
  ],
};

const ROLE_FAREWELLS: Record<TravelerRole, readonly string[]> = {
  pilgrim: [
    '„Kéž tvůj plamen nezhasne dřív, než najdeš útočiště.“',
    '„Choď tiše, poutníku. Starý Vael na tebe ještě nezapomněl.“',
  ],
  ember_gatherer: [
    '„Ať ti olej vydrží a popel pod nohama zůstane klidný.“',
    '„Najdeš-li další uhlíky, víš, u kterého ohně mě hledat.“',
  ],
  cartographer: [
    '„Šťastnou cestu a pevné stezky pod nohama, cestovateli.“',
    '„Nezapomeň občas nahlédnout do mapy [M] — divočina ráda mate.“',
  ],
};

const BIOME_WARNINGS: Record<BiomeKind, string> = {
  moor_forest: 'Varování: Popelavá louka klame klidem; v remízcích hlídkují ghúlové, ale husté kapradí (♣, ♠) kryje plížení.',
  marsh: 'Varování: Mrtvá bažina zpomaluje krok a hlasité brodění vodou láká stvůry z rákosí.',
  ash: 'Varování: Popelavá pustina je otevřená a holá — bez krytu tě hlídky s lucernou uvidí z velké dálky.',
  quarry: 'Varování: Ve skalnatém kamenolomu se zvuk kroků nese mezi balvany. Postupuj tiše a vyhni se hlídkám.',
  blood_forest: 'Varování: Prokletý krvavý les je plný hladových ghúlů; pliž se pod rudými korunami bez rozsvícené lucerny.',
  volcanic: 'Varování: Sopečná trhlina pálí lávovými průrvami. Přes pukliny skákej úskokem [RMB], ale dej pozor na hluk.',
  frost: 'Varování: Zmrzlá pustina zpomaluje obnovu výdrže. Neplýtvej zbytečně během, pokud nemusíš.',
  bone_plain: 'Varování: Kostěná pláň je posetá strážci popela. Sleduj hlídky a využívej stín před bojem.',
};

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

function questStatusTag(status: QuestStatus): { badge: string; label: string; cls: string } {
  switch (status) {
    case 'ready':
      return { badge: '[✓]', label: 'Připraveno k odevzdání', cls: 'q-ready' };
    case 'active':
      return { badge: '[>]', label: 'Aktivní úkol', cls: 'q-active' };
    case 'completed':
      return { badge: '[x]', label: 'Splněno', cls: 'q-done' };
    case 'available':
    default:
      return { badge: '[!]', label: 'Nový úkol', cls: 'q-avail' };
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
  private readonly titleBg: TitleBackground;
  private readonly menuContinueBtn: HTMLButtonElement;
  private readonly menuSaveInfoEl: HTMLDivElement;
  private readonly menuSeedDrawer: HTMLDivElement;
  private readonly menuSeedInput: HTMLInputElement;
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
  private invLogMessage = 'Vyber předmět šipkami nebo myší. [Enter] použije či nasadí.';
  private qbLogMessage = 'Vyber úkol ze seznamu. [Enter] přijme nebo odevzdá splněný úkol.';
  private npcLogMessage = 'Zvol odpověď [1–4], šipkami nebo myší. [Esc] zavře rozhovor.';
  private qbSelectedIndex = 0;
  private journalSelectedIndex = 0;
  private npcSelectedIndex = 0;
  private npcDialogMode: 'main' | 'trade' = 'main';
  private npcHistoryStep = 0;
  private npcSurvivalStep = 0;
  private activeNpc: RoadsideNpc | null = null;
  private npcSpokenQuote = '';

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
        <span id="hud-zone" class="hud-zone-title">STARTOVNÍ MÝTINA</span>
        <span id="hud-coords" class="hud-coords">0,2</span>
        <span class="ascii-pipe">|</span>
      </div>
      <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
      <div class="hud-line">
        <span class="ascii-pipe">|</span>
        <span class="stat-label stat-hp">HP</span>
        <span id="hud-hp-bar" class="stat-bar stat-hp">[||||||||..]</span>
        <span id="hud-hp-val" class="stat-val stat-hp"> 80/100</span>
        <span class="ascii-pipe">|</span>
      </div>
      <div class="hud-line">
        <span class="ascii-pipe">|</span>
        <span class="stat-label stat-st">ST</span>
        <span id="hud-st-bar" class="stat-bar stat-st">[||||||||||]</span>
        <span id="hud-st-val" class="stat-val stat-st">100/100</span>
        <span class="ascii-pipe">|</span>
      </div>
      <div class="hud-line">
        <span class="ascii-pipe">|</span>
        <span class="stat-label stat-oil">OL</span>
        <span id="hud-oil-bar" class="stat-bar stat-oil">[||||||||||]</span>
        <span id="hud-oil-val" class="stat-val stat-oil">100/100</span>
        <span class="ascii-pipe">|</span>
      </div>
      <div class="hud-line hud-env-line">
        <span class="ascii-pipe">|</span>
        <span id="hud-env" class="hud-env-text">10:33 · Slunečný den · Jasno</span>
        <span class="ascii-pipe">|</span>
      </div>
      <div class="hud-line hud-status-line">
        <span class="ascii-pipe">|</span>
        <span id="hud-status" class="hud-status-text">LUCERNA</span>
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
        <span class="quest-hud-heading">AKTIVNÍ ÚKOL</span>
        <span class="hud-coords">[J]</span>
        <span class="ascii-pipe">|</span>
      </div>
      <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
      <div id="hud-quest-title" class="quest-hud-title">Žádný aktivní úkol</div>
      <div id="hud-quest-prog" class="quest-hud-prog">Promluv u tabule [!] na mýtině</div>
      <div id="hud-quest-nav" class="quest-hud-nav">[E] Přijmout úkol</div>
      <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
    `;

    // 2. Bottom-right controls hint
    const hudBottomRight = document.createElement('div');
    hudBottomRight.id = 'hud-bottom-right';
    hudBottomRight.className = 'ascii-controls-bar';
    hudBottomRight.innerHTML = `
      <span class="ctrl-item"><kbd>[LMB/Space]</kbd> Útok</span>
      <span class="ctrl-item"><kbd>[RMB]</kbd> Úskok</span>
      <span class="ctrl-item"><kbd>[E]</kbd> Akce</span>
      <span class="ctrl-item"><kbd>[J]</kbd> Úkoly</span>
      <span class="ctrl-item"><kbd>[F]</kbd> Lucerna</span>
      <span id="hud-stealth" class="ctrl-item"><kbd>[C/Shift]</kbd> Plížení</span>
      <span id="hud-inv" class="ctrl-item"><kbd>[I]</kbd> Inventář</span>
      <span class="ctrl-item"><kbd>[M]</kbd> Mapa</span>
      <span class="ctrl-item"><kbd>[T/P]</kbd> Čas/Počasí</span>
      <span class="ctrl-item"><kbd>[Esc]</kbd> Menu</span>
      <span id="hud-mute" class="ctrl-item"><kbd>[N]</kbd> Mute</span>
      <span class="ctrl-sep">·</span>
      <span class="ctrl-item">Zoom <strong id="hud-zoom">1.00×</strong></span>
    `;

    // 2b. Floating combat & loot toast
    this.toastEl = document.createElement('div');
    this.toastEl.id = 'hud-toast';
    this.toastEl.className = 'hud-toast hidden';

    // 2c. Contextual interaction prompt ([E] Promluvit / Sebrat relikvii)
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
      <div class="death-title">+--- PADL JSI V POPELU ---+</div>
      <div class="death-sub">Stiskni <kbd>[R]</kbd> pro návrat k útočišti</div>
    `;

    // 3. Fullscreen Title Screen / Pause Menu
    this.menuBackdrop = document.createElement('div');
    this.menuBackdrop.id = 'game-menu-modal';
    this.menuBackdrop.className = 'title-screen';
    this.menuBackdrop.setAttribute('role', 'dialog');
    this.menuBackdrop.setAttribute('aria-label', 'Hlavní menu');
    this.menuBackdrop.innerHTML = `
      <canvas id="title-bg-canvas" class="title-bg-canvas" aria-hidden="true"></canvas>
      <div class="title-screen-content">
        <div class="title-header-block">
          <pre id="title-ascii-logo" class="title-ascii-logo" aria-label="UHLIKY VAELU"></pre>
          <div class="title-lore-subtitle">„Když velká říše Vaelu lehla popelem, zůstala jen jiskra v tvé lucerně.“</div>
        </div>
        <nav class="title-nav" aria-label="Hlavní nabídka">
          <button id="menu-continue-btn" type="button" class="title-nav-item" data-menu-action="continue">
            <span class="title-item-main">
              <span class="title-cursor" aria-hidden="true"> </span>
              <span class="title-item-label">Pokračovat ve výpravě</span>
            </span>
            <div id="menu-save-info" class="title-item-sub"></div>
          </button>
          <button id="menu-new-game-btn" type="button" class="title-nav-item" data-menu-action="new_game">
            <span class="title-item-main">
              <span class="title-cursor" aria-hidden="true"> </span>
              <span class="title-item-label">Nová výprava</span>
            </span>
          </button>
          <button id="menu-custom-seed-btn" type="button" class="title-nav-item" data-menu-action="custom_seed">
            <span class="title-item-main">
              <span class="title-cursor" aria-hidden="true"> </span>
              <span class="title-item-label">Vlastní seed světa</span>
            </span>
          </button>
          <div id="title-seed-drawer" class="title-seed-drawer hidden">
            <input id="menu-seed-input" type="text" maxlength="20" class="ascii-input title-seed-input" placeholder="Např. ASH-8492" autocomplete="off" />
            <button id="menu-seed-launch-btn" type="button" class="ascii-btn ascii-btn-primary">[ Spustit ]</button>
          </div>
          <button id="menu-chronicle-btn" type="button" class="title-nav-item" data-menu-action="chronicle">
            <span class="title-item-main">
              <span class="title-cursor" aria-hidden="true"> </span>
              <span class="title-item-label">Kronika a ovládání</span>
            </span>
          </button>
          <button id="menu-quit-btn" type="button" class="title-nav-item" data-menu-action="quit">
            <span class="title-item-main">
              <span class="title-cursor" aria-hidden="true"> </span>
              <span class="title-item-label">Ukončit hru</span>
            </span>
          </button>
        </nav>
        <div class="title-audio-panel" aria-label="Nastavení zvuku">
          <div class="title-audio-heading">-- ZVUK --</div>
          <label class="title-audio-row" for="menu-ambient-vol">
            <span class="title-audio-label">Hudba / Ambient</span>
            <input id="menu-ambient-vol" type="range" min="0" max="100" step="1" class="title-audio-slider" />
            <span id="menu-ambient-vol-val" class="title-audio-val">80%</span>
          </label>
          <label class="title-audio-row" for="menu-sfx-vol">
            <span class="title-audio-label">Efekty</span>
            <input id="menu-sfx-vol" type="range" min="0" max="100" step="1" class="title-audio-slider" />
            <span id="menu-sfx-vol-val" class="title-audio-val">85%</span>
          </label>
        </div>
      </div>
      <div class="title-footer">
        <span class="title-version">v${__APP_VERSION__}</span>
        <span class="title-footer-sep">·</span>
        <span class="title-controls-hint">[↑/↓] Výběr · [Enter] Potvrdit</span>
      </div>
    `;

    const titleLogoEl = this.menuBackdrop.querySelector('#title-ascii-logo') as HTMLPreElement;
    titleLogoEl.textContent = TITLE_ASCII_LOGO;
    const titleBgCanvas = this.menuBackdrop.querySelector('#title-bg-canvas') as HTMLCanvasElement;
    this.titleBg = new TitleBackground(titleBgCanvas);

    // 3b. Chronicle & Controls ASCII modal (opened from Title Screen)
    this.chronicleBackdrop = document.createElement('div');
    this.chronicleBackdrop.id = 'chronicle-modal';
    this.chronicleBackdrop.className = 'ascii-modal-backdrop chronicle-backdrop hidden';
    this.chronicleBackdrop.setAttribute('role', 'dialog');
    this.chronicleBackdrop.setAttribute('aria-label', 'Kronika a ovládání');
    this.chronicleBackdrop.innerHTML = `
      <div class="ascii-modal chronicle-modal">
        <div class="modal-header">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div class="modal-title-row">
            <span class="modal-title"><span class="ascii-pipe">|</span> KRONIKA A OVLÁDÁNÍ</span>
            <span class="modal-close-hint">[Esc] Zavřít <span class="ascii-pipe">|</span></span>
          </div>
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        </div>
        <div class="chronicle-body">
          <div class="pane-heading">-- KRONIKA VAELU --</div>
          <p class="chronicle-lore">
            Před třemi věky stála říše Vaelu na třech pilířích: na bílém mramoru Aethelgardu,
            železných výhních Kael’Varru a solných baštách Siltmooru. Pak přišla Noc popela —
            obloha zčernala, z rozsedlin vystoupily stíny a lucerny strážců pohasly.
          </p>
          <p class="chronicle-lore">
            Jsi posledním poutníkem, který nese živý uhlík. Bloudíš rozvalinami a pustinami,
            hlídáš hladinu oleje ve své lucerně, sbíráš zapomenuté relikvie a hledáš pravdu o pádu Vaelu.
          </p>
          <div class="pane-heading">-- PŘEHLED OVLÁDÁNÍ --</div>
          <div class="chronicle-controls-grid">
            <div class="chronicle-ctrl-row"><kbd>[W A S D] / [Šipky]</kbd><span>Pohyb poutníka</span></div>
            <div class="chronicle-ctrl-row"><kbd>[Shift]</kbd><span>Běh (spotřebovává výdrž)</span></div>
            <div class="chronicle-ctrl-row"><kbd>[C]</kbd><span>Plížení (tichý krok v porostu)</span></div>
            <div class="chronicle-ctrl-row"><kbd>[LMB] / [Mezerník]</kbd><span>Útok zbraní / úder</span></div>
            <div class="chronicle-ctrl-row"><kbd>[RMB]</kbd><span>Úskok (Dash) směrem kurzoru</span></div>
            <div class="chronicle-ctrl-row"><kbd>[F]</kbd><span>Zapnout / zhasnout lucernu</span></div>
            <div class="chronicle-ctrl-row"><kbd>[E]</kbd><span>Interakce (tabule, poutníci, relikvie)</span></div>
            <div class="chronicle-ctrl-row"><kbd>[I] / [Tab]</kbd><span>Inventář a výbava</span></div>
            <div class="chronicle-ctrl-row"><kbd>[M]</kbd><span>Mapa prozkoumaného světa</span></div>
            <div class="chronicle-ctrl-row"><kbd>[J]</kbd><span>Deník úkolů</span></div>
            <div class="chronicle-ctrl-row"><kbd>[Kolečko myši]</kbd><span>Přiblížení / oddálení kamery</span></div>
            <div class="chronicle-ctrl-row"><kbd>[N] / [Esc]</kbd><span>Ztlumit zvuk / Menu</span></div>
          </div>
        </div>
        <div class="modal-footer chronicle-footer">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div class="chronicle-footer-actions">
            <button id="chronicle-close-btn" type="button" class="ascii-btn ascii-btn-primary">[Esc] Zavřít kroniku</button>
          </div>
        </div>
      </div>
    `;

    // 4. Inventory ASCII modal
    this.invBackdrop = document.createElement('div');
    this.invBackdrop.id = 'inventory-modal';
    this.invBackdrop.className = 'ascii-modal-backdrop hidden';
    this.invBackdrop.setAttribute('role', 'dialog');
    this.invBackdrop.setAttribute('aria-label', 'Inventář');
    this.invBackdrop.innerHTML = `
      <div class="ascii-modal inventory-modal">
        <div class="modal-header">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div class="modal-title-row">
            <span class="modal-title"><span class="ascii-pipe">|</span> INVENTÁŘ POUTNÍKA</span>
            <span class="modal-close-hint">[I / Tab / Esc] Zavřít <span class="ascii-pipe">|</span></span>
          </div>
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        </div>
        <div class="inventory-body">
          <div class="inventory-list-pane">
            <div class="pane-heading">-- BATOH --</div>
            <div id="inv-list" class="inv-list"></div>
          </div>
          <div class="inventory-divider"></div>
          <div class="inventory-detail-pane">
            <div class="pane-heading">-- DETAIL PŘEDMĚTU --</div>
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
              <button id="inv-action-btn" type="button" class="ascii-btn ascii-btn-primary">[Enter] Použít</button>
              <button id="inv-close-btn" type="button" class="ascii-btn">[Esc] Zavřít</button>
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
    this.qbBackdrop.setAttribute('aria-label', 'Úkolová tabule');
    this.qbBackdrop.innerHTML = `
      <div class="ascii-modal quest-modal">
        <div class="modal-header">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div class="modal-title-row">
            <span class="modal-title"><span class="ascii-pipe">|</span> ÚKOLOVÁ TABULE HLÍDKY [!]</span>
            <span class="modal-close-hint">[E / Esc] Zavřít <span class="ascii-pipe">|</span></span>
          </div>
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        </div>
        <div class="inventory-body">
          <div class="inventory-list-pane">
            <div class="pane-heading">-- NABÍDKA ÚKOLŮ --</div>
            <div id="qb-list" class="inv-list"></div>
          </div>
          <div class="inventory-divider"></div>
          <div class="inventory-detail-pane">
            <div class="pane-heading">-- ZÁPIS HLÍDKY --</div>
            <div id="qb-detail-title" class="inv-detail-title"></div>
            <div id="qb-detail-status" class="inv-detail-meta"></div>
            <div id="qb-detail-quote" class="inv-detail-desc"></div>
            <div id="qb-detail-objectives" class="quest-objectives-list"></div>
            <div id="qb-detail-reward" class="inv-detail-effect"></div>
            <div class="inv-detail-actions">
              <button id="qb-action-btn" type="button" class="ascii-btn ascii-btn-primary">[Enter] Přijmout úkol</button>
              <button id="qb-close-btn" type="button" class="ascii-btn">[Esc] Odejít</button>
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
    this.journalBackdrop.setAttribute('aria-label', 'Deník úkolů');
    this.journalBackdrop.innerHTML = `
      <div class="ascii-modal quest-modal">
        <div class="modal-header">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div class="modal-title-row">
            <span class="modal-title"><span class="ascii-pipe">|</span> DENÍK POUTNÍKA — ÚKOLY</span>
            <span class="modal-close-hint">[J / Esc] Zavřít <span class="ascii-pipe">|</span></span>
          </div>
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        </div>
        <div class="inventory-body">
          <div class="inventory-list-pane">
            <div class="pane-heading">-- ÚKOLY --</div>
            <div id="journal-list" class="inv-list"></div>
          </div>
          <div class="inventory-divider"></div>
          <div class="inventory-detail-pane">
            <div class="pane-heading">-- PODROBNOSTI CÍLE --</div>
            <div id="journal-detail-title" class="inv-detail-title"></div>
            <div id="journal-detail-status" class="inv-detail-meta"></div>
            <div id="journal-detail-desc" class="inv-detail-desc"></div>
            <div id="journal-detail-objectives" class="quest-objectives-list"></div>
            <div id="journal-detail-reward" class="inv-detail-effect"></div>
            <div class="inv-detail-actions">
              <button id="journal-track-btn" type="button" class="ascii-btn ascii-btn-primary">[Enter] Sledovat v HUDu</button>
              <button id="journal-close-btn" type="button" class="ascii-btn">[Esc] Zavřít</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div class="inv-log">| Cíle aktivních úkolů jsou zvýrazněny symbolem [!] na mapě světa [M].</div>
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        </div>
      </div>
    `;

    // 6b. Roadside NPC Dialogue / Trade modal (opened with E near @ / &)
    this.npcBackdrop = document.createElement('div');
    this.npcBackdrop.id = 'npc-dialog-modal';
    this.npcBackdrop.className = 'ascii-modal-backdrop hidden';
    this.npcBackdrop.setAttribute('role', 'dialog');
    this.npcBackdrop.setAttribute('aria-label', 'Rozhovor s pocestným');
    this.npcBackdrop.innerHTML = `
      <div class="ascii-modal npc-dialog-modal">
        <div class="modal-header">
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
          <div class="modal-title-row">
            <span class="modal-title"><span class="ascii-pipe">|</span> <span id="npc-modal-title">POUTNÍK U CESTY</span></span>
            <span class="modal-close-hint"><span id="npc-modal-hint">[1–4 / Myš] Volba · [Esc] Rozloučit se</span> <span class="ascii-pipe">|</span></span>
          </div>
          <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        </div>
        <div class="inventory-body npc-dialog-body">
          <div class="inventory-list-pane">
            <div id="npc-pane-heading" class="pane-heading">-- TÉMA ROZHOVORU --</div>
            <div id="npc-list" class="inv-list"></div>
          </div>
          <div class="inventory-divider"></div>
          <div class="inventory-detail-pane">
            <div class="pane-heading">-- ODPOVĚĎ POUTNÍKA --</div>
            <div id="npc-detail-title" class="inv-detail-title"></div>
            <div id="npc-detail-meta" class="inv-detail-meta"></div>
            <div id="npc-detail-desc" class="inv-detail-desc"></div>
            <div id="npc-detail-stock" class="quest-objectives-list"></div>
            <div id="npc-detail-effect" class="inv-detail-effect"></div>
            <div class="inv-detail-actions">
              <button id="npc-action-btn" type="button" class="ascii-btn ascii-btn-primary">[Enter] Zvolit</button>
              <button id="npc-close-btn" type="button" class="ascii-btn">[Esc] Odejít</button>
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

    this.refreshMenuState(world.seed);
    this.renderInventoryModal();
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
        this.showToast('Pro ukončení v prohlížeči zavři tuto kartu.', 3.2);
      }
    }, 120);
  }

  public refreshMenuState(currentWorldSeed: string): void {
    const save = loadSavedGame();
    const canContinue = this.sessionActive || Boolean(save);
    this.menuContinueBtn.classList.toggle('hidden', !canContinue);

    if (this.sessionActive) {
      this.menuSaveInfoEl.textContent = save
        ? `Seed ${currentWorldSeed} · ${formatSaveTime(save.savedAt)}`
        : `Aktivní výprava · Seed ${currentWorldSeed}`;
    } else if (save) {
      this.menuSaveInfoEl.textContent = `Seed ${save.seed} · ${formatSaveTime(save.savedAt)}`;
    } else {
      this.menuSaveInfoEl.textContent = '';
    }

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
    const greetings = ROLE_GREETINGS[npc.role];
    const greetIdx = Math.floor(Math.random() * greetings.length);
    this.npcSpokenQuote = greetings[greetIdx];
    this.npcLogMessage = 'Zvol odpověď [1–4], šipkami nebo myší. [Esc] zavře rozhovor.';
    this.activeModal = 'npc_dialog';
    this.npcBackdrop.classList.remove('hidden');
    this.audio.playParchmentRustle();
    this.renderNpcDialogModal();
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
      this.qbLogMessage = `Sleduješ úkol: ${selected.title}.`;
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
      this.showToast(`Sledovaný úkol: ${selected.title}`);
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
    return quest.objectives
      .map((obj) => {
        const mark = obj.done ? '[✓]' : '[ ]';
        const progress = obj.target > 1 ? ` (${obj.current}/${obj.target})` : '';
        let dirHint = '';
        if (!obj.done && obj.targetX !== undefined && obj.targetY !== undefined) {
          const dir = compassDir(this.player.x, this.player.y, obj.targetX, obj.targetY);
          const dist = Math.round(Math.hypot(obj.targetX - this.player.x, obj.targetY - this.player.y));
          dirHint = ` <span class="q-obj-dir">(${dir}, ~${dist} buněk)</span>`;
        }
        return `<div class="q-obj-row${obj.done ? ' q-obj-done' : ''}">${mark} ${obj.label}${progress}${dirHint}</div>`;
      })
      .join('');
  }

  private renderQuestBoardModal(): void {
    const quests = this.quests.getQuests();
    if (this.qbSelectedIndex >= quests.length) this.qbSelectedIndex = 0;

    this.qbListEl.innerHTML = '';
    quests.forEach((q, idx) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `inv-item-row${idx === this.qbSelectedIndex ? ' selected' : ''}`;
      const cursor = idx === this.qbSelectedIndex ? '>' : ' ';
      const st = questStatusTag(q.status);
      row.innerHTML = `<span class="inv-cursor">${cursor}</span> <span class="inv-badge ${st.cls}">${st.badge}</span> <span class="inv-name">${q.title}</span>`;
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
        ? ` · Splněno ${selected.completionCount}×`
        : '';
    this.qbDetailStatusEl.textContent = `Stav: ${st.label}${repeatText}`;
    this.qbDetailQuoteEl.textContent = `${selected.giverQuote} ${selected.description}`;
    this.qbDetailObjectivesEl.innerHTML = this.renderObjectivesHtml(selected);
    this.qbDetailRewardEl.textContent = `Odměna: ${selected.rewardSummary}`;

    if (selected.status === 'available') {
      this.qbActionBtn.disabled = false;
      this.qbActionBtn.textContent = '[Enter] Přijmout úkol';
    } else if (selected.status === 'ready') {
      this.qbActionBtn.disabled = false;
      this.qbActionBtn.textContent = '[Enter] Odevzdat a získat odměnu';
    } else if (selected.status === 'active') {
      this.qbActionBtn.disabled = false;
      this.qbActionBtn.textContent = '[Enter] Sledovat v HUDu';
    } else {
      this.qbActionBtn.disabled = true;
      this.qbActionBtn.textContent = '[ Dokončeno ]';
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
            label: 'Směnit za olej do lucerny (+1 ks)',
            title: 'Doplnění paliva do lucerny',
            effect: 'Cena: 1× surovina/relikvie -> 1× Lahvička oleje do lucerny',
            btnText: '[Enter] Směnit za olej',
          },
          {
            badge: '[2]',
            label: 'Směnit za léčivé byliny (+45 HP)',
            title: 'Sušené léčivé byliny z Vaelu',
            effect: 'Cena: 1× surovina/relikvie -> 1× Léčivé byliny z Vaelu',
            btnText: '[Enter] Směnit za byliny',
          },
          {
            badge: '[3]',
            label: 'Nákres: Kael’Varr (Železná výheň)',
            title: 'Nákres cesty ke Kael’Varru',
            effect: 'Cena: 1× surovina/relikvie -> Odhalí na mapě [M] železnou metropoli Kael’Varr',
            btnText: '[Enter] Koupit nákres Kael’Varru',
            citySketch: 'city_kaelvarr',
          },
          {
            badge: '[4]',
            label: 'Nákres: Siltmoor (Kalný přístav)',
            title: 'Nákres cesty k Siltmooru',
            effect: 'Cena: 1× surovina/relikvie -> Odhalí na mapě [M] bažinný přístav Siltmoor',
            btnText: '[Enter] Koupit nákres Siltmooru',
            citySketch: 'city_siltmoor',
          },
          {
            badge: '[5]',
            label: 'Nákres: Aethelgard (Bílý relikviář)',
            title: 'Nákres cesty k Aethelgardu',
            effect: 'Cena: 1× surovina/relikvie -> Odhalí na mapě [M] bílý Aethelgard',
            btnText: '[Enter] Koupit nákres Aethelgardu',
            citySketch: 'city_aethelgard',
          },
          {
            badge: '[6]',
            label: 'Zpět k rozhovoru',
            title: 'Návrat k tématům rozhovoru',
            effect: 'Vrátí se k otázkám o historii Vaelu a přežití v divočině',
            btnText: '[Enter] Zpět',
          },
        ];
      }

      return [
        {
          badge: '[1]',
          label: 'Směnit za olej do lucerny (+1 ks)',
          title: 'Doplnění paliva do lucerny',
          effect: 'Cena: 1× surovina/relikvie -> 1× Lahvička oleje do lucerny',
          btnText: '[Enter] Směnit za olej',
        },
        {
          badge: '[2]',
          label: 'Směnit za léčivé byliny (+45 HP)',
          title: 'Sušené léčivé byliny z Vaelu',
          effect: 'Cena: 1× surovina/relikvie -> 1× Léčivé byliny z Vaelu',
          btnText: '[Enter] Směnit za byliny',
        },
        {
          badge: '[3]',
          label: 'Získat nákres okolí (mapa M)',
          title: 'Nákres zapomenutých ruin a oltářů',
          effect: 'Cena: 1× surovina/relikvie -> Odhalí úsek mapy [M] a vyznačí [♦]',
          btnText: '[Enter] Koupit nákres',
        },
        {
          badge: '[4]',
          label: 'Zpět k rozhovoru',
          title: 'Návrat k tématům rozhovoru',
          effect: 'Vrátí se k otázkám o historii Vaelu a přežití v divočině',
          btnText: '[Enter] Zpět',
        },
      ];
    }

    return [
      {
        badge: '[1]',
        label: 'Vyptat se na starý Vael a pád říše',
        title: 'Kronika starého Vaelu',
        effect: 'Odhalí útržky historie říše před bitvou s nestvůrami',
        btnText: '[Enter] Vyptat se',
      },
      {
        badge: '[2]',
        label: 'Zeptat se na přežití v divočině',
        title: 'Rady pro přežití v divočině',
        effect: 'Praktické rady k plížení [C], lucerně [F], hluku a brodění',
        btnText: '[Enter] Vyslechnout radu',
      },
      {
        badge: '[3]',
        label: 'Obchodovat / Vyměnit zásoby',
        title: 'Směna zásob u ohniště',
        effect: 'Vyměň suroviny/relikvie za olej, byliny či nákres mapy [M]',
        btnText: '[Enter] Otevřít směnu',
      },
      {
        badge: '[4]',
        label: 'Rozloučit se',
        title: 'Odchod na stezku',
        effect: 'Ukončí rozhovor s poutníkem',
        btnText: '[Enter] Rozloučit se',
      },
    ];
  }

  private renderNpcDialogModal(): void {
    const npc = this.activeNpc;
    if (!npc) return;

    const options = this.getNpcDialogOptions();
    if (this.npcSelectedIndex >= options.length) this.npcSelectedIndex = 0;

    this.npcModalTitleEl.textContent = `${npc.name.toUpperCase()} (${npc.glyph})`;
    this.npcModalHintEl.textContent = `[1–${options.length} / Myš] Volba · [Esc] Rozloučit se`;
    this.npcPaneHeadingEl.textContent =
      this.npcDialogMode === 'trade' ? '-- SMĚNA ZÁSOB --' : '-- TÉMA ROZHOVORU --';
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
    this.npcDetailMetaEl.textContent = `${npc.title} · Biom: ${BIOME_NAMES[npc.biome]}`;
    this.npcDetailDescEl.textContent = this.npcSpokenQuote;

    const tradableCounts = TRADABLE_LOOT_IDS.map((id) => {
      const count = this.inventory.countItem(id);
      if (count <= 0) return null;
      const item = this.inventory.getItems().find((it) => it.id === id);
      return `${item?.name ?? id} ×${count}`;
    }).filter((x): x is string => x !== null);

    this.npcDetailStockEl.innerHTML = `<div class="q-obj-row">Nabízené suroviny/relikvie: ${
      tradableCounts.length > 0 ? tradableCounts.join(' · ') : 'Žádné (najdi *, ,, U nebo ?)'
    }</div>`;
    this.npcDetailEffectEl.textContent = selected.effect;

    const backIndex = options.length - 1;
    const needsPayment = this.npcDialogMode === 'trade' && this.npcSelectedIndex < backIndex;
    const canAfford = !needsPayment || Boolean(this.inventory.findFirstTradable(TRADABLE_LOOT_IDS));
    this.npcActionBtn.disabled = !canAfford;
    this.npcActionBtn.textContent = canAfford ? selected.btnText : '[ Chybí surovina či relikvie ]';
    this.npcLogEl.textContent = `| ${this.npcLogMessage}`;
  }

  private confirmNpcAction(): void {
    const npc = this.activeNpc;
    if (!npc) return;

    if (this.npcDialogMode === 'main') {
      if (this.npcSelectedIndex === 0) {
        const historyLines = ROLE_HISTORY_LORE[npc.role];
        this.npcSpokenQuote = historyLines[this.npcHistoryStep % historyLines.length];
        this.npcHistoryStep += 1;
        this.npcLogMessage = `${npc.name} vzpomíná na starý Vael a pád říše.`;
        this.audio.playUiClick('select');
        this.renderNpcDialogModal();
        return;
      }

      if (this.npcSelectedIndex === 1) {
        const tips = ROLE_SURVIVAL_TIPS[npc.role];
        const tip = tips[this.npcSurvivalStep % tips.length];
        this.npcSurvivalStep += 1;
        this.npcSpokenQuote = `${tip} ${BIOME_WARNINGS[npc.biome]}`;
        this.npcLogMessage = `${npc.name} ti poradil, jak přežít v divočině.`;
        this.audio.playUiClick('select');
        this.renderNpcDialogModal();
        return;
      }

      if (this.npcSelectedIndex === 2) {
        this.npcDialogMode = 'trade';
        this.npcSelectedIndex = 0;
        const maxOpt = npc.role === 'cartographer' ? 5 : 3;
        this.npcLogMessage = `Vyber zásoby ke směně [1–${maxOpt}] nebo [${maxOpt + 1}] pro návrat.`;
        this.audio.playUiClick('open');
        this.renderNpcDialogModal();
        return;
      }

      const farewells = ROLE_FAREWELLS[npc.role];
      const farewell = farewells[Math.floor(Math.random() * farewells.length)];
      this.closeOverlayToGame();
      this.showToast(`${npc.name}: ${farewell}`, 3.0);
      return;
    }

    // Trade sub-menu
    const options = this.getNpcDialogOptions();
    const backIndex = options.length - 1;
    if (this.npcSelectedIndex === backIndex) {
      this.npcDialogMode = 'main';
      this.npcSelectedIndex = 0;
      this.npcLogMessage = 'Zvol odpověď [1–4], šipkami nebo myší. [Esc] zavře rozhovor.';
      this.audio.playUiClick('select');
      this.renderNpcDialogModal();
      return;
    }

    const payment = this.inventory.findFirstTradable(TRADABLE_LOOT_IDS);
    if (!payment) {
      this.audio.playUiClick('close');
      this.npcLogMessage = 'Nemáš žádný Žhavý uhlík, relikvii ani trofej ke směně.';
      this.renderNpcDialogModal();
      return;
    }

    if (this.npcSelectedIndex === 0) {
      this.inventory.removeItem(payment.id, 1);
      this.inventory.addItem(OIL_FLASK_TEMPLATE, 1);
      this.audio.playUiClick('potion');
      this.npcLogMessage = `Směněno: 1× ${payment.name} za 1× ${OIL_FLASK_TEMPLATE.name}.`;
      this.showToast(`Získáno: ${OIL_FLASK_TEMPLATE.name}`, 2.6);
      this.menuCallbacks.onTradeCompleted();
      this.renderInventoryModal();
      this.renderNpcDialogModal();
      return;
    }

    if (this.npcSelectedIndex === 1) {
      this.inventory.removeItem(payment.id, 1);
      this.inventory.addItem(HEALING_HERBS_TEMPLATE, 1);
      this.audio.playUiClick('potion');
      this.npcLogMessage = `Směněno: 1× ${payment.name} za 1× ${HEALING_HERBS_TEMPLATE.name}.`;
      this.showToast(`Získáno: ${HEALING_HERBS_TEMPLATE.name}`, 2.6);
      this.menuCallbacks.onTradeCompleted();
      this.renderInventoryModal();
      this.renderNpcDialogModal();
      return;
    }

    const chosenOpt = options[this.npcSelectedIndex];
    const res = this.menuCallbacks.onRevealMapSketch(npc, chosenOpt?.citySketch);
    if (!res.poi) {
      this.audio.playUiClick('close');
      this.npcLogMessage = 'Poutník v okolí nenašel žádné neznámé ruiny k zakreslení.';
      this.renderNpcDialogModal();
      return;
    }
    this.inventory.removeItem(payment.id, 1);
    this.audio.playParchmentRustle();
    const dir = compassDir(this.player.x, this.player.y, res.poi.x, res.poi.y);
    const dist = Math.round(Math.hypot(res.poi.x - this.player.x, res.poi.y - this.player.y));
    this.npcSpokenQuote = `„Zanesl jsem ti do mapy polohu lokace ${res.poi.name} směrem na ${dir} (~${dist} buněk). Otevři přehledovou mapu [M].“`;
    this.npcLogMessage = `Nákres: ${res.poi.name} (${dir}, ~${dist} b.) · Odhaleno ${res.newlyRevealedChunks} úseků mapy.`;
    this.showToast(`Nákres odhalil: ${res.poi.name} na mapě [M]`, 3.4);
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
      row.className = `inv-item-row${idx === this.journalSelectedIndex ? ' selected' : ''}`;
      const cursor = idx === this.journalSelectedIndex ? '>' : ' ';
      const st = questStatusTag(q.status);
      const pin = q.id === trackedId ? ' *' : '';
      row.innerHTML = `<span class="inv-cursor">${cursor}</span> <span class="inv-badge ${st.cls}">${st.badge}</span> <span class="inv-name">${q.title}${pin}</span>`;
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
    const pinLabel = selected.id === trackedId ? ' · [SLEDOVÁN]' : '';
    this.journalDetailStatusEl.textContent = `Stav: ${st.label}${pinLabel}`;
    this.journalDetailDescEl.textContent = selected.description;
    this.journalDetailObjectivesEl.innerHTML = this.renderObjectivesHtml(selected);
    this.journalDetailRewardEl.textContent = `Odměna: ${selected.rewardSummary}`;

    if (selected.status === 'active' || selected.status === 'ready') {
      this.journalTrackBtn.disabled = false;
      this.journalTrackBtn.textContent =
        selected.id === trackedId ? '[ Sledováno v HUDu ]' : '[Enter] Sledovat v HUDu';
    } else if (selected.status === 'available') {
      this.journalTrackBtn.disabled = true;
      this.journalTrackBtn.textContent = 'Přijmi u úkolové tabule [!]';
    } else {
      this.journalTrackBtn.disabled = true;
      this.journalTrackBtn.textContent = '[ Splněno ]';
    }
  }

  private getInventoryGroupLabel(category: InventoryItem['category']): string {
    if (category === 'weapon' || category === 'light' || category === 'relic') {
      return 'VÝBAVA A RELIKVIE';
    }
    if (category === 'consumable') {
      return 'ZÁSOBY A ELIXÍRY';
    }
    return 'ZÁPISY A TROFEJE';
  }

  private renderInventoryModal(): void {
    const items = this.inventory.getItems();
    const selectedIdx = this.inventory.getSelectedIndex();

    this.invListEl.innerHTML = '';

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'inv-empty';
      empty.textContent = '(Batoh zeje prázdnotou)';
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
        const newTag = isNew ? `<span class="inv-tag-new">[NOVÉ]</span>` : '';
        const rightTag = isEquipped
          ? `<span class="inv-tag-equipped">[NASAZENO]</span>`
          : item.quantity > 1
            ? `<span class="inv-tag-qty">×${item.quantity}</span>`
            : '';

        row.innerHTML = `<span class="inv-cursor">${cursor}</span><span class="inv-row-glyph" style="color:${glyphInfo.color}">${glyphInfo.glyph}</span><span class="inv-name">${item.name}</span>${newTag}${rightTag}`;
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
      this.invDetailTitleEl.textContent = 'Žádný předmět';
      this.invDetailMetaEl.textContent = '';
      this.invDetailDescEl.textContent = 'V batohu již nic nezbývá.';
      this.invDetailEffectEl.textContent = '';
      this.invActionBtn.disabled = true;
      this.invActionBtn.textContent = '[Enter] —';
    } else {
      const preview = getItemAsciiPreview(selected);
      this.invDetailArtEl.innerHTML = `<pre class="inv-ascii-art" style="color:${preview.color}">${preview.art}</pre>`;
      this.invDetailTitleEl.textContent = selected.name;
      const isEquipped =
        selected.category === 'relic' ? selected.equipped !== false : Boolean(selected.equipped);
      const statusPill = isEquipped
        ? `<span class="inv-meta-equipped">NASAZENO</span>`
        : selected.quantity > 1
          ? `<span class="inv-meta-qty">${selected.quantity} ks</span>`
          : `<span class="inv-meta-muted">V batohu</span>`;
      this.invDetailMetaEl.innerHTML = `<span class="inv-meta-cat">[${selected.symbol}] ${selected.categoryLabel}</span> · ${statusPill}`;
      this.invDetailDescEl.textContent = selected.description;
      this.invDetailEffectEl.textContent = `Efekt: ${selected.effectText}`;
      this.invActionBtn.disabled = false;
      this.invActionBtn.textContent = `[Enter] ${this.inventory.getActionLabel(selected)}`;
    }

    this.invLogEl.textContent = `| ${this.invLogMessage}`;
    this.renderInventoryStatsAndBuffs(true);
  }

  private renderInventoryStatsAndBuffs(force = false): void {
    const p = this.player;

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

    const light = p.getLanternLightRange();
    const lightVal = light.isLit
      ? `${light.total.toFixed(1)} pol.${fmtBonus(light.bonus, 1)}`
      : `Zhasnuta (${light.total.toFixed(1)} pol.${fmtBonus(light.bonus, 1)})`;

    const oilDrain = p.getEffectiveOilDrainRate();
    const oilEfficiencyPct = Math.round((1 - p.oilDrainMultiplier) * 100);
    const oilOn = p.lanternOn && p.oil > 0;
    const oilBonusHtml =
      oilEfficiencyPct > 0
        ? ` <span class="inv-stat-bonus">(-${oilEfficiencyPct}%)</span>`
        : '';
    const oilVal = oilOn
      ? `${oilDrain.toFixed(2)}/s${oilBonusHtml}`
      : `0.00/s <span class="inv-stat-muted">(zhasnuta)</span>`;

    const walk = p.getEffectiveWalkSpeed();
    const walkVal = `${walk.total.toFixed(1)} pol./s${fmtBonus(walk.delta, 1)}`;

    const detect = p.getEnemyDetectionInfo(this.lastAmbientContext);
    const detectDelta = detect.total - detect.base;
    const detectCls =
      detectDelta <= -0.5 ? 'inv-stat-bonus' : detectDelta >= 0.5 ? 'inv-stat-penalty' : 'inv-stat-muted';
    const detectVal = `${detect.total.toFixed(1)} pol. <span class="${detectCls}">(${detect.label})</span>`;

    const effectSigParts: string[] = [];
    const effectRows: string[] = [];

    for (const item of this.inventory.getItems()) {
      if (item.category === 'relic' && item.quantity > 0 && item.equipped !== false) {
        const desc = item.effectText.replace(/^Pasivní:\s*/i, '');
        effectSigParts.push(`r:${item.id}`);
        effectRows.push(
          `<div class="inv-buff-row inv-buff-relic"><div class="inv-buff-head"><span class="inv-buff-tag">[${item.symbol}]</span> <span class="inv-buff-name">${item.name}</span> <span class="inv-buff-meta">Relikvie</span></div><div class="inv-buff-desc">${desc}</div></div>`
        );
      }
    }

    for (const eff of p.activeEffects) {
      const secs = Math.max(1, Math.ceil(eff.remainingSeconds));
      const cls = eff.kind === 'buff' ? 'inv-buff-pos' : 'inv-buff-neg';
      const tag = eff.kind === 'buff' ? '[+]' : '[-]';
      effectSigParts.push(`e:${eff.id}:${secs}`);
      effectRows.push(
        `<div class="inv-buff-row ${cls}"><div class="inv-buff-head"><span class="inv-buff-tag">${tag}</span> <span class="inv-buff-name">${eff.name}</span> <span class="inv-buff-time">${secs}s</span></div><div class="inv-buff-desc">${eff.description}</div></div>`
      );
    }

    if (p.exhausted) {
      effectSigParts.push('exhausted');
      effectRows.push(
        `<div class="inv-buff-row inv-buff-neg"><div class="inv-buff-head"><span class="inv-buff-tag">[!]</span> <span class="inv-buff-name">Vyčerpaný</span> <span class="inv-buff-time">do 18 ST</span></div><div class="inv-buff-desc">Nelze sprintovat ani útočit, dokud se výdrž neobnoví.</div></div>`
      );
    }

    if (p.inColdBiome) {
      effectSigParts.push('cold');
      effectRows.push(
        `<div class="inv-buff-row inv-buff-neg"><div class="inv-buff-head"><span class="inv-buff-tag">[!]</span> <span class="inv-buff-name">Mráz</span> <span class="inv-buff-time">zóna</span></div><div class="inv-buff-desc">-58 % rychlost regenerace výdrže.</div></div>`
      );
    }

    if (p.isSneaking) {
      effectSigParts.push(`sneak:${p.inUndergrowth ? 1 : 0}`);
      const sneakDesc = p.inUndergrowth
        ? '-70 % dosah odhalení v porostu · pomalejší chůze'
        : '-44 % dosah odhalení · pomalejší chůze';
      effectRows.push(
        `<div class="inv-buff-row inv-buff-pos"><div class="inv-buff-head"><span class="inv-buff-tag">[C]</span> <span class="inv-buff-name">Plížení${p.inUndergrowth ? ' (Kryt)' : ''}</span></div><div class="inv-buff-desc">${sneakDesc}</div></div>`
      );
    }

    const signature = `${hpVal}|${stVal}|${stRegenVal}|${dmgVal}|${armorVal}|${lightVal}|${oilVal}|${walkVal}|${detectVal}|${effectSigParts.join(',')}`;
    if (!force && signature === this.lastInvStatsSignature) {
      return;
    }
    this.lastInvStatsSignature = signature;

    const buffsHtml =
      effectRows.length > 0
        ? effectRows.join('')
        : `<div class="inv-buff-empty">Žádné aktivní efekty</div>`;

    const statLine = (label: string, val: string): string =>
      `<div class="inv-stat-line"><span class="inv-stat-label">${label}</span><span class="inv-stat-val">${val}</span></div>`;

    this.invStatsPanelEl.innerHTML = `
      <div class="ascii-box">
        <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        <div class="ascii-box-title"><span class="ascii-pipe">|</span><span>STATISTIKY POSTAVY</span><span class="ascii-pipe">|</span></div>
        <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        <div class="ascii-box-frame">
          <div class="inv-stat-group">
            ${statLine('Zdraví (HP)', hpVal)}
            ${statLine('Výdrž (ST)', stVal)}
            ${statLine('Regen výdrže', stRegenVal)}
          </div>
          <div class="inv-stat-sep"></div>
          <div class="inv-stat-group">
            ${statLine('Útok (DMG)', dmgVal)}
            ${statLine('Odolnost', armorVal)}
          </div>
          <div class="inv-stat-sep"></div>
          <div class="inv-stat-group">
            ${statLine('Dosah světla', lightVal)}
            ${statLine('Spotřeba oleje', oilVal)}
            ${statLine('Rychlost chůze', walkVal)}
            ${statLine('Odhalení', detectVal)}
          </div>
        </div>
        <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
      </div>
      <div class="ascii-box">
        <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
        <div class="ascii-box-title"><span class="ascii-pipe">|</span><span>AKTIVNÍ EFEKTY / BUFFY</span><span class="ascii-pipe">|</span></div>
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
        promptText = `[E] Sebrat relikvii: ${nearbyRelic.name}`;
      } else if (nearbyNpc) {
        promptText = `[E] Promluvit: ${nearbyNpc.name} (${nearbyNpc.glyph})`;
      } else if (world.isNearQuestGiver(this.player.x, this.player.y)) {
        const hasReady = this.quests.getQuests().some((q) => q.status === 'ready');
        promptText = hasReady
          ? '[E] Promluvit / Odevzdat splněný úkol [!]'
          : '[E] Prohlédnout úkolovou tabuli [!]';
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
      const signText = `[ ROZCESTNÍK ]  ${nearbySign.lines.join('  ·  ')}`;
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
    if (this.player.isDead) tags.push('PADL');
    else if (this.player.isDashing) tags.push('ÚSKOK');
    else if (oil <= 0) tags.push('BEZ OLEJE');
    else if (lanternLit) tags.push('LUCERNA');
    else tags.push('LUCERNA ZHASNUTA');
    if (!this.player.isDead) {
      if (this.player.isSneaking) {
        tags.push(this.player.inUndergrowth ? 'PLÍŽENÍ (KRYT)' : 'PLÍŽENÍ');
      } else if (this.player.isSprinting) {
        tags.push('BĚH');
      } else if (this.player.exhausted) {
        tags.push('VYČERPÁN');
      }
    }
    if (this.player.inColdBiome) tags.push('MRÁZ');
    if (this.player.hasTorchLit) tags.push('POCHODEŇ');
    if (this.player.equippedWeapon) tags.push('MEČ');
    if (this.player.activeRelicCount > 0) {
      tags.push(this.player.activeRelicCount > 1 ? `RELIKVIE ×${this.player.activeRelicCount}` : 'RELIKVIE');
    }
    if (isMuted) tags.push('MUTE');
    const statusText = tags.join(' · ');
    const sneaking = !this.player.isDead && this.player.isSneaking;
    const hasNewInv = this.inventory.hasNewItems();

    const signature = `${zone}|${x}|${y}|${hp}/${maxHp}|${st}/${maxSt}|${oil}|${lanternLit}|${isMuted}|${envText}|${statusText}|${zoomStr}|${this.player.exhausted}|${this.player.inColdBiome}|${sneaking}|${this.player.inUndergrowth}|${this.player.activeRelicCount}|${hasNewInv}`;
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
      this.hudMuteEl.innerHTML = isMuted ? '<kbd>[N]</kbd> Mute (Ztlumeno)' : '<kbd>[N]</kbd> Mute';
      this.hudMuteEl.classList.toggle('ctrl-muted', isMuted);
      this.hudStealthEl.innerHTML = sneaking
        ? '<kbd>[C/Shift]</kbd> PLÍŽENÍ'
        : '<kbd>[C/Shift]</kbd> Plížení';
      this.hudStealthEl.classList.toggle('ctrl-stealth-active', sneaking);
      this.hudInvEl.innerHTML = hasNewInv
        ? '<kbd>[I*]</kbd> Inventář'
        : '<kbd>[I]</kbd> Inventář';
      this.hudInvEl.classList.toggle('ctrl-inv-new', hasNewInv);
    }

    // Update top-right Quest Tracker HUD
    const tracker = this.quests.getHudTrackerInfo(this.player.x, this.player.y, world);
    const qSig = tracker
      ? `${tracker.title}|${tracker.progressLine}|${tracker.navLine}|${tracker.isReady}`
      : `NONE|${Math.round(this.player.x / 4)}|${Math.round(this.player.y / 4)}`;
    if (qSig !== this.lastQuestSignature) {
      this.lastQuestSignature = qSig;
      if (tracker) {
        this.hudQuestTitleEl.textContent = tracker.title;
        this.hudQuestTitleEl.classList.toggle('quest-ready-title', tracker.isReady);
        this.hudQuestProgEl.textContent = tracker.progressLine;
        this.hudQuestNavEl.textContent = tracker.navLine;
      } else {
        const allCompleted = this.quests.getQuests().every((q) => q.status === 'completed');
        this.hudQuestTitleEl.textContent = allCompleted ? 'Všechny hlavní úkoly splněny' : 'Žádný aktivní úkol';
        this.hudQuestTitleEl.classList.remove('quest-ready-title');
        this.hudQuestProgEl.textContent = 'Úkolová tabule [!] na mýtině';
        const dir = compassDir(this.player.x, this.player.y, world.questGiver.x, world.questGiver.y);
        const dist = Math.round(Math.hypot(world.questGiver.x - this.player.x, world.questGiver.y - this.player.y));
        this.hudQuestNavEl.textContent = dist <= 5 ? '[E] Prohlédnout tabuli' : `Tabule: ${dir} · ~${dist} buněk`;
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
