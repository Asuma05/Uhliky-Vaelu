import type { CombatSystem } from './combat';
import type { Enemy, EnemyManager } from './enemies';
import type { AmbientLightProfile, EnvironmentSystem } from './environment';
import { getItemName, getTravelerName } from './i18n';
import type { CellIllumination, LightingSystem } from './lighting';
import type { Player } from './player';
import type { QuestManager } from './quests';
import type { CameraState, Cell, SlashEffect, TileKind, Vec2 } from './types';
import { PALETTE, type World } from './world';

const SUB_X = 2;
const SUB_Y = 2;
const MICRO_W = 4;
const MICRO_H = 6;
const MICRO_FONT_SIZE = 7;

const BLOCK_SIZE = 16;
const STRUCT_TOP_PAD = 2;
const MAX_CACHED_BLOCKS = 128;

const MEMORY_STRUCT_COLOR = '#262830';
const MEMORY_GROUND_COLOR = '#15171c';
const MEMORY_CANOPY_COLOR = '#1a1d24';

const GRASS_BLADE_CHARS = ['·', '‧', ','] as const;
const PATH_CHARS = ['·', '‧', '.'] as const;
const RUIN_FLOOR_CHARS = ['·', '‧', '_', '-'] as const;
const REFLECT_CHARS = ['~', '-', '_', '(', ')', ':'] as const;

const GRASS_PALETTE = ['#222b26', '#28332c', '#2f3b33', '#37443a', '#2c2d26'] as const;
const BLOOD_GRASS_PALETTE = ['#36161e', '#451d27', '#542430', '#632b38', '#3d1922'] as const;
const FLOWER_PALETTE = ['#8f9993', '#a3a094', '#858d99', '#968f9c'] as const;

interface TerrainBlock {
  key: string;
  bx: number;
  by: number;
  lastUsedSeq: number;
  incomplete: boolean;
  groundCanvas: HTMLCanvasElement;
  structCanvas: HTMLCanvasElement | null;
}

interface WaterRipple {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  maxRadius: number;
}

interface MicroGlyph {
  char: string;
  color: string;
  bg?: string;
}

function floorDiv(n: number, size: number): number {
  return Math.floor(n / size);
}

function blockKey(bx: number, by: number): string {
  return `${bx},${by}`;
}

function microHash(x: number, y: number, salt: number): number {
  let n =
    (Math.imul(x | 0, 374761393) ^
      Math.imul(y | 0, 668265263) ^
      Math.imul(salt | 0, 1442695041)) >>>
    0;
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function parseHexRgb(hex: string): [number, number, number] {
  if (!hex) return [120, 120, 120];
  if (hex.startsWith('rgb(')) {
    const parts = hex.slice(4, -1).split(',');
    if (parts.length === 3) {
      return [
        Math.max(0, Math.min(255, parseInt(parts[0], 10) || 0)),
        Math.max(0, Math.min(255, parseInt(parts[1], 10) || 0)),
        Math.max(0, Math.min(255, parseInt(parts[2], 10) || 0)),
      ];
    }
  }
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  if (clean.length !== 6) return [120, 120, 120];
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function tintTowardWater(rgb: [number, number, number], fade: number): string {
  const waterR = 8;
  const waterG = 22;
  const waterB = 34;
  const mix = Math.min(0.62, Math.max(0.14, fade * 0.56));
  const r = Math.round(waterR + (rgb[0] * 0.68 - waterR) * mix);
  const g = Math.round(waterG + (rgb[1] * 0.72 - waterG) * mix);
  const b = Math.round(waterB + (rgb[2] * 0.85 + 14 - waterB) * mix);
  return `rgb(${r},${g},${b})`;
}

function isWallWallKind(cell: Cell | null): boolean {
  return cell?.kind === 'wall';
}

function isWaterKind(kind: TileKind | undefined): boolean {
  return kind === 'marsh_water' || kind === 'river_water';
}

function isShadowCasterKind(kind: TileKind): boolean {
  return (
    kind === 'wall' ||
    kind === 'quarry_rock' ||
    kind === 'tree_trunk' ||
    kind === 'blood_tree' ||
    kind === 'dead_tree' ||
    kind === 'furnace' ||
    kind === 'statue'
  );
}

function isVerticalReflectorKind(kind: TileKind): boolean {
  return (
    kind === 'wall' ||
    kind === 'quarry_rock' ||
    kind === 'tree_trunk' ||
    kind === 'blood_tree' ||
    kind === 'dead_tree' ||
    kind === 'brazier' ||
    kind === 'monolith' ||
    kind === 'menhir' ||
    kind === 'bridge' ||
    kind === 'furnace' ||
    kind === 'statue'
  );
}

function isWoodWallCell(cell: Cell): boolean {
  return cell.bg === PALETTE.cellBg.woodWall;
}

function isRuinWallCell(cell: Cell): boolean {
  const ch = cell.char;
  return (
    !isWoodWallCell(cell) &&
    (ch === '┌' ||
      ch === '─' ||
      ch === '┐' ||
      ch === '│' ||
      ch === '└' ||
      ch === '┘' ||
      ch === '├' ||
      ch === '┤' ||
      ch === '┬' ||
      ch === '┴' ||
      ch === '┼' ||
      ch === '▒' ||
      ch === '░')
  );
}

function isRedBrickColor(hex: string): boolean {
  const c = hex.toLowerCase();
  return (
    c === '#78544f' ||
    c === '#875f59' ||
    c === '#634541' ||
    c === '#6e4c47' ||
    c === '#a65348' ||
    c === '#bd6155' ||
    c === '#823d35' ||
    c === '#964940'
  );
}

export class AsciiRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  // High-density sub-tile micro-ASCII metrics (2x2 micro-chars of 4x6px @ 7px font -> 8x12px cell)
  public readonly baseFontSize = 11;
  public readonly cellWidth = SUB_X * MICRO_W;
  public readonly cellHeight = SUB_Y * MICRO_H;
  private readonly microFontStack =
    "'Consolas', 'JetBrains Mono', 'Fira Code', 'Cascadia Mono', monospace";

  public readonly camera: CameraState;

  private viewportWidth = 0;
  private viewportHeight = 0;
  private dpr = 1;

  private readonly rgbCache = new Map<string, [number, number, number]>();
  private readonly shadedColorCache = new Map<string, string>();
  private readonly terrainBlockCache = new Map<string, TerrainBlock>();
  private readonly occupiedLightRingCells = new Set<number>();
  private blockUsageSeq = 0;
  private cachedWorldSeed = '';
  private cachedDpr = 0;

  private readonly scratchIllum: CellIllumination = {
    inLos: false,
    explored: false,
    intensity: 0,
    warmth: 0,
    sunlight: 0,
    cyanGlow: 0,
  };
  private readonly scratchNeighborIllum: CellIllumination = {
    inLos: false,
    explored: false,
    intensity: 0,
    warmth: 0,
    sunlight: 0,
    cyanGlow: 0,
  };

  // Offscreen lightmap (multiply) and additive glowmap (lighter)
  private readonly lightCanvas: HTMLCanvasElement;
  private readonly lightCtx: CanvasRenderingContext2D;
  private readonly glowCanvas: HTMLCanvasElement;
  private readonly glowCtx: CanvasRenderingContext2D;
  private lightGridW = 0;
  private lightGridH = 0;
  private lightImgData: ImageData | null = null;
  private lightBlurBuf: Uint8ClampedArray | null = null;
  private glowImgData: ImageData | null = null;

  // Dynamic expanding water ripples
  private waterRipples: WaterRipple[] = [];
  private rippleSpawnCooldown = 0;
  private lastElapsedTime = 0;

  // Per-column scratch reflector state for live water reflections
  private colReflectRow = new Int32Array(512);
  private colReflectKind: (TileKind | null)[] = new Array(512).fill(null);
  private colReflectColor: string[] = new Array(512).fill('');
  private colReflectHeight = new Uint8Array(512);

  private lastEnvCacheKey = '';
  private currentAmbient: AmbientLightProfile = {
    ambientStrength: 1.0,
    sunlight: 1.0,
    nightFactor: 0.0,
    tintR: 236,
    tintG: 232,
    tintB: 224,
    bgColor: 'rgb(11,12,12)',
    memoryStructColor: MEMORY_STRUCT_COLOR,
    memoryGroundColor: MEMORY_GROUND_COLOR,
    memoryCanopyColor: MEMORY_CANOPY_COLOR,
    sightMultiplier: 1,
    vignetteOpacity: 0,
  };

  private readonly handleResizeBound: () => void;

  constructor(canvas: HTMLCanvasElement, initialTarget: { x: number; y: number }) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Could not initialize 2D canvas context.');
    }
    this.ctx = context;

    this.lightCanvas = document.createElement('canvas');
    const lctx = this.lightCanvas.getContext('2d');
    this.glowCanvas = document.createElement('canvas');
    const gctx = this.glowCanvas.getContext('2d');
    if (!lctx || !gctx) {
      throw new Error('Could not initialize offscreen lightmap contexts.');
    }
    this.lightCtx = lctx;
    this.glowCtx = gctx;

    this.camera = {
      x: initialTarget.x,
      y: initialTarget.y - 2,
      zoom: 1.0,
      targetZoom: 1.0,
      minZoom: 0.75,
      maxZoom: 2.6,
    };

    this.handleResizeBound = this.resize.bind(this);
    this.resize();
    window.addEventListener('resize', this.handleResizeBound);
  }

  public resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;

    this.canvas.width = Math.max(1, Math.floor(this.viewportWidth * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(this.viewportHeight * this.dpr));
    this.canvas.style.width = `${this.viewportWidth}px`;
    this.canvas.style.height = `${this.viewportHeight}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  public adjustZoom(deltaSteps: number): void {
    const zoomFactor = Math.pow(1.12, deltaSteps);
    this.camera.targetZoom = Math.min(
      this.camera.maxZoom,
      Math.max(this.camera.minZoom, this.camera.targetZoom * zoomFactor)
    );
  }

  public snapCameraTo(target: Vec2): void {
    this.camera.x = target.x;
    this.camera.y = target.y - 1.5;
  }

  public updateCamera(player: Player, dt: number): void {
    const followSmooth = 1 - Math.exp(-8.5 * dt);
    const zoomSmooth = 1 - Math.exp(-11 * dt);

    const targetX = player.x;
    const targetY = player.y - 1.5;

    this.camera.x += (targetX - this.camera.x) * followSmooth;
    this.camera.y += (targetY - this.camera.y) * followSmooth;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * zoomSmooth;
  }

  /** Converts viewport mouse coordinates to world cell coordinates for click aiming */
  public screenToWorld(clientX: number, clientY: number): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const zoom = this.camera.zoom;
    const originX = this.viewportWidth / (2 * zoom) - this.camera.x * this.cellWidth;
    const originY = this.viewportHeight / (2 * zoom) - this.camera.y * this.cellHeight;
    return {
      x: (sx / zoom - originX) / this.cellWidth,
      y: (sy / zoom - originY) / this.cellHeight,
    };
  }

  private getRgb(hex: string): [number, number, number] {
    let rgb = this.rgbCache.get(hex);
    if (!rgb) {
      rgb = parseHexRgb(hex);
      this.rgbCache.set(hex, rgb);
    }
    return rgb;
  }

  private shadeColor(
    baseHex: string,
    intensity: number,
    warmth: number,
    cyanGlow: number,
    structural: boolean
  ): string {
    const iBucket = Math.min(12, Math.max(0, Math.round(intensity * 12)));
    const wBucket = Math.min(6, Math.max(0, Math.round(warmth * 6)));
    const cBucket = Math.min(4, Math.max(0, Math.round(cyanGlow * 4)));
    const key = `${baseHex}|${iBucket}|${wBucket}|${cBucket}|${structural ? 1 : 0}`;

    const cached = this.shadedColorCache.get(key);
    if (cached) return cached;

    const [br, bg, bb] = this.getRgb(baseHex);
    const iNorm = iBucket / 12;
    const wNorm = wBucket / 6;
    const cNorm = cBucket / 4;

    const nf = this.currentAmbient.nightFactor;
    const memR = structural ? Math.round(46 - nf * 12) : Math.round(27 - nf * 8);
    const memG = structural ? Math.round(49 - nf * 10) : Math.round(29 - nf * 7);
    const memB = structural ? Math.round(54 + nf * 2) : Math.round(33 + nf * 1);

    const sun = this.currentAmbient.sunlight;
    const boost = 0.92 + iNorm * (0.28 + sun * 0.14);
    let litR = Math.min(255, br * boost);
    let litG = Math.min(255, bg * boost);
    let litB = Math.min(255, bb * boost);

    const envMix =
      sun > 0.15
        ? 0.05 + sun * 0.04
        : (1 - wNorm * 0.72) * (0.06 + nf * 0.28);
    litR = litR + (this.currentAmbient.tintR - litR) * envMix;
    litG = litG + (this.currentAmbient.tintG - litG) * envMix;
    litB = litB + (this.currentAmbient.tintB - litB) * envMix;

    if (wNorm > 0) {
      const wm = wNorm * (0.34 - sun * 0.18);
      litR = litR + (248 - litR) * wm;
      litG = litG + (174 - litG) * wm;
      litB = litB + (78 - litB) * wm;
    }

    if (cNorm > 0) {
      const cm = cNorm * 0.42;
      litR = litR + (120 - litR) * cm;
      litG = litG + (238 - litG) * cm;
      litB = litB + (214 - litB) * cm;
    }

    const mix = Math.min(1, iNorm * 1.25);
    const r = Math.round(memR + (litR - memR) * mix);
    const g = Math.round(memG + (litG - memG) * mix);
    const b = Math.round(memB + (litB - memB) * mix);

    const result = `rgb(${r},${g},${b})`;
    if (this.shadedColorCache.size < 6000) {
      this.shadedColorCache.set(key, result);
    }
    return result;
  }

  // =========================================================================
  // OFFSCREEN 16x16 STATIC TERRAIN BLOCK CACHING (60 FPS SUB-TILE ART)
  // =========================================================================

  private getOrBakeTerrainBlock(world: World, bx: number, by: number): TerrainBlock {
    const key = blockKey(bx, by);
    const existing = this.terrainBlockCache.get(key);
    if (existing) {
      if (existing.incomplete) {
        const wx0 = bx * BLOCK_SIZE;
        const wy0 = by * BLOCK_SIZE;
        if (
          world.getCell(wx0, wy0) !== null &&
          world.getCell(wx0 + BLOCK_SIZE - 1, wy0 + BLOCK_SIZE - 1) !== null
        ) {
          this.bakeTerrainBlock(world, existing);
        }
      }
      existing.lastUsedSeq = ++this.blockUsageSeq;
      return existing;
    }

    const groundCanvas = document.createElement('canvas');
    const block: TerrainBlock = {
      key,
      bx,
      by,
      lastUsedSeq: ++this.blockUsageSeq,
      incomplete: false,
      groundCanvas,
      structCanvas: null,
    };
    this.bakeTerrainBlock(world, block);
    this.terrainBlockCache.set(key, block);
    this.evictOldBlocksIfNeeded();
    return block;
  }

  private evictOldBlocksIfNeeded(): void {
    if (this.terrainBlockCache.size <= MAX_CACHED_BLOCKS) return;
    const all = Array.from(this.terrainBlockCache.values());
    all.sort((a, b) => a.lastUsedSeq - b.lastUsedSeq);
    const removeCount = all.length - MAX_CACHED_BLOCKS;
    for (let i = 0; i < removeCount; i++) {
      this.terrainBlockCache.delete(all[i].key);
    }
  }

  private resolveGroundBg(cell: Cell, wx: number, wy: number): string {
    const wave =
      Math.sin(wx * 0.08 + wy * 0.06) * 0.5 + Math.cos(wx * 0.05 - wy * 0.09) * 0.5;
    switch (cell.kind) {
      case 'grass':
      case 'flower':
      case 'bush':
      case 'tree_trunk':
      case 'tree_canopy':
      case 'blood_tree':
      case 'dead_tree': {
        if (cell.bg === PALETTE.cellBg.bloodFloor) return '#140b0e';
        if (cell.bg === PALETTE.cellBg.forest) return wave > 0.1 ? '#080c0a' : '#070a09';
        if (cell.bg === PALETTE.cellBg.marshGround) return '#0e1513';
        return wave > 0.25 ? '#141a17' : wave < -0.25 ? '#101513' : '#121815';
      }
      case 'path':
        return wave > 0 ? '#181411' : '#1b1713';
      case 'bridge':
        return '#1e1710';
      case 'ford':
        return '#0e1d28';
      case 'ruin_floor':
        if (cell.bg === PALETTE.cellBg.marbleFloor) return '#24252a';
        return wave > 0 ? '#13171f' : '#151a23';
      case 'crypt_floor':
        return '#0f121a';
      case 'passage':
        return '#0c0e14';
      case 'quarry_ground':
      case 'rubble':
        return '#111419';
      case 'ash_ground':
      case 'ember':
        return '#111014';
      case 'marsh_ground':
        return '#0c1211';
      case 'marsh_water':
        return '#06121b';
      case 'river_water':
        return '#06131f';
      case 'snow_ground':
        return '#10161c';
      case 'ice':
        return '#13222e';
      case 'basalt':
        return '#100f14';
      case 'lava':
        return '#2b0903';
      case 'bone_pile':
        return '#14120f';
      case 'wall':
      case 'quarry_rock':
        return '#080a0f';
      default:
        return cell.bg ?? PALETTE.cellBg.grass;
    }
  }

  private bakeTerrainBlock(world: World, block: TerrainBlock): void {
    const scale = Math.min(this.dpr, 2);
    const logicalW = BLOCK_SIZE * this.cellWidth;
    const logicalH = BLOCK_SIZE * this.cellHeight;
    const pixelW = Math.max(1, Math.round(logicalW * scale));
    const pixelH = Math.max(1, Math.round(logicalH * scale));

    if (block.groundCanvas.width !== pixelW || block.groundCanvas.height !== pixelH) {
      block.groundCanvas.width = pixelW;
      block.groundCanvas.height = pixelH;
    }
    const gctx = block.groundCanvas.getContext('2d', { alpha: false });
    if (!gctx) return;

    gctx.setTransform(scale, 0, 0, scale, 0, 0);
    gctx.imageSmoothingEnabled = false;
    gctx.fillStyle = '#07090d';
    gctx.fillRect(0, 0, logicalW, logicalH);

    const wx0 = block.bx * BLOCK_SIZE;
    const wy0 = block.by * BLOCK_SIZE;
    let incomplete = false;
    let hasStructures = false;

    const cells: (Cell | null)[] = new Array(BLOCK_SIZE * BLOCK_SIZE);

    // 1. Gather cells + RLE-fill tile background colors
    let lastFill = '';
    for (let ly = 0; ly < BLOCK_SIZE; ly++) {
      const wy = wy0 + ly;
      const py = ly * this.cellHeight;
      let runBg = '';
      let runStartLx = 0;
      let runCols = 0;

      for (let lx = 0; lx < BLOCK_SIZE; lx++) {
        const wx = wx0 + lx;
        const cell = world.getCell(wx, wy);
        cells[ly * BLOCK_SIZE + lx] = cell;
        if (!cell) {
          incomplete = true;
          if (runCols > 0) {
            if (runBg !== lastFill) {
              gctx.fillStyle = runBg;
              lastFill = runBg;
            }
            gctx.fillRect(runStartLx * this.cellWidth, py, runCols * this.cellWidth + 0.3, this.cellHeight + 0.3);
            runCols = 0;
          }
          continue;
        }

        if (
          cell.kind === 'wall' ||
          cell.kind === 'quarry_rock' ||
          cell.kind === 'tree_trunk' ||
          cell.kind === 'blood_tree' ||
          cell.kind === 'dead_tree' ||
          cell.kind === 'tombstone' ||
          cell.kind === 'monolith' ||
          cell.kind === 'menhir' ||
          cell.kind === 'wagon' ||
          cell.kind === 'signpost' ||
          cell.kind === 'statue' ||
          Boolean(cell.overhangChar)
        ) {
          hasStructures = true;
        }

        const bg = this.resolveGroundBg(cell, wx, wy);
        if (runCols === 0) {
          runBg = bg;
          runStartLx = lx;
          runCols = 1;
        } else if (bg === runBg) {
          runCols++;
        } else {
          if (runBg !== lastFill) {
            gctx.fillStyle = runBg;
            lastFill = runBg;
          }
          gctx.fillRect(runStartLx * this.cellWidth, py, runCols * this.cellWidth + 0.3, this.cellHeight + 0.3);
          runBg = bg;
          runStartLx = lx;
          runCols = 1;
        }
      }

      if (runCols > 0) {
        if (runBg !== lastFill) {
          gctx.fillStyle = runBg;
          lastFill = runBg;
        }
        gctx.fillRect(runStartLx * this.cellWidth, py, runCols * this.cellWidth + 0.3, this.cellHeight + 0.3);
      }
    }

    // 2. Draw sparse, calm 2x2 sub-tile ground micro-textures (negative space first!)
    const buckets = new Map<string, { chars: string[]; xs: number[]; ys: number[] }>();
    const pushMicro = (color: string, ch: string, px: number, py: number) => {
      let b = buckets.get(color);
      if (!b) {
        b = { chars: [], xs: [], ys: [] };
        buckets.set(color, b);
      }
      b.chars.push(ch);
      b.xs.push(px);
      b.ys.push(py);
    };

    for (let ly = 0; ly < BLOCK_SIZE; ly++) {
      const wy = wy0 + ly;
      const tilePy = ly * this.cellHeight;
      for (let lx = 0; lx < BLOCK_SIZE; lx++) {
        const wx = wx0 + lx;
        const cell = cells[ly * BLOCK_SIZE + lx];
        if (!cell) continue;
        // Water & opaque walls don't need ground texture glyphs underneath
        if (isWaterKind(cell.kind) || cell.kind === 'wall' || cell.kind === 'quarry_rock') continue;

        const tilePx = lx * this.cellWidth;
        const isBlood = cell.bg === PALETTE.cellBg.bloodFloor;
        const isForestFloor = cell.bg === PALETTE.cellBg.forest;
        const cellH = microHash(wx, wy, 19);
        const slotSx = cellH < 0.5 ? 0 : 1;
        const slotSy = ((wx + wy) & 1) === 0 ? 0 : 1;

        for (let sy = 0; sy < SUB_Y; sy++) {
          const my = wy * SUB_Y + sy;
          const py = tilePy + sy * MICRO_H;
          for (let sx = 0; sx < SUB_X; sx++) {
            const mx = wx * SUB_X + sx;
            const px = tilePx + sx * MICRO_W;
            const h1 = microHash(mx, my, 31);
            const h2 = microHash(mx, my, 73);

            if (
              cell.kind === 'grass' ||
              cell.kind === 'tree_canopy' ||
              cell.kind === 'tree_trunk' ||
              cell.kind === 'blood_tree' ||
              cell.kind === 'dead_tree'
            ) {
              if (isForestFloor) {
                // Dark forest undergrowth with subtle fallen needles/leaves (~28% sub-tiles)
                if (h2 < 0.72) continue;
                const ch = h1 < 0.45 ? '·' : h1 < 0.75 ? '‧' : h1 < 0.9 ? ',' : "'";
                const col = h2 < 0.85 ? '#28332b' : h2 < 0.94 ? '#383229' : '#212b23';
                pushMicro(col, ch, px, py);
              } else if (isBlood) {
                if (cell.char === ' ' || sx !== slotSx || sy !== slotSy) continue;
                const ch = GRASS_BLADE_CHARS[Math.floor(h2 * GRASS_BLADE_CHARS.length) % GRASS_BLADE_CHARS.length];
                pushMicro(BLOOD_GRASS_PALETTE[Math.floor(h1 * 3) % 3], ch, px, py);
              } else {
                // Gentle low-contrast Ashen Meadow grass carpet (~66% sub-tile coverage)
                if (cell.char === 'v' && sx === slotSx && sy === slotSy) {
                  pushMicro(GRASS_PALETTE[3], 'v', px, py);
                } else if (cell.char === '"' && sx === slotSx && sy === slotSy) {
                  pushMicro(GRASS_PALETTE[4], '"', px, py);
                } else {
                  if (h2 < 0.34) continue;
                  const ch = h1 < 0.36 ? '·' : h1 < 0.68 ? '‧' : h1 < 0.86 ? ',' : "'";
                  const col = h2 > 0.84 ? GRASS_PALETTE[4] : GRASS_PALETTE[Math.floor(h1 * 3) % 3];
                  pushMicro(col, ch, px, py);
                }
              }
            } else if (cell.kind === 'flower') {
              if (sx === slotSx && sy === slotSy) {
                const fcol = isBlood
                  ? '#7d212d'
                  : cell.color || FLOWER_PALETTE[Math.floor(h1 * FLOWER_PALETTE.length) % FLOWER_PALETTE.length];
                pushMicro(fcol, '⁕', px, py);
              } else if (h2 >= 0.48) {
                const pal = isBlood ? BLOOD_GRASS_PALETTE : GRASS_PALETTE;
                pushMicro(pal[Math.floor(h1 * 3) % 3], h1 < 0.5 ? '·' : '‧', px, py);
              }
            } else if (cell.kind === 'bush') {
              if (h2 < 0.52) continue;
              const bushCh = h1 < 0.45 ? '♣' : h1 < 0.78 ? ',' : '*';
              const pal = isBlood ? BLOOD_GRASS_PALETTE : GRASS_PALETTE;
              pushMicro(pal[Math.min(pal.length - 1, 1 + Math.floor(h2 * 3))], bushCh, px, py);
            } else if (cell.kind === 'path') {
              if (h2 < 0.66) continue;
              const ch = PATH_CHARS[Math.floor(h1 * PATH_CHARS.length) % PATH_CHARS.length];
              const col = h2 < 0.78 ? '#5c5043' : h2 < 0.92 ? '#6e6050' : '#7d6e5c';
              pushMicro(col, ch, px, py);
            } else if (cell.kind === 'bridge') {
              const ch = sx === 0 && sy === 0 ? '|' : h1 < 0.65 ? '=' : '-';
              const col = sy === 0 ? '#85694e' : '#634d39';
              pushMicro(col, ch, px, py);
            } else if (cell.kind === 'ford') {
              if (sy === 0 && sx === slotSx) {
                pushMicro(h1 < 0.5 ? '#6d7c8c' : '#536170', h2 < 0.5 ? 'o' : '·', px, py);
              } else if (sy === 1 && sx === 1 - slotSx) {
                pushMicro('#257291', '~', px, py);
              }
            } else if (cell.kind === 'ruin_floor' || cell.kind === 'crypt_floor' || cell.kind === 'passage') {
              if (cell.bg === PALETTE.cellBg.marbleFloor) {
                if (h2 < 0.72) continue;
                const ch = h1 < 0.45 ? '·' : h1 < 0.78 ? '‧' : '░';
                const col = h2 < 0.86 ? '#7a7870' : '#96938a';
                pushMicro(col, ch, px, py);
                continue;
              }
              if (h2 < 0.76) continue;
              const moss = cell.kind === 'ruin_floor' && h2 > 0.95;
              const ch = moss ? ',' : RUIN_FLOOR_CHARS[Math.floor(h1 * RUIN_FLOOR_CHARS.length) % RUIN_FLOOR_CHARS.length];
              const col = moss
                ? '#344d3b'
                : cell.kind === 'crypt_floor'
                  ? h2 < 0.88
                    ? '#353c52'
                    : '#454e69'
                  : h2 < 0.88
                    ? '#3d4554'
                    : '#4e586b';
              pushMicro(col, ch, px, py);
            } else if (cell.kind === 'marsh_ground') {
              if (h2 < 0.55) continue;
              const ch = h1 < 0.65 ? GRASS_BLADE_CHARS[Math.floor(h2 * 3) % 3] : '~';
              const col = h2 < 0.78 ? '#24362f' : '#2c4238';
              pushMicro(col, ch, px, py);
            } else if (cell.kind === 'quarry_ground' || cell.kind === 'rubble') {
              if (h2 < 0.58) continue;
              const ch = h1 < 0.45 ? '·' : h1 < 0.8 ? '.' : ',';
              const col = h2 < 0.8 ? '#434b59' : '#566073';
              pushMicro(col, ch, px, py);
            } else if (cell.kind === 'ash_ground') {
              if (h2 < 0.56) continue;
              const ch = h1 < 0.5 ? '·' : h1 < 0.82 ? '‧' : ',';
              const col = h2 < 0.78 ? '#38353e' : '#46424f';
              pushMicro(col, ch, px, py);
            } else if (cell.kind === 'snow_ground') {
              if (h2 < 0.58) continue;
              const ch = h1 < 0.55 ? '·' : h1 < 0.85 ? ',' : "'";
              const col = h2 < 0.78 ? '#586b7a' : '#718696';
              pushMicro(col, ch, px, py);
            } else if (cell.kind === 'ice') {
              if (h2 < 0.55) continue;
              const ch = h1 < 0.45 ? '/' : h1 < 0.8 ? '\\' : '=';
              const col = h2 < 0.78 ? '#69bed9' : '#9ee1f5';
              pushMicro(col, ch, px, py);
            } else if (cell.kind === 'basalt') {
              if (h2 < 0.62) continue;
              const ch = h1 < 0.6 ? '·' : ':';
              const col = h2 < 0.82 ? '#292633' : '#373342';
              pushMicro(col, ch, px, py);
            } else if (cell.kind === 'bone_pile') {
              if (h2 < 0.58) continue;
              const ch = h1 < 0.35 ? '/' : h1 < 0.7 ? '\\' : ',';
              const col = h2 < 0.8 ? '#a8a192' : '#736b5d';
              pushMicro(col, ch, px, py);
            } else {
              if (h2 < 0.72) continue;
              pushMicro(cell.color || '#5e6573', '·', px, py);
            }
          }
        }
      }
    }

    gctx.font = `${MICRO_FONT_SIZE}px ${this.microFontStack}`;
    gctx.textBaseline = 'top';
    gctx.textAlign = 'left';
    buckets.forEach((b, color) => {
      gctx.fillStyle = color;
      for (let i = 0; i < b.chars.length; i++) {
        gctx.fillText(b.chars[i], b.xs[i], b.ys[i]);
      }
    });

    // 3. Cast ground drop shadows directly south / SE of vertical blockers
    const shadowPoints: { px: number; py: number; fullRow: boolean }[] = [];
    for (let ly = 0; ly < BLOCK_SIZE; ly++) {
      const wy = wy0 + ly;
      const py = ly * this.cellHeight;
      for (let lx = 0; lx < BLOCK_SIZE; lx++) {
        const cell = cells[ly * BLOCK_SIZE + lx];
        if (!cell || cell.solid || isWaterKind(cell.kind)) continue;
        const wx = wx0 + lx;
        const north = ly > 0 ? cells[(ly - 1) * BLOCK_SIZE + lx] : world.getCell(wx, wy - 1);
        const nw =
          ly > 0 && lx > 0
            ? cells[(ly - 1) * BLOCK_SIZE + (lx - 1)]
            : world.getCell(wx - 1, wy - 1);

        if (north && isShadowCasterKind(north.kind)) {
          gctx.fillStyle = 'rgba(3, 5, 10, 0.56)';
          gctx.fillRect(lx * this.cellWidth, py, this.cellWidth, MICRO_H + 1);
          if (north.kind === 'wall' || north.kind === 'quarry_rock') {
            gctx.fillStyle = 'rgba(3, 5, 10, 0.28)';
            gctx.fillRect(lx * this.cellWidth, py + MICRO_H + 1, this.cellWidth, MICRO_H - 1);
          }
          shadowPoints.push({ px: lx * this.cellWidth, py, fullRow: true });
        } else if (nw && isShadowCasterKind(nw.kind)) {
          gctx.fillStyle = 'rgba(3, 5, 10, 0.34)';
          gctx.fillRect(lx * this.cellWidth, py, MICRO_W + 1, MICRO_H);
          shadowPoints.push({ px: lx * this.cellWidth, py, fullRow: false });
        }
      }
    }
    if (shadowPoints.length > 0) {
      gctx.fillStyle = '#070a10';
      for (let i = 0; i < shadowPoints.length; i++) {
        const sp = shadowPoints[i];
        gctx.fillText(':', sp.px, sp.py);
        if (sp.fullRow) {
          gctx.fillText(':', sp.px + MICRO_W, sp.py);
        }
      }
    }

    // 4. Bake 2.5D extruded structures, walls, cliffs, tree trunks, canopies & props
    if (!hasStructures) {
      block.structCanvas = null;
      block.incomplete = incomplete;
      return;
    }

    const sLogicalH = (BLOCK_SIZE + STRUCT_TOP_PAD) * this.cellHeight;
    const sPixelH = Math.max(1, Math.round(sLogicalH * scale));
    if (!block.structCanvas) {
      block.structCanvas = document.createElement('canvas');
    }
    if (block.structCanvas.width !== pixelW || block.structCanvas.height !== sPixelH) {
      block.structCanvas.width = pixelW;
      block.structCanvas.height = sPixelH;
    }
    const sctx = block.structCanvas.getContext('2d');
    if (!sctx) {
      block.incomplete = incomplete;
      return;
    }

    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, pixelW, sPixelH);
    sctx.setTransform(scale, 0, 0, scale, 0, 0);
    sctx.translate(0, STRUCT_TOP_PAD * this.cellHeight);
    sctx.imageSmoothingEnabled = false;
    sctx.font = `${MICRO_FONT_SIZE}px ${this.microFontStack}`;
    sctx.textBaseline = 'top';
    sctx.textAlign = 'left';

    const getLocalOrWorld = (lx: number, ly: number): Cell | null => {
      if (lx >= 0 && lx < BLOCK_SIZE && ly >= 0 && ly < BLOCK_SIZE) {
        return cells[ly * BLOCK_SIZE + lx];
      }
      return world.getCell(wx0 + lx, wy0 + ly);
    };

    // Painter's order: North (ly=0) -> South (ly=15)
    for (let ly = 0; ly < BLOCK_SIZE; ly++) {
      const wy = wy0 + ly;
      const basePy = ly * this.cellHeight;
      for (let lx = 0; lx < BLOCK_SIZE; lx++) {
        const cell = cells[ly * BLOCK_SIZE + lx];
        if (!cell) continue;
        const wx = wx0 + lx;
        const basePx = lx * this.cellWidth;

        if (cell.kind === 'wall') {
          this.bakeExtrudedWall(
            sctx,
            cell,
            wx,
            wy,
            basePx,
            basePy,
            isWallWallKind(getLocalOrWorld(lx, ly - 1)),
            isWallWallKind(getLocalOrWorld(lx, ly + 1)),
            isWallWallKind(getLocalOrWorld(lx + 1, ly)),
            isWallWallKind(getLocalOrWorld(lx - 1, ly))
          );
        } else if (cell.kind === 'quarry_rock') {
          this.bakeExtrudedCliff(
            sctx,
            cell,
            wx,
            wy,
            basePx,
            basePy,
            getLocalOrWorld(lx, ly - 1)?.kind === 'quarry_rock',
            getLocalOrWorld(lx, ly + 1)?.kind === 'quarry_rock'
          );
        } else if (
          cell.kind === 'tree_trunk' ||
          cell.kind === 'blood_tree' ||
          cell.kind === 'dead_tree'
        ) {
          this.bakeTreeTrunk(sctx, cell, wx, wy, basePx, basePy);
        } else if (
          cell.kind === 'tombstone' ||
          cell.kind === 'monolith' ||
          cell.kind === 'menhir' ||
          cell.kind === 'wagon' ||
          cell.kind === 'signpost' ||
          cell.kind === 'statue'
        ) {
          this.bakeWorldProp(sctx, cell, wx, wy, basePx, basePy);
        }

        if (cell.overhangChar && cell.overhangColor) {
          this.bakeCanopyMicroTiles(
            sctx,
            cell.overhangColor,
            wx,
            wy,
            basePx,
            basePy,
            true,
            cell.overhangChar
          );
        }
      }
    }

    block.incomplete = incomplete;
  }

  private bakeExtrudedWall(
    ctx: CanvasRenderingContext2D,
    cell: Cell,
    wx: number,
    wy: number,
    basePx: number,
    basePy: number,
    wN: boolean,
    wS: boolean,
    wE: boolean,
    wW: boolean
  ): void {
    const isWood = isWoodWallCell(cell);
    const isIronWall = cell.bg === PALETTE.cellBg.ironWall;
    const isMarbleWall = cell.bg === PALETTE.cellBg.marbleWall;
    const isRuin = isRuinWallCell(cell);
    const isRedBrick = !isWood && !isIronWall && !isMarbleWall && isRedBrickColor(cell.color);

    // 4 micro-rows tall (sy = -2..1 -> 24px = 2x tile height) for intact stone,
    // 3..4 micro-rows for weathered ruins & wooden palisades
    const erodeHash = microHash(wx, wy, 203);
    let topSy = -2;
    if (isWood) {
      topSy = erodeHash > 0.65 ? -2 : -1;
    } else if (isRuin && erodeHash > 0.45 && !wS) {
      topSy = -1;
    }

    // Opaque deep silhouette backing so rear ground & terrain stay solidly occluded
    ctx.fillStyle = '#07090e';
    ctx.fillRect(basePx, basePy + topSy * MICRO_H, this.cellWidth + 0.3, (2 - topSy) * MICRO_H + 0.4);

    // Directional color ramp (Crest -> Upper -> Mid -> Plinth Shadow)
    const palette = isWood
      ? ['#8f6f52', '#735840', '#594331', '#3b2c1f']
      : isIronWall
        ? ['#686275', '#4c4757', '#35313d', '#1e1b24']
        : isMarbleWall
          ? ['#f0ece1', '#d6d2c7', '#b5b1a6', '#7d7a72']
          : isRedBrick
            ? ['#a36e66', '#855750', '#66423d', '#422a27']
            : ['#9ea8b8', '#788294', '#565f70', '#343b47'];

    for (let sy = topSy; sy <= 1; sy++) {
      const py = basePy + sy * MICRO_H;
      const isCrest = sy === topSy;
      const isPlinth = sy === 1;

      for (let sx = 0; sx < SUB_X; sx++) {
        const mx = wx * SUB_X + sx;
        const my = wy * SUB_Y + sy;
        const h = microHash(mx, my, 409);
        const mossChance = !isIronWall && !isMarbleWall && isRuin && h > 0.84;

        let glyph: string;
        let color: string;

        if (isWood) {
          glyph = isCrest ? (sx === 0 ? '#' : '=') : sy === 0 ? '|' : h < 0.5 ? ':' : '|';
          color = palette[Math.min(3, sy - topSy)];
        } else if (isCrest) {
          // Sunlit cornice / parapet crown
          if (wS) {
            glyph = h < 0.45 ? '%' : h < 0.8 ? '=' : '#';
            color = !wN || (!wW && sx === 0) ? palette[0] : palette[2];
          } else {
            const crenel = !wN && !wS && (mx & 1) === 0;
            glyph = crenel ? '@' : h < 0.5 ? '=' : '#';
            color = !wE && sx === 1 ? palette[1] : palette[0];
          }
        } else if (wS) {
          // Wall top continuing southward: flat battlement stonework with subtle bevel
          glyph = !wE && sx === 1 ? ':' : h < 0.35 ? '%' : h < 0.72 ? '=' : '#';
          color = !wW && sx === 0 ? palette[1] : !wE && sx === 1 ? palette[3] : palette[2];
        } else {
          // Exposed south-facing 2.5D vertical masonry facade graded from @/# down to -/:
          const depth = sy - topSy; // 1 = upper, 2 = mid, 3 = plinth
          if (depth === 1) {
            glyph = h < 0.42 ? '@' : h < 0.82 ? '#' : '%';
            color = !wE && sx === 1 ? palette[2] : palette[1];
          } else if (depth === 2) {
            glyph = h < 0.32 ? '#' : h < 0.72 ? '%' : '=';
            color = !wE && sx === 1 ? palette[3] : palette[2];
          } else {
            // Plinth / ground contact shadow base
            glyph = h < 0.25 ? '%' : h < 0.65 ? '-' : ':';
            color = palette[3];
          }
        }

        if (mossChance && !isCrest) {
          color = isPlinth ? '#2d4533' : '#3b5942';
          glyph = sy === 1 ? ':' : '%';
        }

        // Subtle warm highlight rim on sunlit left vertical corners
        if (!wW && sx === 0 && !isPlinth && !mossChance && h > 0.35) {
          color = isCrest ? '#bac4d4' : palette[Math.max(0, sy - topSy - 1)];
        }

        ctx.fillStyle = color;
        ctx.fillText(glyph, basePx + sx * MICRO_W, py);
      }
    }
  }

  private bakeExtrudedCliff(
    ctx: CanvasRenderingContext2D,
    cell: Cell,
    wx: number,
    wy: number,
    basePx: number,
    basePy: number,
    rN: boolean,
    rS: boolean
  ): void {
    const hBase = microHash(wx, wy, 521);
    const c = cell.color.toLowerCase();
    const isBasalt =
      c === '#4b4552' ||
      c === '#5c5463' ||
      c === '#3a3540' ||
      c === '#574e59' ||
      c === '#6b5e66' ||
      c === '#423b45';
    const topSy = hBase > 0.32 ? -2 : -1;

    ctx.fillStyle = '#080a0f';
    ctx.fillRect(basePx, basePy + topSy * MICRO_H, this.cellWidth + 0.3, (2 - topSy) * MICRO_H + 0.4);

    const pal = isBasalt
      ? ['#63596b', '#4d4554', '#38323d', '#242029']
      : ['#8d97a8', '#6a7485', '#4c5463', '#2d333d'];

    for (let sy = topSy; sy <= 1; sy++) {
      const py = basePy + sy * MICRO_H;
      const depth = sy - topSy;
      for (let sx = 0; sx < SUB_X; sx++) {
        const mx = wx * SUB_X + sx;
        const my = wy * SUB_Y + sy;
        const h = microHash(mx, my, 557);

        let glyph: string;
        if (sy === topSy) {
          glyph = !rN ? (sx === 0 ? '/' : '\\') : h < 0.5 ? '@' : '#';
        } else if (depth === 1) {
          glyph = h < 0.35 ? '@' : h < 0.7 ? '#' : '%';
        } else if (!rS && sy === 1) {
          glyph = h < 0.45 ? ':' : '-';
        } else {
          glyph = h < 0.4 ? '%' : h < 0.75 ? '=' : ':';
        }

        const cIdx = Math.min(pal.length - 1, depth + (!rN && sy === topSy ? 0 : sx === 1 ? 1 : 0));
        ctx.fillStyle = pal[cIdx];
        ctx.fillText(glyph, basePx + sx * MICRO_W, py);
      }
    }
  }

  private bakeTreeTrunk(
    ctx: CanvasRenderingContext2D,
    cell: Cell,
    _wx: number,
    _wy: number,
    basePx: number,
    basePy: number
  ): void {
    const glyph = cell.kind === 'dead_tree' ? 'Y' : 'T';
    ctx.font = `${this.baseFontSize}px ${this.microFontStack}`;
    ctx.fillStyle = cell.color;
    ctx.fillText(glyph, basePx + 0.5, basePy + 0.5);
    ctx.font = `${MICRO_FONT_SIZE}px ${this.microFontStack}`;
  }

  private bakeCanopyMicroTiles(
    ctx: CanvasRenderingContext2D,
    baseColorHex: string,
    _wx: number,
    _wy: number,
    basePx: number,
    basePy: number,
    _drawBacking: boolean,
    overhangChar = '♣\uFE0E'
  ): void {
    ctx.font = `${this.baseFontSize}px ${this.microFontStack}`;
    ctx.fillStyle = baseColorHex;
    ctx.fillText(overhangChar, basePx + 0.5, basePy + 0.5);
    ctx.font = `${MICRO_FONT_SIZE}px ${this.microFontStack}`;
  }

  private bakeWorldProp(
    ctx: CanvasRenderingContext2D,
    cell: Cell,
    _wx: number,
    _wy: number,
    basePx: number,
    basePy: number
  ): void {
    if (cell.kind === 'tombstone') {
      ctx.fillStyle = '#090a0e';
      ctx.fillRect(basePx + 1, basePy - 2, this.cellWidth - 2, this.cellHeight + 2);
      ctx.fillStyle = '#b4bdcc';
      ctx.fillText('/', basePx, basePy - 2);
      ctx.fillText('\\', basePx + MICRO_W, basePy - 2);
      ctx.fillStyle = '#7f8999';
      ctx.fillText('|', basePx, basePy + MICRO_H - 1);
      ctx.fillText(':', basePx + MICRO_W, basePy + MICRO_H - 1);
    } else if (cell.kind === 'monolith' || cell.kind === 'menhir') {
      const isRunic = cell.kind === 'monolith';
      ctx.fillStyle = '#090b10';
      ctx.fillRect(basePx, basePy - MICRO_H * 2, this.cellWidth, MICRO_H * 4);
      const crest = isRunic ? '#b8f0ff' : '#adb8c7';
      const body = isRunic ? '#5c8c99' : '#6e7787';
      const base = '#3b424f';
      for (let sy = -2; sy <= 1; sy++) {
        const py = basePy + sy * MICRO_H;
        ctx.fillStyle = sy === -2 ? crest : sy === 1 ? base : body;
        ctx.fillText(sy === -2 ? '/' : sy === 0 && isRunic ? '*' : '#', basePx, py);
        ctx.fillText(sy === -2 ? '\\' : '|', basePx + MICRO_W, py);
      }
    } else if (cell.kind === 'wagon') {
      ctx.fillStyle = '#140e09';
      ctx.fillRect(basePx, basePy, this.cellWidth, this.cellHeight);
      ctx.fillStyle = '#a37e5c';
      ctx.fillText('#', basePx, basePy);
      ctx.fillText('=', basePx + MICRO_W, basePy);
      ctx.fillStyle = '#73563d';
      ctx.fillText('o', basePx, basePy + MICRO_H);
      ctx.fillText('o', basePx + MICRO_W, basePy + MICRO_H);
    } else if (cell.kind === 'signpost') {
      ctx.fillStyle = '#e0a95e';
      ctx.fillText('=', basePx, basePy);
      ctx.fillText('=', basePx + MICRO_W, basePy);
      ctx.fillStyle = '#9e6f34';
      ctx.fillText('|', basePx, basePy + MICRO_H);
      ctx.fillText(':', basePx + MICRO_W, basePy + MICRO_H);
    } else if (cell.kind === 'statue') {
      ctx.fillStyle = '#1b1c20';
      ctx.fillRect(basePx, basePy - MICRO_H, this.cellWidth, MICRO_H * 3);
      ctx.fillStyle = '#f5f2e6';
      ctx.fillText(cell.char, basePx + 1.5, basePy - MICRO_H);
      ctx.fillStyle = '#d4cfc2';
      ctx.fillText('#', basePx, basePy);
      ctx.fillText('#', basePx + MICRO_W, basePy);
      ctx.fillStyle = '#8f8b80';
      ctx.fillText('=', basePx, basePy + MICRO_H);
      ctx.fillText('=', basePx + MICRO_W, basePy + MICRO_H);
    }
  }

  // =========================================================================
  // LIVE WATER REFLECTIONS & CONCENTRIC RIPPLES
  // =========================================================================

  private updateWaterRipples(world: World, player: Player, elapsedTime: number): void {
    const dt =
      this.lastElapsedTime > 0
        ? Math.min(0.1, Math.max(0, elapsedTime - this.lastElapsedTime))
        : 0.016;
    this.lastElapsedTime = elapsedTime;

    for (let i = this.waterRipples.length - 1; i >= 0; i--) {
      const r = this.waterRipples[i];
      r.age += dt;
      if (r.age >= r.maxAge) {
        this.waterRipples.splice(i, 1);
      }
    }

    if (this.rippleSpawnCooldown > 0) {
      this.rippleSpawnCooldown -= dt * (player.isSprinting || player.isDashing ? 1.8 : 1.0);
    }

    const moving = player.isMoving || player.isDashing || Math.hypot(player.vx, player.vy) > 0.8;
    if (!moving || this.rippleSpawnCooldown > 0) return;

    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    const footCell = world.getCell(px, py);
    let waterDistSq = isWaterKind(footCell?.kind) ? 0 : 999;
    let rippleX = player.x;
    let rippleY = player.y + 0.1;

    if (waterDistSq > 0) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const c = world.getCell(px + dx, py + dy);
          if (!isWaterKind(c?.kind)) continue;
          const cx = px + dx + 0.5;
          const cy = py + dy + 0.5;
          const dSq = (cx - player.x) * (cx - player.x) + (cy - player.y) * (cy - player.y);
          if (dSq < waterDistSq) {
            waterDistSq = dSq;
            rippleX = player.x + (cx - player.x) * 0.45;
            rippleY = player.y + (cy - player.y) * 0.45;
          }
        }
      }
    }

    if (waterDistSq <= 6.8) {
      const fast = player.isSprinting || player.isDashing;
      this.waterRipples.push({
        x: rippleX,
        y: rippleY,
        age: 0,
        maxAge: fast ? 1.18 : 1.02,
        maxRadius: fast ? 4.8 : 3.6,
      });
      if (this.waterRipples.length > 18) {
        this.waterRipples.shift();
      }
      this.rippleSpawnCooldown = 0.23;
    }
  }

  private renderWaterSurface(
    ctx: CanvasRenderingContext2D,
    world: World,
    player: Player,
    lighting: LightingSystem,
    environment: EnvironmentSystem,
    ambient: AmbientLightProfile,
    elapsedTime: number,
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number
  ): void {
    const colCount = maxCol - minCol + 1;
    if (colCount > this.colReflectRow.length) {
      this.colReflectRow = new Int32Array(colCount + 32);
      this.colReflectKind = new Array(colCount + 32).fill(null);
      this.colReflectColor = new Array(colCount + 32).fill('');
      this.colReflectHeight = new Uint8Array(colCount + 32);
    }

    ctx.font = `${MICRO_FONT_SIZE}px ${this.microFontStack}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    const scanStartRow = minRow - 6;
    for (let i = 0; i < colCount; i++) {
      this.colReflectRow[i] = -99999;
      this.colReflectKind[i] = null;
      this.colReflectColor[i] = '';
      this.colReflectHeight[i] = 0;
    }

    const skyAnchorX =
      this.camera.x +
      Math.sin(this.camera.x * 0.014) * 3.5 +
      (environment.timeOfDay - 0.5) * 14;
    const skyAnchorY = this.camera.y - 4.2;
    const isNightSky = ambient.nightFactor >= 0.45;
    const showSunOrMoon = !isNightSky ? environment.rainIntensity < 0.78 : environment.rainIntensity < 0.85;
    const lanternLit = (player.lanternOn && player.oil > 0) || player.hasTorchLit;
    const illum = this.scratchIllum;

    // Track per-column inverted reflections cleanly in one top-to-bottom scan
    for (let row = scanStartRow; row <= maxRow; row++) {
      const visibleRow = row >= minRow;
      const tilePy = row * this.cellHeight;

      for (let col = minCol; col <= maxCol; col++) {
        const cIdx = col - minCol;
        const cell = world.getCell(col, row);
        if (!cell) {
          this.colReflectKind[cIdx] = null;
          continue;
        }

        if (isVerticalReflectorKind(cell.kind)) {
          this.colReflectRow[cIdx] = row;
          this.colReflectKind[cIdx] = cell.kind;
          this.colReflectColor[cIdx] =
            cell.kind === 'brazier'
              ? '#ff9d3b'
              : cell.kind === 'tree_trunk'
                ? '#4c753d'
                : cell.kind === 'blood_tree'
                  ? '#9c2d3f'
                  : cell.color;
          this.colReflectHeight[cIdx] =
            cell.kind === 'wall' || cell.kind === 'quarry_rock' ? 5 : cell.kind === 'bridge' ? 2 : 4;
          continue;
        }

        if (cell.overhangChar && cell.overhangColor) {
          this.colReflectRow[cIdx] = row;
          this.colReflectKind[cIdx] = 'tree_canopy';
          this.colReflectColor[cIdx] = cell.overhangColor;
          this.colReflectHeight[cIdx] = 4;
          continue;
        }

        if (!isWaterKind(cell.kind)) {
          if (row - this.colReflectRow[cIdx] > 1) {
            this.colReflectKind[cIdx] = null;
          }
          continue;
        }

        if (!visibleRow) continue;

        lighting.sampleCellInto(col, row, illum);
        if (!illum.explored && illum.intensity <= 0.015) continue;

        const tilePx = col * this.cellWidth;
        const reflectDist = row - this.colReflectRow[cIdx];
        const refKind = this.colReflectKind[cIdx];
        const hasBankReflect =
          refKind !== null && reflectDist >= 1 && reflectDist <= this.colReflectHeight[cIdx];

        for (let sy = 0; sy < SUB_Y; sy++) {
          const my = row * SUB_Y + sy;
          const py = tilePy + sy * MICRO_H;
          const wyCenter = (my + 0.5) / SUB_Y;

          for (let sx = 0; sx < SUB_X; sx++) {
            const mx = col * SUB_X + sx;
            const px = tilePx + sx * MICRO_W;
            const wxCenter = (mx + 0.5) / SUB_X;

            // 1. Concentric circular player ripple rings ((  ))
            let rippleChar: string | null = null;
            let rippleColor = '';
            for (let rIdx = this.waterRipples.length - 1; rIdx >= 0; rIdx--) {
              const rp = this.waterRipples[rIdx];
              const progress = rp.age / rp.maxAge;
              const radius = 0.45 + progress * rp.maxRadius;
              const dx = wxCenter - rp.x;
              const dy = (wyCenter - rp.y) * 1.48;
              const dist = Math.hypot(dx, dy);
              if (Math.abs(dist - radius) < 0.36 || (radius > 1.3 && Math.abs(dist - radius * 0.58) < 0.3)) {
                const fade = 1 - progress;
                rippleChar =
                  Math.abs(dx) > Math.abs(dy) * 0.68
                    ? dx < 0
                      ? '('
                      : ')'
                    : dy < 0
                      ? '~'
                      : '_';
                rippleColor =
                  fade > 0.65 ? '#9ce6ff' : fade > 0.32 ? '#4ca3c7' : '#245269';
                break;
              }
            }

            if (rippleChar) {
              ctx.fillStyle = rippleColor;
              ctx.fillText(rippleChar, px, py);
              continue;
            }

            // 2. Inverted player silhouette reflection south of player feet
            const pRelY = wyCenter - player.y;
            if (pRelY >= 0.15 && pRelY <= 3.55 && Math.abs(wxCenter - player.x) <= 2.2) {
              const wobble = Math.sin(elapsedTime * 4.4 + wyCenter * 3.8) * 0.32;
              const pRelX = wxCenter - player.x + wobble;
              const halfSpan = pRelY < 1.35 ? 0.92 : pRelY < 2.35 ? 0.62 : 0.32;
              if (Math.abs(pRelX) <= halfSpan) {
                const waveToggle = ((Math.floor(elapsedTime * 5) + mx + my) & 1) === 0;
                const ch =
                  Math.abs(pRelX) > halfSpan * 0.68
                    ? pRelX < 0
                      ? '('
                      : ')'
                    : waveToggle
                      ? '~'
                      : ':';
                ctx.fillStyle = lanternLit && pRelY < 1.9 ? '#9e743c' : '#4a647a';
                ctx.fillText(ch, px, py);
                continue;
              }
            }

            // 3. Inverted shore walls, tree canopies & torchlight reflections
            if (hasBankReflect) {
              const wobble =
                Math.sin(elapsedTime * 3.1 + my * 1.2 + mx * 0.45) * (0.28 + reflectDist * 0.12);
              const mirrorX = Math.round(col + wobble * 0.45);
              if (mirrorX === col || microHash(mx, my, 809) > 0.32) {
                const fade = Math.max(0.18, 1 - reflectDist / (this.colReflectHeight[cIdx] + 0.8));
                const rgb = this.getRgb(this.colReflectColor[cIdx] || '#6b788c');
                ctx.fillStyle = tintTowardWater(rgb, fade);
                const rCh =
                  REFLECT_CHARS[
                    Math.floor(microHash(mx, my + Math.floor(elapsedTime * 2), 827) * REFLECT_CHARS.length) %
                      REFLECT_CHARS.length
                  ];
                ctx.fillText(rCh, px, py);
                continue;
              }
            }

            // 4. Shimmering Sun or Moon sky reflection column
            if (showSunOrMoon) {
              const sdx = wxCenter - skyAnchorX + Math.sin(elapsedTime * 2.8 + wyCenter * 2.4) * 0.42;
              const sdy = wyCenter - skyAnchorY;
              const columnWidth = sdy >= -1.8 && sdy <= 0.6 ? 1.55 : sdy > 0.6 && sdy < 5.6 ? 0.95 : 0;
              if (columnWidth > 0 && Math.abs(sdx) <= columnWidth) {
                const shimmer = Math.sin(elapsedTime * 4.5 + wyCenter * 2.9 + wxCenter * 1.3);
                if (shimmer > -0.15) {
                  const ch =
                    Math.abs(sdx) > columnWidth * 0.65
                      ? sdx < 0
                        ? '('
                        : ')'
                      : shimmer > 0.55
                        ? '~'
                        : '-';
                  ctx.fillStyle = isNightSky
                    ? shimmer > 0.5
                      ? '#a9c7ed'
                      : '#627fa6'
                    : shimmer > 0.5
                      ? '#f2c96b'
                      : '#b88c3b';
                  ctx.fillText(ch, px, py);
                  continue;
                }
              }
            }

            // 5. Base dark water surface ripple texture
            if (cell.kind === 'river_water') {
              const flowPhase = Math.sin(elapsedTime * 2.8 + mx * 0.55 + my * 1.15);
              const hWater = microHash(mx, my, 853);
              const ch = flowPhase > 0.4 ? '~' : hWater < 0.45 ? '≈' : hWater < 0.78 ? '-' : '~';
              ctx.fillStyle =
                flowPhase > 0.58 ? '#3b95ba' : flowPhase > -0.15 ? '#1f6485' : '#123e57';
              ctx.fillText(ch, px, py);
            } else {
              const wavePhase = Math.sin(elapsedTime * 2.0 + mx * 0.62 + my * 1.18);
              const hWater = microHash(mx, my, 853);
              const ch =
                wavePhase > 0.45
                  ? '~'
                  : hWater < 0.34
                    ? '-'
                    : hWater < 0.68
                      ? '_'
                      : ':';
              ctx.fillStyle = wavePhase > 0.55 ? '#1b4a61' : wavePhase > -0.2 ? '#123347' : '#0b2130';
              ctx.fillText(ch, px, py);
            }
          }
        }
      }
    }
  }

  private renderWaterHighlightsPostLight(
    ctx: CanvasRenderingContext2D,
    world: World,
    lighting: LightingSystem,
    environment: EnvironmentSystem,
    ambient: AmbientLightProfile,
    elapsedTime: number,
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number
  ): void {
    const isNight = ambient.nightFactor >= 0.45;
    if (!isNight && this.waterRipples.length === 0) return;

    ctx.font = `${MICRO_FONT_SIZE}px ${this.microFontStack}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    const skyAnchorX =
      this.camera.x +
      Math.sin(this.camera.x * 0.014) * 3.5 +
      (environment.timeOfDay - 0.5) * 14;
    const skyAnchorY = this.camera.y - 4.2;
    const illum = this.scratchIllum;

    // Subtle moonlight reflection shimmer strictly in LOS at night
    if (isNight && environment.rainIntensity < 0.85) {
      const rStart = Math.max(minRow, Math.floor(skyAnchorY - 2));
      const rEnd = Math.min(maxRow, Math.ceil(skyAnchorY + 6));
      const cStart = Math.max(minCol, Math.floor(skyAnchorX - 2.5));
      const cEnd = Math.min(maxCol, Math.ceil(skyAnchorX + 2.5));

      ctx.fillStyle = 'rgba(176, 212, 255, 0.44)';
      for (let row = rStart; row <= rEnd; row++) {
        for (let col = cStart; col <= cEnd; col++) {
          const cell = world.getCell(col, row);
          if (!isWaterKind(cell?.kind)) continue;
          lighting.sampleCellInto(col, row, illum);
          if (!illum.inLos) continue;
          const py = row * this.cellHeight + (row & 1) * MICRO_H;
          const px = col * this.cellWidth + ((col + Math.floor(elapsedTime * 3)) & 1) * MICRO_W;
          const s = Math.sin(elapsedTime * 4.2 + row * 2.5 + col * 1.4);
          if (s > 0.35) {
            ctx.fillText(s > 0.72 ? '~' : '-', px, py);
          }
        }
      }
    }

    // Crisp ripple crest sheen inside LOS so expanding ((  )) rings stay vivid at dusk/night
    for (let i = 0; i < this.waterRipples.length; i++) {
      const rp = this.waterRipples[i];
      const progress = rp.age / rp.maxAge;
      const radius = 0.45 + progress * rp.maxRadius;
      const fade = (1 - progress) * (isNight ? 0.55 : 0.35);
      if (fade <= 0.05) continue;

      const cMin = Math.max(minCol, Math.floor(rp.x - radius - 1));
      const cMax = Math.min(maxCol, Math.ceil(rp.x + radius + 1));
      const rMin = Math.max(minRow, Math.floor(rp.y - radius - 1));
      const rMax = Math.min(maxRow, Math.ceil(rp.y + radius + 1));

      ctx.fillStyle = `rgba(148, 224, 255, ${fade.toFixed(2)})`;
      for (let row = rMin; row <= rMax; row++) {
        for (let col = cMin; col <= cMax; col++) {
          const cell = world.getCell(col, row);
          if (!isWaterKind(cell?.kind)) continue;
          lighting.sampleCellInto(col, row, illum);
          if (!illum.inLos) continue;

          for (let sy = 0; sy < SUB_Y; sy++) {
            const wyCenter = row + (sy + 0.5) / SUB_Y;
            for (let sx = 0; sx < SUB_X; sx++) {
              const wxCenter = col + (sx + 0.5) / SUB_X;
              const dx = wxCenter - rp.x;
              const dy = (wyCenter - rp.y) * 1.48;
              const dist = Math.hypot(dx, dy);
              if (Math.abs(dist - radius) < 0.32) {
                const ch =
                  Math.abs(dx) > Math.abs(dy) * 0.68
                    ? dx < 0
                      ? '('
                      : ')'
                    : dy < 0
                      ? '~'
                      : '_';
                ctx.fillText(ch, col * this.cellWidth + sx * MICRO_W, row * this.cellHeight + sy * MICRO_H);
              }
            }
          }
        }
      }
    }
  }

  // =========================================================================
  // DYNAMIC SHADOWCAST LIGHTMAP & ADDITIVE GLOWMAP
  // =========================================================================

  private compositeLightmap(
    ctx: CanvasRenderingContext2D,
    world: World,
    lighting: LightingSystem,
    ambient: AmbientLightProfile,
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number
  ): void {
    const cols = maxCol - minCol + 1;
    const rows = maxRow - minRow + 1;
    if (cols <= 0 || rows <= 0) return;

    if (
      cols !== this.lightGridW ||
      rows !== this.lightGridH ||
      !this.lightImgData ||
      !this.lightBlurBuf ||
      !this.glowImgData
    ) {
      this.lightGridW = cols;
      this.lightGridH = rows;
      this.lightCanvas.width = cols;
      this.lightCanvas.height = rows;
      this.glowCanvas.width = cols;
      this.glowCanvas.height = rows;
      this.lightImgData = this.lightCtx.createImageData(cols, rows);
      this.lightBlurBuf = new Uint8ClampedArray(cols * rows * 4);
      this.glowImgData = this.glowCtx.createImageData(cols, rows);
    }

    const lightData = this.lightImgData.data;
    const blurBuf = this.lightBlurBuf;
    const glowData = this.glowImgData.data;
    const sun = ambient.sunlight;
    const nf = ambient.nightFactor;
    const dayFactor = 1 - nf;
    const dayAmbientScale = 0.84 + ambient.ambientStrength * 0.16;

    // Soft ambient / explored shadow color:
    // - Daytime: ~45% brightness with subtle cool slate tint (never pitch-black stripes)
    // - Nighttime: deep darkness outside light reach
    const memR = Math.round(8 + dayFactor * (108 * dayAmbientScale - 8));
    const memG = Math.round(10 + dayFactor * (117 * dayAmbientScale - 10));
    const memB = Math.round(18 + dayFactor * (134 * dayAmbientScale - 18));

    // Unexplored shadow color: deeper cool slate in daytime, true darkness at night
    const unexpR = Math.round(3 + dayFactor * 39);
    const unexpG = Math.round(4 + dayFactor * 44);
    const unexpB = Math.round(9 + dayFactor * 52);

    const illum = this.scratchIllum;
    const belowIllum = this.scratchNeighborIllum;

    for (let ry = 0; ry < rows; ry++) {
      const row = minRow + ry;
      for (let rx = 0; rx < cols; rx++) {
        const col = minCol + rx;
        const idx = (ry * cols + rx) * 4;

        lighting.sampleCellInto(col, row, illum);
        let inLos = illum.inLos;
        let explored = illum.explored;
        let intensity = illum.intensity;
        let warmth = illum.warmth;
        let cyanGlow = illum.cyanGlow;

        // Keep 2.5D upward-extruded stone wall & cliff crowns illuminated when standing directly south
        if (!inLos || intensity <= 0.025) {
          const below = world.getCell(col, row + 1);
          if (below && (below.kind === 'wall' || below.kind === 'quarry_rock')) {
            lighting.sampleCellInto(col, row + 1, belowIllum);
            if (belowIllum.inLos && belowIllum.intensity > 0.025) {
              inLos = true;
              explored = true;
              intensity = belowIllum.intensity;
              warmth = belowIllum.warmth;
              cyanGlow = belowIllum.cyanGlow;
            }
          }
        }

        if (!explored && intensity <= 0.015) {
          blurBuf[idx] = unexpR;
          blurBuf[idx + 1] = unexpG;
          blurBuf[idx + 2] = unexpB;
          blurBuf[idx + 3] = 255;
          glowData[idx + 3] = 0;
          continue;
        }

        const isLit = inLos && intensity > 0.02;
        if (!isLit) {
          blurBuf[idx] = memR;
          blurBuf[idx + 1] = memG;
          blurBuf[idx + 2] = memB;
          blurBuf[idx + 3] = 255;
          glowData[idx + 3] = 0;
          continue;
        }

        const iNorm = Math.min(1, Math.pow(intensity, 1.05));
        const envMix =
          sun > 0.25 ? 0.06 + sun * 0.04 : (1 - warmth * 0.75) * (0.14 + nf * 0.34);

        let lr = 255 + (ambient.tintR - 255) * envMix;
        let lg = 255 + (ambient.tintG - 255) * envMix;
        let lb = 255 + (ambient.tintB - 255) * envMix;

        if (warmth > 0.03) {
          const wm = Math.max(0, warmth * (0.4 - sun * 0.24));
          lr += (255 - lr) * wm;
          lg += (206 - lg) * wm;
          lb += (132 - lb) * wm;
        }

        if (cyanGlow > 0.03) {
          const cm = cyanGlow * 0.38;
          lr += (158 - lr) * cm;
          lg += (246 - lg) * cm;
          lb += (242 - lb) * cm;
        }

        blurBuf[idx] = Math.round(memR + (lr - memR) * iNorm);
        blurBuf[idx + 1] = Math.round(memG + (lg - memG) * iNorm);
        blurBuf[idx + 2] = Math.round(memB + (lb - memB) * iNorm);
        blurBuf[idx + 3] = 255;

        const sunLift = sun > 0.25 ? Math.round(sun * iNorm * 16) : 0;

        if (warmth > 0.08) {
          const w2 = warmth * warmth * (1 - sun * 0.68);
          glowData[idx] = Math.min(255, Math.round(w2 * 68) + sunLift);
          glowData[idx + 1] = Math.min(255, Math.round(w2 * 38) + sunLift);
          glowData[idx + 2] = Math.min(255, Math.round(w2 * 11) + sunLift);
          glowData[idx + 3] = 255;
        } else if (cyanGlow > 0.1) {
          const c2 = cyanGlow * cyanGlow;
          glowData[idx] = Math.min(255, Math.round(c2 * 14) + sunLift);
          glowData[idx + 1] = Math.min(255, Math.round(c2 * 58) + sunLift);
          glowData[idx + 2] = Math.min(255, Math.round(c2 * 66) + sunLift);
          glowData[idx + 3] = 255;
        } else if (sunLift > 0) {
          glowData[idx] = sunLift;
          glowData[idx + 1] = sunLift;
          glowData[idx + 2] = sunLift;
          glowData[idx + 3] = 255;
        } else {
          glowData[idx + 3] = 0;
        }
      }
    }

    // Gentle 5-tap spatial smoothing on the lightmap to soften cell-to-cell transitions
    const rowStride = cols * 4;
    for (let ry = 0; ry < rows; ry++) {
      const upOff = ry > 0 ? -rowStride : 0;
      const dnOff = ry < rows - 1 ? rowStride : 0;
      for (let rx = 0; rx < cols; rx++) {
        const idx = (ry * cols + rx) * 4;
        const ltOff = rx > 0 ? -4 : 0;
        const rtOff = rx < cols - 1 ? 4 : 0;

        lightData[idx] =
          (blurBuf[idx] * 52 +
            (blurBuf[idx + ltOff] +
              blurBuf[idx + rtOff] +
              blurBuf[idx + upOff] +
              blurBuf[idx + dnOff]) *
              12) /
          100;
        lightData[idx + 1] =
          (blurBuf[idx + 1] * 52 +
            (blurBuf[idx + ltOff + 1] +
              blurBuf[idx + rtOff + 1] +
              blurBuf[idx + upOff + 1] +
              blurBuf[idx + dnOff + 1]) *
              12) /
          100;
        lightData[idx + 2] =
          (blurBuf[idx + 2] * 52 +
            (blurBuf[idx + ltOff + 2] +
              blurBuf[idx + rtOff + 2] +
              blurBuf[idx + upOff + 2] +
              blurBuf[idx + dnOff + 2]) *
              12) /
          100;
        lightData[idx + 3] = 255;
      }
    }

    this.lightCtx.putImageData(this.lightImgData, 0, 0);
    this.glowCtx.putImageData(this.glowImgData, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      this.lightCanvas,
      minCol * this.cellWidth,
      minRow * this.cellHeight,
      cols * this.cellWidth,
      rows * this.cellHeight
    );

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.04;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      this.glowCanvas,
      minCol * this.cellWidth,
      minRow * this.cellHeight,
      cols * this.cellWidth,
      rows * this.cellHeight
    );
    ctx.restore();
  }

  /**
   * Renders low-contrast ASCII dithering (·, :, ░) across light-to-shadow transitions,
   * direct warm amber/golden tinting on terrain/wall glyphs, and grid-based
   * flickering ASCII light rings (inner gold, middle orange, outer amber->slate)
   * on open floor cells around the lantern and hearths.
   */
  private renderShadowDitheringAndWarmth(
    ctx: CanvasRenderingContext2D,
    world: World,
    player: Player,
    enemies: EnemyManager,
    lighting: LightingSystem,
    ambient: AmbientLightProfile,
    elapsedTime: number,
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number
  ): void {
    const illum = this.scratchIllum;
    const dayFactor = 1 - ambient.nightFactor;
    const ditherR = Math.round(44 + dayFactor * 54);
    const ditherG = Math.round(52 + dayFactor * 58);
    const ditherB = Math.round(74 + dayFactor * 58);
    const ditherColor = `rgb(${ditherR},${ditherG},${ditherB})`;

    this.occupiedLightRingCells.clear();
    this.occupiedLightRingCells.add(Math.floor(player.y) * 100000 + Math.floor(player.x));
    for (let i = 0; i < enemies.enemies.length; i++) {
      const e = enemies.enemies[i];
      if (!e.alive) continue;
      this.occupiedLightRingCells.add(Math.floor(e.y) * 100000 + Math.floor(e.x));
    }

    // 1. Direct warm amber/gold tinting of terrain & wall glyphs in lantern & hearth light
    ctx.save();
    ctx.globalCompositeOperation = 'color';
    for (let row = minRow; row <= maxRow; row++) {
      const py = row * this.cellHeight;
      for (let col = minCol; col <= maxCol; col++) {
        lighting.sampleCellInto(col, row, illum);
        if (!illum.inLos || illum.warmth <= 0.08) continue;

        const cell = world.getCell(col, row);
        if (!cell) continue;

        const tintAlpha = Math.min(0.84, illum.warmth * 0.8);
        ctx.fillStyle = `rgba(255, 194, 84, ${tintAlpha.toFixed(3)})`;
        ctx.fillRect(col * this.cellWidth, py, this.cellWidth, this.cellHeight);
      }
    }
    ctx.restore();

    // 2. Grid-based ASCII light rings (inner gold, mid orange, outer amber->slate) & shadow dithering
    const tick = Math.floor(elapsedTime * 6.5);
    const innerGlyphs = ['·', '˙', "'"] as const;
    const innerColors = ['#ffe58f', '#ffd166', '#ffb84d'] as const;
    const midGlyphs = [':', ';', '·', '░'] as const;
    const midColors = ['#f59e42', '#e87f2c', '#d96b27'] as const;
    const outerGlyphs = ['.', '·', ','] as const;

    ctx.save();
    ctx.font = `${MICRO_FONT_SIZE}px ${this.microFontStack}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    for (let row = minRow; row <= maxRow; row++) {
      const py = row * this.cellHeight;
      for (let col = minCol; col <= maxCol; col++) {
        const cell = world.getCell(col, row);
        if (
          !cell ||
          cell.solid ||
          cell.overhangChar ||
          isWaterKind(cell.kind) ||
          cell.kind === 'brazier' ||
          cell.kind === 'furnace' ||
          cell.kind === 'alch_lantern' ||
          cell.kind === 'lava' ||
          cell.kind === 'ember' ||
          cell.kind === 'wisp' ||
          cell.kind === 'quest_board' ||
          cell.kind === 'monolith' ||
          cell.kind === 'passage' ||
          cell.kind === 'signpost' ||
          cell.kind === 'statue'
        ) {
          continue;
        }

        lighting.sampleCellInto(col, row, illum);

        // Warm ASCII light rings on open floor cells (never over player/enemies)
        if (
          illum.inLos &&
          illum.warmth > 0.06 &&
          !this.occupiedLightRingCells.has(row * 100000 + col)
        ) {
          const cellNoise = microHash(col, row, 137);
          const tickNoise = microHash(col, row, 211 + tick);
          const w = Math.max(0, Math.min(1, illum.warmth + (tickNoise - 0.5) * 0.09));

          const subX = microHash(col, row, 19 + (tick & 3)) < 0.5 ? 0 : MICRO_W;
          const subY = microHash(col, row, 37 + ((tick >> 1) & 3)) < 0.5 ? 0 : MICRO_H;

          if (w >= 0.56) {
            // Inner zone: bright gold/amber with occasional flickering * or +
            if (cellNoise < 0.74) {
              const glyph =
                tickNoise > 0.84
                  ? tickNoise > 0.92
                    ? '*'
                    : '+'
                  : innerGlyphs[Math.floor(tickNoise * innerGlyphs.length) % innerGlyphs.length];
              const color = innerColors[Math.floor(cellNoise * innerColors.length) % innerColors.length];
              ctx.globalAlpha = Math.min(0.72, 0.4 + w * 0.3);
              ctx.fillStyle = color;
              ctx.fillText(glyph, col * this.cellWidth + subX, py + subY);
            }
            continue;
          } else if (w >= 0.25) {
            // Middle zone: warm orange shading ring (:, ;, ·, ░)
            if (cellNoise < 0.68) {
              const gIdx = Math.floor(((cellNoise + tickNoise * 0.25) % 1) * midGlyphs.length);
              const cIdx = Math.floor(cellNoise * midColors.length) % midColors.length;
              ctx.globalAlpha = 0.26 + w * 0.42;
              ctx.fillStyle = midColors[cIdx];
              ctx.fillText(midGlyphs[gIdx], col * this.cellWidth + subX, py + subY);
            }
            continue;
          } else if (w >= 0.06) {
            // Outer edge: sparse dots/commas transitioning from muted amber to cool slate grey
            const edgeT = (w - 0.06) / 0.19;
            if (cellNoise <= 0.32 + edgeT * 0.54) {
              const r = Math.round(92 + edgeT * 100);
              const g = Math.round(106 + edgeT * 26);
              const b = Math.round(128 - edgeT * 60);
              const gIdx = Math.floor(cellNoise * outerGlyphs.length) % outerGlyphs.length;
              ctx.globalAlpha = 0.16 + edgeT * 0.2;
              ctx.fillStyle = `rgb(${r},${g},${b})`;
              ctx.fillText(outerGlyphs[gIdx], col * this.cellWidth + subX, py + subY);
            }
            continue;
          }
        }

        // Shadow & penumbra dithering outside warm light rings
        let shadowLevel = 0;
        if (!illum.inLos) {
          shadowLevel = illum.explored ? 0.82 : 0.95;
        } else if (illum.intensity < 0.84) {
          shadowLevel = 1 - illum.intensity / 0.84;
        }

        if (shadowLevel <= 0.14) continue;

        const h = microHash(col, row, 71);
        let glyph = '';
        if (shadowLevel < 0.42) {
          if (h < 0.34) glyph = '·';
        } else if (shadowLevel < 0.72) {
          if (h < 0.34) glyph = '·';
          else if (h < 0.56) glyph = ':';
        } else {
          if (h < 0.28) glyph = ':';
          else if (h < 0.54) glyph = '░';
        }
        if (!glyph) continue;

        const baseAlpha = 0.08 + dayFactor * 0.05;
        ctx.globalAlpha = Math.min(0.24, baseAlpha + shadowLevel * 0.11);
        ctx.fillStyle = ditherColor;
        const subX = microHash(col, row, 19) < 0.5 ? 0 : MICRO_W;
        const subY = microHash(col, row, 37) < 0.5 ? 0 : MICRO_H;
        ctx.fillText(glyph, col * this.cellWidth + subX, py + subY);
      }
    }
    ctx.restore();
  }

  /**
   * Renders subtle, occasional flickering ember sparks (·, ˙, ') in the grid
   * around the lit player lantern and active campfires/braziers.
   */
  private renderLightSparks(
    ctx: CanvasRenderingContext2D,
    world: World,
    lighting: LightingSystem,
    elapsedTime: number,
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number
  ): void {
    const sparkGlyphs = ['·', '˙', "'"] as const;
    const sparkColors = ['#ffe89e', '#ffc266', '#ff943d'] as const;

    const drawCluster = (
      cx: number,
      cy: number,
      radiusCells: number,
      maxSparks: number,
      seedBase: number
    ) => {
      for (let s = 0; s < maxSparks; s++) {
        const rate = 2.1 + (s % 3) * 0.35;
        const t = elapsedTime * rate + microHash(seedBase, s, 11) * 10;
        const bucket = Math.floor(t);
        const phase = t - bucket;

        // Occasional: only ~42% of buckets emit a spark
        if (microHash(seedBase, bucket + s * 31, 29) > 0.42) continue;

        const angle = microHash(seedBase + bucket, s, 43) * Math.PI * 2;
        const dist = 0.45 + microHash(seedBase + bucket, s, 59) * (radiusCells - 0.45);
        const gx = Math.round((cx + Math.cos(angle) * dist * 1.3) * 2) / 2;
        const gy = Math.round((cy + Math.sin(angle) * dist - phase * 0.55) * 2) / 2;

        const alpha = Math.sin(phase * Math.PI) * 0.62;
        if (alpha <= 0.04) continue;

        const gIdx = Math.floor(microHash(seedBase + bucket, s, 73) * sparkGlyphs.length);
        const cIdx = Math.floor(microHash(seedBase + bucket, s, 89) * sparkColors.length);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = sparkColors[cIdx];
        ctx.fillText(sparkGlyphs[gIdx], gx * this.cellWidth, gy * this.cellHeight);
      }
    };

    ctx.save();
    ctx.font = `${MICRO_FONT_SIZE}px ${this.microFontStack}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    const lantern = lighting.getLanternGlowState();
    if (lantern.active) {
      drawCluster(lantern.x, lantern.y, 2.6, 3, 101);
    }

    const lights = world.getActiveLights();
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      if (!light.flicker) continue;
      if (
        light.x < minCol - 3 ||
        light.x > maxCol + 3 ||
        light.y < minRow - 3 ||
        light.y > maxRow + 3
      ) {
        continue;
      }
      if (lighting.getLosVisibility(Math.floor(light.x), Math.floor(light.y)) < 0.05) {
        continue;
      }
      const isWarm = light.color.includes('218') || light.color.includes('255, 92');
      if (!isWarm) continue;
      const seed = Math.round(light.x * 17 + light.y * 31);
      drawCluster(light.x, light.y, 3.4, 4, seed);
    }

    ctx.restore();
  }

  // =========================================================================
  // LIVE LUMINOUS PROPS (HEARTHS, LAVA, WISPS, QUEST BOARD)
  // =========================================================================

  private renderLiveWorldProps(
    ctx: CanvasRenderingContext2D,
    world: World,
    lighting: LightingSystem,
    elapsedTime: number,
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number
  ): void {
    const illum = this.scratchIllum;
    ctx.font = `${MICRO_FONT_SIZE}px ${this.microFontStack}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    for (let row = minRow; row <= maxRow; row++) {
      const py = row * this.cellHeight;
      for (let col = minCol; col <= maxCol; col++) {
        const cell = world.getCell(col, row);
        if (!cell) continue;
        const kind = cell.kind;
        if (
          kind !== 'brazier' &&
          kind !== 'furnace' &&
          kind !== 'alch_lantern' &&
          kind !== 'lava' &&
          kind !== 'ember' &&
          kind !== 'wisp' &&
          kind !== 'quest_board'
        ) {
          continue;
        }

        lighting.sampleCellInto(col, row, illum);
        if (!illum.inLos && kind !== 'lava') continue;

        const px = col * this.cellWidth;

        if (kind === 'brazier') {
          const flick = Math.sin(elapsedTime * 11 + col * 2.1 + row * 1.7);
          const hot = flick > 0.25 ? '#ffe375' : '#ff9933';
          const ember = flick > -0.2 ? '#ff6420' : '#ffaa44';

          ctx.fillStyle = '#240f06';
          ctx.fillRect(px, py - MICRO_H * 0.5, this.cellWidth, this.cellHeight + MICRO_H * 0.5);

          ctx.fillStyle = hot;
          ctx.fillText(flick > 0 ? '^' : '*', px, py - 2);
          ctx.fillText(flick > 0.3 ? '·' : '^', px + MICRO_W, py - 2);
          ctx.fillStyle = ember;
          ctx.fillText('#', px, py + MICRO_H * 0.5);
          ctx.fillText('@', px + MICRO_W, py + MICRO_H * 0.5);
          ctx.fillStyle = '#734a3a';
          ctx.fillText('=', px, py + MICRO_H);
          ctx.fillText('=', px + MICRO_W, py + MICRO_H);
        } else if (kind === 'furnace') {
          const lit = (cell.animSpeed ?? 0) > 0;
          const flick = Math.sin(elapsedTime * 9.5 + col * 1.9 + row * 2.3);
          ctx.fillStyle = lit ? '#2b1208' : '#1a1820';
          ctx.fillRect(px, py - MICRO_H, this.cellWidth, this.cellHeight + MICRO_H);
          ctx.fillStyle = lit ? '#594e5e' : '#4a4554';
          ctx.fillText('▲', px, py - MICRO_H);
          ctx.fillText('▲', px + MICRO_W, py - MICRO_H);
          ctx.font = `700 ${this.baseFontSize}px ${this.microFontStack}`;
          ctx.fillStyle = lit ? (flick > 0 ? '#ffa13b' : '#ff6420') : '#665e70';
          ctx.fillText('Ω', px + 0.5, py - 1);
          ctx.font = `${MICRO_FONT_SIZE}px ${this.microFontStack}`;
          if (lit && flick > 0.2) {
            ctx.fillStyle = '#ffe375';
            ctx.fillText('*', px + MICRO_W, py - MICRO_H * 1.4);
          }
        } else if (kind === 'alch_lantern') {
          const pulse = Math.sin(elapsedTime * 6.2 + col * 2.7 + row);
          ctx.fillStyle = '#091f18';
          ctx.fillRect(px, py - MICRO_H * 0.5, this.cellWidth, this.cellHeight + MICRO_H * 0.5);
          ctx.fillStyle = pulse > 0 ? '#8affc0' : '#4ae3c5';
          ctx.fillText(pulse > 0 ? '*' : 'o', px + 1.5, py - 1);
          ctx.fillStyle = '#6b543e';
          ctx.fillText('|', px + 1.5, py + MICRO_H);
        } else if (kind === 'lava') {
          const glow = Math.sin(elapsedTime * 2.8 + col * 0.9 + row * 1.3);
          ctx.fillStyle = glow > 0.35 ? '#ffb845' : '#ff5a17';
          ctx.fillText(glow > 0 ? '~' : '=', px, py);
          ctx.fillText(glow > 0.4 ? '*' : '~', px + MICRO_W, py);
          ctx.fillStyle = glow > -0.1 ? '#ff7d26' : '#c93810';
          ctx.fillText('=', px, py + MICRO_H);
          ctx.fillText(glow > 0 ? '#' : '~', px + MICRO_W, py + MICRO_H);
        } else if (kind === 'ember') {
          const p = Math.sin(elapsedTime * 4.5 + (cell.animPhase ?? 0) * 6);
          ctx.fillStyle = p > 0.2 ? '#ff9d3b' : '#db481a';
          ctx.fillText(p > 0.3 ? '*' : '·', px + (p > 0 ? MICRO_W : 0), py);
        } else if (kind === 'wisp') {
          const bob = Math.sin(elapsedTime * 3.4 + col) * 2.2;
          ctx.fillStyle = '#9effef';
          ctx.fillText('*', px, py + bob);
          ctx.fillStyle = '#5ce6d0';
          ctx.fillText('~', px + MICRO_W, py + bob + MICRO_H * 0.6);
        } else if (kind === 'quest_board') {
          ctx.fillStyle = '#291c0e';
          ctx.fillRect(px - 0.5, py - 1, this.cellWidth + 1, this.cellHeight + 1.5);
          ctx.font = `700 ${this.baseFontSize}px ${this.microFontStack}`;
          ctx.fillStyle = cell.char === '!' ? '#ffe975' : '#e0a555';
          ctx.fillText(cell.char, px + 1, py + 0.5);
          ctx.font = `${MICRO_FONT_SIZE}px ${this.microFontStack}`;
        }
      }
    }
  }

  // =========================================================================
  // MAIN RENDER PIPELINE
  // =========================================================================

  public render(
    world: World,
    player: Player,
    lighting: LightingSystem,
    enemies: EnemyManager,
    combat: CombatSystem,
    environment: EnvironmentSystem,
    quests: QuestManager,
    elapsedTime: number
  ): void {
    const ctx = this.ctx;
    const zoom = this.camera.zoom;

    if (world.seed !== this.cachedWorldSeed || this.dpr !== this.cachedDpr) {
      this.terrainBlockCache.clear();
      this.waterRipples.length = 0;
      this.cachedWorldSeed = world.seed;
      this.cachedDpr = this.dpr;
    }

    const ambient = environment.getAmbientProfile();
    this.currentAmbient = ambient;
    const envCacheKey = `${Math.round(ambient.nightFactor * 12)}|${Math.round(ambient.sunlight * 12)}|${Math.round(ambient.ambientStrength * 10)}`;
    if (envCacheKey !== this.lastEnvCacheKey) {
      this.lastEnvCacheKey = envCacheKey;
      this.shadedColorCache.clear();
    }

    this.updateWaterRipples(world, player, elapsedTime);

    // 1. Clear full screen canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = ambient.bgColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Visible world coordinate bounds
    const halfViewCellsX = this.viewportWidth / (2 * this.cellWidth * zoom);
    const halfViewCellsY = this.viewportHeight / (2 * this.cellHeight * zoom);

    const minCol = Math.floor(this.camera.x - halfViewCellsX) - 2;
    const maxCol = Math.ceil(this.camera.x + halfViewCellsX) + 2;
    const minRow = Math.floor(this.camera.y - halfViewCellsY) - 2;
    const maxRow = Math.ceil(this.camera.y + halfViewCellsY) + 3;

    // 3. Transform into crisp zoomed world pixel space
    const originX = this.viewportWidth / (2 * zoom) - this.camera.x * this.cellWidth;
    const originY = this.viewportHeight / (2 * zoom) - this.camera.y * this.cellHeight;

    ctx.save();
    ctx.scale(this.dpr * zoom, this.dpr * zoom);
    ctx.translate(originX, originY);
    ctx.imageSmoothingEnabled = false;

    const minBx = floorDiv(minCol, BLOCK_SIZE);
    const maxBx = floorDiv(maxCol, BLOCK_SIZE);
    const minBy = floorDiv(minRow, BLOCK_SIZE);
    const maxBy = floorDiv(maxRow, BLOCK_SIZE);

    const blocks: TerrainBlock[] = [];
    for (let by = minBy; by <= maxBy; by++) {
      for (let bx = minBx; bx <= maxBx; bx++) {
        blocks.push(this.getOrBakeTerrainBlock(world, bx, by));
      }
    }

    // Pass 1: Blit pre-baked 16x16 dense micro-ASCII ground & cast shadows
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      ctx.drawImage(
        b.groundCanvas,
        0,
        0,
        b.groundCanvas.width,
        b.groundCanvas.height,
        b.bx * BLOCK_SIZE * this.cellWidth,
        b.by * BLOCK_SIZE * this.cellHeight,
        BLOCK_SIZE * this.cellWidth,
        BLOCK_SIZE * this.cellHeight
      );
    }

    // Pass 2: Live animated water ripples, shore/tree/wall reflections, player reflection & sun/moon track
    this.renderWaterSurface(
      ctx,
      world,
      player,
      lighting,
      environment,
      ambient,
      elapsedTime,
      minCol,
      maxCol,
      minRow,
      maxRow
    );

    // Pass 3: Blit pre-baked 2.5D shaded walls, cliffs, tree trunks & foliage canopies (North->South)
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (!b.structCanvas) continue;
      ctx.drawImage(
        b.structCanvas,
        0,
        0,
        b.structCanvas.width,
        b.structCanvas.height,
        b.bx * BLOCK_SIZE * this.cellWidth,
        (b.by * BLOCK_SIZE - STRUCT_TOP_PAD) * this.cellHeight,
        BLOCK_SIZE * this.cellWidth,
        (BLOCK_SIZE + STRUCT_TOP_PAD) * this.cellHeight
      );
    }

    // Pass 4: Multiply crisp dynamic shadowcast lightmap + Additive lantern/wisp glow
    this.compositeLightmap(ctx, world, lighting, ambient, minCol, maxCol, minRow, maxRow);
    this.renderShadowDitheringAndWarmth(
      ctx,
      world,
      player,
      enemies,
      lighting,
      ambient,
      elapsedTime,
      minCol,
      maxCol,
      minRow,
      maxRow
    );

    // Pass 5: Live glowing hearths, lava, wisps, quest board + post-light water gleam
    this.renderWaterHighlightsPostLight(
      ctx,
      world,
      lighting,
      environment,
      ambient,
      elapsedTime,
      minCol,
      maxCol,
      minRow,
      maxRow
    );
    this.renderLiveWorldProps(ctx, world, lighting, elapsedTime, minCol, maxCol, minRow, maxRow);

    // Pass 6: Loot drops, relics, sound waves, boss telegraphs, roadside NPCs, dash ghosts, Y-sorted entities & knight silhouette, weapon slashes
    this.renderLootDrops(ctx, combat, lighting, elapsedTime);
    this.renderQuestRelics(ctx, quests, player, lighting, elapsedTime);
    this.renderSoundWaves(ctx, combat);
    this.renderBossTelegraphs(ctx, combat, elapsedTime);
    this.renderRoadsideNpcs(ctx, world, player, lighting, elapsedTime);
    this.renderDashGhosts(ctx, combat, player, elapsedTime);
    this.renderEntitiesSorted(ctx, world, player, enemies, lighting, elapsedTime);

    for (let i = 0; i < combat.slashes.length; i++) {
      this.renderSlashEffect(ctx, combat.slashes[i]);
    }

    // Pass 7: Local 2.5D walk-under canopies & front wall occlusion directly around player/visible enemies
    this.renderLocalOverhangs(ctx, world, player, enemies, lighting);

    // Pass 8: Luminous world halos, flickering sparks & floating combat text
    this.renderVisibleWorldHalos(ctx, world, lighting, ambient, elapsedTime, minCol, maxCol, minRow, maxRow);
    this.renderLightSparks(ctx, world, lighting, elapsedTime, minCol, maxCol, minRow, maxRow);
    this.renderFloatingTexts(ctx, combat);

    ctx.restore();

    // Pass 9: Screen-space weather (mist wisps, ASCII rain, splashes) & dark-fantasy vignette
    this.renderWeather(ctx, environment, ambient, elapsedTime);
    this.renderVignette(ctx, player.hurtFlashTimer, ambient, environment.fogIntensity);
  }

  private renderLocalOverhangs(
    ctx: CanvasRenderingContext2D,
    world: World,
    player: Player,
    enemies: EnemyManager,
    lighting: LightingSystem
  ): void {
    const illum = this.scratchIllum;
    const pCol = Math.floor(player.x);
    const pRow = Math.floor(player.y);

    ctx.font = `${MICRO_FONT_SIZE}px ${this.microFontStack}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // Re-draw foliage overhangs in a ±4 tile radius around the player so canopy leaves layer above shoulders
    for (let dy = -3; dy <= 2; dy++) {
      const wy = pRow + dy;
      for (let dx = -3; dx <= 3; dx++) {
        const wx = pCol + dx;
        const cell = world.getCell(wx, wy);
        if (!cell?.overhangChar || !cell.overhangColor) continue;
        lighting.sampleCellInto(wx, wy, illum);
        if (!illum.inLos || illum.intensity <= 0.025) continue;
        const shaded = this.shadeColor(
          cell.overhangColor,
          illum.intensity,
          illum.warmth,
          illum.cyanGlow,
          false
        );
        this.bakeCanopyMicroTiles(
          ctx,
          shaded,
          wx,
          wy,
          wx * this.cellWidth,
          wy * this.cellHeight,
          false,
          cell.overhangChar
        );
      }
    }

    // Re-draw tree canopies above nearby visible enemies as well
    for (let i = 0; i < enemies.enemies.length; i++) {
      const e = enemies.enemies[i];
      if (!e.alive) continue;
      if (Math.abs(e.x - player.x) > 40 || Math.abs(e.y - player.y) > 25) continue;
      const ec = Math.floor(e.x);
      const er = Math.floor(e.y);
      lighting.sampleCellInto(ec, er, illum);
      if (!illum.inLos) continue;
      for (let dy = -2; dy <= 1; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const cell = world.getCell(ec + dx, er + dy);
          if (!cell?.overhangChar || !cell.overhangColor) continue;
          const shaded = this.shadeColor(
            cell.overhangColor,
            illum.intensity,
            illum.warmth,
            illum.cyanGlow,
            false
          );
          this.bakeCanopyMicroTiles(
            ctx,
            shaded,
            ec + dx,
            er + dy,
            (ec + dx) * this.cellWidth,
            (er + dy) * this.cellHeight,
            false,
            cell.overhangChar
          );
        }
      }
    }
  }

  // =========================================================================
  // DETAILED KNIGHT/WANDERER SILHOUETTE WITH FLOWING CLOAK & SWORD
  // =========================================================================

  private drawKnightSilhouette(
    ctx: CanvasRenderingContext2D,
    player: Player,
    worldX: number,
    worldY: number,
    elapsedTime: number,
    isGhost: boolean,
    ghostAlpha = 1
  ): void {
    const bob = isGhost ? 0 : player.getWalkBobOffset() * 0.45;
    const sneak = !isGhost && player.isSneaking;
    const sneakCrouchPx = sneak ? 2 : 0;
    const cx = worldX * this.cellWidth;
    const footY = (worldY + 0.12 + bob) * this.cellHeight + sneakCrouchPx;
    const lanternLit = (player.lanternOn && player.oil > 0) || player.hasTorchLit;
    const hurt = !isGhost && player.hurtFlashTimer > 0;
    const speed = Math.hypot(player.vx, player.vy);
    const moving = speed > 1.5 || player.isMoving || player.isDashing;

    // Grounded contact shadow under knight's boots & cloak
    if (!isGhost) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
      ctx.beginPath();
      ctx.ellipse(
        cx,
        (worldY + 0.2) * this.cellHeight,
        this.cellWidth * 1.45,
        this.cellHeight * 0.42,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    const rimColor = isGhost
      ? '#b8b09c'
      : hurt
        ? '#ff7062'
        : sneak
          ? '#8b9bb0'
          : lanternLit
            ? '#f0dfc0'
            : '#c8cdd9';
    const cloakMid = isGhost
      ? '#8a8272'
      : hurt
        ? '#c94338'
        : sneak
          ? '#596375'
          : lanternLit
            ? '#8a7e6e'
            : '#687185';
    const cloakDark = isGhost ? '#5c554a' : hurt ? '#78221b' : sneak ? '#232836' : '#323847';
    const armorTone = isGhost ? '#9e9788' : hurt ? '#ff8578' : sneak ? '#8490a3' : '#b2bdd1';

    const grid = new Map<string, MicroGlyph>();
    const setMicro = (mc: number, mr: number, char: string, color: string, bg?: string) => {
      grid.set(`${mc},${mr}`, { char, color, bg: bg ?? '#06070c' });
    };

    // Velocity-reactive flowing cloak waves
    const trailX =
      speed > 1.5
        ? -player.vx / speed
        : player.facing === 'right'
          ? -0.6
          : player.facing === 'left'
            ? 0.6
            : -0.25;
    const amp = moving ? (player.isSprinting || player.isDashing ? 1.5 : 1.05) : 0.4;
    const waveFreq = moving ? 13.5 : 3.1;

    for (let mr = -3; mr <= 0; mr++) {
      const depthDown = mr + 3; // 0 (shoulders) .. 3 (hem)
      const sway = Math.round(
        trailX * (depthDown * 0.68) + Math.sin(elapsedTime * waveFreq - mr * 1.25) * amp * (0.28 + depthDown * 0.22)
      );
      const halfSpan = depthDown === 0 ? 2 : depthDown === 1 ? 2 : depthDown === 2 ? 2 : 2;
      for (let dc = -halfSpan; dc <= halfSpan; dc++) {
        const mc = dc + sway;
        const isEdge = Math.abs(dc) === halfSpan;
        const ch =
          dc < 0
            ? isEdge
              ? '/'
              : '#'
            : dc > 0
              ? isEdge
                ? '\\'
                : '#'
              : mr === 0
                ? '|'
                : '#';
        setMicro(mc, mr, ch, isEdge ? cloakMid : cloakDark);
      }
      // Extra wispy tail behind trailing cloak edge while sprinting/dashing
      if (moving && (player.isSprinting || player.isDashing) && depthDown >= 2) {
        const tailC = Math.round(trailX * (depthDown + 1.1) + sway);
        setMicro(tailC, mr, depthDown === 3 ? '\\' : '/', cloakDark);
      }
    }

    // Core dark-fantasy hooded knight body (@, #, /, \, |)
    const lean = moving ? (player.facing === 'left' ? -1 : player.facing === 'right' ? 1 : 0) : 0;
    const stride = Math.floor(player.walkPhase) % 4;

    if (player.facing === 'up') {
      // Back view: pointed hood + full flowing cloak drape down spine
      setMicro(-1, -5, '/', rimColor);
      setMicro(0, -5, '@', rimColor);
      setMicro(1, -5, '\\', rimColor);
      setMicro(-1, -4, '|', rimColor);
      setMicro(0, -4, '#', armorTone);
      setMicro(1, -4, '|', rimColor);
      setMicro(-2, -3, '/', rimColor);
      setMicro(-1, -3, '@', armorTone);
      setMicro(0, -3, '#', armorTone);
      setMicro(1, -3, '@', armorTone);
      setMicro(2, -3, '\\', rimColor);
      setMicro(-1, -2, '|', cloakMid);
      setMicro(0, -2, '@', cloakDark);
      setMicro(1, -2, '|', cloakMid);
    } else if (player.facing === 'left' || player.facing === 'right') {
      // Crisp side profile with pauldrons & forward hood slant
      const f = player.facing === 'right' ? 1 : -1;
      setMicro(0, -5, f > 0 ? '/' : '\\', rimColor);
      setMicro(f, -5, '@', rimColor);
      setMicro(0, -4, '|', cloakMid);
      setMicro(f, -4, '#', armorTone);
      setMicro(-1 + lean, -3, '/', rimColor);
      setMicro(0 + lean, -3, '@', armorTone);
      setMicro(1 + lean, -3, '\\', rimColor);
      setMicro(0 + lean, -2, '|', armorTone);
      setMicro(f + lean, -2, '#', rimColor);
      setMicro(0, -1, '#', cloakMid);
      setMicro(f, -1, '|', armorTone);
    } else {
      // Front-facing iconic knight silhouette
      setMicro(-1, -5, '/', rimColor);
      setMicro(0, -5, '@', rimColor);
      setMicro(1, -5, '\\', rimColor);
      setMicro(-1, -4, '|', rimColor);
      setMicro(0, -4, '#', '#141720');
      setMicro(1, -4, '|', rimColor);
      setMicro(-2, -3, '/', rimColor);
      setMicro(-1, -3, '@', armorTone);
      setMicro(0, -3, '#', armorTone);
      setMicro(1, -3, '@', armorTone);
      setMicro(2, -3, '\\', rimColor);
      setMicro(-1, -2, '|', armorTone);
      setMicro(0, -2, '@', armorTone);
      setMicro(1, -2, '|', armorTone);
      setMicro(-1, -1, '#', cloakMid);
      setMicro(0, -1, '|', cloakDark);
      setMicro(1, -1, '#', cloakMid);
    }

    // Animated striding boots (with cool blue-grey tint when wading in water)
    const bootColor = !isGhost && player.inWater ? '#8ab4cc' : rimColor;
    if (moving && stride === 1) {
      setMicro(-1, 0, '/', bootColor);
      setMicro(1, 0, '|', cloakMid);
    } else if (moving && stride === 3) {
      setMicro(-1, 0, '|', cloakMid);
      setMicro(1, 0, '\\', bootColor);
    } else {
      setMicro(-1, 0, '|', bootColor);
      setMicro(1, 0, '|', bootColor);
    }

    // Metallic gleaming sword oriented to facing with traveling specular shine
    if (!isGhost) {
      const hasRunic = Boolean(player.equippedWeapon);
      const bladeBase = hasRunic ? '#56d8f5' : '#95acc7';
      const bladeEdge = hasRunic ? '#bdf8ff' : '#e1edfc';
      const glintSeg = Math.floor((elapsedTime * 2.8) % 6); // pulses every ~2.1s along segments 0..2

      let bladeCells: { mc: number; mr: number; ch: string }[];
      if (player.facing === 'left') {
        bladeCells = [
          { mc: -2, mr: -2, ch: '\\' },
          { mc: -3, mr: -3, ch: '\\' },
          { mc: -4, mr: -4, ch: '\\' },
        ];
      } else if (player.facing === 'right') {
        bladeCells = [
          { mc: 2, mr: -2, ch: '/' },
          { mc: 3, mr: -3, ch: '/' },
          { mc: 4, mr: -4, ch: '/' },
        ];
      } else if (player.facing === 'up') {
        bladeCells = [
          { mc: 2, mr: -3, ch: '/' },
          { mc: 3, mr: -4, ch: '/' },
          { mc: 4, mr: -5, ch: '/' },
        ];
      } else {
        bladeCells = [
          { mc: 2, mr: -2, ch: '\\' },
          { mc: 3, mr: -1, ch: '\\' },
          { mc: 3, mr: 0, ch: '|' },
        ];
      }

      for (let i = 0; i < bladeCells.length; i++) {
        const b = bladeCells[i];
        const isGlint = glintSeg === i;
        setMicro(
          b.mc,
          b.mr,
          isGlint ? '*' : b.ch,
          isGlint ? '#ffffff' : i === 2 ? bladeEdge : bladeBase,
          '#05070c'
        );
      }
    }

    const anchorX = Math.round(cx - MICRO_W * 0.5);
    const anchorY = Math.round(footY - MICRO_H);

    ctx.save();
    if (isGhost) {
      ctx.globalAlpha = ghostAlpha;
    } else {
      if (sneak && player.inUndergrowth) {
        ctx.globalAlpha = 0.76;
      }
      // Crisp dark cutout backing underneath all knight/sword cells
      ctx.fillStyle = '#06070c';
      grid.forEach((cell, key) => {
        const comma = key.indexOf(',');
        const mc = parseInt(key.slice(0, comma), 10);
        const mr = parseInt(key.slice(comma + 1), 10);
        ctx.fillStyle = cell.bg ?? '#06070c';
        ctx.fillRect(anchorX + mc * MICRO_W - 0.5, anchorY + mr * MICRO_H - 0.5, MICRO_W + 1, MICRO_H + 1);
      });
    }

    ctx.font = `700 ${MICRO_FONT_SIZE}px ${this.microFontStack}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    grid.forEach((cell, key) => {
      const comma = key.indexOf(',');
      const mc = parseInt(key.slice(0, comma), 10);
      const mr = parseInt(key.slice(comma + 1), 10);
      ctx.fillStyle = cell.color;
      ctx.fillText(cell.char, anchorX + mc * MICRO_W, anchorY + mr * MICRO_H);
    });

    if (!isGhost && player.inWater) {
      const splashWave = Math.sin(elapsedTime * 7.5) > 0;
      ctx.fillStyle = '#6ec6eb';
      ctx.fillText(splashWave ? '~' : '≈', anchorX - 2 * MICRO_W, anchorY + 2);
      ctx.fillText(splashWave ? '≈' : '~', anchorX + 2 * MICRO_W, anchorY + 2);
      ctx.fillStyle = '#3d8fb3';
      ctx.fillText('~', anchorX - MICRO_W, anchorY + MICRO_H * 0.65);
      ctx.fillText('~', anchorX + MICRO_W, anchorY + MICRO_H * 0.65);
    }
    ctx.restore();

    // Local lantern glow is rendered via grid-based ASCII light rings (no blurry radial blob)
  }

  private renderPlayer(
    ctx: CanvasRenderingContext2D,
    world: World,
    player: Player,
    elapsedTime: number
  ): void {
    this.drawKnightSilhouette(ctx, player, player.x, player.y, elapsedTime, false);

    // Subtle 2.5D depth check: if an intact stone wall sits 1 tile directly south of player feet,
    // redraw the upper wall crest row so the player authentically ducks behind south parapets
    const pCol = Math.floor(player.x);
    const pRow = Math.floor(player.y);
    for (let dx = -2; dx <= 2; dx++) {
      const cell = world.getCell(pCol + dx, pRow + 1);
      if (cell?.kind === 'wall') {
        const wx = pCol + dx;
        const wy = pRow + 1;
        this.bakeExtrudedWall(
          ctx,
          cell,
          wx,
          wy,
          wx * this.cellWidth,
          wy * this.cellHeight,
          isWallWallKind(world.getCell(wx, wy - 1)),
          isWallWallKind(world.getCell(wx, wy + 1)),
          isWallWallKind(world.getCell(wx + 1, wy)),
          isWallWallKind(world.getCell(wx - 1, wy))
        );
      }
    }
  }

  private renderVisibleWorldHalos(
    ctx: CanvasRenderingContext2D,
    world: World,
    lighting: LightingSystem,
    ambient: AmbientLightProfile,
    elapsedTime: number,
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Minimal radial halo (<= 5% opacity) so ASCII grid light rings remain the primary light visual
    const lantern = lighting.getLanternGlowState();
    const lanternAlphaScale = (1 - ambient.sunlight * 0.85) * lantern.warmth;
    if (lantern.active && lanternAlphaScale > 0.04) {
      const lx = lantern.x * this.cellWidth;
      const ly = lantern.y * this.cellHeight;
      const radiusPx = lantern.radiusY * 0.42 * this.cellHeight;
      const coreAlpha = Math.min(0.05, 0.02 + ambient.nightFactor * 0.03) * lanternAlphaScale * lantern.flicker;
      const midAlpha = coreAlpha * 0.4;

      const grad = ctx.createRadialGradient(lx, ly, 2, lx, ly, radiusPx);
      grad.addColorStop(0, `rgba(255, 206, 122, ${coreAlpha.toFixed(3)})`);
      grad.addColorStop(0.42, `rgba(242, 154, 68, ${midAlpha.toFixed(3)})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lx, ly, radiusPx, 0, Math.PI * 2);
      ctx.fill();
    }

    const lights = world.getActiveLights();
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      const lx = Math.floor(light.x);
      const ly = Math.floor(light.y);

      const vis = lighting.getLosVisibility(lx, ly);
      if (vis < 0.05) continue;

      const rCellsX = (light.radius * this.cellHeight) / this.cellWidth + 2;
      const rCellsY = light.radius + 2;
      if (
        light.x + rCellsX < minCol ||
        light.x - rCellsX > maxCol ||
        light.y + rCellsY < minRow ||
        light.y - rCellsY > maxRow
      ) {
        continue;
      }

      const seed = light.x * 1.73 + light.y * 2.41;
      const pulse = light.flicker
        ? 0.93 +
          Math.sin(elapsedTime * 4.7 + seed) * 0.05 +
          Math.sin(elapsedTime * 11.3 + seed * 1.4) * 0.038 +
          Math.sin(elapsedTime * 19.1 + seed * 0.6) * 0.02
        : 1;

      const cx = light.x * this.cellWidth;
      const cy = light.y * this.cellHeight;
      const radiusPx = light.radius * 0.72 * this.cellHeight * pulse;

      ctx.globalAlpha = 0.04 + 0.03 * vis;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radiusPx);
      grad.addColorStop(0, light.color);
      grad.addColorStop(0.45, light.color.replace(/[\d.]+\)\s*$/, (m) => `${(parseFloat(m) * 0.42).toFixed(3)})`));
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderEntitiesSorted(
    ctx: CanvasRenderingContext2D,
    world: World,
    player: Player,
    enemies: EnemyManager,
    lighting: LightingSystem,
    elapsedTime: number
  ): void {
    const visibleEnemies: { enemy: Enemy; illum: CellIllumination }[] = [];
    const darkRevealed: Enemy[] = [];
    for (let i = 0; i < enemies.enemies.length; i++) {
      const enemy = enemies.enemies[i];
      if (!enemy.alive) continue;
      const ec = Math.floor(enemy.x);
      const er = Math.floor(enemy.y - 0.5);
      const illum = lighting.sampleCell(ec, er);
      if (!illum.inLos || illum.intensity <= 0.03) {
        if (player.hasDarkSightRelic && Math.hypot(enemy.x - player.x, enemy.y - player.y) <= 34) {
          darkRevealed.push(enemy);
        }
        continue;
      }
      visibleEnemies.push({ enemy, illum });
    }

    visibleEnemies.sort((a, b) => a.enemy.y - b.enemy.y);

    let playerDrawn = false;
    for (let i = 0; i < visibleEnemies.length; i++) {
      const entry = visibleEnemies[i];
      if (!playerDrawn && player.y <= entry.enemy.y) {
        this.renderPlayer(ctx, world, player, elapsedTime);
        playerDrawn = true;
      }
      this.renderEnemy(ctx, entry.enemy, entry.illum);
    }

    if (!playerDrawn) {
      this.renderPlayer(ctx, world, player, elapsedTime);
    }

    if (darkRevealed.length > 0) {
      const pulse = 0.5 + Math.sin(elapsedTime * 5.0) * 0.35;
      ctx.save();
      ctx.font = `700 ${this.baseFontSize}px ${this.microFontStack}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.globalAlpha = pulse;
      for (let i = 0; i < darkRevealed.length; i++) {
        const e = darkRevealed[i];
        const cx = e.x * this.cellWidth;
        const cy = (e.y - 0.8) * this.cellHeight;
        ctx.fillStyle = 'rgba(255, 224, 128, 0.22)';
        ctx.beginPath();
        ctx.arc(cx, cy, this.cellHeight * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe68c';
        ctx.fillText(e.isBoss ? '[!]' : '✦', cx, cy);
      }
      ctx.restore();
    }
  }

  private renderEnemy(
    ctx: CanvasRenderingContext2D,
    enemy: Enemy,
    illum: CellIllumination
  ): void {
    const sprite = enemy.getSprite();
    const bob =
      enemy.state === 'chase' || enemy.state === 'patrol'
        ? -Math.abs(Math.sin(enemy.walkPhase * (Math.PI / 2))) * 0.12
        : 0;

    const stepW = this.cellWidth * 0.9;
    const stepH = this.cellHeight * 0.92;
    const topLeftPx = enemy.x * this.cellWidth - (sprite.width * stepW) / 2;
    const topLeftPy = (enemy.y + bob) * this.cellHeight - sprite.height * stepH + 3;

    // Grounded crimson/gold threat halo
    ctx.fillStyle = enemy.isBoss ? 'rgba(245, 194, 72, 0.34)' : 'rgba(220, 62, 52, 0.28)';
    ctx.beginPath();
    ctx.ellipse(
      enemy.x * this.cellWidth,
      (enemy.y + 0.12) * this.cellHeight,
      this.cellWidth * 1.45,
      this.cellHeight * 0.44,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Opaque silhouette backing
    for (let r = 0; r < sprite.height; r++) {
      for (let c = 0; c < sprite.width; c++) {
        const sc = sprite.cells[r][c];
        if (!sc) continue;
        const px = topLeftPx + c * stepW;
        const py = topLeftPy + r * stepH;
        ctx.fillStyle = sc.bg ?? PALETTE.bg;
        ctx.fillRect(px - 0.5, py - 0.3, stepW + 1, stepH + 0.6);
      }
    }

    ctx.font = `700 ${this.baseFontSize}px ${this.microFontStack}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    for (let r = 0; r < sprite.height; r++) {
      for (let c = 0; c < sprite.width; c++) {
        const sc = sprite.cells[r][c];
        if (!sc || sc.char === ' ') continue;
        const px = topLeftPx + c * stepW;
        const py = topLeftPy + r * stepH;
        ctx.fillStyle =
          enemy.hitFlashTimer > 0
            ? sc.color
            : this.shadeColor(sc.color, Math.max(0.76, illum.intensity), illum.warmth, illum.cyanGlow, true);
        ctx.fillText(sc.char, px, py);
      }
    }

    // Minimalist micro HP bar & boss name
    if (enemy.isBoss || enemy.hp < enemy.maxHp || enemy.state === 'chase' || enemy.state === 'windup') {
      const slots = enemy.isBoss ? 8 : 5;
      const filled = Math.max(0, Math.round((enemy.hp / enemy.maxHp) * slots));
      const bar = `[${'|'.repeat(filled)}${'.'.repeat(slots - filled)}]`;
      const barPx = enemy.x * this.cellWidth - (enemy.isBoss ? 22 : 16);
      const barPy = topLeftPy - this.cellHeight * 0.95;

      ctx.fillStyle = 'rgba(9, 9, 11, 0.86)';
      ctx.fillRect(barPx - 1, barPy - 0.5, enemy.isBoss ? 46 : 33, this.cellHeight * 0.88);
      ctx.font = `700 8px ${this.microFontStack}`;
      ctx.fillStyle = enemy.isBoss
        ? enemy.state === 'windup'
          ? '#ff825c'
          : '#e8b658'
        : enemy.state === 'windup'
          ? '#f26a52'
          : '#c23a3a';
      ctx.fillText(bar, barPx, barPy);

      if (enemy.isBoss) {
        ctx.font = `700 9px ${this.microFontStack}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#09090b';
        ctx.fillText(enemy.name, enemy.x * this.cellWidth + 1, barPy - this.cellHeight * 0.95 + 1);
        ctx.fillStyle = '#f0cc75';
        ctx.fillText(enemy.name, enemy.x * this.cellWidth, barPy - this.cellHeight * 0.95);
        ctx.textAlign = 'left';
      }
    } else if (enemy.state === 'investigate') {
      const qx = enemy.x * this.cellWidth;
      const qy = topLeftPy - this.cellHeight * 0.95;
      ctx.font = `700 9px ${this.microFontStack}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(9, 9, 11, 0.86)';
      ctx.fillRect(qx - 11, qy - 0.5, 22, this.cellHeight * 0.88);
      ctx.fillStyle = '#f0c45a';
      ctx.fillText('[?]', qx, qy);
      ctx.textAlign = 'left';
    }
  }

  private renderLootDrops(
    ctx: CanvasRenderingContext2D,
    combat: CombatSystem,
    lighting: LightingSystem,
    elapsedTime: number
  ): void {
    if (combat.lootDrops.length === 0) return;

    ctx.font = `700 ${this.baseFontSize}px ${this.microFontStack}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    for (let i = 0; i < combat.lootDrops.length; i++) {
      const drop = combat.lootDrops[i];
      const illum = lighting.sampleCell(Math.floor(drop.x), Math.floor(drop.y));
      if (!illum.inLos || illum.intensity <= 0.03) continue;

      const bob = Math.sin(elapsedTime * 5 + drop.id) * 1.4;
      const px = drop.x * this.cellWidth;
      const py = drop.y * this.cellHeight + bob;

      ctx.fillStyle = 'rgba(14, 12, 10, 0.94)';
      ctx.fillRect(px - this.cellWidth - 2, py - 1.5, this.cellWidth * 3 + 4, this.cellHeight + 3);
      ctx.strokeStyle = drop.worldCacheId ? '#eab308' : drop.color;
      ctx.lineWidth = 0.85;
      ctx.strokeRect(px - this.cellWidth - 2, py - 1.5, this.cellWidth * 3 + 4, this.cellHeight + 3);
      ctx.fillStyle = drop.worldCacheId ? '#fde047' : drop.color;
      ctx.fillText(
        drop.worldCacheId ? ' ▣ ' : `[${drop.itemTemplate.symbol}]`,
        px - this.cellWidth + 1,
        py
      );
    }
  }

  private renderQuestRelics(
    ctx: CanvasRenderingContext2D,
    quests: QuestManager,
    player: Player,
    lighting: LightingSystem,
    elapsedTime: number
  ): void {
    const relics = quests.getRelics();
    if (relics.length === 0) return;

    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    for (let i = 0; i < relics.length; i++) {
      const relic = relics[i];
      if (relic.collected) continue;

      const illum = lighting.sampleCell(Math.floor(relic.x), Math.floor(relic.y));
      if (!illum.inLos || illum.intensity <= 0.03) continue;

      const bob = Math.sin(elapsedTime * 3.8 + i * 1.9) * 1.5;
      const pulse = 0.65 + Math.sin(elapsedTime * 5.2 + i) * 0.35;
      const cx = relic.x * this.cellWidth;
      const cy = relic.y * this.cellHeight + bob;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, this.cellHeight * 2.5);
      grad.addColorStop(0, `rgba(255, 224, 128, ${(0.42 * pulse).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, this.cellHeight * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = 'rgba(14, 12, 10, 0.94)';
      ctx.fillRect(cx - this.cellWidth * 1.35, cy - 1.5, this.cellWidth * 2.7, this.cellHeight + 3);
      ctx.strokeStyle = relic.color;
      ctx.lineWidth = 0.9;
      ctx.strokeRect(cx - this.cellWidth * 1.35, cy - 1.5, this.cellWidth * 2.7, this.cellHeight + 3);
      ctx.font = `700 ${this.baseFontSize}px ${this.microFontStack}`;
      ctx.fillStyle = relic.color;
      ctx.fillText('✦', cx - this.cellWidth * 0.5, cy);

      if (Math.hypot(relic.x - player.x, relic.y - player.y) <= 8) {
        ctx.font = `600 9px ${this.microFontStack}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = relic.color;
        ctx.fillText(getItemName(relic), cx, cy - this.cellHeight * 1.1);
        ctx.textAlign = 'left';
      }
    }
  }

  private renderSoundWaves(ctx: CanvasRenderingContext2D, combat: CombatSystem): void {
    if (combat.soundWaves.length === 0) return;

    ctx.save();
    ctx.font = `600 9px ${this.microFontStack}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const drawAsciiRing = (
      cx: number,
      cy: number,
      rCells: number,
      color: string,
      alpha: number,
      isWade: boolean
    ): void => {
      if (alpha <= 0.04) return;
      const rx = rCells * this.cellWidth;
      const ry = rCells * 0.68 * this.cellHeight;
      const steps = Math.max(8, Math.min(20, Math.round(rCells * 3.2)));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      for (let s = 0; s < steps; s++) {
        const angle = (s / steps) * Math.PI * 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        let glyph: string;
        if (Math.abs(cosA) >= 0.32) {
          glyph = cosA < 0 ? '(' : ')';
        } else {
          glyph = isWade ? '~' : '·';
        }
        ctx.fillText(glyph, cx + cosA * rx, cy + sinA * ry);
      }
    };

    for (let i = 0; i < combat.soundWaves.length; i++) {
      const wave = combat.soundWaves[i];
      const progress = Math.min(1, wave.age / wave.duration);
      const alpha = Math.max(0, (1 - progress) * (wave.kind === 'run' ? 0.55 : 0.82));
      const cx = wave.x * this.cellWidth;
      const cy = (wave.y - 0.35) * this.cellHeight;
      const isWade = wave.kind === 'wade';

      drawAsciiRing(cx, cy, wave.radius, wave.color, alpha, isWade);
      if (wave.radius > 1.8) {
        drawAsciiRing(cx, cy, wave.radius * 0.65, wave.color, alpha * 0.58, isWade);
      }
    }

    ctx.restore();
  }

  private renderBossTelegraphs(
    ctx: CanvasRenderingContext2D,
    combat: CombatSystem,
    elapsedTime: number
  ): void {
    if (combat.bossTelegraphs.length === 0) return;

    ctx.save();
    ctx.font = `700 ${this.baseFontSize}px ${this.microFontStack}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    for (let i = 0; i < combat.bossTelegraphs.length; i++) {
      const t = combat.bossTelegraphs[i];
      const frac = Math.min(1, t.age / t.duration);
      const pulse = 0.65 + Math.sin(elapsedTime * 16 + t.id) * 0.35;

      if (t.kind === 'poison_mist') {
        const alpha = (frac > 0.8 ? (1 - frac) / 0.2 : 1) * 0.65;
        ctx.fillStyle = `rgba(38, 176, 102, ${(0.14 * alpha).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(
          t.x * this.cellWidth,
          t.y * this.cellHeight,
          t.radius * this.cellWidth,
          t.radius * this.cellHeight * 0.78,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#62f2a2';
        for (let p = 0; p < 16; p++) {
          const ang = (p / 16) * Math.PI * 2 + elapsedTime * 1.1;
          const rr = t.radius * (0.45 + ((p * 37) % 10) / 18);
          const gx = (t.x + Math.cos(ang) * rr) * this.cellWidth;
          const gy = (t.y + Math.sin(ang) * rr * 0.8) * this.cellHeight;
          ctx.fillText(p % 2 === 0 ? '░' : '~', gx, gy);
        }
      } else if (t.kind === 'furnace_nova') {
        const curR = 1.2 + frac * (t.radius - 1.2);
        ctx.globalAlpha = 0.4 + pulse * 0.55;
        ctx.fillStyle = t.color;
        const steps = 18;
        for (let s = 0; s < steps; s++) {
          const a = (s / steps) * Math.PI * 2;
          ctx.fillText(
            s % 3 === 0 ? 'Ω' : '*',
            (t.x + Math.cos(a) * t.radius) * this.cellWidth,
            (t.y + Math.sin(a) * t.radius) * this.cellHeight
          );
          if (frac > 0.1) {
            ctx.fillText(
              '!',
              (t.x + Math.cos(a) * curR) * this.cellWidth,
              (t.y + Math.sin(a) * curR) * this.cellHeight
            );
          }
        }
      } else if (t.kind === 'hammer_slam') {
        const baseA = t.angle ?? 0;
        const halfA = t.coneHalfAngle ?? Math.PI * 0.34;
        ctx.globalAlpha = 0.45 + pulse * 0.5;
        ctx.fillStyle = t.color;
        for (let ring = 2; ring <= t.radius; ring += 1.5) {
          for (let s = -3; s <= 3; s++) {
            const a = baseA + (s / 3) * halfA;
            ctx.fillText(
              ring >= t.radius - 1.2 ? '!' : '#',
              (t.x + Math.cos(a) * ring) * this.cellWidth,
              (t.y + Math.sin(a) * ring) * this.cellHeight
            );
          }
        }
      } else if (t.kind === 'light_lunge') {
        const bx = t.targetX ?? t.x;
        const by = t.targetY ?? t.y;
        ctx.globalAlpha = 0.55 + pulse * 0.45;
        ctx.fillStyle = t.color;
        const steps = 9;
        for (let s = 1; s <= steps; s++) {
          const u = s / steps;
          const lx = (t.x + (bx - t.x) * u) * this.cellWidth;
          const ly = (t.y + (by - t.y) * u) * this.cellHeight;
          ctx.fillText(s === steps ? '✦' : '»', lx, ly);
        }
      }
    }

    ctx.restore();
  }

  private renderRoadsideNpcs(
    ctx: CanvasRenderingContext2D,
    world: World,
    player: Player,
    lighting: LightingSystem,
    elapsedTime: number
  ): void {
    const travelers = world.getActiveTravelers();
    if (travelers.length === 0) return;

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    for (let i = 0; i < travelers.length; i++) {
      const npc = travelers[i];
      const illum = lighting.sampleCell(Math.floor(npc.x), Math.floor(npc.y));
      if (!illum.inLos || illum.intensity <= 0.03) continue;

      const bob = Math.sin(elapsedTime * 2.2 + i * 1.7) * 0.8;
      const cx = npc.x * this.cellWidth;
      const cy = (npc.y - 0.45) * this.cellHeight + bob;
      const pulse = 0.85 + Math.sin(elapsedTime * 5.4 + i) * 0.15;

      // Warm amber ground halo + soft lantern pulse
      ctx.fillStyle = 'rgba(245, 184, 72, 0.25)';
      ctx.beginPath();
      ctx.ellipse(
        cx,
        (npc.y + 0.15) * this.cellHeight,
        this.cellWidth * 1.35,
        this.cellHeight * 0.42,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, this.cellHeight * 2.4 * pulse);
      grad.addColorStop(0, 'rgba(245, 184, 72, 0.11)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, this.cellHeight * 2.4 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Dark cutout backing + crisp amber/gold ASCII glyph (@ or &)
      ctx.fillStyle = 'rgba(10, 9, 8, 0.94)';
      ctx.fillRect(cx - this.cellWidth * 0.85, cy - this.cellHeight * 0.65, this.cellWidth * 1.7, this.cellHeight * 1.3);
      ctx.strokeStyle = 'rgba(240, 178, 72, 0.55)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(cx - this.cellWidth * 0.85, cy - this.cellHeight * 0.65, this.cellWidth * 1.7, this.cellHeight * 1.3);

      ctx.font = `700 ${this.baseFontSize + 2}px ${this.microFontStack}`;
      ctx.fillStyle = npc.color;
      ctx.fillText(npc.glyph, cx, cy + 0.5);

      if (Math.hypot(npc.x - player.x, npc.y - player.y) <= 11) {
        const npcName = getTravelerName(npc.role);
        ctx.font = `600 9px ${this.microFontStack}`;
        ctx.fillStyle = '#09090b';
        ctx.fillText(npcName, cx + 1, cy - this.cellHeight * 1.15 + 1);
        ctx.fillStyle = '#f0d48c';
        ctx.fillText(npcName, cx, cy - this.cellHeight * 1.15);
      }
    }

    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
  }

  private renderDashGhosts(
    ctx: CanvasRenderingContext2D,
    combat: CombatSystem,
    player: Player,
    elapsedTime: number
  ): void {
    if (combat.dashGhosts.length === 0) return;
    for (let i = 0; i < combat.dashGhosts.length; i++) {
      const ghost = combat.dashGhosts[i];
      const alpha = Math.max(0, 1 - ghost.age / ghost.duration) * 0.42;
      this.drawKnightSilhouette(ctx, player, ghost.x, ghost.y, elapsedTime, true, alpha);
    }
  }

  private renderSlashEffect(ctx: CanvasRenderingContext2D, slash: SlashEffect): void {
    const progress = Math.min(1, slash.age / slash.duration);
    const alpha = Math.max(0, 1 - progress * 0.9);
    const arcSpan = Math.PI * 0.78;
    const startAngle = slash.angle - arcSpan * 0.5;
    const steps = 9;

    ctx.save();
    ctx.font = `700 ${this.baseFontSize + 1}px ${this.microFontStack}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    for (let i = 0; i < steps; i++) {
      const frac = i / (steps - 1);
      const trailDist = Math.abs(frac - progress);
      if (trailDist > 0.52) continue;

      const a = startAngle + frac * arcSpan;
      const radiusX = slash.reach * 0.85 * this.cellWidth;
      const radiusY = slash.reach * 0.62 * this.cellHeight;
      const px = slash.x * this.cellWidth + Math.cos(a) * radiusX;
      const py = slash.y * this.cellHeight + Math.sin(a) * radiusY;

      const tan = a + Math.PI / 2;
      const absCos = Math.abs(Math.cos(tan));
      const absSin = Math.abs(Math.sin(tan));
      let glyph: string;
      if (trailDist < 0.14) glyph = '*';
      else if (absCos > 0.85) glyph = '-';
      else if (absSin > 0.85) glyph = '|';
      else glyph = Math.cos(tan) * Math.sin(tan) > 0 ? '\\' : '/';

      ctx.globalAlpha = alpha * (1 - trailDist * 1.4);
      ctx.fillStyle = trailDist < 0.18 ? '#fff4db' : '#d99a5b';
      ctx.fillText(glyph, px - this.cellWidth * 0.5, py - this.cellHeight * 0.5);

      if (i % 2 === 0) {
        const ipx = slash.x * this.cellWidth + Math.cos(a) * (radiusX * 0.66);
        const ipy = slash.y * this.cellHeight + Math.sin(a) * (radiusY * 0.66);
        ctx.fillStyle = '#b84239';
        ctx.fillText('~', ipx - this.cellWidth * 0.5, ipy - this.cellHeight * 0.5);
      }
    }

    ctx.restore();
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D, combat: CombatSystem): void {
    if (combat.floatingTexts.length === 0) return;

    ctx.save();
    ctx.font = `700 10px ${this.microFontStack}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    for (let i = 0; i < combat.floatingTexts.length; i++) {
      const ft = combat.floatingTexts[i];
      const progress = ft.age / ft.duration;
      const alpha = Math.max(0, 1 - Math.pow(progress, 1.8));
      const px = ft.x * this.cellWidth;
      const py = (ft.y - progress * 2.4) * this.cellHeight;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#09090b';
      ctx.fillText(ft.text, px + 1, py + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, px, py);
    }

    ctx.restore();
  }

  private renderWeather(
    ctx: CanvasRenderingContext2D,
    environment: EnvironmentSystem,
    ambient: AmbientLightProfile,
    elapsedTime: number
  ): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const mistIntensity = Math.max(
      environment.fogIntensity,
      environment.overcastIntensity * 0.48
    );

    if (mistIntensity > 0.02) {
      const fog = environment.fogIntensity;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const clearInner = Math.min(w, h) * (0.28 - fog * 0.08);
      const fogOuter = Math.hypot(cx, cy) * 0.94;

      const fogR = Math.round(92 - ambient.nightFactor * 48);
      const fogG = Math.round(104 - ambient.nightFactor * 52);
      const fogB = Math.round(118 - ambient.nightFactor * 42);

      if (fog > 0.02) {
        const mistGrad = ctx.createRadialGradient(
          cx,
          cy,
          Math.max(10, clearInner),
          cx,
          cy,
          fogOuter
        );
        mistGrad.addColorStop(0, `rgba(${fogR},${fogG},${fogB},0)`);
        mistGrad.addColorStop(0.58, `rgba(${fogR},${fogG},${fogB},${(fog * 0.18).toFixed(3)})`);
        mistGrad.addColorStop(1, `rgba(${fogR},${fogG},${fogB},${(fog * 0.36).toFixed(3)})`);

        ctx.fillStyle = mistGrad;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.save();
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      const activeWisps = Math.floor(environment.fogWisps.length * mistIntensity);
      const basePxSize = Math.round(11 * this.dpr);
      ctx.font = `${basePxSize}px ${this.microFontStack}`;

      for (let i = 0; i < activeWisps; i++) {
        const wisp = environment.fogWisps[i];
        // Keep center of field of view clear; mist wisps drift softly near viewport edges
        const distFromCenter = Math.hypot((wisp.x - 0.5) * 2, (wisp.y - 0.5) * 2);
        if (distFromCenter < 0.52) continue;
        const edgeMask = Math.min(1, (distFromCenter - 0.52) / 0.58);
        const pulse = 0.72 + Math.sin(elapsedTime * 0.95 + wisp.phase) * 0.28;
        const alpha = Math.min(0.32, mistIntensity * edgeMask * pulse * 0.28);
        if (alpha <= 0.015) continue;

        ctx.fillStyle = `rgba(${fogR + 52},${fogG + 58},${fogB + 64},${alpha.toFixed(3)})`;
        ctx.fillText(wisp.glyph.repeat(wisp.size + 1), wisp.x * w, wisp.y * h);
      }
      ctx.restore();
    }

    if (environment.rainIntensity > 0.02) {
      const rain = environment.rainIntensity;
      ctx.save();
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      const rainPx = Math.round(10 * this.dpr);
      ctx.font = `${rainPx}px ${this.microFontStack}`;

      const activeDrops = Math.floor(environment.rainDrops.length * rain);
      const rR = Math.round(126 - ambient.nightFactor * 38);
      const rG = Math.round(146 - ambient.nightFactor * 36);
      const rB = Math.round(172 - ambient.nightFactor * 22);

      for (let i = 0; i < activeDrops; i++) {
        const drop = environment.rainDrops[i];
        const alpha = (0.18 + drop.shade * 0.24) * rain;
        ctx.fillStyle = `rgba(${rR},${rG},${rB},${alpha.toFixed(3)})`;
        ctx.fillText(drop.glyph, drop.x * w, drop.y * h);
      }

      const splashPx = Math.round(9 * this.dpr);
      ctx.font = `${splashPx}px ${this.microFontStack}`;
      for (let i = 0; i < environment.rainSplashes.length; i++) {
        const sp = environment.rainSplashes[i];
        const fade = Math.max(0, 1 - sp.age / sp.duration);
        const alpha = fade * 0.4 * rain;
        ctx.fillStyle = `rgba(${rR + 22},${rG + 24},${rB + 22},${alpha.toFixed(3)})`;
        ctx.fillText(sp.glyph, sp.x * w, sp.y * h);
      }

      ctx.restore();
    }
  }

  private renderVignette(
    ctx: CanvasRenderingContext2D,
    hurtFlashTimer: number,
    ambient: AmbientLightProfile,
    fogIntensity: number
  ): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const innerR = Math.min(w, h) * (0.36 - fogIntensity * 0.08);
    const outerR = Math.hypot(cx, cy) * 1.04;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (ambient.vignetteOpacity > 0.01) {
      const vigR = Math.round(9 - ambient.nightFactor * 4);
      const vigG = Math.round(9 - ambient.nightFactor * 3);
      const vigB = Math.round(11 + ambient.nightFactor * 9);
      const vigAlpha = ambient.vignetteOpacity.toFixed(3);

      const vignette = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
      vignette.addColorStop(0, `rgba(${vigR}, ${vigG}, ${vigB}, 0)`);
      vignette.addColorStop(1, `rgba(${vigR}, ${vigG}, ${vigB}, ${vigAlpha})`);

      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }

    if (hurtFlashTimer > 0) {
      const alpha = Math.min(0.45, (hurtFlashTimer / 0.26) * 0.42);
      const hurtGrad = ctx.createRadialGradient(cx, cy, innerR * 0.85, cx, cy, outerR);
      hurtGrad.addColorStop(0, 'rgba(180, 28, 28, 0)');
      hurtGrad.addColorStop(1, `rgba(176, 30, 30, ${alpha.toFixed(3)})`);
      ctx.fillStyle = hurtGrad;
      ctx.fillRect(0, 0, w, h);
    }
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResizeBound);
    this.terrainBlockCache.clear();
  }
}
