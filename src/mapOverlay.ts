import type { LightingSystem } from './lighting';
import type { Player } from './player';
import type { BiomeKind, ChartedMarker, QuestMapMarker, TileKind } from './types';
import { CHUNK_SIZE, PALETTE, type World, type WorldChunk } from './world';

interface SampledTile {
  char: string;
  color: string;
}

const KIND_PRIORITY: Record<TileKind, number> = {
  quest_board: 15,
  signpost: 14,
  furnace: 13,
  alch_lantern: 13,
  wisp: 13,
  brazier: 12,
  monolith: 12,
  statue: 12,
  lava: 12,
  wall: 11,
  bridge: 10,
  ford: 10,
  river_water: 9,
  tombstone: 9,
  passage: 9,
  path: 8,
  wagon: 7,
  menhir: 7,
  quarry_rock: 6,
  ice: 6,
  blood_tree: 5,
  dead_tree: 5,
  tree_trunk: 5,
  marsh_water: 4,
  crypt_floor: 3,
  ruin_floor: 3,
  ember: 2,
  tree_canopy: 2,
  rubble: 2,
  bone_pile: 2,
  basalt: 1,
  snow_ground: 1,
  quarry_ground: 1,
  ash_ground: 1,
  marsh_ground: 1,
  bush: 1,
  flower: 1,
  grass: 0,
  void: 0,
};

function mapTileAppearance(
  kind: TileKind,
  biome: BiomeKind,
  hasOverhang: boolean
): SampledTile {
  switch (kind) {
    case 'quest_board':
      return { char: '!', color: '#f0c45a' };
    case 'signpost':
      return { char: '+', color: '#d9b578' };
    case 'wisp':
      return { char: '*', color: '#78ebd2' };
    case 'brazier':
      return { char: '*', color: '#ff9a38' };
    case 'furnace':
      return { char: 'Ω', color: '#ff7828' };
    case 'alch_lantern':
      return { char: '*', color: '#62f2a2' };
    case 'statue':
      return { char: '&', color: '#f2eee2' };
    case 'monolith':
      return { char: '^', color: '#85e6de' };
    case 'lava':
      return { char: '≈', color: '#ff6f28' };
    case 'wall':
      return { char: '#', color: '#9ea8b8' };
    case 'bridge':
      return { char: '=', color: '#9c7853' };
    case 'ford':
      return { char: '=', color: '#8f9cab' };
    case 'river_water':
      return { char: '~', color: '#3294ba' };
    case 'tombstone':
      return { char: '+', color: '#88919e' };
    case 'passage':
      return { char: '░', color: '#333342' };
    case 'path':
      return { char: ':', color: '#8a7a66' };
    case 'wagon':
      return { char: 'W', color: '#8c6f52' };
    case 'menhir':
      return { char: '^', color: '#7a8494' };
    case 'ice':
      return { char: '♦', color: '#9eddf2' };
    case 'quarry_rock':
      return { char: '^', color: '#697485' };
    case 'dead_tree':
      return { char: 'Y', color: '#665f59' };
    case 'blood_tree':
      return { char: 'T', color: '#7d2331' };
    case 'tree_trunk':
      return {
        char: 'T',
        color: biome === 'frost' ? '#63869c' : '#355743',
      };
    case 'marsh_water':
      return { char: '~', color: '#277894' };
    case 'crypt_floor':
      return { char: '.', color: '#3b4152' };
    case 'ruin_floor':
      return { char: '.', color: '#474f5e' };
    case 'ember':
      return { char: '*', color: '#c45129' };
    case 'bone_pile':
      return { char: 'o', color: '#bab3a3' };
    case 'basalt':
      return { char: '.', color: '#26242e' };
    case 'snow_ground':
      return { char: '.', color: '#64798a' };
    case 'tree_canopy':
      return { char: '^', color: '#2a4234' };
    case 'quarry_ground':
      return { char: '.', color: '#3d4450' };
    case 'ash_ground':
      return { char: '.', color: biome === 'bone_plain' ? '#403a32' : '#35323b' };
    case 'marsh_ground':
      return { char: ',', color: '#25362f' };
    case 'rubble':
      return { char: ':', color: '#585e69' };
    case 'bush':
      return { char: '"', color: '#2b3d31' };
    case 'flower':
      return { char: '.', color: biome === 'blood_forest' ? '#5e1d26' : '#26302a' };
    case 'grass':
    default:
      if (hasOverhang) {
        return {
          char: '^',
          color: biome === 'blood_forest' ? '#7d2331' : biome === 'frost' ? '#5c7e94' : '#2d4a39',
        };
      }
      return {
        char: '.',
        color: biome === 'blood_forest' ? '#291319' : '#1b211e',
      };
  }
}

interface BakedChunkMeta {
  canvas: HTMLCanvasElement;
  cx: number;
  cy: number;
  poiLabel: { text: string; x: number; y: number; color: string } | null;
}

export class MapOverlay {
  private readonly root: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly titleEl: HTMLSpanElement;
  private readonly metaEl: HTMLSpanElement;
  private readonly seedBadgeEl: HTMLSpanElement;

  private readonly cssW = 620;
  private readonly cssH = 460;
  private readonly dpr: number;
  private visible = false;

  // Interactive camera (pan in world coordinates centered in viewport)
  private readonly basePxPerCell = 1.5; // 64-cell chunk = 96px at 1.0x zoom
  private panX = 0;
  private panY = 0;
  private mapZoom = 1.0;
  private readonly minZoom = 0.25;
  private readonly maxZoom = 3.5;

  private lastPlayerX = 0;
  private lastPlayerY = 0;

  private isDragging = false;
  private dragStartClientX = 0;
  private dragStartClientY = 0;
  private dragStartPanX = 0;
  private dragStartPanY = 0;

  private readonly chunkCache = new Map<string, BakedChunkMeta>();

  private readonly handleMouseMoveBound: (e: MouseEvent) => void;
  private readonly handleMouseUpBound: () => void;

  constructor(world: World, onClose: () => void) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.root = document.createElement('div');
    this.root.id = 'map-overlay';
    this.root.className = 'ascii-modal-backdrop hidden';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Mapa světa');

    const panel = document.createElement('div');
    panel.className = 'ascii-modal map-modal';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
      <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
      <div class="modal-title-row">
        <span class="modal-title"><span class="ascii-pipe">|</span> <span id="map-title-text">MAPA SVĚTA (NEKONEČNÁ)</span></span>
        <span class="modal-close-hint"><span id="map-seed-badge" class="map-seed-badge">SEED: ---</span> · [Tažení] Posun · [Kolečko] Zoom · [M / Esc] <span class="ascii-pipe">|</span></span>
      </div>
      <div class="ascii-rule-bar"><span>+</span><span class="rule-fill"></span><span>+</span></div>
    `;

    this.titleEl = header.querySelector('#map-title-text') as HTMLSpanElement;
    this.seedBadgeEl = header.querySelector('#map-seed-badge') as HTMLSpanElement;

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'map-canvas-wrap';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'map-canvas';
    this.canvas.width = Math.floor(this.cssW * this.dpr);
    this.canvas.height = Math.floor(this.cssH * this.dpr);
    this.canvas.style.width = `${this.cssW}px`;
    this.canvas.style.height = `${this.cssH}px`;

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not initialize map overlay 2D context.');
    }
    this.ctx = context;
    canvasWrap.appendChild(this.canvas);

    const footer = document.createElement('div');
    footer.className = 'map-footer';

    this.metaEl = document.createElement('span');
    this.metaEl.className = 'map-meta';

    const legend = document.createElement('div');
    legend.className = 'map-legend';
    legend.innerHTML = `
      <span><b class="leg-player">@</b> TY</span>
      <span><b class="leg-quest">!</b> Úkol</span>
      <span><b class="leg-wall">#</b> Ruiny</span>
      <span><b class="leg-path">:</b> Cesty</span>
      <span><b class="leg-river">~</b> Řeka</span>
      <span><b class="leg-bridge">=</b> Lávky/Brody</span>
      <span><b class="leg-tree">T</b> Lesní háj</span>
      <span><b class="leg-marsh">~</b> Bažina</span>
      <span><b class="leg-quarry">^</b> Skály</span>
      <span><b class="leg-ash">.</b> Popel</span>
      <span><b class="leg-blood">T</b> Krvavý les</span>
      <span><b class="leg-lava">≈</b> Láva</span>
      <span><b class="leg-frost">♦</b> Mráz</span>
      <span><b class="leg-bone">o</b> Bojiště</span>
      <span><b class="leg-charted">♦</b> Nákres</span>
    `;

    const recenterBtn = document.createElement('button');
    recenterBtn.id = 'map-recenter-btn';
    recenterBtn.type = 'button';
    recenterBtn.className = 'ascii-btn ascii-btn-primary';
    recenterBtn.textContent = '[ Vycentrovat ]';
    recenterBtn.addEventListener('click', () => {
      this.centerOn(this.lastPlayerX, this.lastPlayerY);
    });

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'ascii-btn';
    closeBtn.textContent = '[ Zavřít ]';
    closeBtn.addEventListener('click', onClose);

    const footerActions = document.createElement('div');
    footerActions.className = 'map-footer-actions';
    footerActions.appendChild(recenterBtn);
    footerActions.appendChild(closeBtn);

    const footerBottom = document.createElement('div');
    footerBottom.className = 'map-footer-row';
    footerBottom.appendChild(this.metaEl);
    footerBottom.appendChild(footerActions);

    footer.appendChild(legend);
    footer.appendChild(footerBottom);

    panel.appendChild(header);
    panel.appendChild(canvasWrap);
    panel.appendChild(footer);
    this.root.appendChild(panel);

    // Interactive map dragging & cursor-centered mouse wheel zoom
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      this.isDragging = true;
      this.dragStartClientX = e.clientX;
      this.dragStartClientY = e.clientY;
      this.dragStartPanX = this.panX;
      this.dragStartPanY = this.panY;
      this.canvas.classList.add('dragging');
    });

    this.handleMouseMoveBound = (e: MouseEvent) => {
      if (!this.isDragging || !this.visible) return;
      const scale = this.basePxPerCell * this.mapZoom;
      const rect = this.canvas.getBoundingClientRect();
      const ratioX = rect.width > 0 ? this.cssW / rect.width : 1;
      const dx = (e.clientX - this.dragStartClientX) * ratioX;
      const dy = (e.clientY - this.dragStartClientY) * ratioX;
      this.panX = this.dragStartPanX - dx / scale;
      this.panY = this.dragStartPanY - dy / scale;
    };

    this.handleMouseUpBound = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.canvas.classList.remove('dragging');
    };

    window.addEventListener('mousemove', this.handleMouseMoveBound);
    window.addEventListener('mouseup', this.handleMouseUpBound);

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.visible) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.deltaY === 0) return;

        const rect = this.canvas.getBoundingClientRect();
        const sx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * this.cssW;
        const sy = ((e.clientY - rect.top) / Math.max(1, rect.height)) * this.cssH;

        const oldScale = this.basePxPerCell * this.mapZoom;
        const worldUnderMouseX = this.panX + (sx - this.cssW * 0.5) / oldScale;
        const worldUnderMouseY = this.panY + (sy - this.cssH * 0.5) / oldScale;

        const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
        this.mapZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.mapZoom * factor));

        const newScale = this.basePxPerCell * this.mapZoom;
        this.panX = worldUnderMouseX - (sx - this.cssW * 0.5) / newScale;
        this.panY = worldUnderMouseY - (sy - this.cssH * 0.5) / newScale;
      },
      { passive: false }
    );

    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) onClose();
    });

    this.rebuild(world);
  }

  public rebuild(world: World): void {
    this.chunkCache.clear();
    this.titleEl.textContent = `MAPA SVĚTA (NEKONEČNÁ)`;
    this.seedBadgeEl.textContent = `SEED: ${world.seed}`;
    this.centerOn(world.spawnPoint.x, world.spawnPoint.y);
  }

  public centerOn(x: number, y: number): void {
    this.panX = x;
    this.panY = y;
    this.mapZoom = 1.0;
  }

  public getElement(): HTMLElement {
    return this.root;
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.isDragging = false;
    this.canvas.classList.remove('dragging');
    this.root.classList.toggle('hidden', !visible);
  }

  public isVisible(): boolean {
    return this.visible;
  }

  private bakeChunkThumbnail(chunk: WorldChunk): BakedChunkMeta {
    const thumbSize = 96; // 16x16 mini-cells at 6px each -> scales crisply to 96px at 1.0x zoom
    const gridN = 16; // 64 / 4 = 16
    const step = 4;
    const cellPx = thumbSize / gridN; // 6px

    const off = document.createElement('canvas');
    off.width = thumbSize;
    off.height = thumbSize;
    const octx = off.getContext('2d');
    if (octx) {
      octx.fillStyle = '#09090c';
      octx.fillRect(0, 0, thumbSize, thumbSize);
      octx.font = "6.5px 'JetBrains Mono', 'Cascadia Mono', 'Consolas', monospace";
      octx.textBaseline = 'top';
      octx.textAlign = 'left';

      let lastColor = '';
      for (let mr = 0; mr < gridN; mr++) {
        for (let mc = 0; mc < gridN; mc++) {
          let bestKind: TileKind = 'grass';
          let bestPrio = -1;
          let fallbackKind: TileKind = 'grass';
          let fallbackPrio = -1;
          let wallCount = 0;
          let riverCount = 0;
          let ironWallCount = 0;
          let marbleWallCount = 0;
          let marbleFloorCount = 0;
          let hasOverhang = false;
          let sampleBiome: BiomeKind = chunk.biomes[(mr * step + 2) * CHUNK_SIZE + (mc * step + 2)];

          for (let dy = 0; dy < step; dy++) {
            for (let dx = 0; dx < step; dx++) {
              const lx = mc * step + dx;
              const ly = mr * step + dy;
              const cell = chunk.cells[ly * CHUNK_SIZE + lx];
              if (cell.overhangChar) hasOverhang = true;
              if (cell.kind === 'wall') {
                wallCount++;
                if (cell.bg === PALETTE.cellBg.ironWall) ironWallCount++;
                else if (cell.bg === PALETTE.cellBg.marbleWall) marbleWallCount++;
              }
              if (cell.kind === 'ruin_floor' && cell.bg === PALETTE.cellBg.marbleFloor) {
                marbleFloorCount++;
              }
              if (cell.kind === 'river_water') riverCount++;
              const p = KIND_PRIORITY[cell.kind] ?? 0;
              if (p > bestPrio) {
                bestPrio = p;
                bestKind = cell.kind;
                sampleBiome = chunk.biomes[ly * CHUNK_SIZE + lx];
              }
              if (cell.kind !== 'wall' && cell.kind !== 'river_water' && p > fallbackPrio) {
                fallbackPrio = p;
                fallbackKind = cell.kind;
              }
            }
          }

          if (bestKind === 'wall' && wallCount < 2) {
            bestKind = fallbackKind;
          } else if (bestKind === 'river_water' && riverCount < 3) {
            bestKind = fallbackKind;
          }

          const tile = mapTileAppearance(bestKind, sampleBiome, hasOverhang);
          if (bestKind === 'wall') {
            if (marbleWallCount >= ironWallCount && marbleWallCount > 0) tile.color = '#ede9dd';
            else if (ironWallCount > 0) tile.color = '#8c6b5c';
          } else if (bestKind === 'ruin_floor' && marbleFloorCount > 0) {
            tile.color = '#8f8d85';
          }
          if (tile.color !== lastColor) {
            octx.fillStyle = tile.color;
            lastColor = tile.color;
          }
          octx.fillText(tile.char, mc * cellPx + 0.5, mr * cellPx);
        }
      }
    }

    let poiLabel: BakedChunkMeta['poiLabel'] = null;
    if (chunk.poi) {
      const p = chunk.poi;
      poiLabel = {
        text: p.shortLabel,
        x: p.x,
        y: p.y - p.radiusY - 3,
        color:
          p.id === 'city_kaelvarr'
            ? '#ff8c42'
            : p.id === 'city_siltmoor'
              ? '#64f0b0'
              : p.id === 'city_aethelgard'
                ? '#f5eedc'
                : p.id === 'village'
                  ? '#88decb'
                  : p.id === 'cathedral'
                    ? '#e09a8a'
                    : '#d2ccc0',
      };
    } else if (chunk.cx === 0 && chunk.cy === 0) {
      poiLabel = {
        text: 'ÚTOČIŠTĚ',
        x: 0,
        y: -11,
        color: '#e8d094',
      };
    }

    return {
      canvas: off,
      cx: chunk.cx,
      cy: chunk.cy,
      poiLabel,
    };
  }

  public render(
    world: World,
    player: Player,
    lighting: LightingSystem,
    elapsedTime: number,
    questMarkers: readonly QuestMapMarker[] = [],
    chartedMarkers: readonly ChartedMarker[] = []
  ): void {
    if (!this.visible) return;

    this.lastPlayerX = player.x;
    this.lastPlayerY = player.y;

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#070709';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const scale = this.basePxPerCell * this.mapZoom;
    const chunkPx = CHUNK_SIZE * scale;
    const centerX = this.cssW * 0.5;
    const centerY = this.cssH * 0.5;

    const worldToScreenX = (wx: number): number => centerX + (wx - this.panX) * scale;
    const worldToScreenY = (wy: number): number => centerY + (wy - this.panY) * scale;

    // 1. Subtle infinite chunk coordinate grid
    const minWorldX = this.panX - centerX / scale;
    const maxWorldX = this.panX + centerX / scale;
    const minWorldY = this.panY - centerY / scale;
    const maxWorldY = this.panY + centerY / scale;

    const startCx = Math.floor(minWorldX / CHUNK_SIZE) - 1;
    const endCx = Math.floor(maxWorldX / CHUNK_SIZE) + 1;
    const startCy = Math.floor(minWorldY / CHUNK_SIZE) - 1;
    const endCy = Math.floor(maxWorldY / CHUNK_SIZE) + 1;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let cx = startCx; cx <= endCx + 1; cx++) {
      const sx = Math.round(worldToScreenX(cx * CHUNK_SIZE)) + 0.5;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, this.cssH);
    }
    for (let cy = startCy; cy <= endCy + 1; cy++) {
      const sy = Math.round(worldToScreenY(cy * CHUNK_SIZE)) + 0.5;
      ctx.moveTo(0, sy);
      ctx.lineTo(this.cssW, sy);
    }
    ctx.stroke();

    // 2. Render explored chunk thumbnails inside viewport (lazily bake <= 8 per frame)
    const exploredKeys = lighting.getExploredChunkKeys();
    const visiblePoiLabels: NonNullable<BakedChunkMeta['poiLabel']>[] = [];
    let bakedThisFrame = 0;

    for (const key of exploredKeys) {
      const comma = key.indexOf(',');
      if (comma === -1) continue;
      const cx = Number(key.slice(0, comma));
      const cy = Number(key.slice(comma + 1));

      const sx = worldToScreenX(cx * CHUNK_SIZE);
      const sy = worldToScreenY(cy * CHUNK_SIZE);
      if (sx + chunkPx < -4 || sx > this.cssW + 4 || sy + chunkPx < -4 || sy > this.cssH + 4) {
        continue;
      }

      let meta = this.chunkCache.get(key);
      if (!meta && bakedThisFrame < 8) {
        const chunk = world.getChunkForPreview(cx, cy);
        meta = this.bakeChunkThumbnail(chunk);
        this.chunkCache.set(key, meta);
        bakedThisFrame++;
      }

      if (meta) {
        ctx.drawImage(meta.canvas, sx, sy, chunkPx + 0.6, chunkPx + 0.6);
        if (meta.poiLabel) {
          visiblePoiLabels.push(meta.poiLabel);
        }
      } else {
        // Placeholder shimmer while baking lazily
        ctx.fillStyle = 'rgba(40, 44, 52, 0.25)';
        ctx.fillRect(sx, sy, chunkPx, chunkPx);
      }
    }

    // 3. Draw explored POI labels cleanly above terrain
    ctx.font = "600 8.5px 'JetBrains Mono', 'Cascadia Mono', 'Consolas', monospace";
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    for (let i = 0; i < visiblePoiLabels.length; i++) {
      const lbl = visiblePoiLabels[i];
      const lx = worldToScreenX(lbl.x);
      const ly = worldToScreenY(lbl.y);
      const w = ctx.measureText(lbl.text).width;
      ctx.fillStyle = 'rgba(9, 9, 11, 0.86)';
      ctx.fillRect(lx - w * 0.5 - 3, ly - 1, w + 6, 11);
      ctx.fillStyle = lbl.color;
      ctx.fillText(lbl.text, lx, ly);
    }

    // 4. Draw Quest Markers (visible even far in unexplored fog or pinned to viewport border!)
    if (questMarkers.length > 0) {
      const pulse = 0.55 + Math.sin(elapsedTime * 4.2) * 0.45;
      ctx.font = "700 9px 'JetBrains Mono', 'Consolas', monospace";
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      for (let i = 0; i < questMarkers.length; i++) {
        const m = questMarkers[i];
        const rawX = worldToScreenX(m.x);
        const rawY = worldToScreenY(m.y);
        const inView =
          rawX >= 14 && rawX <= this.cssW - 14 && rawY >= 14 && rawY <= this.cssH - 14;
        const badge = m.isTurnIn ? '[?]' : '[!]';
        const color = m.isTurnIn ? '#74e098' : '#f0c45a';

        if (inView) {
          const radius = 11 + pulse * 4;
          ctx.strokeStyle = m.isTurnIn
            ? `rgba(116, 224, 152, ${(0.45 + pulse * 0.45).toFixed(2)})`
            : `rgba(240, 196, 90, ${(0.45 + pulse * 0.45).toFixed(2)})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(rawX, rawY, radius, 0, Math.PI * 2);
          ctx.stroke();

          const tw = ctx.measureText(badge).width;
          ctx.fillStyle = 'rgba(9, 9, 11, 0.9)';
          ctx.fillRect(rawX - tw * 0.5 - 2, rawY - 6, tw + 4, 12);
          ctx.fillStyle = color;
          ctx.fillText(badge, rawX - tw * 0.5, rawY);
        } else {
          // Clamped compass-edge marker so player knows which way to pan or travel
          const ex = Math.max(24, Math.min(this.cssW - 24, rawX));
          const ey = Math.max(16, Math.min(this.cssH - 16, rawY));
          const distCells = Math.round(Math.hypot(m.x - player.x, m.y - player.y));
          const text = `${badge} ${distCells}`;
          const tw = ctx.measureText(text).width;
          const boxX = Math.max(6, Math.min(this.cssW - tw - 12, ex - tw * 0.5));
          ctx.fillStyle = 'rgba(12, 12, 16, 0.92)';
          ctx.fillRect(boxX - 2, ey - 7, tw + 6, 14);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.strokeRect(boxX - 2, ey - 7, tw + 6, 14);
          ctx.fillStyle = color;
          ctx.fillText(text, boxX + 1, ey);
        }
      }
    }

    // 4b. Draw Charted Ruins/Altar Markers revealed by Traveler Map Sketches
    if (chartedMarkers.length > 0) {
      ctx.font = "700 9px 'JetBrains Mono', 'Consolas', monospace";
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      for (let i = 0; i < chartedMarkers.length; i++) {
        const cm = chartedMarkers[i];
        const rawX = worldToScreenX(cm.x);
        const rawY = worldToScreenY(cm.y);
        const inView =
          rawX >= 14 && rawX <= this.cssW - 14 && rawY >= 14 && rawY <= this.cssH - 14;
        const badge = cm.isCity ? '[★]' : '[♦]';
        const color = cm.color ?? '#7ee0c8';

        if (inView) {
          ctx.strokeStyle = color;
          ctx.lineWidth = cm.isCity ? 1.5 : 1.2;
          ctx.beginPath();
          ctx.arc(rawX, rawY, cm.isCity ? 12 : 10, 0, Math.PI * 2);
          ctx.stroke();

          const tw = ctx.measureText(badge).width;
          ctx.fillStyle = 'rgba(9, 9, 11, 0.92)';
          ctx.fillRect(rawX - tw * 0.5 - 2, rawY - 6, tw + 4, 12);
          ctx.fillStyle = color;
          ctx.fillText(badge, rawX - tw * 0.5, rawY);

          ctx.font = "600 8px 'JetBrains Mono', 'Consolas', monospace";
          const lw = ctx.measureText(cm.label).width;
          ctx.fillStyle = 'rgba(9, 9, 11, 0.88)';
          ctx.fillRect(rawX - lw * 0.5 - 3, rawY + 8, lw + 6, 10);
          ctx.fillStyle = color;
          ctx.fillText(cm.label, rawX - lw * 0.5, rawY + 13);
          ctx.font = "700 9px 'JetBrains Mono', 'Consolas', monospace";
        } else {
          const ex = Math.max(24, Math.min(this.cssW - 24, rawX));
          const ey = Math.max(16, Math.min(this.cssH - 16, rawY));
          const distCells = Math.round(Math.hypot(cm.x - player.x, cm.y - player.y));
          const text = `${badge} ${distCells}`;
          const tw = ctx.measureText(text).width;
          const boxX = Math.max(6, Math.min(this.cssW - tw - 12, ex - tw * 0.5));
          ctx.fillStyle = 'rgba(12, 12, 16, 0.92)';
          ctx.fillRect(boxX - 2, ey - 7, tw + 6, 14);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.strokeRect(boxX - 2, ey - 7, tw + 6, 14);
          ctx.fillStyle = color;
          ctx.fillText(text, boxX + 1, ey);
        }
      }
    }

    // 5. Blinking player '@' marker at live global coordinates
    const px = worldToScreenX(player.x);
    const py = worldToScreenY(player.y);
    const blink = 0.72 + Math.sin(elapsedTime * 5.2) * 0.28;

    ctx.fillStyle = `rgba(235, 200, 110, ${(0.18 * blink).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#09090b';
    ctx.fillRect(px - 6, py - 6, 12, 12);

    ctx.font = "700 11px 'JetBrains Mono', 'Consolas', monospace";
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5de93';
    ctx.fillText('@', px, py + 0.5);

    // 6. Bottom-right canvas seed & coordinate badge
    const infoTag = `SEED: ${world.seed} · Zoom ${this.mapZoom.toFixed(2)}×`;
    ctx.font = "600 8.5px 'JetBrains Mono', 'Consolas', monospace";
    const sm = ctx.measureText(infoTag);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(9, 9, 11, 0.88)';
    ctx.fillRect(this.cssW - sm.width - 12, this.cssH - 16, sm.width + 8, 12);
    ctx.fillStyle = '#c9a66b';
    ctx.fillText(infoTag, this.cssW - sm.width - 8, this.cssH - 14);

    ctx.restore();

    const zone = world.getZoneName(player.x, player.y);
    const chunksCount = lighting.getExploredChunkCount();
    this.metaEl.textContent = `Pozice: ${Math.round(player.x)},${Math.round(player.y)} · ${zone} · Prozkoumáno: ${chunksCount} chunků · Zoom: ${this.mapZoom.toFixed(2)}×`;
  }

  public dispose(): void {
    window.removeEventListener('mousemove', this.handleMouseMoveBound);
    window.removeEventListener('mouseup', this.handleMouseUpBound);
  }
}
