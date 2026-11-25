export interface Vec2 {
  x: number;
  y: number;
}

export interface RectBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type Direction = 'down' | 'up' | 'left' | 'right';

export type BiomeKind =
  | 'moor_forest'
  | 'marsh'
  | 'ash'
  | 'quarry'
  | 'blood_forest'
  | 'volcanic'
  | 'frost'
  | 'bone_plain';

export type PoiKind =
  | 'shelter'
  | 'cathedral'
  | 'fortress'
  | 'graveyard'
  | 'village'
  | 'watchtower'
  | 'abbey_crypt'
  | 'cave'
  | 'city_kaelvarr'
  | 'city_siltmoor'
  | 'city_aethelgard';

export type CityPoiKind = 'city_kaelvarr' | 'city_siltmoor' | 'city_aethelgard';

export interface PointOfInterest {
  uid: string;
  id: PoiKind;
  name: string;
  shortLabel: string;
  x: number;
  y: number;
  chunkX: number;
  chunkY: number;
  entranceX: number;
  entranceY: number;
  radiusX: number;
  radiusY: number;
  biome: BiomeKind;
  /** Distance-based difficulty scalar [0..1+] */
  difficulty: number;
}

export interface Signpost {
  x: number;
  y: number;
  lines: string[];
  resolveLines?: () => string[];
}

export interface WorldLootSpot {
  id: string;
  x: number;
  y: number;
  tier: number;
}

export type TileKind =
  | 'void'
  | 'grass'
  | 'flower'
  | 'path'
  | 'bridge'
  | 'signpost'
  | 'quest_board'
  | 'ruin_floor'
  | 'crypt_floor'
  | 'wall'
  | 'rubble'
  | 'quarry_ground'
  | 'quarry_rock'
  | 'ash_ground'
  | 'ember'
  | 'tree_trunk'
  | 'tree_canopy'
  | 'dead_tree'
  | 'bush'
  | 'tombstone'
  | 'marsh_ground'
  | 'marsh_water'
  | 'river_water'
  | 'ford'
  | 'wisp'
  | 'monolith'
  | 'passage'
  | 'brazier'
  | 'lava'
  | 'basalt'
  | 'ice'
  | 'snow_ground'
  | 'blood_tree'
  | 'bone_pile'
  | 'wagon'
  | 'menhir'
  | 'furnace'
  | 'alch_lantern'
  | 'statue';

export interface Cell {
  char: string;
  color: string;
  bg?: string;
  kind: TileKind;
  solid: boolean;
  /** Optional alternate glyph for subtle wind or ember animation */
  altChar?: string;
  /** Optional alternate color for subtle ember/flower shimmer */
  altColor?: string;
  /** Deterministic phase offset [0, 1) for animation */
  animPhase?: number;
  /** Animation speed multiplier (0 = static) */
  animSpeed?: number;
  /** Optional canopy/arch glyph drawn over the player for 2.5D depth */
  overhangChar?: string;
  overhangColor?: string;
}

export interface SpriteCell {
  char: string;
  color: string;
  bg?: string;
}

export interface AsciiSprite {
  width: number;
  height: number;
  cells: (SpriteCell | null)[][];
}

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
  flicker?: boolean;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  targetZoom: number;
  minZoom: number;
  maxZoom: number;
}

export type ItemCategory = 'weapon' | 'consumable' | 'lore' | 'light' | 'loot' | 'relic';

export interface InventoryItem {
  id: string;
  name: string;
  symbol: string;
  category: ItemCategory;
  categoryLabel: string;
  description: string;
  effectText: string;
  actionLabel: string;
  quantity: number;
  equipable?: boolean;
  equipped?: boolean;
  healAmount?: number;
  oilAmount?: number;
  attackBonus?: number;
  loreText?: string;
  oilEfficiencyBonus?: number;
  damageReductionBonus?: number;
  staminaRegenBonus?: number;
  lanternRangeBonus?: number;
  revealsEnemiesInDark?: boolean;
}

export interface ActiveStatusEffect {
  id: string;
  name: string;
  description: string;
  kind: 'buff' | 'debuff';
  remainingSeconds: number;
  durationSeconds: number;
  staminaRegenBonus?: number;
  walkSpeedMultiplier?: number;
  hpRegenPerSec?: number;
  sourceItemId?: string;
}

export type ActiveModal =
  | 'none'
  | 'menu'
  | 'inventory'
  | 'map'
  | 'journal'
  | 'quest_board'
  | 'npc_dialog';

export type QuestKind = 'cleanse' | 'relics' | 'hunt';
export type QuestStatus = 'available' | 'active' | 'ready' | 'completed';

export interface QuestObjective {
  id: string;
  label: string;
  current: number;
  target: number;
  poiUid?: string;
  poiId?: PoiKind;
  targetX?: number;
  targetY?: number;
  done: boolean;
}

export interface QuestRelic {
  id: string;
  name: string;
  poiUid: string;
  poiId: PoiKind;
  x: number;
  y: number;
  color: string;
  description: string;
  collected: boolean;
}

export type CityBossArchetype = 'iron_founder' | 'mire_alchemist' | 'last_inquisitor';

export interface QuestBossSpec {
  poiUid: string;
  poiId: PoiKind;
  poiName: string;
  bossName: string;
  kind: EnemyKind;
  chunkX: number;
  chunkY: number;
  x: number;
  y: number;
  archetype?: CityBossArchetype;
  isCityBoss?: boolean;
}

export interface BossTelegraph {
  id: number;
  x: number;
  y: number;
  radius: number;
  angle?: number;
  coneHalfAngle?: number;
  targetX?: number;
  targetY?: number;
  kind: 'hammer_slam' | 'furnace_nova' | 'poison_mist' | 'light_lunge';
  age: number;
  duration: number;
  color: string;
  label: string;
  damage: number;
  enemyId: string;
  resolved?: boolean;
  tickTimer?: number;
}

export interface QuestEntry {
  id: string;
  kind: QuestKind;
  title: string;
  giverQuote: string;
  description: string;
  rewardSummary: string;
  status: QuestStatus;
  repeatable?: boolean;
  completionCount: number;
  objectives: QuestObjective[];
}

export interface QuestMapMarker {
  x: number;
  y: number;
  label: string;
  isTurnIn: boolean;
}

export interface SerializedQuestState {
  quests: {
    id: string;
    status: QuestStatus;
    completionCount: number;
    objectives: {
      id: string;
      current: number;
      done: boolean;
    }[];
  }[];
  collectedRelicIds: string[];
  trackedQuestId: string | null;
}

export interface QuestGiverSpot {
  x: number;
  y: number;
  name: string;
}

export type WeatherKind = 'sunny' | 'overcast' | 'fog' | 'rain' | 'storm';

export type EnemyKind = 'ghoul' | 'skeleton';
export type EnemyAIState = 'patrol' | 'investigate' | 'chase' | 'windup' | 'recover';

export type SoundWaveKind = 'run' | 'sprint' | 'dash' | 'combat' | 'wade';

export interface SoundWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  hearRadius: number;
  age: number;
  duration: number;
  kind: SoundWaveKind;
  color: string;
}

export type TravelerRole = 'pilgrim' | 'ember_gatherer' | 'cartographer';

export interface RoadsideNpc {
  id: string;
  role: TravelerRole;
  name: string;
  title: string;
  glyph: '@' | '&';
  color: string;
  x: number;
  y: number;
  campfireX: number;
  campfireY: number;
  chunkKey: string;
  biome: BiomeKind;
  loreIndex: number;
}

export interface ChartedMarker {
  id: string;
  x: number;
  y: number;
  label: string;
  poiId: PoiKind;
  color?: string;
  isCity?: boolean;
}

export interface SlashEffect {
  x: number;
  y: number;
  angle: number;
  age: number;
  duration: number;
  reach: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
  duration: number;
}

export interface DashGhost {
  x: number;
  y: number;
  age: number;
  duration: number;
}

export interface LootDrop {
  id: number;
  worldCacheId?: string;
  chunkKey?: string;
  x: number;
  y: number;
  itemTemplate: Omit<InventoryItem, 'quantity'>;
  quantity: number;
  color: string;
  age: number;
}

export interface SaveData {
  version: number;
  seed: string;
  savedAt: number;
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp?: number;
    stamina: number;
    maxStamina?: number;
    oil: number;
    lanternOn: boolean;
    facing: Direction;
    hasTorchLit: boolean;
    equippedWeapon: string | null;
    weaponAttackBonus: number;
    isSneaking?: boolean;
  };
  inventory: InventoryItem[];
  defeatedEnemyIds: string[];
  collectedCacheIds: string[];
  exploredChunks: string[];
  chartedMarkers?: ChartedMarker[];
  environment: {
    timeOfDay: number;
    targetWeather: WeatherKind;
  };
  quests?: SerializedQuestState;
}

export interface GameDebugState {
  seed: string;
  pois: { uid: string; id: PoiKind; name: string; x: number; y: number }[];
  cities: { uid: string; id: CityPoiKind; name: string; x: number; y: number }[];
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    facing: Direction;
    isMoving: boolean;
    isSprinting: boolean;
    isSneaking: boolean;
    inUndergrowth: boolean;
    isDashing: boolean;
    isDead: boolean;
    inColdBiome: boolean;
    hp: number;
    maxHp: number;
    stamina: number;
    maxStamina: number;
    oil: number;
    maxOil: number;
    lanternOn: boolean;
    exhausted: boolean;
    hasTorchLit: boolean;
    equippedWeapon: string | null;
    attackDamage: number;
    collidedX: boolean;
    collidedY: boolean;
    hitbox: RectBounds;
  };
  combat: {
    aliveEnemies: number;
    totalEnemies: number;
    lootDropsCount: number;
    activeSlashes: number;
    soundWavesCount: number;
    enemiesDefeated: number;
  };
  activeTravelersCount: number;
  environment: {
    clock: string;
    phase: string;
    weather: WeatherKind;
    weatherLabel: string;
    sunIntensity: number;
    overcastIntensity: number;
    rainIntensity: number;
    fogIntensity: number;
    nightFactor: number;
  };
  audio: {
    unlocked: boolean;
    muted: boolean;
    ambientVolume: number;
    sfxVolume: number;
    currentBiome: string;
  };
  quests: {
    activeCount: number;
    readyCount: number;
    completedCount: number;
    trackedTitle: string | null;
    relicsRemaining: number;
  };
  camera: CameraState;
  activeModal: ActiveModal;
  inventoryCount: number;
  exploredCells: number;
  biome: BiomeKind;
  zone: string;
  chunkStats: {
    chunkSize: number;
    loadedChunks: number;
    exploredChunks: number;
    currentChunk: { cx: number; cy: number };
  };
  fps: number;
}
