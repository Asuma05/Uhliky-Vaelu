import { hashSeedToUint32, normalizeSeed } from './save';
import type {
  BiomeKind,
  Cell,
  CityPoiKind,
  LightSource,
  PoiKind,
  PointOfInterest,
  QuestBossSpec,
  QuestGiverSpot,
  RoadsideNpc,
  Signpost,
  TravelerRole,
  Vec2,
  WorldLootSpot,
} from './types';

export const CHUNK_SIZE = 64;
const ACTIVE_CHUNK_RADIUS = 2; // 5x5 chunks actively maintained around the player
const MAX_CACHED_CHUNKS = 64; // LRU memory cap for explored/visited chunks
const POI_MACRO_CHUNKS = 3; // 1 macro POI per 3x3 chunk block (192x192 cells)
const VORONOI_ROAD_CELL = 136;

export function floorDiv(n: number, size: number = CHUNK_SIZE): number {
  return Math.floor(n / size);
}

export function posMod(n: number, size: number = CHUNK_SIZE): number {
  return ((n % size) + size) % size;
}

export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export const PALETTE = {
  bg: '#09090b',
  // 1. Popelavá louka (Ashen Meadow) — chladné popelavé a tlumené mechově-břidlicové tóny
  moorGrass: ['#3c4a40', '#465448', '#334038', '#4f5d50', '#3a473e'],
  moorHeather: ['#8f9694', '#a39f93', '#7f8794', '#948a94'],
  forestFloor: ['#1b241f', '#222c26', '#28332b', '#161e1a'],
  darkForestCanopy: ['#23362c', '#2b4235', '#1d2d25', '#334c3e', '#263b30', '#18261f'],
  treeCanopy: ['#293f32', '#314a3b', '#213429', '#395443'],
  treeTrunk: ['#635042', '#524236', '#735d4c'],
  // 2. Mrtvá bažina (Dead Marsh) — tlumená rašelina a kontrastní temně modrá voda
  marshGround: ['#273832', '#2f4238', '#21302b', '#364a3e', '#1c2924'],
  marshWater: ['#1d6b85', '#27829e', '#144e63', '#3398b5'],
  riverWater: ['#257ea3', '#3196bd', '#1a5f7d', '#46b0d6'],
  fordStone: ['#6b7785', '#7c8999', '#5a6573'],
  wisp: ['#70fce2', '#adfff0', '#4ce6ce'],
  // 3. Popelavá pustina (Ashen Wastes)
  ashGround: ['#3e3b45', '#4a4652', '#333038', '#544f59', '#423e47'],
  ashEmber: ['#ff6e2e', '#ff903b', '#db481a'],
  menhir: ['#7a8494', '#666f7d', '#8e98a8', '#565f6b'],
  // 4. Skalnatý kamenolom (Rocky Quarry)
  quarryGround: ['#4a5260', '#586170', '#3d4450', '#646e7d'],
  quarryRock: ['#737e8f', '#606a7a', '#8590a1', '#505966'],
  // 5. Prokletý krvavý les (Cursed Blood Forest)
  bloodFloor: ['#331820', '#401e27', '#291319', '#4a222d'],
  bloodCanopy: ['#7d2331', '#942b3b', '#631b26', '#a83344', '#52151e'],
  bloodTrunk: ['#5c2c31', '#4a2227', '#6e363b'],
  // 6. Sopečná trhlina / Lávová pole (Volcanic Rift & Lava Fields)
  basalt: ['#282630', '#33303d', '#201e26', '#3d3947'],
  basaltWall: ['#4b4552', '#5c5463', '#3a3540'],
  lava: ['#ff5e1a', '#ff8c24', '#ff3b14', '#ffc447'],
  // 7. Zmrzlá pustina / Jinovatková pláň (Frost Wasteland)
  snowGround: ['#6b7f8f', '#7a90a1', '#5c6f7e', '#8aa0b0'],
  frostTree: ['#56768c', '#6588a0', '#486375', '#7699b0'],
  iceCrystal: ['#94e8ff', '#ccf5ff', '#6cd8f5', '#b0efff'],
  // 8. Kostěná pláň / Staré bojiště (Bone Plain / Old Battlefield)
  boneGround: ['#4d463c', '#595145', '#403a32', '#665d4f'],
  boneProp: ['#bab3a3', '#a69f90', '#c7c0b0', '#918b7e'],
  rustWeapon: ['#8a7262', '#9c816f', '#756154'],
  wagonWood: ['#6e5743', '#5c4837', '#80664f'],
  // Structures & Roads — tlumená hliněná cesta a chladná břidlicová zeď
  path: ['#756757', '#847462', '#665a4c', '#8f7f6c'],
  bridge: ['#7d634a', '#6b543e', '#8c7054', '#594533'],
  signpost: ['#e0a95e', '#bf8943'],
  ruinFloor: ['#49515e', '#57606e', '#3c434f', '#445448'],
  cryptFloor: ['#363c4c', '#434a5e', '#2b303d'],
  stoneAsh: ['#76808f', '#646e7c', '#8993a3', '#535c69'],
  stoneBrick: ['#78544f', '#875f59', '#634541', '#6e4c47'],
  stoneMoss: ['#3e5745', '#324738'],
  tombstone: ['#868f9c', '#727a87', '#9aa3b0', '#5f6773'],
  deadTree: ['#665f59', '#756e67', '#544e49', '#827a73'],
  bush: ['#2c3d32', '#35483b', '#24332a', '#3d5142'],
  monolith: ['#99c4cc', '#7ea8b0', '#b5e0e8'],
  passage: ['#1a1a24', '#242430', '#12121a', '#09090b'],
  brazierStone: ['#7d8591', '#8f4c45'],
  brazierFire: ['#ff9c38', '#ff6824', '#ffd66b'],
  ironWall: ['#5a5566', '#464250', '#6e677a', '#35323d'],
  marbleWall: ['#e8e4da', '#d4d0c5', '#f5f2e9', '#bab5aa'],
  marbleFloor: ['#a39f95', '#8f8b82', '#b8b4a9', '#7a776f'],
  furnace: ['#ff7828', '#ffa13b', '#ff4d1c', '#5c5563'],
  alchLantern: ['#62f2a2', '#4ae3c5', '#8affc0'],
  statue: ['#f2eee2', '#dcd7ca', '#c4bfb2'],
  // Subtle dark cell backgrounds for cohesive terrain zones
  cellBg: {
    grass: '#0c0f0e',
    forest: '#080c0a',
    path: '#171411',
    bridge: '#1c1610',
    riverWater: '#081724',
    ford: '#10202b',
    marshWater: '#081822',
    marshGround: '#0c1211',
    ashGround: '#111014',
    quarryGround: '#111318',
    quarryRock: '#171a21',
    bloodFloor: '#140b0e',
    basalt: '#100f14',
    lava: '#330d05',
    snowGround: '#10161c',
    ice: '#13222e',
    boneGround: '#14120f',
    ruinFloor: '#13161d',
    cryptFloor: '#0f121a',
    wall: '#181c24',
    woodWall: '#17130f',
    hearth: '#2b1208',
    questBoard: '#261a0d',
    ironWall: '#1b1921',
    marbleWall: '#2b2b30',
    marbleFloor: '#24252a',
    furnace: '#2e1006',
    alchLantern: '#0a241d',
  },
} as const;

export const BIOME_NAMES: Record<BiomeKind, string> = {
  moor_forest: 'Popelavá louka',
  marsh: 'Mrtvá bažina',
  ash: 'Popelavá pustina',
  quarry: 'Skalnatý kamenolom',
  blood_forest: 'Prokletý krvavý les',
  volcanic: 'Sopečná trhlina',
  frost: 'Zmrzlá pustina',
  bone_plain: 'Kostěná pláň',
};

const GRASS_CHARS = ['·', '‧', ',', "'"] as const;
const GROVE_CANOPY_CHARS = ['♣\uFE0E', '♠\uFE0E', '↟'] as const;
const BLOOD_CANOPY_CHARS = ['♣\uFE0E', '♠\uFE0E', '↟', '⇞', '♧'] as const;
const ROCK_CHARS = ['▲', '▴', '△', '▓'] as const;
const WATER_CHARS = ['≈', '∿', '~'] as const;
const TOMBSTONE_CHARS = ['†', '+', '╥'] as const;

// 4-neighbor bitmask (N=1, E=2, S=4, W=8) lookup tables for box-drawing auto-tiling
const INTACT_WALL_BOX = [
  '╬', '║', '═', '╚', '║', '║', '╔', '╠',
  '═', '╝', '═', '╩', '╗', '╣', '╦', '╬',
] as const;

const RUIN_WALL_BOX = [
  '┼', '│', '─', '└', '│', '│', '┌', '├',
  '─', '┘', '─', '┴', '┐', '┤', '┬', '┼',
] as const;

/** Deterministic Mulberry32 PRNG */
export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashCoords(x: number, y: number, seed: number): number {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function hashInts(a: number, b: number, c: number, seed: number): number {
  let h = (seed ^ Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b9)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** 2D Simplex Noise for seamless infinite multi-octave terrain & biome fields */
class SimplexNoise2D {
  private readonly perm = new Uint8Array(512);
  private readonly permMod12 = new Uint8Array(512);

  private static readonly F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
  private static readonly G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
  private static readonly GRAD3: readonly [number, number][] = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [0, 1],
    [0, -1],
  ];

  constructor(seed: number) {
    const rng = createRng(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  public sample(xin: number, yin: number): number {
    let n0 = 0;
    let n1 = 0;
    let n2 = 0;

    const s = (xin + yin) * SimplexNoise2D.F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * SimplexNoise2D.G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + SimplexNoise2D.G2;
    const y1 = y0 - j1 + SimplexNoise2D.G2;
    const x2 = x0 - 1.0 + 2.0 * SimplexNoise2D.G2;
    const y2 = y0 - 1.0 + 2.0 * SimplexNoise2D.G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      const g = SimplexNoise2D.GRAD3[gi0];
      n0 = t0 * t0 * (g[0] * x0 + g[1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      const g = SimplexNoise2D.GRAD3[gi1];
      n1 = t1 * t1 * (g[0] * x1 + g[1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      const g = SimplexNoise2D.GRAD3[gi2];
      n2 = t2 * t2 * (g[0] * x2 + g[1] * y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }

  public fbm(x: number, y: number, scale: number): number {
    const n1 = this.sample(x / scale, y / scale);
    const n2 = this.sample((x + 313) / (scale * 0.45), (y - 197) / (scale * 0.45));
    const v = (n1 * 0.72 + n2 * 0.28) * 1.45;
    return v < -1 ? -1 : v > 1 ? 1 : v;
  }
}

/** 8-way Czech compass abbreviation pointing from (ax, ay) to (bx, by) */
export function compassDir(ax: number, ay: number, bx: number, by: number): string {
  const angle = Math.atan2(by - ay, bx - ax); // 0 = East, -PI/2 = North
  const oct = Math.round(angle / (Math.PI / 4));
  switch (((oct % 8) + 8) % 8) {
    case 0:
      return 'V';
    case 1:
      return 'JV';
    case 2:
      return 'J';
    case 3:
      return 'JZ';
    case 4:
      return 'Z';
    case 5:
      return 'SZ';
    case 6:
      return 'S';
    case 7:
    default:
      return 'SV';
  }
}

interface PoiSpecTemplate {
  id: PoiKind;
  name: string;
  shortLabel: string;
  rx: number;
  ry: number;
}

const POI_TEMPLATES: Record<PoiKind, PoiSpecTemplate> = {
  shelter: {
    id: 'shelter',
    name: 'Startovní útočiště',
    shortLabel: 'ÚTOČIŠTĚ',
    rx: 10,
    ry: 8,
  },
  cathedral: {
    id: 'cathedral',
    name: 'Znesvěcená katedrála',
    shortLabel: 'KATEDRÁLA',
    rx: 16,
    ry: 14,
  },
  fortress: {
    id: 'fortress',
    name: 'Rozvaliny tvrze',
    shortLabel: 'TVRZ',
    rx: 18,
    ry: 15,
  },
  graveyard: {
    id: 'graveyard',
    name: 'Hřbitov',
    shortLabel: 'HŘBITOV',
    rx: 16,
    ry: 13,
  },
  village: {
    id: 'village',
    name: 'Zatopená vesnice',
    shortLabel: 'VESNICE',
    rx: 17,
    ry: 14,
  },
  watchtower: {
    id: 'watchtower',
    name: 'Stará strážní věž',
    shortLabel: 'STRÁŽNÍ VĚŽ',
    rx: 12,
    ry: 12,
  },
  abbey_crypt: {
    id: 'abbey_crypt',
    name: 'Opatská krypta',
    shortLabel: 'KRYPTA',
    rx: 15,
    ry: 13,
  },
  cave: {
    id: 'cave',
    name: 'Vstup do jeskyně',
    shortLabel: 'JESKYNĚ',
    rx: 14,
    ry: 11,
  },
  city_kaelvarr: {
    id: 'city_kaelvarr',
    name: 'Kael’Varr — Železná výheň',
    shortLabel: "KAEL'VARR",
    rx: 26,
    ry: 25,
  },
  city_siltmoor: {
    id: 'city_siltmoor',
    name: 'Siltmoor — Kalný přístav',
    shortLabel: 'SILTMOOR',
    rx: 26,
    ry: 25,
  },
  city_aethelgard: {
    id: 'city_aethelgard',
    name: 'Aethelgard — Bílý relikviář',
    shortLabel: 'AETHELGARD',
    rx: 26,
    ry: 25,
  },
};

const ALL_EXPEDITION_POIS: readonly PoiKind[] = [
  'cathedral',
  'fortress',
  'graveyard',
  'village',
  'watchtower',
  'abbey_crypt',
  'cave',
];

function pickPoiKindForBiome(biome: BiomeKind, roll: number): PoiKind {
  switch (biome) {
    case 'marsh':
      return roll < 0.58 ? 'village' : roll < 0.82 ? 'graveyard' : 'abbey_crypt';
    case 'ash':
      return roll < 0.48 ? 'cathedral' : roll < 0.82 ? 'abbey_crypt' : 'fortress';
    case 'quarry':
      return roll < 0.48 ? 'cave' : roll < 0.82 ? 'fortress' : 'watchtower';
    case 'blood_forest':
      return roll < 0.45 ? 'graveyard' : roll < 0.78 ? 'abbey_crypt' : 'cathedral';
    case 'volcanic':
      return roll < 0.5 ? 'fortress' : roll < 0.82 ? 'cathedral' : 'cave';
    case 'frost':
      return roll < 0.52 ? 'watchtower' : roll < 0.82 ? 'fortress' : 'abbey_crypt';
    case 'bone_plain':
      return roll < 0.48 ? 'graveyard' : roll < 0.8 ? 'fortress' : 'watchtower';
    case 'moor_forest':
    default:
      return ALL_EXPEDITION_POIS[Math.floor(roll * ALL_EXPEDITION_POIS.length) % ALL_EXPEDITION_POIS.length];
  }
}

export interface WorldChunk {
  cx: number;
  cy: number;
  key: string;
  originX: number;
  originY: number;
  cells: Cell[];
  biomes: BiomeKind[];
  poiMask: Uint8Array;
  roadMask: Uint8Array;
  lights: LightSource[];
  poi: PointOfInterest | null;
  signposts: Signpost[];
  lootSpots: WorldLootSpot[];
  travelers: RoadsideNpc[];
  lastUsedSeq: number;
}

interface VoronoiSite {
  x: number;
  y: number;
}

/**
 * Dynamically generates and caches 64×64 chunks around the player
 * with an active 5×5 window and LRU eviction.
 */
export class ChunkManager {
  private readonly cache = new Map<string, WorldChunk>();
  private readonly activeChunks: WorldChunk[] = [];
  private activeLights: LightSource[] = [];
  private activeSignposts: Signpost[] = [];
  private activeTravelers: RoadsideNpc[] = [];

  private centerCx = Number.NaN;
  private centerCy = Number.NaN;
  private usageSeq = 0;

  private readonly generator: (cx: number, cy: number) => WorldChunk;

  constructor(generator: (cx: number, cy: number) => WorldChunk) {
    this.generator = generator;
  }

  public getChunk(cx: number, cy: number): WorldChunk {
    const key = chunkKey(cx, cy);
    let chunk = this.cache.get(key);
    if (!chunk) {
      chunk = this.generator(cx, cy);
      this.cache.set(key, chunk);
    }
    chunk.lastUsedSeq = ++this.usageSeq;
    return chunk;
  }

  public getChunkIfCached(cx: number, cy: number): WorldChunk | undefined {
    const key = chunkKey(cx, cy);
    const chunk = this.cache.get(key);
    if (chunk) {
      chunk.lastUsedSeq = ++this.usageSeq;
    }
    return chunk;
  }

  /** Gets chunk for map preview thumbnail baking and trims LRU cache if needed */
  public getChunkForPreview(cx: number, cy: number): WorldChunk {
    const chunk = this.getChunk(cx, cy);
    this.evictOldChunksIfNeeded();
    return chunk;
  }

  public updateActiveWindow(worldX: number, worldY: number): boolean {
    const cx = floorDiv(Math.floor(worldX), CHUNK_SIZE);
    const cy = floorDiv(Math.floor(worldY), CHUNK_SIZE);
    if (cx === this.centerCx && cy === this.centerCy && this.activeChunks.length > 0) {
      return false;
    }

    this.centerCx = cx;
    this.centerCy = cy;
    this.activeChunks.length = 0;
    const lights: LightSource[] = [];
    const signs: Signpost[] = [];
    const travelers: RoadsideNpc[] = [];

    for (let dy = -ACTIVE_CHUNK_RADIUS; dy <= ACTIVE_CHUNK_RADIUS; dy++) {
      for (let dx = -ACTIVE_CHUNK_RADIUS; dx <= ACTIVE_CHUNK_RADIUS; dx++) {
        const ch = this.getChunk(cx + dx, cy + dy);
        this.activeChunks.push(ch);
        for (let i = 0; i < ch.lights.length; i++) lights.push(ch.lights[i]);
        for (let i = 0; i < ch.signposts.length; i++) signs.push(ch.signposts[i]);
        for (let i = 0; i < ch.travelers.length; i++) travelers.push(ch.travelers[i]);
      }
    }

    this.activeLights = lights;
    this.activeSignposts = signs;
    this.activeTravelers = travelers;
    this.evictOldChunksIfNeeded();
    return true;
  }

  private evictOldChunksIfNeeded(): void {
    if (this.cache.size <= MAX_CACHED_CHUNKS) return;

    const activeSet = new Set<string>();
    for (let i = 0; i < this.activeChunks.length; i++) {
      activeSet.add(this.activeChunks[i].key);
    }

    const candidates: WorldChunk[] = [];
    for (const chunk of this.cache.values()) {
      if (!activeSet.has(chunk.key)) {
        candidates.push(chunk);
      }
    }
    candidates.sort((a, b) => a.lastUsedSeq - b.lastUsedSeq);

    const over = this.cache.size - MAX_CACHED_CHUNKS;
    for (let i = 0; i < over && i < candidates.length; i++) {
      this.cache.delete(candidates[i].key);
    }
  }

  public getActiveChunks(): readonly WorldChunk[] {
    return this.activeChunks;
  }

  public getActiveLights(): readonly LightSource[] {
    return this.activeLights;
  }

  public getActiveSignposts(): readonly Signpost[] {
    return this.activeSignposts;
  }

  public getActiveTravelers(): readonly RoadsideNpc[] {
    return this.activeTravelers;
  }

  public getLoadedCount(): number {
    return this.cache.size;
  }

  public getCenterChunk(): { cx: number; cy: number } {
    return {
      cx: Number.isNaN(this.centerCx) ? 0 : this.centerCx,
      cy: Number.isNaN(this.centerCy) ? 0 : this.centerCy,
    };
  }
}

export class World {
  public readonly seed: string;
  public readonly numericSeed: number;
  public readonly spawnPoint: Vec2 = { x: 0, y: 2 };
  public readonly questGiver: QuestGiverSpot = {
    x: -4,
    y: 1,
    name: 'Úkolová tabule hlídky',
  };

  private readonly elevNoise: SimplexNoise2D;
  private readonly moistNoise: SimplexNoise2D;
  private readonly tempNoise: SimplexNoise2D;
  private readonly corrNoise: SimplexNoise2D;
  private readonly detailNoise: SimplexNoise2D;
  private readonly warpNoiseX: SimplexNoise2D;
  private readonly warpNoiseY: SimplexNoise2D;
  private readonly groveNoise: SimplexNoise2D;
  private readonly riverNoise: SimplexNoise2D;
  private readonly ridgeNoise: SimplexNoise2D;
  private readonly riverZeroOffset: number;

  private readonly chunkManager: ChunkManager;
  private readonly macroPoiCache = new Map<string, PointOfInterest | null>();
  private readonly imperialCities: PointOfInterest[] = [];
  private readonly starterSignpostLines: string[] = [];

  constructor(rawSeed = 'ASH-8492') {
    this.seed = normalizeSeed(rawSeed);
    this.numericSeed = hashSeedToUint32(this.seed);

    this.elevNoise = new SimplexNoise2D(this.numericSeed ^ 0x11111111);
    this.moistNoise = new SimplexNoise2D(this.numericSeed ^ 0x22222222);
    this.tempNoise = new SimplexNoise2D(this.numericSeed ^ 0x33333333);
    this.corrNoise = new SimplexNoise2D(this.numericSeed ^ 0x44444444);
    this.detailNoise = new SimplexNoise2D(this.numericSeed ^ 0x55555555);
    this.warpNoiseX = new SimplexNoise2D(this.numericSeed ^ 0x66666666);
    this.warpNoiseY = new SimplexNoise2D(this.numericSeed ^ 0x77777777);
    this.groveNoise = new SimplexNoise2D(this.numericSeed ^ 0x8822aa11);
    this.riverNoise = new SimplexNoise2D(this.numericSeed ^ 0x44cc9922);
    this.ridgeNoise = new SimplexNoise2D(this.numericSeed ^ 0xaa553377);

    // Guarantee a primary river meanders ~40-55 cells from spawn without flooding the starter cottage
    const originRiver = this.sampleRawMainRiver(0, 0);
    const southRoadRiver = this.sampleRawMainRiver(0, 14);
    let chosenOffset = this.sampleRawMainRiver(46, 12);
    for (const pt of [
      { x: 46, y: 12 },
      { x: -46, y: 14 },
      { x: 38, y: -38 },
      { x: -40, y: -36 },
      { x: 52, y: 36 },
    ]) {
      const val = this.sampleRawMainRiver(pt.x, pt.y);
      if (Math.abs(val - originRiver) >= 0.16 && Math.abs(val - southRoadRiver) >= 0.12) {
        chosenOffset = val;
        break;
      }
    }
    if (Math.abs(chosenOffset - originRiver) < 0.14) {
      chosenOffset = originRiver + (originRiver > 0 ? -0.24 : 0.24);
    }
    this.riverZeroOffset = chosenOffset;

    // Deterministically place the 3 grand Imperial Cities at 160–245 cells from origin
    this.initImperialCities();

    // Precompute directions to nearest macro POIs for starter signpost
    const nearPois = this.findPoisInRange(90, 420);
    for (let i = 0; i < Math.min(3, nearPois.length); i++) {
      const p = nearPois[i];
      const dir = compassDir(4, 3, p.x, p.y);
      const dist = Math.round(Math.hypot(p.x - 4, p.y - 3));
      this.starterSignpostLines.push(`${dir}: ${p.name} (${dist})`);
    }
    if (this.starterSignpostLines.length === 0) {
      this.starterSignpostLines.push('V: Pohraniční stezka');
    }

    this.chunkManager = new ChunkManager((cx, cy) => this.generateChunk(cx, cy));
    this.chunkManager.updateActiveWindow(this.spawnPoint.x, this.spawnPoint.y);
  }

  private initImperialCities(): void {
    const aethelCxOptions = [-1, 0, 1];
    const aethelCx =
      aethelCxOptions[Math.floor(hashInts(11, 22, 33, this.numericSeed) * aethelCxOptions.length) % aethelCxOptions.length];
    const kaelCyOptions = [1, 2];
    const kaelCy =
      kaelCyOptions[Math.floor(hashInts(44, 55, 66, this.numericSeed) * kaelCyOptions.length) % kaelCyOptions.length];
    const siltCyOptions = [1, 2];
    const siltCy =
      siltCyOptions[Math.floor(hashInts(77, 88, 99, this.numericSeed) * siltCyOptions.length) % siltCyOptions.length];

    const specs: { kind: CityPoiKind; cx: number; cy: number; biome: BiomeKind }[] = [
      { kind: 'city_kaelvarr', cx: 2, cy: kaelCy, biome: 'volcanic' },
      { kind: 'city_siltmoor', cx: -3, cy: siltCy, biome: 'marsh' },
      { kind: 'city_aethelgard', cx: aethelCx, cy: -3, biome: 'frost' },
    ];

    for (const s of specs) {
      const tpl = POI_TEMPLATES[s.kind];
      const px = s.cx * CHUNK_SIZE + 32;
      const py = s.cy * CHUNK_SIZE + 32;
      this.imperialCities.push({
        uid: `city:${s.kind}`,
        id: s.kind,
        name: tpl.name,
        shortLabel: tpl.shortLabel,
        x: px,
        y: py,
        chunkX: s.cx,
        chunkY: s.cy,
        entranceX: px,
        entranceY: py + tpl.ry + 1,
        radiusX: tpl.rx,
        radiusY: tpl.ry,
        biome: s.biome,
        difficulty: 1.5,
      });
    }
  }

  public getImperialCities(): readonly PointOfInterest[] {
    return this.imperialCities;
  }

  public getImperialCityByKind(kind: CityPoiKind): PointOfInterest | null {
    return this.imperialCities.find((c) => c.id === kind) ?? null;
  }

  public getCityBossSpecs(): QuestBossSpec[] {
    return this.imperialCities.map((city) => {
      if (city.id === 'city_kaelvarr') {
        return {
          poiUid: city.uid,
          poiId: city.id,
          poiName: city.name,
          bossName: 'Železný slévač',
          kind: 'skeleton',
          chunkX: city.chunkX,
          chunkY: city.chunkY,
          x: city.x,
          y: city.y,
          archetype: 'iron_founder',
          isCityBoss: true,
        };
      }
      if (city.id === 'city_siltmoor') {
        return {
          poiUid: city.uid,
          poiId: city.id,
          poiName: city.name,
          bossName: 'Alchymista z hlubin',
          kind: 'ghoul',
          chunkX: city.chunkX,
          chunkY: city.chunkY,
          x: city.x,
          y: city.y,
          archetype: 'mire_alchemist',
          isCityBoss: true,
        };
      }
      return {
        poiUid: city.uid,
        poiId: city.id,
        poiName: city.name,
        bossName: 'Poslední inkvizitor',
        kind: 'skeleton',
        chunkX: city.chunkX,
        chunkY: city.chunkY,
        x: city.x,
        y: city.y,
        archetype: 'last_inquisitor',
        isCityBoss: true,
      };
    });
  }

  public updateActiveChunks(worldX: number, worldY: number): boolean {
    return this.chunkManager.updateActiveWindow(worldX, worldY);
  }

  public getActiveChunks(): readonly WorldChunk[] {
    return this.chunkManager.getActiveChunks();
  }

  public getActiveLights(): readonly LightSource[] {
    return this.chunkManager.getActiveLights();
  }

  public getLoadedChunkCount(): number {
    return this.chunkManager.getLoadedCount();
  }

  public getCurrentChunkCoords(): { cx: number; cy: number } {
    return this.chunkManager.getCenterChunk();
  }

  public getChunkForPreview(cx: number, cy: number): WorldChunk {
    return this.chunkManager.getChunkForPreview(cx, cy);
  }

  /** Fast O(1) lookup from currently cached chunks (no arbitrary bounds clamping) */
  public getCell(col: number, row: number): Cell | null {
    const cx = floorDiv(col, CHUNK_SIZE);
    const cy = floorDiv(row, CHUNK_SIZE);
    const chunk = this.chunkManager.getChunkIfCached(cx, cy);
    if (!chunk) return null;
    const lx = posMod(col, CHUNK_SIZE);
    const ly = posMod(row, CHUNK_SIZE);
    return chunk.cells[ly * CHUNK_SIZE + lx];
  }

  public isSolidCell(col: number, row: number): boolean {
    const cell = this.getCell(col, row);
    if (!cell) return true;
    return cell.solid;
  }

  /**
   * Returns true ONLY for solid opaque walls, buildings, and rocks that cast full shadows.
   * Trees, bushes, and foliage are semi-transparent and handled via getLightTransmittance().
   */
  public isOpaqueCell(col: number, row: number): boolean {
    const cell = this.getCell(col, row);
    if (!cell) return true;
    if (
      cell.kind === 'wall' ||
      cell.kind === 'quarry_rock' ||
      cell.kind === 'menhir' ||
      cell.kind === 'passage' ||
      cell.kind === 'furnace'
    ) {
      return true;
    }
    return cell.solid && (cell.char === '#' || cell.char === '█');
  }

  /**
   * Returns light transmittance [0..1] for a cell:
   * - 0.0: solid opaque wall, building, or rock (full shadow)
   * - 0.72: tree trunk / dead tree / blood tree (~28% attenuation per tree)
   * - 0.78: dense bush / foliage glyph (~22% attenuation)
   * - 0.84: ice crystal (~16% attenuation)
   * - 0.94: overhead tree canopy (subtle dappled forest shade)
   * - 1.0: open space
   */
  public getLightTransmittance(col: number, row: number): number {
    const cell = this.getCell(col, row);
    if (!cell) return 0;

    const kind = cell.kind;
    if (
      kind === 'wall' ||
      kind === 'quarry_rock' ||
      kind === 'menhir' ||
      kind === 'passage' ||
      kind === 'furnace' ||
      (cell.solid && (cell.char === '#' || cell.char === '█'))
    ) {
      return 0;
    }

    if (
      kind === 'tree_trunk' ||
      kind === 'blood_tree' ||
      kind === 'dead_tree' ||
      cell.char === 'T'
    ) {
      return 0.72;
    }

    if (
      kind === 'bush' ||
      cell.char.startsWith('♣') ||
      cell.char.startsWith('♠')
    ) {
      return 0.74;
    }

    if (kind === 'ice') {
      return 0.84;
    }

    if (kind === 'tree_canopy' || Boolean(cell.overhangChar)) {
      return 0.94;
    }

    return 1.0;
  }

  public isUndergrowthCell(col: number, row: number): boolean {
    const cell = this.getCell(col, row);
    if (!cell) return false;
    if (cell.kind === 'bush' || cell.kind === 'tree_canopy') return true;
    const ov = cell.overhangChar ?? '';
    if (
      ov.startsWith('♣') ||
      ov.startsWith('♠') ||
      ov.startsWith('↟') ||
      ov.startsWith('⇞') ||
      ov.startsWith('♧')
    ) {
      return true;
    }
    const ch = cell.char;
    return ch.startsWith('♣') || ch.startsWith('♠') || ch.startsWith('↟');
  }

  public collidesRect(minX: number, minY: number, maxX: number, maxY: number): boolean {
    const c0 = Math.floor(minX);
    const c1 = Math.floor(maxX);
    const r0 = Math.floor(minY);
    const r1 = Math.floor(maxY);

    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (this.isSolidCell(c, r)) return true;
      }
    }
    return false;
  }

  /** Pure coordinate-based continuous biome classifier supporting all 8 biomes */
  public getBiomeAt(wx: number, wy: number): BiomeKind {
    for (let i = 0; i < this.imperialCities.length; i++) {
      const city = this.imperialCities[i];
      if (Math.hypot(wx - city.x, wy - city.y) < 54) {
        return city.biome;
      }
    }

    const dist = Math.hypot(wx, wy);
    const wobble = this.detailNoise.sample(wx / 26, wy / 26) * 14;
    const effDist = dist + wobble;

    if (effDist < 120) {
      return 'moor_forest';
    }

    const elev = this.elevNoise.fbm(wx, wy, 155);
    const moist = this.moistNoise.fbm(wx, wy, 170);
    const temp = this.tempNoise.fbm(wx, wy, 165);
    const corr = this.corrNoise.fbm(wx, wy, 145);

    // 6. Sopečná trhlina / Lávová pole (far from start!)
    if (
      (effDist >= 210 && temp > 0.24 && (elev > 0.04 || corr > 0.12)) ||
      (effDist >= 340 && temp > 0.16 && corr > 0.08)
    ) {
      return 'volcanic';
    }
    // 7. Zmrzlá pustina / Jinovatková pláň
    if (effDist >= 126 && temp < -0.22) {
      return 'frost';
    }
    // 4. Skalnatý kamenolom a horské průsmyky
    if (elev > 0.27) {
      return 'quarry';
    }
    // 2. Mrtvá bažina a zatopená oblast
    if (moist > 0.23 && elev < 0.2) {
      return 'marsh';
    }
    // 5. Prokletý krvavý les
    if (effDist >= 126 && corr > 0.2 && moist > -0.2) {
      return 'blood_forest';
    }
    // 8. Kostěná pláň / Staré bojiště
    if (effDist >= 128 && corr > 0.05 && moist <= 0.05 && elev < 0.25) {
      return 'bone_plain';
    }
    // 3. Popelavá pustina
    if (temp > 0.11 && moist < 0.05) {
      return 'ash';
    }
    // 1. Popelavá louka (Ashen Meadow)
    return 'moor_forest';
  }

  public getAmbientZoneKind(wx: number, wy: number): CityPoiKind | BiomeKind {
    for (let i = 0; i < this.imperialCities.length; i++) {
      const city = this.imperialCities[i];
      if (Math.hypot(wx - city.x, wy - city.y) < 54) {
        return city.id as CityPoiKind;
      }
    }
    return this.getBiomeAt(Math.floor(wx), Math.floor(wy));
  }

  public getZoneName(x: number, y: number): string {
    const col = Math.floor(x);
    const row = Math.floor(y);
    if (Math.hypot(x, y) < 26) {
      return 'Startovní mýtina';
    }
    const cx = floorDiv(col, CHUNK_SIZE);
    const cy = floorDiv(row, CHUNK_SIZE);
    const chunk = this.chunkManager.getChunkIfCached(cx, cy);
    if (chunk?.poi && Math.hypot(x - chunk.poi.x, y - chunk.poi.y) <= Math.max(chunk.poi.radiusX, chunk.poi.radiusY) + 3) {
      return chunk.poi.name;
    }
    return BIOME_NAMES[this.getBiomeAt(col, row)];
  }

  public isNearQuestGiver(x: number, y: number, maxDist = 4.6): boolean {
    return Math.hypot(x - (this.questGiver.x + 0.5), y - (this.questGiver.y + 0.5)) <= maxDist;
  }

  public getNearbySignpost(x: number, y: number, maxDist = 4.5): Signpost | null {
    let best: Signpost | null = null;
    let bestDist = maxDist;
    const signs = this.chunkManager.getActiveSignposts();
    for (let i = 0; i < signs.length; i++) {
      const sp = signs[i];
      const d = Math.hypot(x - (sp.x + 0.5), y - (sp.y + 0.5));
      if (d <= bestDist) {
        bestDist = d;
        best = sp;
      }
    }
    return best;
  }

  public getActiveTravelers(): readonly RoadsideNpc[] {
    return this.chunkManager.getActiveTravelers();
  }

  public getNearbyTraveler(x: number, y: number, maxDist = 4.6): RoadsideNpc | null {
    let best: RoadsideNpc | null = null;
    let bestDist = maxDist;
    const travelers = this.chunkManager.getActiveTravelers();
    for (let i = 0; i < travelers.length; i++) {
      const npc = travelers[i];
      const d = Math.hypot(x - npc.x, y - npc.y);
      if (d <= bestDist) {
        bestDist = d;
        best = npc;
      }
    }
    return best;
  }

  public findNearestMajorPoi(
    fromX: number,
    fromY: number,
    excludeUids?: ReadonlySet<string>
  ): PointOfInterest | null {
    const macroSize = CHUNK_SIZE * POI_MACRO_CHUNKS;
    const baseMx = Math.round(fromX / macroSize);
    const baseMy = Math.round(fromY / macroSize);
    let bestNew: PointOfInterest | null = null;
    let bestNewDist = Infinity;
    let bestAny: PointOfInterest | null = null;
    let bestAnyDist = Infinity;

    for (let dmy = -6; dmy <= 6; dmy++) {
      for (let dmx = -6; dmx <= 6; dmx++) {
        const mx = baseMx + dmx;
        const my = baseMy + dmy;
        if (mx === 0 && my === 0) continue;
        const poi = this.getPoiForMacroBlock(mx, my);
        if (!poi || poi.id === 'shelter') continue;
        const dist = Math.hypot(poi.x - fromX, poi.y - fromY);
        if (dist < bestAnyDist) {
          bestAnyDist = dist;
          bestAny = poi;
        }
        if ((!excludeUids || !excludeUids.has(poi.uid)) && dist < bestNewDist) {
          bestNewDist = dist;
          bestNew = poi;
        }
      }
    }

    return bestNew ?? bestAny;
  }

  /**
   * Returns a deterministic POI descriptor for a macro-block (mx, my) in O(1)
   * without generating any chunk terrain arrays.
   */
  public getPoiForMacroBlock(mx: number, my: number): PointOfInterest | null {
    if (mx === 0 && my === 0) return null; // Reserved for Starter Clearing
    const key = `${mx},${my}`;
    if (this.macroPoiCache.has(key)) {
      return this.macroPoiCache.get(key) ?? null;
    }

    const chebyshev = Math.max(Math.abs(mx), Math.abs(my));
    const presenceRoll = hashInts(mx, my, 1, this.numericSeed ^ 0x918273);
    if (chebyshev > 3 && presenceRoll > 0.82) {
      this.macroPoiCache.set(key, null);
      return null;
    }

    // Choose sub-chunk inside the 3x3 macro-block (mx*3 - 1 .. mx*3 + 1)
    let offsetX = Math.floor(hashInts(mx, my, 2, this.numericSeed) * POI_MACRO_CHUNKS) - 1;
    const offsetY = Math.floor(hashInts(mx, my, 3, this.numericSeed) * POI_MACRO_CHUNKS) - 1;
    let chunkX = mx * POI_MACRO_CHUNKS + offsetX;
    const chunkY = my * POI_MACRO_CHUNKS + offsetY;
    if (this.imperialCities.some((c) => c.chunkX === chunkX && c.chunkY === chunkY)) {
      offsetX = ((offsetX + 2) % POI_MACRO_CHUNKS) - 1;
      chunkX = mx * POI_MACRO_CHUNKS + offsetX;
    }

    // Place wholly inside chunk (32, 32) so zero cross-chunk structure border clipping occurs!
    const px = chunkX * CHUNK_SIZE + 32;
    const py = chunkY * CHUNK_SIZE + 32;
    const biome = this.getBiomeAt(px, py);
    const kindRoll = hashInts(mx, my, 4, this.numericSeed ^ 0x55aa12);
    const kind = pickPoiKindForBiome(biome, kindRoll);
    const tpl = POI_TEMPLATES[kind];
    const dist = Math.hypot(px, py);

    const poi: PointOfInterest = {
      uid: `poi:${mx},${my}`,
      id: kind,
      name: tpl.name,
      shortLabel: tpl.shortLabel,
      x: px,
      y: py,
      chunkX,
      chunkY,
      entranceX: px,
      entranceY: py + tpl.ry + 1,
      radiusX: tpl.rx,
      radiusY: tpl.ry,
      biome,
      difficulty: Math.min(2.5, Math.max(0.25, dist / 240)),
    };

    this.macroPoiCache.set(key, poi);
    return poi;
  }

  public getPoiInChunk(cx: number, cy: number): PointOfInterest | null {
    for (let i = 0; i < this.imperialCities.length; i++) {
      const city = this.imperialCities[i];
      if (city.chunkX === cx && city.chunkY === cy) {
        return city;
      }
    }
    const mx = floorDiv(cx + 1, POI_MACRO_CHUNKS);
    const my = floorDiv(cy + 1, POI_MACRO_CHUNKS);
    const poi = this.getPoiForMacroBlock(mx, my);
    if (!poi) return null;
    if (poi.chunkX === cx && poi.chunkY === cy) return poi;
    return null;
  }

  /** Finds deterministic expedition POIs within [minDist..maxDist] cells from (0, 0) */
  public findPoisInRange(minDist: number, maxDist: number): PointOfInterest[] {
    const macroSize = CHUNK_SIZE * POI_MACRO_CHUNKS; // 192 cells
    const maxMacro = Math.ceil(maxDist / macroSize) + 1;
    const result: PointOfInterest[] = [];

    for (let my = -maxMacro; my <= maxMacro; my++) {
      for (let mx = -maxMacro; mx <= maxMacro; mx++) {
        if (mx === 0 && my === 0) continue;
        const poi = this.getPoiForMacroBlock(mx, my);
        if (!poi) continue;
        const d = Math.hypot(poi.x, poi.y);
        if (d >= minDist && d <= maxDist) {
          result.push(poi);
        }
      }
    }

    result.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
    return result;
  }

  public getKnownNearPois(): PointOfInterest[] {
    const list: PointOfInterest[] = [
      {
        uid: 'poi:shelter',
        id: 'shelter',
        name: 'Startovní útočiště',
        shortLabel: 'ÚTOČIŠTĚ',
        x: 0,
        y: -6,
        chunkX: 0,
        chunkY: 0,
        entranceX: 0,
        entranceY: 0,
        radiusX: 10,
        radiusY: 8,
        biome: 'moor_forest',
        difficulty: 0,
      },
    ];
    for (const ch of this.chunkManager.getActiveChunks()) {
      if (ch.poi) list.push(ch.poi);
    }
    return list;
  }

  // =========================================================================
  // VORONOI ROADS, CONTINUOUS RIVERS & GROVE NOISE FIELDS
  // =========================================================================
  private getVoronoiSite(gx: number, gy: number): VoronoiSite {
    // Pin sites around x = 0 near origin so a major highway threads into starter crossroads (0, 8)
    if (gx === 0 && gy === 0) {
      return { x: 42, y: 12 };
    }
    if (gx === -1 && gy === 0) {
      return { x: -42, y: 12 };
    }
    const rx = hashInts(gx, gy, 11, this.numericSeed ^ 0x3377aa);
    const ry = hashInts(gx, gy, 12, this.numericSeed ^ 0x99cc11);
    return {
      x: (gx + 0.18 + rx * 0.64) * VORONOI_ROAD_CELL,
      y: (gy + 0.18 + ry * 0.64) * VORONOI_ROAD_CELL,
    };
  }

  private sampleRoadInfo(
    wx: number,
    wy: number,
    precomputedSites?: readonly VoronoiSite[]
  ): { roadDelta: number; junctionDelta: number } {
    const warpWeight = Math.min(1, Math.hypot(wx, wy) / 48);
    const u = wx + this.warpNoiseX.sample(wx / 58, wy / 58) * 14 * warpWeight;
    const v = wy + this.warpNoiseY.sample(wx / 58, wy / 58) * 14 * warpWeight;

    let d1 = Infinity;
    let d2 = Infinity;
    let d3 = Infinity;

    if (precomputedSites) {
      for (let s = 0; s < precomputedSites.length; s++) {
        const d = Math.hypot(u - precomputedSites[s].x, v - precomputedSites[s].y);
        if (d < d1) {
          d3 = d2;
          d2 = d1;
          d1 = d;
        } else if (d < d2) {
          d3 = d2;
          d2 = d;
        } else if (d < d3) {
          d3 = d;
        }
      }
    } else {
      const gx0 = floorDiv(wx, VORONOI_ROAD_CELL);
      const gy0 = floorDiv(wy, VORONOI_ROAD_CELL);
      for (let gy = gy0 - 1; gy <= gy0 + 1; gy++) {
        for (let gx = gx0 - 1; gx <= gx0 + 1; gx++) {
          const site = this.getVoronoiSite(gx, gy);
          const d = Math.hypot(u - site.x, v - site.y);
          if (d < d1) {
            d3 = d2;
            d2 = d1;
            d1 = d;
          } else if (d < d2) {
            d3 = d2;
            d2 = d;
          } else if (d < d3) {
            d3 = d;
          }
        }
      }
    }

    return { roadDelta: d2 - d1, junctionDelta: d3 - d1 };
  }

  private sampleRawMainRiver(wx: number, wy: number): number {
    const rwx = wx + this.warpNoiseX.sample(wx / 140, wy / 140) * 24;
    const rwy = wy + this.warpNoiseY.sample(wx / 140, wy / 140) * 24;
    return this.riverNoise.sample(rwx / 250, rwy / 250);
  }

  private sampleRawCreek(wx: number, wy: number): number {
    const rwx = wx + this.warpNoiseX.sample(wx / 140, wy / 140) * 24;
    const rwy = wy + this.warpNoiseY.sample(wx / 140, wy / 140) * 24;
    return this.riverNoise.sample((rwx + 731) / 185, (rwy - 519) / 185);
  }

  private sampleRiverInfo(wx: number, wy: number): {
    isRiver: boolean;
    isDeep: boolean;
    isBank: boolean;
    isCrossing: boolean;
    crossingKind: 'bridge' | 'ford';
  } {
    const dist = Math.hypot(wx, wy);
    if (dist < 26) {
      return {
        isRiver: false,
        isDeep: false,
        isBank: false,
        isCrossing: false,
        crossingKind: 'bridge',
      };
    }

    const mainVal = this.sampleRawMainRiver(wx, wy) - this.riverZeroOffset;
    const mainAbs = Math.abs(mainVal);
    const creekVal = this.sampleRawCreek(wx, wy);
    const creekAbs = Math.abs(creekVal);

    const isMain = mainAbs < 0.025;
    const isCreek = dist >= 110 && creekAbs < 0.014;
    const isRiver = isMain || isCreek;
    const isBank = !isRiver && (mainAbs < 0.042 || (dist >= 110 && creekAbs < 0.024));

    if (!isRiver) {
      return {
        isRiver: false,
        isDeep: false,
        isBank,
        isCrossing: false,
        crossingKind: 'bridge',
      };
    }

    const isDeep = isMain ? mainAbs < 0.011 : creekAbs < 0.006;
    let gx: number;
    let gy: number;
    let val: number;
    if (isMain) {
      gx = this.sampleRawMainRiver(wx + 1, wy) - this.sampleRawMainRiver(wx - 1, wy);
      gy = this.sampleRawMainRiver(wx, wy + 1) - this.sampleRawMainRiver(wx, wy - 1);
      val = mainVal;
    } else {
      gx = this.sampleRawCreek(wx + 1, wy) - this.sampleRawCreek(wx - 1, wy);
      gy = this.sampleRawCreek(wx, wy + 1) - this.sampleRawCreek(wx, wy - 1);
      val = creekVal;
    }

    let clX = wx;
    let clY = wy;
    const g2 = gx * gx + gy * gy;
    if (g2 > 1e-8) {
      clX = wx - (2 * val * gx) / g2;
      clY = wy - (2 * val * gy) / g2;
    }

    const spacing = isMain ? 46 : 42;
    const isCrossing =
      Math.abs(gx) >= Math.abs(gy)
        ? Math.abs(posMod(clY, spacing) - spacing * 0.5) <= 1.45
        : Math.abs(posMod(clX, spacing) - spacing * 0.5) <= 1.45;
    const bx = floorDiv(Math.round(clX), spacing);
    const by = floorDiv(Math.round(clY), spacing);
    const crossingKind =
      hashInts(bx, by, isMain ? 91 : 92, this.numericSeed) < 0.52 ? 'bridge' : 'ford';

    return { isRiver: true, isDeep, isBank, isCrossing, crossingKind };
  }

  private sampleRawGroveNoise(wx: number, wy: number): number {
    return (
      this.groveNoise.sample(wx / 44, wy / 44) * 0.84 +
      this.detailNoise.sample((wx + 173) / 18, (wy - 89) / 18) * 0.16
    );
  }

  private sampleGroveDensity(wx: number, wy: number, roadDelta: number): number {
    let val = this.sampleRawGroveNoise(wx, wy);
    const roadClearance = Math.max(0, 1 - roadDelta / 15);
    val -= roadClearance * roadClearance * 0.58;
    const dist = Math.hypot(wx, wy);
    if (dist < 32) {
      const startClear = 1 - dist / 32;
      val -= startClear * 0.85;
    }
    return val;
  }

  // =========================================================================
  // CHUNK GENERATOR (64×64)
  // =========================================================================
  private generateChunk(cx: number, cy: number): WorldChunk {
    const originX = cx * CHUNK_SIZE;
    const originY = cy * CHUNK_SIZE;
    const cells = new Array<Cell>(CHUNK_SIZE * CHUNK_SIZE);
    const biomes = new Array<BiomeKind>(CHUNK_SIZE * CHUNK_SIZE);
    const poiMask = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
    const roadMask = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
    const lights: LightSource[] = [];
    const signposts: Signpost[] = [];
    const lootSpots: WorldLootSpot[] = [];
    const travelers: RoadsideNpc[] = [];

    const rng = createRng(hashSeedToUint32(`${this.seed}:chunk:${cx},${cy}`));

    // Precompute Voronoi sites overlapping this chunk
    const minGx = floorDiv(originX - 24, VORONOI_ROAD_CELL) - 1;
    const maxGx = floorDiv(originX + CHUNK_SIZE + 24, VORONOI_ROAD_CELL) + 1;
    const minGy = floorDiv(originY - 24, VORONOI_ROAD_CELL) - 1;
    const maxGy = floorDiv(originY + CHUNK_SIZE + 24, VORONOI_ROAD_CELL) + 1;
    const sites: VoronoiSite[] = [];
    for (let gy = minGy; gy <= maxGy; gy++) {
      for (let gx = minGx; gx <= maxGx; gx++) {
        sites.push(this.getVoronoiSite(gx, gy));
      }
    }

    // Check if this chunk hosts a deterministic POI
    const poi = this.getPoiInChunk(cx, cy);
    if (poi) {
      const pL = poi.x - poi.radiusX - 2;
      const pR = poi.x + poi.radiusX + 2;
      const pT = poi.y - poi.radiusY - 2;
      const pB = poi.y + poi.radiusY + 2;
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        const wy = originY + ly;
        if (wy < pT || wy > pB) continue;
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const wx = originX + lx;
          if (wx >= pL && wx <= pR) {
            poiMask[ly * CHUNK_SIZE + lx] = 1;
          }
        }
      }
    }

    const chunk: WorldChunk = {
      cx,
      cy,
      key: chunkKey(cx, cy),
      originX,
      originY,
      cells,
      biomes,
      poiMask,
      roadMask,
      lights,
      poi,
      signposts,
      lootSpots,
      travelers,
      lastUsedSeq: 0,
    };

    let lavaLightBucketX = -999;
    let lavaLightBucketY = -999;

    // Step 1: Base biome terrain + winding rivers + Voronoi roads
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      const wy = originY + ly;
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = originX + lx;
        const idx = ly * CHUNK_SIZE + lx;
        const biome = this.getBiomeAt(wx, wy);
        biomes[idx] = biome;

        let cell = this.buildBaseBiomeCell(wx, wy, biome);

        // Winding continuous rivers & streams (exempt starter clearing, POIs & volcanic lava)
        const roadInfo = this.sampleRoadInfo(wx, wy, sites);
        const h = hashCoords(wx, wy, this.numericSeed ^ 0x7171);

        if (poiMask[idx] === 0 && biome !== 'volcanic') {
          const river = this.sampleRiverInfo(wx, wy);
          if (river.isRiver) {
            if (river.isCrossing) {
              if (river.crossingKind === 'bridge') {
                cell = {
                  char: (wx + wy) % 2 === 0 ? '═' : '≡',
                  color: PALETTE.bridge[Math.floor(h * 3) % 3],
                  bg: PALETTE.cellBg.bridge,
                  kind: 'bridge',
                  solid: false,
                };
              } else {
                cell = {
                  char: h < 0.55 ? '·' : 'o',
                  color: PALETTE.fordStone[Math.floor(h * 3) % 3],
                  bg: PALETTE.cellBg.ford,
                  kind: 'ford',
                  solid: false,
                };
              }
            } else {
              cell = {
                char: river.isDeep ? '≈' : '~',
                color: PALETTE.riverWater[river.isDeep ? 2 : h < 0.5 ? 0 : 1],
                bg: PALETTE.cellBg.riverWater,
                kind: 'river_water',
                solid: false,
                altChar: h < 0.5 ? '∿' : '~',
                animPhase: ((wx * 0.11 + wy * 0.07) % 1 + 1) % 1,
                animSpeed: 0.85,
              };
            }
          } else if (river.isBank && biome === 'moor_forest' && !cell.solid) {
            cell = {
              char: h < 0.14 ? '·' : ' ',
              color: PALETTE.marshGround[Math.floor(h * 4) % 4],
              bg: PALETTE.cellBg.marshGround,
              kind: 'grass',
              solid: false,
            };
          }
        }

        // Track volcanic glow lights sparsely (at most ~1 per 12x12 block on lava)
        if (cell.kind === 'lava') {
          const bx = floorDiv(wx, 12);
          const by = floorDiv(wy, 12);
          if ((bx !== lavaLightBucketX || by !== lavaLightBucketY) && lights.length < 18) {
            lavaLightBucketX = bx;
            lavaLightBucketY = by;
            lights.push({
              x: wx + 0.5,
              y: wy + 0.5,
              radius: 7.5,
              color: 'rgba(255, 92, 32, 0.16)',
              intensity: 0.85,
              flicker: true,
            });
          }
        }

        // Seamless Voronoi cross-chunk roads (kept clear of starter cottage bounds)
        if (poiMask[idx] === 0 && Math.hypot(wx, wy) >= 16 && roadInfo.roadDelta < 3.3) {
          roadMask[idx] = 1;
          if (
            cell.kind === 'river_water' ||
            cell.kind === 'marsh_water' ||
            cell.kind === 'ford' ||
            cell.kind === 'lava'
          ) {
            const isEdge = roadInfo.roadDelta > 2.6;
            cell = {
              char: isEdge ? '│' : (wx + wy) % 2 === 0 ? '═' : '≡',
              color: PALETTE.bridge[isEdge ? 3 : Math.floor(h * 3) % 3],
              bg: PALETTE.cellBg.bridge,
              kind: 'bridge',
              solid: false,
            };
          } else {
            cell = {
              char: h < 0.2 ? GRASS_CHARS[Math.floor(h * 10) % GRASS_CHARS.length] : ' ',
              color: PALETTE.path[Math.floor(h * 4) % 4],
              bg: PALETTE.cellBg.path,
              kind: 'path',
              solid: false,
            };
          }
        }

        cells[idx] = cell;
      }
    }

    // Step 2: Apply Starter Clearing around (0, 0) if this chunk overlaps [-26..26]
    if (originX < 27 && originX + CHUNK_SIZE > -27 && originY < 27 && originY + CHUNK_SIZE > -27) {
      this.applyStarterClearingToChunk(chunk, rng);
    }

    // Step 3: Stamp POI inside this chunk (if present) + local road spur
    if (poi) {
      this.buildChunkPoi(chunk, poi, rng);
      const spurTarget = this.findRoadPointInChunk(chunk, poi.entranceX, poi.entranceY);
      this.carveChunkPathSegment(chunk, poi.entranceX, poi.entranceY, spurTarget.x, spurTarget.y, 1.75, rng);

      lootSpots.push({
        id: `cache:${cx},${cy}:0`,
        x: poi.id.startsWith('city_') ? poi.x - 10 : poi.x + 2,
        y: poi.id.startsWith('city_') ? poi.y : poi.y - 2,
        tier: poi.id.startsWith('city_')
          ? 4
          : Math.min(4, Math.max(1, Math.floor(Math.hypot(poi.x, poi.y) / 180) + 1)),
      });
      if (poi.id.startsWith('city_')) {
        lootSpots.push({
          id: `cache:${cx},${cy}:1`,
          x: poi.x + 10,
          y: poi.y,
          tier: 4,
        });
      }
    }

    // Step 4: Populate landmarks, structured ruins, grove islands & biome props
    this.populateChunkFeatures(chunk, rng);

    // Step 4b: Place rare peaceful roadside travelers & campfires along main roads
    this.placeRoadsideTravelersInChunk(chunk, rng);

    // Step 5: Auto-tile architectural stone & ruined walls with contextual box-drawing glyphs
    this.resolveChunkWalls(chunk, rng);

    return chunk;
  }

  private setChunkCellIfInside(chunk: WorldChunk, wx: number, wy: number, cell: Cell): void {
    const lx = wx - chunk.originX;
    const ly = wy - chunk.originY;
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) return;
    chunk.cells[ly * CHUNK_SIZE + lx] = cell;
  }

  private getChunkCellSafe(chunk: WorldChunk, wx: number, wy: number): Cell | null {
    const lx = wx - chunk.originX;
    const ly = wy - chunk.originY;
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) return null;
    return chunk.cells[ly * CHUNK_SIZE + lx];
  }

  private buildBaseBiomeCell(wx: number, wy: number, biome: BiomeKind): Cell {
    const h = hashCoords(wx, wy, this.numericSeed ^ 0x10203);
    const swayNoise = this.detailNoise.sample(wx / 7, wy / 7);
    const fineNoise = this.detailNoise.sample((wx + 91) / 3.5, (wy - 47) / 3.5);

    switch (biome) {
      case 'moor_forest': {
        // Gentle muted Ashen Meadow grass carpet (~80% light low grass, ~5-8% ⁕/v accents)
        if (fineNoise > 0.42 && h < 0.04) {
          return {
            char: '⁕',
            color: PALETTE.moorHeather[Math.floor(h * 100) % PALETTE.moorHeather.length],
            bg: PALETTE.cellBg.grass,
            kind: 'flower',
            solid: false,
            altChar: '·',
            animPhase: h,
            animSpeed: 0.7,
          };
        }
        const isTuft = swayNoise > 0.25 && h >= 0.04 && h < 0.085;
        const isQuoteTuft = h >= 0.085 && h < 0.14;
        const glyph = isTuft
          ? 'v'
          : isQuoteTuft
            ? '"'
            : h < 0.85
              ? GRASS_CHARS[Math.floor(h * 19) % GRASS_CHARS.length]
              : ' ';
        return {
          char: glyph,
          color: PALETTE.moorGrass[Math.floor(h * 5) % PALETTE.moorGrass.length],
          bg: PALETTE.cellBg.grass,
          kind: 'grass',
          solid: false,
          altChar: glyph === '·' ? '‧' : undefined,
          animPhase: ((wx * 0.09 + wy * 0.07) % 1 + 1) % 1,
          animSpeed: glyph === '·' ? 0.55 : 0,
        };
      }

      case 'marsh': {
        const poolNoise = this.moistNoise.sample(wx / 11, wy / 11);
        if (poolNoise > 0.16) {
          const deep = poolNoise > 0.54;
          return {
            char: WATER_CHARS[deep ? 0 : Math.floor(h * 3) % 3],
            color: PALETTE.marshWater[deep ? 2 : h < 0.5 ? 0 : 1],
            bg: PALETTE.cellBg.marshWater,
            kind: 'marsh_water',
            solid: deep,
            altChar: h < 0.5 ? '∿' : '~',
            animPhase: ((wx * 0.11 + wy * 0.07) % 1 + 1) % 1,
            animSpeed: 0.65,
          };
        }
        return {
          char: h < 0.22 ? GRASS_CHARS[Math.floor(h * 10) % GRASS_CHARS.length] : ' ',
          color: PALETTE.marshGround[Math.floor(h * 5) % PALETTE.marshGround.length],
          bg: PALETTE.cellBg.marshGround,
          kind: 'marsh_ground',
          solid: false,
        };
      }

      case 'ash': {
        if (fineNoise > 0.58 && h < 0.045) {
          return {
            char: '✦',
            color: PALETTE.ashEmber[Math.floor(h * 30) % 3],
            bg: PALETTE.cellBg.ashGround,
            kind: 'ember',
            solid: false,
            altChar: '·',
            altColor: PALETTE.ashEmber[1],
            animPhase: h,
            animSpeed: 1.7,
          };
        }
        return {
          char: h < 0.16 ? GRASS_CHARS[Math.floor(h * 10) % GRASS_CHARS.length] : ' ',
          color: PALETTE.ashGround[Math.floor(h * 5) % PALETTE.ashGround.length],
          bg: PALETTE.cellBg.ashGround,
          kind: 'ash_ground',
          solid: false,
        };
      }

      case 'quarry': {
        // Continuous warped ridge-noise cliff walls & escarpments (never isolated dots)
        const warpX = this.warpNoiseX.sample(wx / 34, wy / 34) * 14;
        const warpY = this.warpNoiseY.sample(wx / 34, wy / 34) * 14;
        const ridge = Math.abs(this.ridgeNoise.sample((wx + warpX) / 42, (wy + warpY) / 42));
        const passGate = this.elevNoise.sample(wx / 28, wy / 28);
        if (ridge < 0.088 && passGate > -0.35 && Math.hypot(wx, wy) > 68) {
          return {
            char: ROCK_CHARS[Math.floor(h * 4) % 4],
            color: PALETTE.quarryRock[Math.floor(h * 4) % 4],
            bg: PALETTE.cellBg.quarryRock,
            kind: 'quarry_rock',
            solid: true,
          };
        }
        return {
          char: h < 0.22 ? (h < 0.14 ? '·' : '‧') : ' ',
          color: PALETTE.quarryGround[Math.floor(h * 4) % 4],
          bg: PALETTE.cellBg.quarryGround,
          kind: 'quarry_ground',
          solid: false,
        };
      }

      case 'blood_forest': {
        if (fineNoise > 0.56 && h < 0.03) {
          return {
            char: '⁕',
            color: '#7d212d',
            bg: PALETTE.cellBg.bloodFloor,
            kind: 'flower',
            solid: false,
          };
        }
        return {
          char: h < 0.18 ? GRASS_CHARS[Math.floor(h * 10) % GRASS_CHARS.length] : ' ',
          color: PALETTE.bloodFloor[Math.floor(h * 4) % 4],
          bg: PALETTE.cellBg.bloodFloor,
          kind: 'grass',
          solid: false,
        };
      }

      case 'volcanic': {
        // Winding glowing lava fissures + continuous basalt cliff ridges
        const fissure = Math.abs(
          this.warpNoiseX.sample(wx / 18, wy / 18) + this.detailNoise.sample(wx / 9, wy / 9) * 0.35
        );
        if (fissure < 0.15) {
          return {
            char: '≈',
            color: PALETTE.lava[Math.floor(h * 4) % 4],
            bg: PALETTE.cellBg.lava,
            kind: 'lava',
            solid: false,
            altChar: '∿',
            altColor: '#ffc447',
            animPhase: ((wx * 0.13 + wy * 0.09) % 1 + 1) % 1,
            animSpeed: 1.9,
          };
        }
        const basaltRidge = Math.abs(this.ridgeNoise.sample((wx + 111) / 38, (wy - 77) / 38));
        if (basaltRidge < 0.075 && fissure > 0.26) {
          return {
            char: ROCK_CHARS[Math.floor(h * 4) % 4],
            color: PALETTE.basaltWall[Math.floor(h * 3) % 3],
            bg: PALETTE.cellBg.quarryRock,
            kind: 'quarry_rock',
            solid: true,
          };
        }
        return {
          char: h < 0.18 ? '·' : ' ',
          color: PALETTE.basalt[Math.floor(h * 4) % 4],
          bg: PALETTE.cellBg.basalt,
          kind: 'basalt',
          solid: false,
        };
      }

      case 'frost': {
        if (fineNoise > 0.65 && h < 0.03) {
          return {
            char: '⁕',
            color: PALETTE.iceCrystal[Math.floor(h * 4) % 4],
            bg: PALETTE.cellBg.snowGround,
            kind: 'snow_ground',
            solid: false,
            altChar: '·',
            animPhase: h,
            animSpeed: 1.2,
          };
        }
        return {
          char: h < 0.16 ? GRASS_CHARS[Math.floor(h * 10) % GRASS_CHARS.length] : ' ',
          color: PALETTE.snowGround[Math.floor(h * 4) % 4],
          bg: PALETTE.cellBg.snowGround,
          kind: 'snow_ground',
          solid: false,
        };
      }

      case 'bone_plain': {
        if (h < 0.016) {
          return {
            char: h < 0.008 ? 'o' : h < 0.012 ? '╱' : '†',
            color: h < 0.009 ? PALETTE.boneProp[0] : PALETTE.rustWeapon[Math.floor(h * 100) % 3],
            bg: PALETTE.cellBg.boneGround,
            kind: 'bone_pile',
            solid: false,
          };
        }
        return {
          char: h < 0.16 ? GRASS_CHARS[Math.floor(h * 10) % GRASS_CHARS.length] : ' ',
          color: PALETTE.boneGround[Math.floor(h * 4) % 4],
          bg: PALETTE.cellBg.boneGround,
          kind: 'ash_ground',
          solid: false,
        };
      }
    }
  }

  // =========================================================================
  // STARTER CLEARING AROUND GLOBAL (0, 0)
  // =========================================================================
  private applyStarterClearingToChunk(chunk: WorldChunk, rng: () => number): void {
    const startX = Math.max(-26, chunk.originX);
    const endX = Math.min(26, chunk.originX + CHUNK_SIZE - 1);
    const startY = Math.max(-26, chunk.originY);
    const endY = Math.min(26, chunk.originY + CHUNK_SIZE - 1);

    // 1. Calm, open Ashen Meadow clearing around (0, 0)
    for (let wy = startY; wy <= endY; wy++) {
      for (let wx = startX; wx <= endX; wx++) {
        const d = Math.hypot(wx, wy);
        if (d > 24) continue;
        const lx = wx - chunk.originX;
        const ly = wy - chunk.originY;
        chunk.poiMask[ly * CHUNK_SIZE + lx] = 1;
        const h = hashCoords(wx, wy, this.numericSeed ^ 0x4242);
        const isFlower = d > 7 && h > 0.97;
        chunk.cells[ly * CHUNK_SIZE + lx] = isFlower
          ? {
              char: '⁕',
              color: PALETTE.moorHeather[Math.floor(h * 100) % PALETTE.moorHeather.length],
              bg: PALETTE.cellBg.grass,
              kind: 'flower',
              solid: false,
            }
          : {
              char: h < 0.82 ? GRASS_CHARS[Math.floor(h * 19) % GRASS_CHARS.length] : ' ',
              color: PALETTE.moorGrass[Math.floor(h * 5) % PALETTE.moorGrass.length],
              bg: PALETTE.cellBg.grass,
              kind: 'grass',
              solid: false,
            };
      }
    }

    // 2. Starter stone cottage above (0, 0): x in [-6..6], y in [-10..-3], door at (0, -3)
    const left = -6;
    const right = 6;
    const top = -10;
    const bottom = -3;

    for (let wy = top; wy <= bottom; wy++) {
      for (let wx = left; wx <= right; wx++) {
        const lx = wx - chunk.originX;
        const ly = wy - chunk.originY;
        if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) continue;

        const isWall = wy === top || wy === bottom || wx === left || wx === right;
        const isDoor = wy === bottom && Math.abs(wx) <= 1;

        if (isWall && !isDoor) {
          chunk.cells[ly * CHUNK_SIZE + lx] = this.createWallCell(wx, wy, rng, false, 'intact');
        } else {
          chunk.cells[ly * CHUNK_SIZE + lx] = {
            char: isDoor ? '═' : (wx + wy) % 2 === 0 ? '·' : '‧',
            color: PALETTE.ruinFloor[Math.abs(wx + wy) % 4],
            bg: PALETTE.cellBg.ruinFloor,
            kind: 'ruin_floor',
            solid: false,
          };
        }
      }
    }

    // 3. Dirt plaza & crossroads road spur connecting cottage -> (0, 28) Voronoi highway
    this.carveChunkPathSegment(chunk, 0, -2, 0, 28, 2.2, rng);

    // 4. Twin braziers + hearth fire inside cottage
    this.placeBrazierInChunk(chunk, -3, -2, 12);
    this.placeBrazierInChunk(chunk, 3, -2, 12);
    this.placeBrazierInChunk(chunk, 0, -8, 10);

    // 5. Quest Board [!] at (-4, 1) — crisp framed golden noticeboard
    const qbX = this.questGiver.x;
    const qbY = this.questGiver.y;
    this.setChunkCellIfInside(chunk, qbX - 1, qbY, {
      char: '╟',
      color: '#e0a555',
      bg: PALETTE.cellBg.questBoard,
      kind: 'quest_board',
      solid: true,
    });
    this.setChunkCellIfInside(chunk, qbX, qbY, {
      char: '!',
      color: '#ffe46b',
      bg: PALETTE.cellBg.questBoard,
      kind: 'quest_board',
      solid: true,
      altChar: '!',
      altColor: '#fff6b8',
      animPhase: 0.25,
      animSpeed: 2.4,
    });
    this.setChunkCellIfInside(chunk, qbX + 1, qbY, {
      char: '╢',
      color: '#e0a555',
      bg: PALETTE.cellBg.questBoard,
      kind: 'quest_board',
      solid: true,
    });
    if (floorDiv(qbX, CHUNK_SIZE) === chunk.cx && floorDiv(qbY, CHUNK_SIZE) === chunk.cy) {
      chunk.lights.push({
        x: qbX + 0.5,
        y: qbY + 0.5,
        radius: 6,
        color: 'rgba(218, 158, 64, 0.14)',
        intensity: 0.75,
        flicker: true,
      });
    }

    // 6. Signpost at (4, 3) showing nearest expedition POIs
    if (floorDiv(4, CHUNK_SIZE) === chunk.cx && floorDiv(3, CHUNK_SIZE) === chunk.cy) {
      this.setChunkCellIfInside(chunk, 4, 3, {
        char: '╤',
        color: PALETTE.signpost[0],
        bg: PALETTE.cellBg.path,
        kind: 'signpost',
        solid: true,
      });
      chunk.signposts.push({ x: 4, y: 3, lines: this.starterSignpostLines });
    }
  }

  // =========================================================================
  // ALL 7 CHUNK-INTERNAL POI STAMPERS (CENTRED AT (pcx*64+32, pcy*64+32))
  // =========================================================================
  private buildChunkPoi(chunk: WorldChunk, poi: PointOfInterest, rng: () => number): void {
    switch (poi.id) {
      case 'city_kaelvarr':
        this.stampKaelVarrCity(chunk, poi.x, poi.y, rng);
        return;
      case 'city_siltmoor':
        this.stampSiltmoorCity(chunk, poi.x, poi.y, rng);
        return;
      case 'city_aethelgard':
        this.stampAethelgardCity(chunk, poi.x, poi.y, rng);
        return;
      case 'cathedral':
        this.stampCathedralPoi(chunk, poi.x, poi.y, rng);
        break;
      case 'fortress':
        this.stampFortressPoi(chunk, poi.x, poi.y, rng);
        break;
      case 'graveyard':
        this.stampGraveyardPoi(chunk, poi.x, poi.y, rng);
        break;
      case 'village':
        this.stampVillagePoi(chunk, poi.x, poi.y, rng);
        break;
      case 'watchtower':
        this.stampWatchtowerPoi(chunk, poi.x, poi.y, rng);
        break;
      case 'abbey_crypt':
        this.stampAbbeyCryptPoi(chunk, poi.x, poi.y, rng);
        break;
      case 'cave':
      default:
        this.stampCavePoi(chunk, poi.x, poi.y, rng);
        break;
    }

    // Ensure guaranteed 5x5 open central courtyard around (poi.x, poi.y) for boss/relic placement
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setChunkCellIfInside(chunk, poi.x + dx, poi.y + dy, {
          char: Math.abs(dx + dy) % 3 === 0 ? '·' : ' ',
          color: PALETTE.ruinFloor[1],
          bg: PALETTE.cellBg.ruinFloor,
          kind: 'ruin_floor',
          solid: false,
        });
      }
    }
  }

  private createCityWallCell(
    col: number,
    row: number,
    rng: () => number,
    theme: 'iron' | 'marble',
    style: 'intact' | 'ruin' = 'intact'
  ): Cell {
    const pal = theme === 'iron' ? PALETTE.ironWall : PALETTE.marbleWall;
    const bg = theme === 'iron' ? PALETTE.cellBg.ironWall : PALETTE.cellBg.marbleWall;
    return {
      char: style === 'ruin' ? 'r' : '#',
      color: pal[Math.abs(col + row + Math.floor(rng() * 4)) % pal.length],
      bg,
      kind: 'wall',
      solid: true,
    };
  }

  private placeFurnaceInChunk(chunk: WorldChunk, col: number, row: number, lit: boolean): void {
    const lx = col - chunk.originX;
    const ly = row - chunk.originY;
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) return;

    chunk.cells[ly * CHUNK_SIZE + lx] = {
      char: 'Ω',
      color: lit ? PALETTE.furnace[0] : PALETTE.furnace[3],
      bg: lit ? PALETTE.cellBg.furnace : PALETTE.cellBg.ironWall,
      kind: 'furnace',
      solid: true,
      altChar: lit ? '▲' : 'Ω',
      altColor: lit ? PALETTE.furnace[1] : PALETTE.furnace[3],
      animPhase: posMod(col * 5 + row * 3, 10) / 10,
      animSpeed: lit ? 3.2 : 0,
    };

    if (lit) {
      chunk.lights.push({
        x: col + 0.5,
        y: row + 0.5,
        radius: 13,
        color: 'rgba(255, 92, 34, 0.22)',
        intensity: 1.0,
        flicker: true,
      });
    }
  }

  private placeAlchLanternInChunk(chunk: WorldChunk, col: number, row: number): void {
    const lx = col - chunk.originX;
    const ly = row - chunk.originY;
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) return;

    chunk.cells[ly * CHUNK_SIZE + lx] = {
      char: '*',
      color: PALETTE.alchLantern[0],
      bg: PALETTE.cellBg.alchLantern,
      kind: 'alch_lantern',
      solid: true,
      altChar: 'o',
      altColor: PALETTE.alchLantern[1],
      animPhase: posMod(col * 7 + row * 11, 10) / 10,
      animSpeed: 2.6,
    };

    chunk.lights.push({
      x: col + 0.5,
      y: row + 0.5,
      radius: 11,
      color: 'rgba(82, 238, 168, 0.19)',
      intensity: 0.92,
      flicker: true,
    });
  }

  private stampKaelVarrCity(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const rx = 25;
    const ry = 24;
    const wallX = 21;
    const wallY = 20;

    // 1. Surrounding volcanic crag ring & smoldering lava fissures outside iron ramparts
    for (let wy = cy - ry; wy <= cy + ry; wy++) {
      for (let wx = cx - rx; wx <= cx + rx; wx++) {
        const dx = Math.abs(wx - cx);
        const dy = Math.abs(wy - cy);
        const onCardinalRoad = dx <= 2 || dy <= 2;

        if (dx > wallX || dy > wallY) {
          if (onCardinalRoad) {
            this.setChunkCellIfInside(chunk, wx, wy, {
              char: rng() < 0.25 ? '·' : ' ',
              color: PALETTE.basalt[0],
              bg: PALETTE.cellBg.basalt,
              kind: 'basalt',
              solid: false,
            });
          } else {
            const h = hashCoords(wx, wy, this.numericSeed ^ 0x4411);
            if (h < 0.14) {
              this.setChunkCellIfInside(chunk, wx, wy, {
                char: '≈',
                color: PALETTE.lava[Math.floor(h * 30) % 4],
                bg: PALETTE.cellBg.lava,
                kind: 'lava',
                solid: false,
              });
            } else if (h < 0.42) {
              this.setChunkCellIfInside(chunk, wx, wy, {
                char: h < 0.28 ? '▲' : '▓',
                color: PALETTE.basaltWall[Math.floor(h * 20) % 3],
                bg: PALETTE.cellBg.quarryRock,
                kind: 'quarry_rock',
                solid: true,
              });
            } else {
              this.setChunkCellIfInside(chunk, wx, wy, {
                char: h > 0.88 ? '*' : '·',
                color: h > 0.88 ? PALETTE.ashEmber[0] : PALETTE.basalt[1],
                bg: PALETTE.cellBg.basalt,
                kind: h > 0.88 ? 'ember' : 'basalt',
                solid: false,
              });
            }
          }
          continue;
        }

        // 2. Massive iron perimeter ramparts with 5-cell-wide gates on all 4 cardinal axes
        const onPerimeter = dx === wallX || dy === wallY;
        const isGate = (dy === wallY && dx <= 2) || (dx === wallX && dy <= 2);
        if (onPerimeter && !isGate) {
          this.setChunkCellIfInside(chunk, wx, wy, this.createCityWallCell(wx, wy, rng, 'iron', 'intact'));
          continue;
        }

        // 3. Industrial basalt streets & glowing drifting embers
        const isEmber = !onCardinalRoad && rng() < 0.045;
        this.setChunkCellIfInside(chunk, wx, wy, {
          char: isEmber ? (rng() < 0.5 ? '*' : '✦') : rng() < 0.2 ? '·' : ' ',
          color: isEmber ? PALETTE.ashEmber[Math.floor(rng() * 3) % 3] : PALETTE.basalt[Math.floor(rng() * 4) % 4],
          bg: PALETTE.cellBg.basalt,
          kind: isEmber ? 'ember' : 'basalt',
          solid: false,
          altChar: isEmber ? '·' : undefined,
          altColor: isEmber ? PALETTE.ashEmber[1] : undefined,
          animPhase: isEmber ? rng() : undefined,
          animSpeed: isEmber ? 1.8 : 0,
        });
      }
    }

    // 4. Four industrial foundry halls in quadrants (all with open doorways & stealth alcoves)
    const halls = [
      { ox: cx - 13, oy: cy - 12 },
      { ox: cx + 13, oy: cy - 12 },
      { ox: cx - 13, oy: cy + 12 },
      { ox: cx + 13, oy: cy + 12 },
    ];
    for (const hall of halls) {
      for (let wy = hall.oy - 4; wy <= hall.oy + 4; wy++) {
        for (let wx = hall.ox - 5; wx <= hall.ox + 5; wx++) {
          const isEdge =
            wx === hall.ox - 5 || wx === hall.ox + 5 || wy === hall.oy - 4 || wy === hall.oy + 4;
          const isDoor =
            (Math.abs(wx - hall.ox) <= 1 && (wy === hall.oy - 4 || wy === hall.oy + 4)) ||
            (Math.abs(wy - hall.oy) <= 1 && (wx === hall.ox - 5 || wx === hall.ox + 5));
          if (isEdge && !isDoor) {
            this.setChunkCellIfInside(
              chunk,
              wx,
              wy,
              this.createCityWallCell(wx, wy, rng, 'iron', rng() < 0.3 ? 'ruin' : 'intact')
            );
          }
        }
      }
      // Smoldering & cold furnaces inside each foundry hall
      this.placeFurnaceInChunk(chunk, hall.ox - 2, hall.oy - 1, true);
      this.placeFurnaceInChunk(chunk, hall.ox + 2, hall.oy + 1, false);
      // Burnt ash-shrub cover for stealth near outer corners
      this.setChunkCellIfInside(chunk, hall.ox, hall.oy + 6, {
        char: '♣\uFE0E',
        color: PALETTE.bush[2],
        bg: PALETTE.cellBg.basalt,
        kind: 'bush',
        solid: false,
      });
    }

    // 5. Central Iron Foundry Arena furnaces + glowing avenue braziers
    for (const sx of [-6, 6]) {
      for (const sy of [-5, 5]) {
        this.placeFurnaceInChunk(chunk, cx + sx, cy + sy, true);
      }
    }
    this.placeFurnaceInChunk(chunk, cx - 3, cy + wallY - 2, true);
    this.placeFurnaceInChunk(chunk, cx + 3, cy + wallY - 2, true);
  }

  private stampSiltmoorCity(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const rx = 25;
    const ry = 24;

    // 1. Dark bog water basin (shallow wading depth so player can traverse/wade everywhere without softlock)
    for (let wy = cy - ry; wy <= cy + ry; wy++) {
      for (let wx = cx - rx; wx <= cx + rx; wx++) {
        const h = hashCoords(wx, wy, this.numericSeed ^ 0x6283);
        this.setChunkCellIfInside(chunk, wx, wy, {
          char: h < 0.2 ? '≈' : h < 0.55 ? '~' : '░',
          color: PALETTE.marshWater[h < 0.3 ? 2 : h < 0.7 ? 0 : 1],
          bg: PALETTE.cellBg.marshWater,
          kind: 'marsh_water',
          solid: false,
          altChar: h < 0.5 ? '~' : '∿',
          animPhase: ((wx * 0.13 + wy * 0.09) % 1 + 1) % 1,
          animSpeed: 0.7,
        });
      }
    }

    // 2. Main wooden cross-piers reaching all 4 entrances + outer harbor ring walkways
    this.carveWoodenPierInChunk(chunk, cx, cy - ry, cx, cy + ry + 1);
    this.carveWoodenPierInChunk(chunk, cx - rx, cy, cx + rx, cy);
    this.carveWoodenPierInChunk(chunk, cx - 15, cy - 14, cx + 15, cy - 14);
    this.carveWoodenPierInChunk(chunk, cx - 15, cy + 14, cx + 15, cy + 14);
    this.carveWoodenPierInChunk(chunk, cx - 15, cy - 14, cx - 15, cy + 14);
    this.carveWoodenPierInChunk(chunk, cx + 15, cy - 14, cx + 15, cy + 14);

    // 3. Central stilt harbor platform (13x11) for the Mire Alchemist miniboss
    for (let wy = cy - 5; wy <= cy + 5; wy++) {
      for (let wx = cx - 6; wx <= cx + 6; wx++) {
        this.setChunkCellIfInside(chunk, wx, wy, {
          char: (wx + wy) % 2 === 0 ? '═' : '-',
          color: PALETTE.bridge[(wx + wy) & 1 ? 0 : 2],
          bg: PALETTE.cellBg.bridge,
          kind: 'bridge',
          solid: false,
        });
      }
    }

    // 4. Six ruined stilt warehouses & trading docks (with 2-sided doors for free passage & stealth)
    const docks = [
      { ox: cx - 15, oy: cy - 8 },
      { ox: cx + 15, oy: cy - 8 },
      { ox: cx - 15, oy: cy + 8 },
      { ox: cx + 15, oy: cy + 8 },
      { ox: cx - 8, oy: cy - 14 },
      { ox: cx + 8, oy: cy + 14 },
    ];
    for (const d of docks) {
      for (let wy = d.oy - 3; wy <= d.oy + 3; wy++) {
        for (let wx = d.ox - 4; wx <= d.ox + 4; wx++) {
          const isEdge = wx === d.ox - 4 || wx === d.ox + 4 || wy === d.oy - 3 || wy === d.oy + 3;
          const isDoor =
            (Math.abs(wx - d.ox) <= 1 && (wy === d.oy - 3 || wy === d.oy + 3)) ||
            (Math.abs(wy - d.oy) <= 1 && (wx === d.ox - 4 || wx === d.ox + 4));
          if (isEdge && !isDoor) {
            this.setChunkCellIfInside(chunk, wx, wy, {
              char: 'r',
              color: PALETTE.bridge[rng() < 0.5 ? 1 : 3],
              bg: PALETTE.cellBg.woodWall,
              kind: 'wall',
              solid: true,
            });
          } else {
            this.setChunkCellIfInside(chunk, wx, wy, {
              char: (wx + wy) % 2 === 0 ? '-' : '=',
              color: PALETTE.bridge[2],
              bg: PALETTE.cellBg.bridge,
              kind: 'bridge',
              solid: false,
            });
          }
        }
      }
    }

    // 5. Eerie toxic-green alchemical lanterns & marsh-reed stealth cover bushes
    const lanterns = [
      { x: cx - 5, y: cy - 4 },
      { x: cx + 5, y: cy - 4 },
      { x: cx - 5, y: cy + 4 },
      { x: cx + 5, y: cy + 4 },
      { x: cx - 14, y: cy - 13 },
      { x: cx + 14, y: cy - 13 },
      { x: cx - 14, y: cy + 13 },
      { x: cx + 14, y: cy + 13 },
    ];
    for (const l of lanterns) {
      this.placeAlchLanternInChunk(chunk, l.x, l.y);
    }

    for (const reed of [
      { x: cx - 8, y: cy - 3 },
      { x: cx + 8, y: cy + 3 },
      { x: cx - 3, y: cy + 8 },
      { x: cx + 3, y: cy - 8 },
    ]) {
      this.setChunkCellIfInside(chunk, reed.x, reed.y, {
        char: '♣\uFE0E',
        color: PALETTE.bush[1],
        bg: PALETTE.cellBg.marshGround,
        kind: 'bush',
        solid: false,
      });
    }
  }

  private stampAethelgardCity(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const rx = 25;
    const ry = 24;
    const wallX = 22;
    const wallY = 21;

    // 1. Pale marble plazas, cloister walks & white stone colonnade perimeter
    for (let wy = cy - ry; wy <= cy + ry; wy++) {
      for (let wx = cx - rx; wx <= cx + rx; wx++) {
        const dx = Math.abs(wx - cx);
        const dy = Math.abs(wy - cy);
        const onBoulevard = dx <= 3 || dy <= 3;

        if (dx > wallX || dy > wallY) {
          this.setChunkCellIfInside(chunk, wx, wy, {
            char: onBoulevard ? (rng() < 0.28 ? '░' : '·') : rng() < 0.2 ? '·' : ' ',
            color: onBoulevard ? PALETTE.marbleFloor[2] : PALETTE.snowGround[1],
            bg: onBoulevard ? PALETTE.cellBg.marbleFloor : PALETTE.cellBg.snowGround,
            kind: onBoulevard ? 'ruin_floor' : 'snow_ground',
            solid: false,
          });
          continue;
        }

        const onOuterWall = dx === wallX || dy === wallY;
        const isGate = (dy === wallY && dx <= 3) || (dx === wallX && dy <= 3);
        if (onOuterWall && !isGate) {
          this.setChunkCellIfInside(chunk, wx, wy, this.createCityWallCell(wx, wy, rng, 'marble', 'intact'));
          continue;
        }

        const tileGlyph = (wx + wy) % 4 === 0 ? '░' : (wx + wy) % 2 === 0 ? '·' : ' ';
        this.setChunkCellIfInside(chunk, wx, wy, {
          char: tileGlyph,
          color: PALETTE.marbleFloor[Math.abs(wx + wy) % PALETTE.marbleFloor.length],
          bg: PALETTE.cellBg.marbleFloor,
          kind: 'ruin_floor',
          solid: false,
        });
      }
    }

    // 2. Four collapsed corner archive towers with open archways & overgrown frost-hedges for stealth
    const towers = [
      { ox: cx - 14, oy: cy - 13 },
      { ox: cx + 14, oy: cy - 13 },
      { ox: cx - 14, oy: cy + 13 },
      { ox: cx + 14, oy: cy + 13 },
    ];
    for (const t of towers) {
      for (let wy = t.oy - 4; wy <= t.oy + 4; wy++) {
        for (let wx = t.ox - 4; wx <= t.ox + 4; wx++) {
          const isEdge = wx === t.ox - 4 || wx === t.ox + 4 || wy === t.oy - 4 || wy === t.oy + 4;
          const isDoor = Math.abs(wx - t.ox) <= 1 || Math.abs(wy - t.oy) <= 1;
          if (isEdge && !isDoor) {
            this.setChunkCellIfInside(
              chunk,
              wx,
              wy,
              this.createCityWallCell(wx, wy, rng, 'marble', rng() < 0.35 ? 'ruin' : 'intact')
            );
          }
        }
      }
      this.setChunkCellIfInside(chunk, t.ox, t.oy + 5, {
        char: '↟',
        color: PALETTE.frostTree[1],
        bg: PALETTE.cellBg.marbleFloor,
        kind: 'bush',
        solid: false,
      });
    }

    // 3. Statues of forgotten kings (&, I, †) lining the grand pale boulevards
    const statueGlyphs = ['&', 'I', '†'] as const;
    const statueOffsets = [
      { dx: -5, dy: -10 },
      { dx: 5, dy: -10 },
      { dx: -5, dy: 10 },
      { dx: 5, dy: 10 },
      { dx: -10, dy: -5 },
      { dx: 10, dy: -5 },
      { dx: -10, dy: 5 },
      { dx: 10, dy: 5 },
    ];
    for (let i = 0; i < statueOffsets.length; i++) {
      const s = statueOffsets[i];
      this.setChunkCellIfInside(chunk, cx + s.dx, cy + s.dy, {
        char: statueGlyphs[i % statueGlyphs.length],
        color: PALETTE.statue[i % PALETTE.statue.length],
        bg: PALETTE.cellBg.marbleFloor,
        kind: 'statue',
        solid: true,
      });
    }

    // 4. Golden sanctuary candle-altars contrasting warmly against cold pale marble
    for (const ax of [-7, 7]) {
      for (const ay of [-6, 6]) {
        this.placeBrazierInChunk(chunk, cx + ax, cy + ay, 12);
      }
    }
    this.placeBrazierInChunk(chunk, cx - 4, cy + wallY - 2, 11);
    this.placeBrazierInChunk(chunk, cx + 4, cy + wallY - 2, 11);
  }

  private stampCathedralPoi(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const naveW = 9;
    const naveH = 12;
    const tranW = 14;
    const tranH = 5;

    for (let wy = cy - naveH; wy <= cy + naveH; wy++) {
      for (let wx = cx - tranW; wx <= cx + tranW; wx++) {
        const inNave = Math.abs(wx - cx) <= naveW && Math.abs(wy - cy) <= naveH;
        const inTran = Math.abs(wx - cx) <= tranW && Math.abs(wy - (cy - 1)) <= tranH;
        if (!inNave && !inTran) continue;

        const onNaveEdge = inNave && (Math.abs(wx - cx) === naveW || Math.abs(wy - cy) === naveH);
        const onTranEdge = inTran && (Math.abs(wx - cx) === tranW || Math.abs(wy - (cy - 1)) === tranH);
        const strictInsideNave = Math.abs(wx - cx) < naveW && Math.abs(wy - cy) < naveH;
        const strictInsideTran = Math.abs(wx - cx) < tranW && Math.abs(wy - (cy - 1)) < tranH;
        const isEdge = (onNaveEdge && !strictInsideTran) || (onTranEdge && !strictInsideNave);
        const isPortal = wy === cy + naveH && Math.abs(wx - cx) <= 2;

        if (isEdge && !isPortal) {
          this.setChunkCellIfInside(chunk, wx, wy, this.createWallCell(wx, wy, rng, true, 'intact'));
        } else {
          this.setChunkCellIfInside(chunk, wx, wy, {
            char: rng() < 0.22 ? (rng() < 0.5 ? '‧' : '·') : ' ',
            color: PALETTE.ruinFloor[Math.floor(rng() * 4) % 4],
            bg: PALETTE.cellBg.ruinFloor,
            kind: 'ruin_floor',
            solid: false,
          });
        }
      }
    }

    for (const dy of [-5, 4]) {
      this.stampPillarInChunk(chunk, cx - 5, cy + dy, 1, 1, rng);
      this.stampPillarInChunk(chunk, cx + 5, cy + dy, 1, 1, rng);
    }
    this.placeBrazierInChunk(chunk, cx - 4, cy - naveH + 3, 11);
    this.placeBrazierInChunk(chunk, cx + 4, cy - naveH + 3, 11);
    this.placeBrazierInChunk(chunk, cx - 4, cy + naveH - 2, 10);
    this.placeBrazierInChunk(chunk, cx + 4, cy + naveH - 2, 10);
  }

  private stampFortressPoi(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const rx = 16;
    const ry = 13;
    const left = cx - rx;
    const right = cx + rx;
    const top = cy - ry;
    const bottom = cy + ry;

    for (let wy = top; wy <= bottom; wy++) {
      for (let wx = left; wx <= right; wx++) {
        const isWall = wx === left || wx === right || wy === top || wy === bottom;
        const isSouthGate = wy === bottom && Math.abs(wx - cx) <= 3;
        const isSideBreach = Math.abs(wy - cy) <= 2 && (wx === left || wx === right);
        if (isWall && !isSouthGate && !isSideBreach) {
          this.setChunkCellIfInside(chunk, wx, wy, this.createWallCell(wx, wy, rng, false, 'intact'));
        } else {
          this.setChunkCellIfInside(chunk, wx, wy, {
            char: rng() < 0.22 ? '·' : ' ',
            color: PALETTE.ruinFloor[Math.floor(rng() * 4) % 4],
            bg: PALETTE.cellBg.ruinFloor,
            kind: 'ruin_floor',
            solid: false,
          });
        }
      }
    }

    this.stampPillarInChunk(chunk, cx - 8, cy - 5, 1, 1, rng);
    this.stampPillarInChunk(chunk, cx + 8, cy - 5, 1, 1, rng);
    this.stampPillarInChunk(chunk, cx - 8, cy + 5, 1, 1, rng);
    this.stampPillarInChunk(chunk, cx + 8, cy + 5, 1, 1, rng);
    this.placeBrazierInChunk(chunk, cx - 5, bottom - 2, 11);
    this.placeBrazierInChunk(chunk, cx + 5, bottom - 2, 11);
  }

  private stampGraveyardPoi(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const rx = 14;
    const ry = 11;
    const left = cx - rx;
    const right = cx + rx;
    const top = cy - ry;
    const bottom = cy + ry;

    for (let wy = top; wy <= bottom; wy++) {
      for (let wx = left; wx <= right; wx++) {
        const isWall = wx === left || wx === right || wy === top || wy === bottom;
        const isGate = Math.abs(wx - cx) <= 2 && (wy === bottom || wy === top);
        if (isWall && !isGate) {
          this.setChunkCellIfInside(chunk, wx, wy, this.createWallCell(wx, wy, rng, false, 'ruin'));
        } else {
          this.setChunkCellIfInside(chunk, wx, wy, {
            char: rng() < 0.16 ? GRASS_CHARS[Math.floor(rng() * GRASS_CHARS.length) % GRASS_CHARS.length] : ' ',
            color: PALETTE.moorGrass[2],
            bg: PALETTE.cellBg.marshGround,
            kind: 'grass',
            solid: false,
          });
        }
      }
    }

    for (let wy = top + 3; wy <= bottom - 3; wy += 3) {
      for (let wx = left + 3; wx <= right - 3; wx += 4) {
        if (Math.abs(wx - cx) <= 3 && Math.abs(wy - cy) <= 3) continue;
        if (rng() < 0.25) continue;
        this.setChunkCellIfInside(chunk, wx, wy, {
          char: TOMBSTONE_CHARS[Math.floor(rng() * 3) % 3],
          color: PALETTE.tombstone[Math.floor(rng() * 4) % 4],
          bg: PALETTE.cellBg.marshGround,
          kind: 'tombstone',
          solid: true,
        });
      }
    }

    this.placeBrazierInChunk(chunk, cx - 4, bottom - 2, 9);
    this.placeBrazierInChunk(chunk, cx + 4, bottom - 2, 9);
  }

  private stampVillagePoi(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const rx = 15;
    const ry = 12;

    for (let wy = cy - ry; wy <= cy + ry; wy++) {
      for (let wx = cx - rx; wx <= cx + rx; wx++) {
        const d = Math.hypot((wx - cx) / rx, (wy - cy) / ry);
        if (d > 1.0) continue;
        const isDeep = d > 0.35 && rng() < 0.55;
        this.setChunkCellIfInside(chunk, wx, wy, {
          char: WATER_CHARS[Math.floor(rng() * 3) % 3],
          color: PALETTE.marshWater[isDeep ? 2 : 1],
          bg: PALETTE.cellBg.marshWater,
          kind: 'marsh_water',
          solid: isDeep,
        });
      }
    }

    // Wooden pier crossways connecting ruined stilt huts
    this.carveWoodenPierInChunk(chunk, cx, cy + ry + 1, cx, cy - 6);
    this.carveWoodenPierInChunk(chunk, cx - 10, cy, cx + 10, cy);

    const huts = [
      { x: cx - 8, y: cy - 5 },
      { x: cx + 8, y: cy - 5 },
      { x: cx - 8, y: cy + 5 },
      { x: cx + 8, y: cy + 5 },
    ];
    for (const h of huts) {
      for (let wy = h.y - 2; wy <= h.y + 2; wy++) {
        for (let wx = h.x - 3; wx <= h.x + 3; wx++) {
          const isEdge = wy === h.y - 2 || wy === h.y + 2 || wx === h.x - 3 || wx === h.x + 3;
          const isDoor = wy === h.y + 2 && Math.abs(wx - h.x) <= 1;
          this.setChunkCellIfInside(chunk, wx, wy, {
            char: isEdge && !isDoor ? 'r' : '═',
            color: isEdge && !isDoor ? PALETTE.bridge[0] : PALETTE.bridge[3],
            bg: isEdge && !isDoor ? PALETTE.cellBg.woodWall : PALETTE.cellBg.bridge,
            kind: isEdge && !isDoor ? 'wall' : 'bridge',
            solid: isEdge && !isDoor,
          });
        }
      }
    }

    this.placeBrazierInChunk(chunk, cx - 3, cy - 1, 9);
    this.placeWispInChunk(chunk, cx + 5, cy - 8, rng);
    this.placeWispInChunk(chunk, cx - 5, cy + 8, rng);
  }

  private stampWatchtowerPoi(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const rOuter = 9;
    const rInner = 7.6;
    for (let wy = cy - rOuter - 1; wy <= cy + rOuter + 1; wy++) {
      for (let wx = cx - rOuter - 1; wx <= cx + rOuter + 1; wx++) {
        const d = Math.hypot(wx - cx, wy - cy);
        if (d > rOuter + 0.5) continue;
        const isDoor = Math.abs(wx - cx) <= 2 && wy >= cy + rInner - 0.5;
        if (d >= rInner && d <= rOuter + 0.3 && !isDoor) {
          this.setChunkCellIfInside(chunk, wx, wy, this.createWallCell(wx, wy, rng, true, 'intact'));
        } else {
          this.setChunkCellIfInside(chunk, wx, wy, {
            char: rng() < 0.2 ? '·' : ' ',
            color: PALETTE.ruinFloor[Math.floor(rng() * 4) % 4],
            bg: PALETTE.cellBg.ruinFloor,
            kind: 'ruin_floor',
            solid: false,
          });
        }
      }
    }
    this.placeBrazierInChunk(chunk, cx - 4, cy + 4, 11);
    this.placeBrazierInChunk(chunk, cx + 4, cy + 4, 11);
  }

  private stampAbbeyCryptPoi(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const left = cx - 12;
    const right = cx + 12;
    const top = cy - 10;
    const bottom = cy + 10;

    for (let wy = top; wy <= bottom; wy++) {
      for (let wx = left; wx <= right; wx++) {
        const isWall = wx === left || wx === right || wy === top || wy === bottom;
        const isGate = wy === bottom && Math.abs(wx - cx) <= 2;
        if (isWall && !isGate) {
          this.setChunkCellIfInside(chunk, wx, wy, this.createWallCell(wx, wy, rng, true, 'intact'));
        } else {
          this.setChunkCellIfInside(chunk, wx, wy, {
            char: rng() < 0.2 ? '·' : ' ',
            color: PALETTE.cryptFloor[Math.floor(rng() * 3) % 3],
            bg: PALETTE.cellBg.cryptFloor,
            kind: 'crypt_floor',
            solid: false,
          });
        }
      }
    }
    for (const dx of [-6, 6]) {
      for (const dy of [-5, 5]) {
        this.stampPillarInChunk(chunk, cx + dx, cy + dy, 1, 1, rng);
      }
    }
    this.placeBrazierInChunk(chunk, cx - 4, top + 3, 10);
    this.placeBrazierInChunk(chunk, cx + 4, top + 3, 10);
  }

  private stampCavePoi(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const rx = 12;
    const ry = 9;
    for (let wy = cy - ry; wy <= cy + ry; wy++) {
      for (let wx = cx - rx; wx <= cx + rx; wx++) {
        const inMaw = Math.abs(wx - cx) <= 3 && wy >= cy - 5 && wy <= cy + 2;
        const d = Math.hypot((wx - cx) / rx, (wy - cy) / ry);
        if (inMaw) {
          const isDeep = wy <= cy - 3;
          this.setChunkCellIfInside(chunk, wx, wy, {
            char: isDeep ? '░' : '·',
            color: PALETTE.passage[isDeep ? 1 : 2],
            bg: PALETTE.bg,
            kind: 'passage',
            solid: isDeep,
          });
        } else if (d <= 1.0 && wy <= cy + 2 && Math.abs(wx - cx) >= 4) {
          this.setChunkCellIfInside(chunk, wx, wy, {
            char: ROCK_CHARS[Math.floor(rng() * 4) % 4],
            color: PALETTE.quarryRock[Math.floor(rng() * 4) % 4],
            bg: PALETTE.cellBg.quarryRock,
            kind: 'quarry_rock',
            solid: true,
          });
        } else {
          this.setChunkCellIfInside(chunk, wx, wy, {
            char: rng() < 0.18 ? '·' : ' ',
            color: PALETTE.quarryGround[Math.floor(rng() * 4) % 4],
            bg: PALETTE.cellBg.quarryGround,
            kind: 'quarry_ground',
            solid: false,
          });
        }
      }
    }
    this.placeBrazierInChunk(chunk, cx - 5, cy + 4, 10);
    this.placeBrazierInChunk(chunk, cx + 5, cy + 4, 10);
  }

  private carveWoodenPierInChunk(chunk: WorldChunk, x0: number, y0: number, x1: number, y1: number): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = Math.round(x0 + (x1 - x0) * t);
      const cy = Math.round(y0 + (y1 - y0) * t);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          this.setChunkCellIfInside(chunk, cx + dx, cy + dy, {
            char: (dx + dy) % 2 === 0 ? '═' : '≡',
            color: PALETTE.bridge[0],
            bg: PALETTE.cellBg.bridge,
            kind: 'bridge',
            solid: false,
          });
        }
      }
    }
  }

  private findRoadPointInChunk(chunk: WorldChunk, fromX: number, fromY: number, maxDist = Infinity): Vec2 {
    let best: Vec2 = { x: fromX, y: Math.min(chunk.originY + CHUNK_SIZE - 4, fromY + 12) };
    let bestDist = Infinity;

    for (let ly = 2; ly < CHUNK_SIZE - 2; ly += 2) {
      for (let lx = 2; lx < CHUNK_SIZE - 2; lx += 2) {
        if (chunk.roadMask[ly * CHUNK_SIZE + lx] === 1) {
          const wx = chunk.originX + lx;
          const wy = chunk.originY + ly;
          const d = Math.hypot(wx - fromX, wy - fromY);
          if (d <= maxDist && d < bestDist) {
            bestDist = d;
            best = { x: wx, y: wy };
          }
        }
      }
    }
    return best;
  }

  private findNearestRoadCellInChunk(
    chunk: WorldChunk,
    fromX: number,
    fromY: number,
    maxDist: number
  ): Vec2 | null {
    let best: Vec2 | null = null;
    let bestDist = maxDist;

    for (let ly = 2; ly < CHUNK_SIZE - 2; ly += 2) {
      for (let lx = 2; lx < CHUNK_SIZE - 2; lx += 2) {
        if (chunk.roadMask[ly * CHUNK_SIZE + lx] === 1) {
          const wx = chunk.originX + lx;
          const wy = chunk.originY + ly;
          const d = Math.hypot(wx - fromX, wy - fromY);
          if (d <= bestDist) {
            bestDist = d;
            best = { x: wx, y: wy };
          }
        }
      }
    }
    return best;
  }

  private carveChunkPathSegment(
    chunk: WorldChunk,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    halfWidth: number,
    rng: () => number
  ): void {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    if (dist < 0.5) return;
    const steps = Math.max(1, Math.ceil(dist * 1.5));
    const rCeil = Math.ceil(halfWidth);
    const perpX = -(y1 - y0) / dist;
    const perpY = (x1 - x0) / dist;
    const bend =
      (hashCoords(Math.round(x0), Math.round(y0), this.numericSeed ^ 0x4545) - 0.5) *
      Math.min(7, dist * 0.25);

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const arc = Math.sin(t * Math.PI) * bend;
      const px = x0 + (x1 - x0) * t + perpX * arc;
      const py = y0 + (y1 - y0) * t + perpY * arc;

      for (let dy = -rCeil; dy <= rCeil; dy++) {
        for (let dx = -rCeil; dx <= rCeil; dx++) {
          const wx = Math.round(px + dx);
          const wy = Math.round(py + dy);
          const existing = this.getChunkCellSafe(chunk, wx, wy);
          if (
            !existing ||
            existing.kind === 'wall' ||
            existing.kind === 'brazier' ||
            existing.kind === 'monolith' ||
            existing.kind === 'menhir' ||
            existing.kind === 'quest_board' ||
            existing.kind === 'signpost' ||
            existing.kind === 'passage'
          ) {
            continue;
          }

          const d = Math.hypot(wx - px, wy - py);
          if (d > halfWidth + (rng() - 0.5) * 0.35) continue;

          const lx = wx - chunk.originX;
          const ly = wy - chunk.originY;
          chunk.roadMask[ly * CHUNK_SIZE + lx] = 1;

          if (
            existing.kind === 'river_water' ||
            existing.kind === 'marsh_water' ||
            existing.kind === 'ford' ||
            existing.kind === 'lava' ||
            existing.kind === 'bridge'
          ) {
            chunk.cells[ly * CHUNK_SIZE + lx] = {
              char: (wx + wy) % 2 === 0 ? '═' : '≡',
              color: PALETTE.bridge[Math.floor(rng() * 3) % 3],
              bg: PALETTE.cellBg.bridge,
              kind: 'bridge',
              solid: false,
            };
          } else {
            chunk.cells[ly * CHUNK_SIZE + lx] = {
              char:
                rng() < 0.18
                  ? GRASS_CHARS[Math.floor(rng() * GRASS_CHARS.length) % GRASS_CHARS.length]
                  : ' ',
              color: PALETTE.path[Math.floor(rng() * 4) % 4],
              bg: PALETTE.cellBg.path,
              kind: 'path',
              solid: false,
            };
          }
        }
      }
    }
  }

  // =========================================================================
  // CHUNK BIOME PROP POPULATOR (COMPACT GROVES, LANDMARKS, STRUCTURED RUINS)
  // =========================================================================
  private isAreaClearInChunk(chunk: WorldChunk, cx: number, cy: number, rx: number, ry: number): boolean {
    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        const wx = cx + dx;
        const wy = cy + dy;
        const lx = wx - chunk.originX;
        const ly = wy - chunk.originY;
        if (lx < 2 || lx >= CHUNK_SIZE - 2 || ly < 2 || ly >= CHUNK_SIZE - 2) return false;
        const idx = ly * CHUNK_SIZE + lx;
        if (chunk.poiMask[idx] === 1 || chunk.roadMask[idx] === 1) return false;
        const cell = chunk.cells[idx];
        if (
          cell.solid ||
          cell.kind === 'river_water' ||
          cell.kind === 'marsh_water' ||
          cell.kind === 'ford' ||
          cell.kind === 'bridge' ||
          cell.kind === 'lava' ||
          cell.kind === 'wall' ||
          cell.kind === 'brazier' ||
          cell.kind === 'monolith' ||
          cell.kind === 'menhir'
        ) {
          return false;
        }
      }
    }
    return true;
  }

  private markPoiMaskRect(chunk: WorldChunk, cx: number, cy: number, rx: number, ry: number): void {
    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        const lx = cx + dx - chunk.originX;
        const ly = cy + dy - chunk.originY;
        if (lx >= 0 && lx < CHUNK_SIZE && ly >= 0 && ly < CHUNK_SIZE) {
          chunk.poiMask[ly * CHUNK_SIZE + lx] = 1;
        }
      }
    }
  }

  private populateChunkFeatures(chunk: WorldChunk, rng: () => number): void {
    // 1. Place structured ruins, grove landmarks & crossroads markers BEFORE grove trees
    if (!chunk.poi) {
      // a) Structured Ruin (Guardhouse Foundation, Courtyard with Broken Gate, or Stone Circle & Altar)
      const ruinRoll = rng();
      if (ruinRoll < 0.48) {
        const ruinVariant = Math.floor(rng() * 3);
        const rx = ruinVariant === 1 ? 8 : 6;
        const ry = ruinVariant === 1 ? 7 : 5;
        for (let attempt = 0; attempt < 16; attempt++) {
          const lx = 12 + Math.floor(rng() * (CHUNK_SIZE - 24));
          const ly = 12 + Math.floor(rng() * (CHUNK_SIZE - 24));
          const wx = chunk.originX + lx;
          const wy = chunk.originY + ly;
          if (Math.hypot(wx, wy) < 48) continue;
          const biome = chunk.biomes[ly * CHUNK_SIZE + lx];
          if (biome === 'volcanic' || biome === 'marsh') continue;
          const roadInfo = this.sampleRoadInfo(wx, wy);
          const grove = this.sampleGroveDensity(wx, wy, roadInfo.roadDelta);
          if (grove > 0.25) continue;
          if (!this.isAreaClearInChunk(chunk, wx, wy, rx, ry)) continue;

          if (ruinVariant === 0) {
            this.stampStructuredGuardhouseInChunk(chunk, wx, wy, rng);
          } else if (ruinVariant === 1) {
            this.stampStructuredCourtyardInChunk(chunk, wx, wy, rng);
          } else {
            this.stampStoneCircleAltarInChunk(chunk, wx, wy, rng);
          }
          break;
        }
      }

      // b) Grove-edge Campfire Glade
      if (rng() < 0.65) {
        for (let attempt = 0; attempt < 18; attempt++) {
          const lx = 9 + Math.floor(rng() * (CHUNK_SIZE - 18));
          const ly = 9 + Math.floor(rng() * (CHUNK_SIZE - 18));
          const wx = chunk.originX + lx;
          const wy = chunk.originY + ly;
          if (Math.hypot(wx, wy) < 44) continue;
          const biome = chunk.biomes[ly * CHUNK_SIZE + lx];
          if (biome !== 'moor_forest' && biome !== 'blood_forest' && biome !== 'frost') continue;
          const roadInfo = this.sampleRoadInfo(wx, wy);
          const grove = this.sampleGroveDensity(wx, wy, roadInfo.roadDelta);
          if (grove < 0.14 || grove > 0.36) continue;
          if (!this.isAreaClearInChunk(chunk, wx, wy, 4, 4)) continue;

          this.stampCampfireGladeInChunk(chunk, wx, wy, rng);
          break;
        }
      }

      // c) Deep-grove Runic Altar
      if (rng() < 0.48) {
        for (let attempt = 0; attempt < 18; attempt++) {
          const lx = 11 + Math.floor(rng() * (CHUNK_SIZE - 22));
          const ly = 11 + Math.floor(rng() * (CHUNK_SIZE - 22));
          const wx = chunk.originX + lx;
          const wy = chunk.originY + ly;
          if (Math.hypot(wx, wy) < 48) continue;
          const biome = chunk.biomes[ly * CHUNK_SIZE + lx];
          if (biome !== 'moor_forest' && biome !== 'ash' && biome !== 'blood_forest') continue;
          const roadInfo = this.sampleRoadInfo(wx, wy);
          const grove = this.sampleGroveDensity(wx, wy, roadInfo.roadDelta);
          if (biome === 'moor_forest' && grove < 0.34) continue;
          if (!this.isAreaClearInChunk(chunk, wx, wy, 6, 6)) continue;

          this.stampStoneCircleAltarInChunk(chunk, wx, wy, rng);
          break;
        }
      }
    }

    // d) Crossroads Signpost or Roadside Brazier
    this.stampCrossroadsLandmarkInChunk(chunk, rng);

    // 2. Compact Forest Groves in Popelavá louka (global 3x3 lattice, zero lone trees!)
    const minGx = floorDiv(chunk.originX - 9, 3);
    const maxGx = floorDiv(chunk.originX + CHUNK_SIZE + 9, 3);
    const minGy = floorDiv(chunk.originY - 9, 3);
    const maxGy = floorDiv(chunk.originY + CHUNK_SIZE + 9, 3);
    const gridW = maxGx - minGx + 1;
    const gridH = maxGy - minGy + 1;

    const slotWx = new Int32Array(gridW * gridH);
    const slotWy = new Int32Array(gridW * gridH);
    const slotGrove = new Float32Array(gridW * gridH);
    const slotRaw = new Uint8Array(gridW * gridH);

    for (let gy = minGy; gy <= maxGy; gy++) {
      const rIdx = gy - minGy;
      for (let gx = minGx; gx <= maxGx; gx++) {
        const cIdx = gx - minGx;
        const gIndex = rIdx * gridW + cIdx;
        const jx = Math.floor(hashInts(gx, gy, 1, this.numericSeed) * 3) - 1;
        const jy = Math.floor(hashInts(gx, gy, 2, this.numericSeed) * 3) - 1;
        const wx = gx * 3 + jx;
        const wy = gy * 3 + jy;
        slotWx[gIndex] = wx;
        slotWy[gIndex] = wy;

        if (Math.hypot(wx, wy) < 30) continue;
        if (this.getBiomeAt(wx, wy) !== 'moor_forest') continue;

        const tlx = wx - chunk.originX;
        const tly = wy + 1 - chunk.originY;
        if (tlx >= 0 && tlx < CHUNK_SIZE && tly >= 0 && tly < CHUNK_SIZE) {
          const tIdx = tly * CHUNK_SIZE + tlx;
          if (chunk.poiMask[tIdx] === 1 || chunk.roadMask[tIdx] === 1) continue;
        }

        const roadInfo = this.sampleRoadInfo(wx, wy);
        if (roadInfo.roadDelta <= 5.0) continue;

        const river = this.sampleRiverInfo(wx, wy);
        if (river.isRiver || river.isBank) continue;

        const gVal = this.sampleGroveDensity(wx, wy, roadInfo.roadDelta);
        slotGrove[gIndex] = gVal;
        if (gVal > 0.26) {
          slotRaw[gIndex] = 1;
        }
      }
    }

    for (let rIdx = 3; rIdx < gridH - 3; rIdx++) {
      for (let cIdx = 3; cIdx < gridW - 3; cIdx++) {
        const gIndex = rIdx * gridW + cIdx;
        if (slotRaw[gIndex] === 0) continue;

        const wx = slotWx[gIndex];
        const wy = slotWy[gIndex];
        if (
          wx < chunk.originX - 2 ||
          wx >= chunk.originX + CHUNK_SIZE + 2 ||
          wy < chunk.originY - 2 ||
          wy >= chunk.originY + CHUNK_SIZE + 2
        ) {
          continue;
        }

        // Require substantial grove cluster (>= 16 neighboring tree slots in 7x7 lattice window)
        let localCount = 0;
        for (let oy = -3; oy <= 3; oy++) {
          for (let ox = -3; ox <= 3; ox++) {
            if (slotRaw[(rIdx + oy) * gridW + (cIdx + ox)] === 1) {
              localCount++;
            }
          }
        }
        if (localCount < 16) continue;

        this.stampTreeInChunk(chunk, wx, wy, slotGrove[gIndex] > 0.42);
      }
    }

    // 3. Remaining non-meadow biome props (sparse, clean, no isolated boulders!)
    for (let ly = 4; ly < CHUNK_SIZE - 4; ly += 6) {
      for (let lx = 4; lx < CHUNK_SIZE - 4; lx += 6) {
        const jx = lx + Math.floor((rng() - 0.5) * 4);
        const jy = ly + Math.floor((rng() - 0.5) * 4);
        if (jx < 3 || jx >= CHUNK_SIZE - 3 || jy < 3 || jy >= CHUNK_SIZE - 3) continue;

        const idx = jy * CHUNK_SIZE + jx;
        if (chunk.poiMask[idx] === 1 || chunk.roadMask[idx] === 1) continue;

        const wx = chunk.originX + jx;
        const wy = chunk.originY + jy;
        if (Math.hypot(wx, wy) < 28) continue;

        const biome = chunk.biomes[idx];
        if (biome === 'moor_forest' || biome === 'quarry' || biome === 'volcanic') continue;

        let nearRoad = false;
        for (let rdy = -2; rdy <= 2 && !nearRoad; rdy++) {
          for (let rdx = -2; rdx <= 2; rdx++) {
            const rl = (jy + rdy) * CHUNK_SIZE + (jx + rdx);
            if (rl >= 0 && rl < chunk.roadMask.length && chunk.roadMask[rl] === 1) {
              nearRoad = true;
              break;
            }
          }
        }
        if (nearRoad) continue;

        const cell = chunk.cells[idx];
        if (
          cell.solid ||
          cell.kind === 'lava' ||
          cell.kind === 'marsh_water' ||
          cell.kind === 'river_water' ||
          cell.kind === 'ford' ||
          cell.kind === 'bridge'
        ) {
          continue;
        }

        const groveCluster = this.sampleRawGroveNoise(wx, wy);

        if (biome === 'marsh') {
          if (rng() < 0.16) {
            this.stampDeadTreeInChunk(chunk, wx, wy, rng);
          } else if (rng() < 0.08 && chunk.lights.length < 18) {
            this.placeWispInChunk(chunk, wx, wy, rng);
          }
        } else if (biome === 'ash') {
          if (rng() < 0.06) {
            this.stampMenhirCircleInChunk(chunk, wx, wy, rng);
          } else if (rng() < 0.11) {
            this.stampDeadTreeInChunk(chunk, wx, wy, rng);
          }
        } else if (biome === 'blood_forest') {
          if (groveCluster > 0.02 && rng() < 0.65) {
            this.stampBloodTreeInChunk(chunk, wx, wy);
          }
        } else if (biome === 'frost') {
          if (groveCluster > 0.1 && rng() < 0.55) {
            this.stampFrostTreeInChunk(chunk, wx, wy);
          } else if (rng() < 0.08) {
            this.stampIceCrystalInChunk(chunk, wx, wy, rng);
          }
        } else if (biome === 'bone_plain') {
          if (rng() < 0.09) {
            this.stampShatteredWagonInChunk(chunk, wx, wy, rng);
          } else if (rng() < 0.14) {
            this.stampBoneClusterInChunk(chunk, wx, wy, rng);
          }
        }
      }
    }
  }

  private stampCampfireGladeInChunk(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    this.markPoiMaskRect(chunk, cx, cy, 3, 3);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.hypot(dx, dy) > 2.5) continue;
        this.setChunkCellIfInside(chunk, cx + dx, cy + dy, {
          char: (dx + dy) % 3 === 0 ? '·' : ' ',
          color: PALETTE.path[1],
          bg: PALETTE.cellBg.path,
          kind: 'path',
          solid: false,
        });
      }
    }

    this.placeBrazierInChunk(chunk, cx, cy, 12);

    // Subtle timber log / stone seats around the campfire
    for (const seat of [
      { dx: -2, dy: 0, ch: '─' },
      { dx: 2, dy: 0, ch: '─' },
    ]) {
      this.setChunkCellIfInside(chunk, cx + seat.dx, cy + seat.dy, {
        char: seat.ch,
        color: PALETTE.wagonWood[0],
        bg: PALETTE.cellBg.path,
        kind: 'rubble',
        solid: false,
      });
    }

    const roadTarget = this.findNearestRoadCellInChunk(chunk, cx, cy, 26);
    if (roadTarget) {
      this.carveChunkPathSegment(chunk, cx, cy + 2, roadTarget.x, roadTarget.y, 1.05, rng);
    }
  }

  private stampStoneCircleAltarInChunk(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    this.markPoiMaskRect(chunk, cx, cy, 6, 6);

    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.hypot(dx, dy);
        if (d > 4.2) continue;
        this.setChunkCellIfInside(chunk, cx + dx, cy + dy, {
          char: d < 2.2 || (Math.abs(dx + dy) % 4 === 0 && rng() < 0.35) ? '·' : ' ',
          color: PALETTE.ruinFloor[1],
          bg: PALETTE.cellBg.ruinFloor,
          kind: 'ruin_floor',
          solid: false,
        });
      }
    }

    // Glowing runic altar monolith at center
    this.setChunkCellIfInside(chunk, cx, cy, {
      char: '╬',
      color: PALETTE.monolith[2],
      bg: PALETTE.cellBg.ruinFloor,
      kind: 'monolith',
      solid: true,
      altChar: '✦',
      altColor: PALETTE.wisp[1],
      animPhase: 0.3,
      animSpeed: 1.6,
    });
    chunk.lights.push({
      x: cx + 0.5,
      y: cy + 0.5,
      radius: 9.5,
      color: 'rgba(104, 224, 198, 0.18)',
      intensity: 1,
      flicker: true,
    });

    // Ring of 8 standing menhirs with a clear southern entrance gap
    const stoneOffsets = [
      { dx: -5, dy: 0 },
      { dx: 5, dy: 0 },
      { dx: 0, dy: -5 },
      { dx: -4, dy: -3 },
      { dx: 4, dy: -3 },
      { dx: -4, dy: 3 },
      { dx: 4, dy: 3 },
    ];
    for (const o of stoneOffsets) {
      this.setChunkCellIfInside(chunk, cx + o.dx, cy + o.dy, {
        char: rng() < 0.6 ? '▲' : '▓',
        color: PALETTE.menhir[Math.floor(rng() * PALETTE.menhir.length) % PALETTE.menhir.length],
        bg: PALETTE.cellBg.quarryRock,
        kind: 'menhir',
        solid: true,
      });
    }

    const roadTarget = this.findNearestRoadCellInChunk(chunk, cx, cy + 5, 28);
    if (roadTarget) {
      this.carveChunkPathSegment(chunk, cx, cy + 5, roadTarget.x, roadTarget.y, 1.15, rng);
    }
  }

  private stampStructuredGuardhouseInChunk(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const rx = 5;
    const ry = 4;
    this.markPoiMaskRect(chunk, cx, cy, rx + 1, ry + 1);

    const breachSide = Math.floor(rng() * 3); // 0=north, 1=west, 2=east
    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        const wx = cx + dx;
        const wy = cy + dy;
        const isWall = Math.abs(dx) === rx || Math.abs(dy) === ry;
        const isCorner = Math.abs(dx) === rx && Math.abs(dy) === ry;
        const isSouthDoor = dy === ry && Math.abs(dx) <= 1;
        const isGatepost = dy === ry && Math.abs(dx) === 2;
        const isBreach =
          (breachSide === 0 && dy === -ry && dx >= 1 && dx <= 2) ||
          (breachSide === 1 && dx === -rx && dy >= -1 && dy <= 0) ||
          (breachSide === 2 && dx === rx && dy >= -1 && dy <= 0);

        if (isWall && !isSouthDoor && !isBreach) {
          this.setChunkCellIfInside(
            chunk,
            wx,
            wy,
            this.createWallCell(wx, wy, rng, isCorner || isGatepost, isCorner || isGatepost ? 'intact' : 'ruin')
          );
        } else if (isBreach) {
          this.setChunkCellIfInside(chunk, wx, wy, {
            char: rng() < 0.5 ? '░' : '·',
            color: PALETTE.stoneAsh[3],
            bg: PALETTE.cellBg.ruinFloor,
            kind: 'rubble',
            solid: false,
          });
        } else {
          this.setChunkCellIfInside(chunk, wx, wy, {
            char: rng() < 0.16 ? '·' : ' ',
            color: PALETTE.ruinFloor[Math.floor(rng() * 4) % 4],
            bg: PALETTE.cellBg.ruinFloor,
            kind: 'ruin_floor',
            solid: false,
          });
        }
      }
    }

    if (rng() < 0.65) {
      this.placeBrazierInChunk(chunk, cx - 3, cy - 2, 10);
    }

    const roadTarget = this.findNearestRoadCellInChunk(chunk, cx, cy + ry + 1, 28);
    if (roadTarget) {
      this.carveChunkPathSegment(chunk, cx, cy + ry + 1, roadTarget.x, roadTarget.y, 1.15, rng);
    }
  }

  private stampStructuredCourtyardInChunk(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const rx = 7;
    const ry = 6;
    this.markPoiMaskRect(chunk, cx, cy, rx + 1, ry + 1);

    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        const wx = cx + dx;
        const wy = cy + dy;
        const isWall = Math.abs(dx) === rx || Math.abs(dy) === ry;
        const isCorner = Math.abs(dx) >= rx - 1 && Math.abs(dy) >= ry - 1 && isWall;
        const isBrokenGate = dy === ry && Math.abs(dx) <= 2;
        const isGatepost = dy === ry && Math.abs(dx) === 3;
        const isSideBreach = (dx === -rx && dy >= -1 && dy <= 0) || (dx === rx && dy >= 0 && dy <= 1);

        if (isWall && !isBrokenGate && !isSideBreach) {
          this.setChunkCellIfInside(
            chunk,
            wx,
            wy,
            this.createWallCell(wx, wy, rng, isCorner || isGatepost, isCorner || isGatepost ? 'intact' : 'ruin')
          );
        } else if (isSideBreach) {
          this.setChunkCellIfInside(chunk, wx, wy, {
            char: '░',
            color: PALETTE.stoneAsh[3],
            bg: PALETTE.cellBg.ruinFloor,
            kind: 'rubble',
            solid: false,
          });
        } else {
          this.setChunkCellIfInside(chunk, wx, wy, {
            char: rng() < 0.16 ? '·' : ' ',
            color: PALETTE.ruinFloor[Math.floor(rng() * 4) % 4],
            bg: PALETTE.cellBg.ruinFloor,
            kind: 'ruin_floor',
            solid: false,
          });
        }
      }
    }

    for (const px of [-3, 3]) {
      for (const py of [-2, 2]) {
        this.stampPillarInChunk(chunk, cx + px, cy + py, 1, 1, rng);
      }
    }

    if (rng() < 0.55) {
      this.placeBrazierInChunk(chunk, cx, cy, 11);
    } else {
      this.setChunkCellIfInside(chunk, cx, cy, {
        char: '╬',
        color: PALETTE.monolith[0],
        bg: PALETTE.cellBg.ruinFloor,
        kind: 'monolith',
        solid: true,
        altChar: '✦',
        altColor: PALETTE.wisp[1],
        animPhase: 0.4,
        animSpeed: 1.5,
      });
      chunk.lights.push({
        x: cx + 0.5,
        y: cy + 0.5,
        radius: 8,
        color: 'rgba(104, 224, 198, 0.15)',
        intensity: 0.9,
        flicker: true,
      });
    }

    const roadTarget = this.findNearestRoadCellInChunk(chunk, cx, cy + ry + 1, 28);
    if (roadTarget) {
      this.carveChunkPathSegment(chunk, cx, cy + ry + 1, roadTarget.x, roadTarget.y, 1.25, rng);
    }
  }

  private stampCrossroadsLandmarkInChunk(chunk: WorldChunk, rng: () => number): void {
    for (let ly = 8; ly < CHUNK_SIZE - 8; ly += 4) {
      for (let lx = 8; lx < CHUNK_SIZE - 8; lx += 4) {
        const idx = ly * CHUNK_SIZE + lx;
        if (chunk.roadMask[idx] !== 1 || chunk.poiMask[idx] === 1) continue;
        const wx = chunk.originX + lx;
        const wy = chunk.originY + ly;
        if (Math.hypot(wx, wy) < 36) continue;

        const info = this.sampleRoadInfo(wx, wy);
        if (info.junctionDelta >= 9.0) continue;

        for (const off of [
          { dx: 4, dy: -4 },
          { dx: -4, dy: -4 },
          { dx: 5, dy: 0 },
          { dx: -5, dy: 0 },
        ]) {
          const sx = wx + off.dx;
          const sy = wy + off.dy;
          const cell = this.getChunkCellSafe(chunk, sx, sy);
          if (
            !cell ||
            cell.solid ||
            cell.kind === 'path' ||
            cell.kind === 'bridge' ||
            cell.kind === 'ford' ||
            cell.kind === 'river_water' ||
            cell.kind === 'marsh_water' ||
            cell.kind === 'lava'
          ) {
            continue;
          }
          const slx = sx - chunk.originX;
          const sly = sy - chunk.originY;
          if (chunk.poiMask[sly * CHUNK_SIZE + slx] === 1 || chunk.roadMask[sly * CHUNK_SIZE + slx] === 1) {
            continue;
          }

          chunk.poiMask[sly * CHUNK_SIZE + slx] = 1;
          if (rng() < 0.55) {
            this.setChunkCellIfInside(chunk, sx, sy, {
              char: '╤',
              color: PALETTE.signpost[0],
              bg: PALETTE.cellBg.grass,
              kind: 'signpost',
              solid: true,
            });
            const homeDir = compassDir(sx, sy, 0, 0);
            const homeDist = Math.round(Math.hypot(sx, sy));
            chunk.signposts.push({
              x: sx,
              y: sy,
              lines: [`${homeDir}: Startovní útočiště (${homeDist})`, 'Křižovatka starých stezek'],
            });
          } else {
            this.placeBrazierInChunk(chunk, sx, sy, 9);
          }
          return;
        }
      }
    }
  }

  private createTravelerSpec(
    role: TravelerRole,
    chunkKeyStr: string,
    wx: number,
    wy: number,
    fx: number,
    fy: number,
    biome: BiomeKind,
    loreIndex: number
  ): RoadsideNpc {
    switch (role) {
      case 'ember_gatherer':
        return {
          id: `npc:${chunkKeyStr}:${wx},${wy}`,
          role,
          name: 'Sběrač uhlíků',
          title: 'Znavený sběrač popela u ohniště',
          glyph: '&',
          color: '#f09a43',
          x: wx + 0.5,
          y: wy + 0.5,
          campfireX: fx + 0.5,
          campfireY: fy + 0.5,
          chunkKey: chunkKeyStr,
          biome,
          loreIndex,
        };
      case 'cartographer':
        return {
          id: `npc:${chunkKeyStr}:${wx},${wy}`,
          role,
          name: 'Starý kartograf',
          title: 'Poutník se svitky map a měřidly',
          glyph: '&',
          color: '#e8c96b',
          x: wx + 0.5,
          y: wy + 0.5,
          campfireX: fx + 0.5,
          campfireY: fy + 0.5,
          chunkKey: chunkKeyStr,
          biome,
          loreIndex,
        };
      case 'pilgrim':
      default:
        return {
          id: `npc:${chunkKeyStr}:${wx},${wy}`,
          role: 'pilgrim',
          name: 'Osamělý poutník',
          title: 'Tichý chodec cestami Vaelu',
          glyph: '@',
          color: '#f2c15a',
          x: wx + 0.5,
          y: wy + 0.5,
          campfireX: fx + 0.5,
          campfireY: fy + 0.5,
          chunkKey: chunkKeyStr,
          biome,
          loreIndex,
        };
    }
  }

  private clearTravelerSpot(chunk: WorldChunk, nx: number, ny: number): void {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const wx = nx + dx;
        const wy = ny + dy;
        const lx = wx - chunk.originX;
        const ly = wy - chunk.originY;
        if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) continue;
        const idx = ly * CHUNK_SIZE + lx;
        const c = chunk.cells[idx];
        if (!c || c.kind === 'wall' || c.kind === 'brazier' || c.kind === 'quest_board' || c.kind === 'signpost') {
          continue;
        }
        if (c.solid && c.kind !== 'river_water' && c.kind !== 'marsh_water' && c.kind !== 'lava') {
          chunk.cells[idx] = {
            char: '·',
            color: PALETTE.path[1],
            bg: PALETTE.cellBg.path,
            kind: 'path',
            solid: false,
          };
        }
        if (dx === 0 && dy === 0) {
          c.overhangChar = undefined;
          c.overhangColor = undefined;
          chunk.poiMask[idx] = 1;
        }
      }
    }
  }

  private placeRoadsideTravelersInChunk(chunk: WorldChunk, rng: () => number): void {
    const roles: readonly TravelerRole[] = ['pilgrim', 'ember_gatherer', 'cartographer'];

    if (chunk.cx === 0 && chunk.cy === 0) {
      const nx = 5;
      const ny = 16;
      const fx = 7;
      const fy = 16;
      this.clearTravelerSpot(chunk, nx, ny);
      this.placeBrazierInChunk(chunk, fx, fy, 10);
      const biome = this.getBiomeAt(nx, ny);
      chunk.travelers.push(
        this.createTravelerSpec('cartographer', chunk.key, nx, ny, fx, fy, biome, Math.floor(rng() * 100))
      );
      return;
    }

    if (chunk.poi) return;
    if (hashInts(chunk.cx, chunk.cy, 77, this.numericSeed ^ 0x51a9) >= 0.24) return;

    const roadOffsets = [
      { dx: 3, dy: 0, fdx: 2, fdy: 0 },
      { dx: -3, dy: 0, fdx: -2, fdy: 0 },
      { dx: 0, dy: 3, fdx: 0, fdy: 2 },
      { dx: 0, dy: -3, fdx: 0, fdy: -2 },
      { dx: 3, dy: 2, fdx: 2, fdy: 1 },
      { dx: -3, dy: -2, fdx: -2, fdy: -1 },
    ];

    for (let ly = 10; ly < CHUNK_SIZE - 10; ly += 4) {
      for (let lx = 10; lx < CHUNK_SIZE - 10; lx += 4) {
        const idx = ly * CHUNK_SIZE + lx;
        if (chunk.roadMask[idx] !== 1) continue;
        const rx = chunk.originX + lx;
        const ry = chunk.originY + ly;

        for (let o = 0; o < roadOffsets.length; o++) {
          const off = roadOffsets[(o + Math.floor(rng() * roadOffsets.length)) % roadOffsets.length];
          const nx = rx + off.dx;
          const ny = ry + off.dy;
          const fx = rx + off.fdx;
          const fy = ry + off.fdy;
          const nlx = nx - chunk.originX;
          const nly = ny - chunk.originY;
          const flx = fx - chunk.originX;
          const fly = fy - chunk.originY;
          if (
            nlx < 4 ||
            nlx >= CHUNK_SIZE - 4 ||
            nly < 4 ||
            nly >= CHUNK_SIZE - 4 ||
            flx < 4 ||
            flx >= CHUNK_SIZE - 4 ||
            fly < 4 ||
            fly >= CHUNK_SIZE - 4
          ) {
            continue;
          }

          const nIdx = nly * CHUNK_SIZE + nlx;
          const fIdx = fly * CHUNK_SIZE + flx;
          const nc = chunk.cells[nIdx];
          const fc = chunk.cells[fIdx];
          if (
            !nc ||
            !fc ||
            nc.solid ||
            fc.solid ||
            chunk.poiMask[nIdx] === 1 ||
            chunk.poiMask[fIdx] === 1 ||
            chunk.roadMask[nIdx] === 1 ||
            nc.kind === 'river_water' ||
            nc.kind === 'marsh_water' ||
            nc.kind === 'lava' ||
            fc.kind === 'river_water' ||
            fc.kind === 'marsh_water' ||
            fc.kind === 'lava'
          ) {
            continue;
          }

          this.clearTravelerSpot(chunk, nx, ny);
          this.placeBrazierInChunk(chunk, fx, fy, 9.5);
          chunk.poiMask[fIdx] = 1;
          const role =
            roles[Math.floor(hashInts(chunk.cx, chunk.cy, 89, this.numericSeed) * roles.length) % roles.length];
          const biome = this.getBiomeAt(nx, ny);
          chunk.travelers.push(
            this.createTravelerSpec(role, chunk.key, nx, ny, fx, fy, biome, Math.floor(rng() * 100))
          );
          return;
        }
      }
    }
  }

  // =========================================================================
  // CONTEXTUAL BOX-DRAWING WALL AUTO-TILING
  // =========================================================================
  private isStarterCottageWall(wx: number, wy: number): boolean {
    if (wx < -6 || wx > 6 || wy < -10 || wy > -3) return false;
    const onBorder = wx === -6 || wx === 6 || wy === -10 || wy === -3;
    const isDoor = wy === -3 && Math.abs(wx) <= 1;
    return onBorder && !isDoor;
  }

  private hasWallNeighbor(chunk: WorldChunk, wx: number, wy: number): boolean {
    const lx = wx - chunk.originX;
    const ly = wy - chunk.originY;
    if (lx >= 0 && lx < CHUNK_SIZE && ly >= 0 && ly < CHUNK_SIZE) {
      return chunk.cells[ly * CHUNK_SIZE + lx].kind === 'wall';
    }
    return this.isStarterCottageWall(wx, wy);
  }

  private resolveChunkWalls(chunk: WorldChunk, rng: () => number): void {
    const resolvedChars = new Map<number, string>();

    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      const wy = chunk.originY + ly;
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const idx = ly * CHUNK_SIZE + lx;
        const cell = chunk.cells[idx];
        if (cell.kind !== 'wall') continue;

        const wx = chunk.originX + lx;
        const n = this.hasWallNeighbor(chunk, wx, wy - 1) ? 1 : 0;
        const e = this.hasWallNeighbor(chunk, wx + 1, wy) ? 2 : 0;
        const s = this.hasWallNeighbor(chunk, wx, wy + 1) ? 4 : 0;
        const w = this.hasWallNeighbor(chunk, wx - 1, wy) ? 8 : 0;
        const mask = n | e | s | w;

        const isRuin = cell.char === 'r';
        let glyph: string =
          mask === 0 ? (isRuin ? '▒' : '▓') : isRuin ? RUIN_WALL_BOX[mask] : INTACT_WALL_BOX[mask];
        if (isRuin && (mask === 5 || mask === 10) && rng() < 0.14) {
          glyph = rng() < 0.55 ? '▒' : '░';
        }
        resolvedChars.set(idx, glyph);
      }
    }

    for (const [idx, glyph] of resolvedChars) {
      chunk.cells[idx].char = glyph;
    }
  }

  // =========================================================================
  // PROP & STRUCTURE STAMP HELPERS
  // =========================================================================
  private createWallCell(
    col: number,
    row: number,
    rng: () => number,
    forceArch = false,
    style: 'intact' | 'ruin' = 'intact'
  ): Cell {
    const brickNoise = this.detailNoise.sample(col / 4.5, row / 4.5);
    const isBrick = forceArch ? Math.abs(col + row) % 3 === 0 : brickNoise > 0.25;
    const isMossy = !forceArch && rng() < 0.1;

    const color = isMossy
      ? PALETTE.stoneMoss[Math.floor(rng() * 2) % 2]
      : isBrick
        ? PALETTE.stoneBrick[Math.floor(rng() * 4) % 4]
        : PALETTE.stoneAsh[Math.floor(rng() * 4) % 4];

    return {
      char: style === 'ruin' ? 'r' : '#',
      color,
      bg: PALETTE.cellBg.wall,
      kind: 'wall',
      solid: true,
    };
  }

  private stampPillarInChunk(
    chunk: WorldChunk,
    x: number,
    y: number,
    w: number,
    h: number,
    rng: () => number
  ): void {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        this.setChunkCellIfInside(chunk, col, row, this.createWallCell(col, row, rng, true, 'intact'));
      }
    }
  }

  private placeBrazierInChunk(chunk: WorldChunk, col: number, row: number, radius = 11): void {
    const lx = col - chunk.originX;
    const ly = row - chunk.originY;
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) return;

    chunk.cells[ly * CHUNK_SIZE + lx] = {
      char: '♨\uFE0E',
      color: PALETTE.brazierFire[0],
      bg: PALETTE.cellBg.hearth,
      kind: 'brazier',
      solid: true,
      altChar: '▲',
      altColor: PALETTE.brazierFire[2],
      animPhase: posMod(col * 3 + row * 7, 10) / 10,
      animSpeed: 3.4,
    };

    // Delicate glowing hearth embers on adjacent walkable floor tiles
    for (const dx of [-1, 1]) {
      const side = this.getChunkCellSafe(chunk, col + dx, row);
      if (side && !side.solid && side.kind !== 'brazier') {
        side.char = '·';
        side.altChar = '˙';
        side.color = PALETTE.brazierFire[2];
        side.altColor = PALETTE.brazierFire[0];
        side.animPhase = dx < 0 ? 0.1 : 0.6;
        side.animSpeed = 4.2;
      }
    }

    chunk.lights.push({
      x: col + 0.5,
      y: row + 0.5,
      radius,
      color: 'rgba(218, 118, 48, 0.14)',
      intensity: 1,
      flicker: true,
    });
  }

  private placeWispInChunk(chunk: WorldChunk, col: number, row: number, rng: () => number): void {
    const lx = col - chunk.originX;
    const ly = row - chunk.originY;
    if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) return;

    chunk.cells[ly * CHUNK_SIZE + lx] = {
      char: '✦',
      color: PALETTE.wisp[0],
      bg: PALETTE.cellBg.marshWater,
      kind: 'wisp',
      solid: false,
      altChar: '·',
      altColor: PALETTE.wisp[1],
      animPhase: rng(),
      animSpeed: 2.2 + rng() * 1.4,
    };
    chunk.lights.push({
      x: col + 0.5,
      y: row + 0.5,
      radius: 9,
      color: 'rgba(104, 224, 198, 0.16)',
      intensity: 1,
      flicker: true,
    });
  }

  private stampTreeInChunk(chunk: WorldChunk, cx: number, cy: number, dark: boolean): void {
    const baseLx = cx - chunk.originX;
    const baseLy = cy + 1 - chunk.originY;
    const trunkInside = baseLx >= 0 && baseLx < CHUNK_SIZE && baseLy >= 0 && baseLy < CHUNK_SIZE;
    const hTrunk = hashCoords(cx, cy, this.numericSeed ^ 0x2468);

    if (trunkInside) {
      const idx = baseLy * CHUNK_SIZE + baseLx;
      const base = chunk.cells[idx];
      if (
        chunk.poiMask[idx] === 1 ||
        chunk.roadMask[idx] === 1 ||
        base.solid ||
        base.kind === 'path' ||
        base.kind === 'bridge' ||
        base.kind === 'ford' ||
        base.kind === 'river_water' ||
        base.kind === 'marsh_water' ||
        base.kind === 'lava'
      ) {
        return;
      }

      // Avoid planting a trunk directly against a road curb
      for (let rdy = -1; rdy <= 1; rdy++) {
        for (let rdx = -1; rdx <= 1; rdx++) {
          const rl = (baseLy + rdy) * CHUNK_SIZE + (baseLx + rdx);
          if (rl >= 0 && rl < chunk.roadMask.length && chunk.roadMask[rl] === 1) {
            return;
          }
        }
      }

      chunk.cells[idx] = {
        char: hTrunk < 0.5 ? '┃' : '│',
        color: PALETTE.treeTrunk[Math.floor(hTrunk * 3) % PALETTE.treeTrunk.length],
        bg: PALETTE.cellBg.forest,
        kind: 'tree_trunk',
        solid: true,
      };
    } else {
      const roadInfo = this.sampleRoadInfo(cx, cy + 1);
      const river = this.sampleRiverInfo(cx, cy + 1);
      if (roadInfo.roadDelta <= 4.5 || river.isRiver) return;
    }

    // Dark forest undergrowth & fallen needles/leaves around grove floor
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.hypot(dx, dy) > 2.4) continue;
        const wx = cx + dx;
        const wy = cy + 1 + dy;
        const lx = wx - chunk.originX;
        const ly = wy - chunk.originY;
        if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) continue;
        const uIdx = ly * CHUNK_SIZE + lx;
        if (chunk.poiMask[uIdx] === 1 || chunk.roadMask[uIdx] === 1) continue;
        const c = chunk.cells[uIdx];
        if (c.kind !== 'grass' && c.kind !== 'flower') continue;
        const hFloor = hashCoords(wx, wy, this.numericSeed ^ 0x5151);
        c.bg = PALETTE.cellBg.forest;
        c.kind = 'grass';
        c.char = hFloor < 0.24 ? (hFloor < 0.12 ? '·' : '‧') : ' ';
        c.color = PALETTE.forestFloor[Math.floor(hFloor * 4) % PALETTE.forestFloor.length];
        c.altChar = undefined;
        c.animSpeed = 0;
      }
    }

    // Optional sparse forest undergrowth shrub inside grove core
    if (dark && hTrunk < 0.16) {
      const bx = cx + (hTrunk < 0.08 ? -1 : 1);
      const by = cy + 1;
      const blx = bx - chunk.originX;
      const bly = by - chunk.originY;
      if (blx >= 0 && blx < CHUNK_SIZE && bly >= 0 && bly < CHUNK_SIZE) {
        const bIdx = bly * CHUNK_SIZE + blx;
        const bc = chunk.cells[bIdx];
        if (chunk.poiMask[bIdx] === 0 && chunk.roadMask[bIdx] === 0 && !bc.solid && bc.kind === 'grass') {
          chunk.cells[bIdx] = {
            char: '♣\uFE0E',
            color: PALETTE.bush[Math.floor(hTrunk * 20) % PALETTE.bush.length],
            bg: PALETTE.cellBg.forest,
            kind: 'bush',
            solid: false,
          };
        }
      }
    }

    // Compact canopy overhang (♣, ♠, ↟)
    const pool = dark ? PALETTE.darkForestCanopy : PALETTE.treeCanopy;
    for (let dy = -2; dy <= 1; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const hc = hashCoords(cx + dx, cy + dy, this.numericSeed ^ 0x8642);
        if ((dx * dx) / 5.2 + (dy * dy) / 3.2 > 1.0 - hc * 0.12) continue;
        const wx = cx + dx;
        const wy = cy + dy;
        const lx = wx - chunk.originX;
        const ly = wy - chunk.originY;
        if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) continue;
        const cIdx = ly * CHUNK_SIZE + lx;
        if (chunk.poiMask[cIdx] === 1 || chunk.roadMask[cIdx] === 1) continue;
        const c = chunk.cells[cIdx];
        if (
          c.kind === 'wall' ||
          c.kind === 'tree_trunk' ||
          c.kind === 'river_water' ||
          c.kind === 'marsh_water' ||
          c.kind === 'bridge' ||
          c.kind === 'ford'
        ) {
          continue;
        }
        c.bg = PALETTE.cellBg.forest;
        c.overhangChar = GROVE_CANOPY_CHARS[Math.floor(hc * GROVE_CANOPY_CHARS.length) % GROVE_CANOPY_CHARS.length];
        c.overhangColor = pool[Math.floor(hc * pool.length) % pool.length];
      }
    }
  }

  private stampBloodTreeInChunk(chunk: WorldChunk, cx: number, cy: number): void {
    const base = this.getChunkCellSafe(chunk, cx, cy + 1);
    if (!base || base.solid || base.kind === 'path' || base.kind === 'bridge' || base.kind === 'river_water') return;
    const h = hashCoords(cx, cy, this.numericSeed ^ 0x9911);

    this.setChunkCellIfInside(chunk, cx, cy + 1, {
      char: h < 0.5 ? '┃' : '│',
      color: PALETTE.bloodTrunk[Math.floor(h * 3) % PALETTE.bloodTrunk.length],
      bg: PALETTE.cellBg.bloodFloor,
      kind: 'blood_tree',
      solid: true,
    });

    for (let dy = -2; dy <= 1; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const hc = hashCoords(cx + dx, cy + dy, this.numericSeed ^ 0x9922);
        if ((dx * dx) / 5.2 + (dy * dy) / 3.2 > 1.0 - hc * 0.14) continue;
        const lx = cx + dx - chunk.originX;
        const ly = cy + dy - chunk.originY;
        if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) continue;
        const cIdx = ly * CHUNK_SIZE + lx;
        if (chunk.poiMask[cIdx] === 1 || chunk.roadMask[cIdx] === 1) continue;
        const c = chunk.cells[cIdx];
        if (c.kind === 'wall' || c.kind === 'blood_tree' || c.kind === 'river_water' || c.kind === 'bridge') continue;
        c.bg = PALETTE.cellBg.bloodFloor;
        c.overhangChar = BLOOD_CANOPY_CHARS[Math.floor(hc * BLOOD_CANOPY_CHARS.length) % BLOOD_CANOPY_CHARS.length];
        c.overhangColor = PALETTE.bloodCanopy[Math.floor(hc * PALETTE.bloodCanopy.length) % PALETTE.bloodCanopy.length];
      }
    }
  }

  private stampFrostTreeInChunk(chunk: WorldChunk, cx: number, cy: number): void {
    const base = this.getChunkCellSafe(chunk, cx, cy + 1);
    if (!base || base.solid || base.kind === 'path' || base.kind === 'bridge' || base.kind === 'river_water') return;

    this.setChunkCellIfInside(chunk, cx, cy + 1, {
      char: '│',
      color: PALETTE.frostTree[1],
      bg: PALETTE.cellBg.snowGround,
      kind: 'tree_trunk',
      solid: true,
    });

    for (let dy = -2; dy <= 1; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > 3) continue;
        const hc = hashCoords(cx + dx, cy + dy, this.numericSeed ^ 0x7722);
        const lx = cx + dx - chunk.originX;
        const ly = cy + dy - chunk.originY;
        if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE) continue;
        const cIdx = ly * CHUNK_SIZE + lx;
        if (chunk.poiMask[cIdx] === 1 || chunk.roadMask[cIdx] === 1) continue;
        const c = chunk.cells[cIdx];
        if (c.kind === 'wall' || c.kind === 'tree_trunk' || c.kind === 'river_water' || c.kind === 'bridge') continue;
        c.overhangChar = hc < 0.65 ? '↟' : '⇞';
        c.overhangColor = PALETTE.frostTree[Math.floor(hc * PALETTE.frostTree.length) % PALETTE.frostTree.length];
      }
    }
  }

  private stampIceCrystalInChunk(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const c = this.getChunkCellSafe(chunk, cx, cy);
    if (!c || c.solid || c.kind === 'path' || c.kind === 'river_water') return;
    this.setChunkCellIfInside(chunk, cx, cy, {
      char: rng() < 0.6 ? '♦' : '▲',
      color: PALETTE.iceCrystal[Math.floor(rng() * 4) % 4],
      bg: PALETTE.cellBg.ice,
      kind: 'ice',
      solid: true,
    });
  }

  private stampDeadTreeInChunk(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const base = this.getChunkCellSafe(chunk, cx, cy + 1);
    if (!base || base.solid || base.kind === 'path' || base.kind === 'bridge' || base.kind === 'river_water') return;

    this.setChunkCellIfInside(chunk, cx, cy, {
      char: '⇞',
      color: PALETTE.deadTree[Math.floor(rng() * 4) % 4],
      bg: PALETTE.cellBg.marshGround,
      kind: 'dead_tree',
      solid: true,
    });
    this.setChunkCellIfInside(chunk, cx, cy + 1, {
      char: '│',
      color: PALETTE.deadTree[Math.floor(rng() * 4) % 4],
      bg: PALETTE.cellBg.marshGround,
      kind: 'dead_tree',
      solid: true,
    });
  }

  private stampMenhirCircleInChunk(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const offsets = [
      { dx: -3, dy: 0 },
      { dx: 3, dy: 0 },
      { dx: 0, dy: -2 },
      { dx: 0, dy: 2 },
    ];
    for (const o of offsets) {
      const c = this.getChunkCellSafe(chunk, cx + o.dx, cy + o.dy);
      if (!c || c.solid || c.kind === 'path' || c.kind === 'river_water') continue;
      this.setChunkCellIfInside(chunk, cx + o.dx, cy + o.dy, {
        char: rng() < 0.55 ? '▲' : '▓',
        color: PALETTE.menhir[Math.floor(rng() * 4) % 4],
        bg: PALETTE.cellBg.quarryRock,
        kind: 'menhir',
        solid: true,
      });
    }
  }

  private stampShatteredWagonInChunk(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const parts = [
      { dx: -1, dy: 0, ch: '┌' },
      { dx: 0, dy: 0, ch: '─' },
      { dx: 1, dy: 0, ch: '┐' },
      { dx: 0, dy: 1, ch: 'o' },
    ];
    for (const p of parts) {
      const c = this.getChunkCellSafe(chunk, cx + p.dx, cy + p.dy);
      if (!c || c.solid || c.kind === 'path' || c.kind === 'river_water') continue;
      this.setChunkCellIfInside(chunk, cx + p.dx, cy + p.dy, {
        char: p.ch,
        color: p.ch === 'o' ? PALETTE.boneProp[0] : PALETTE.wagonWood[Math.floor(rng() * 3) % 3],
        bg: PALETTE.cellBg.boneGround,
        kind: p.ch === 'o' ? 'bone_pile' : 'wagon',
        solid: p.ch !== 'o',
      });
    }
  }

  private stampBoneClusterInChunk(chunk: WorldChunk, cx: number, cy: number, rng: () => number): void {
    const glyphs = ['o', '╱', '†', '╲'] as const;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (rng() < 0.65) continue;
        const c = this.getChunkCellSafe(chunk, cx + dx, cy + dy);
        if (!c || c.solid || c.kind === 'path' || c.kind === 'river_water') continue;
        const ch = glyphs[Math.floor(rng() * glyphs.length) % glyphs.length];
        this.setChunkCellIfInside(chunk, cx + dx, cy + dy, {
          char: ch,
          color: ch === 'o' ? PALETTE.boneProp[Math.floor(rng() * 4) % 4] : PALETTE.rustWeapon[Math.floor(rng() * 3) % 3],
          bg: PALETTE.cellBg.boneGround,
          kind: 'bone_pile',
          solid: false,
        });
      }
    }
  }
}
