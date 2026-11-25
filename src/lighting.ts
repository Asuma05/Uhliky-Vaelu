import type { AmbientLightProfile } from './environment';
import type { Player } from './player';
import { CHUNK_SIZE, chunkKey, floorDiv, posMod, type World } from './world';

/** Classic 8-octant recursive shadowcasting multipliers */
const OCTANT_MULT: readonly [
  readonly number[],
  readonly number[],
  readonly number[],
  readonly number[],
] = [
  [1, 0, 0, -1, -1, 0, 0, 1],
  [0, 1, -1, 0, 0, -1, 1, 0],
  [0, 1, 1, 0, 0, -1, -1, 0],
  [1, 0, 0, 1, -1, 0, 0, -1],
];

const LOS_HALF_X = 116;
const LOS_HALF_Y = 74;
const LOS_W = LOS_HALF_X * 2 + 1;
const LOS_H = LOS_HALF_Y * 2 + 1;
const CHUNK_BITMASK_BYTES = (CHUNK_SIZE * CHUNK_SIZE) >> 3; // 512 bytes per chunk

export interface CellIllumination {
  /** Whether the cell has clear line-of-sight from the player */
  inLos: boolean;
  /** Whether the player has previously seen this cell (map memory) */
  explored: boolean;
  /** Total light intensity [0, 1] hitting this cell */
  intensity: number;
  /** Warm amber lantern/fire contribution [0, 1] */
  warmth: number;
  /** Golden daytime sunlight contribution [0, 1] */
  sunlight: number;
  /** Ghostly cyan wisp/monolith contribution [0, 1] */
  cyanGlow: number;
}

interface ActiveWorldLight {
  x: number;
  y: number;
  radiusY: number;
  radiusX: number;
  isWarm: boolean;
  pulse: number;
}

function smoothRadialFalloff(normDist: number): number {
  if (normDist >= 1) return 0;
  if (normDist <= 0) return 1;
  const u = 1 - normDist;
  const smooth = u * u * (3 - 2 * u);
  return smooth * 0.55 + u * u * 0.45;
}

export class LightingSystem {
  /** Sliding-window incoming visibility buffer [0..255] centered on (losOriginCol, losOriginRow) */
  private readonly losMask = new Uint8Array(LOS_W * LOS_H);
  /** Sliding-window outgoing transmitted visibility [0..255] after semi-transparent obstacles */
  private readonly passMask = new Uint8Array(LOS_W * LOS_H);
  /** Sparse list of marked buffer indices for O(visible) fast clearing */
  private readonly losIndices: number[] = [];
  private losOriginCol = 0;
  private losOriginRow = 0;

  /** Chunked bit-packed explored map memory (512 bytes per visited 64×64 chunk) */
  private readonly exploredBitmasks = new Map<string, Uint8Array>();
  private readonly exploredChunkKeys = new Set<string>();
  private exploredCount = 0;

  /** Pre-filtered active-chunk world lights for the current frame */
  private readonly nearbyLights: ActiveWorldLight[] = [];

  private lastOriginCol = Number.NaN;
  private lastOriginRow = Number.NaN;

  // Aspect ratio compensation (cellHeight / cellWidth = 9.5 / 6.0 ≈ 1.583)
  private readonly aspectRatio = 9.5 / 6.0;

  private readonly nightSightRadiusY = 30;
  private readonly sunnySightRadiusY = 66;
  private sightRadiusY = 66;
  private sightRadiusX: number;
  private lastShadowRadiusY = -1;

  private originX = 0;
  private originY = 0;
  private activeRadiusY = 18;
  private activeRadiusX = 28;
  private lanternActive = true;
  private lanternWarmth = 1;
  private flickerFactor = 1;
  private ambientStrength = 0;
  private currentSunlight = 0;
  private ambientRadiusY = 26;
  private ambientRadiusX = 40;

  constructor() {
    this.sightRadiusX = Math.ceil(this.sightRadiusY * this.aspectRatio);
  }

  public getExploredCount(): number {
    return this.exploredCount;
  }

  public getExploredChunkCount(): number {
    return this.exploredChunkKeys.size;
  }

  public getExploredChunkKeys(): ReadonlySet<string> {
    return this.exploredChunkKeys;
  }

  public exportExploredChunks(): string[] {
    return Array.from(this.exploredChunkKeys);
  }

  public importExploredChunks(keys: readonly string[]): void {
    this.exploredBitmasks.clear();
    this.exploredChunkKeys.clear();
    this.exploredCount = 0;

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!k || this.exploredChunkKeys.has(k)) continue;
      this.exploredChunkKeys.add(k);
      const mask = new Uint8Array(CHUNK_BITMASK_BYTES);
      mask.fill(0xff);
      this.exploredBitmasks.set(k, mask);
      this.exploredCount += CHUNK_SIZE * CHUNK_SIZE;
    }
  }

  /** Reveals an area of (2*radius+1)x(2*radius+1) chunks on the map memory (used by map sketches). */
  public revealChunkArea(centerCx: number, centerCy: number, radius = 1): number {
    let newlyRevealed = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const k = chunkKey(centerCx + dx, centerCy + dy);
        if (!this.exploredChunkKeys.has(k)) {
          this.exploredChunkKeys.add(k);
          newlyRevealed++;
        }
        const existing = this.exploredBitmasks.get(k);
        if (!existing) {
          const mask = new Uint8Array(CHUNK_BITMASK_BYTES);
          mask.fill(0xff);
          this.exploredBitmasks.set(k, mask);
          this.exploredCount += CHUNK_SIZE * CHUNK_SIZE;
        } else {
          for (let i = 0; i < existing.length; i++) {
            if (existing[i] !== 0xff) {
              for (let b = 0; b < 8; b++) {
                if ((existing[i] & (1 << b)) === 0) {
                  this.exploredCount++;
                }
              }
              existing[i] = 0xff;
            }
          }
        }
      }
    }
    return newlyRevealed;
  }

  public getLosVisibility(col: number, row: number): number {
    const bx = col - this.losOriginCol + LOS_HALF_X;
    const by = row - this.losOriginRow + LOS_HALF_Y;
    if (bx < 0 || bx >= LOS_W || by < 0 || by >= LOS_H) return 0;
    return this.losMask[by * LOS_W + bx] / 255;
  }

  public isInLOS(col: number, row: number): boolean {
    const bx = col - this.losOriginCol + LOS_HALF_X;
    const by = row - this.losOriginRow + LOS_HALF_Y;
    if (bx < 0 || bx >= LOS_W || by < 0 || by >= LOS_H) return false;
    return this.losMask[by * LOS_W + bx] >= 12;
  }

  public getLanternGlowState(): {
    x: number;
    y: number;
    radiusX: number;
    radiusY: number;
    active: boolean;
    warmth: number;
    flicker: number;
  } {
    return {
      x: this.originX,
      y: this.originY,
      radiusX: this.activeRadiusX,
      radiusY: this.activeRadiusY,
      active: this.lanternActive,
      warmth: this.lanternWarmth,
      flicker: this.flickerFactor,
    };
  }

  public isExplored(col: number, row: number): boolean {
    const cx = floorDiv(col, CHUNK_SIZE);
    const cy = floorDiv(row, CHUNK_SIZE);
    const mask = this.exploredBitmasks.get(chunkKey(cx, cy));
    if (!mask) return false;
    const lx = posMod(col, CHUNK_SIZE);
    const ly = posMod(row, CHUNK_SIZE);
    const bitIdx = ly * CHUNK_SIZE + lx;
    return (mask[bitIdx >> 3] & (1 << (bitIdx & 7))) !== 0;
  }

  private markExplored(col: number, row: number): void {
    const cx = floorDiv(col, CHUNK_SIZE);
    const cy = floorDiv(row, CHUNK_SIZE);
    const k = chunkKey(cx, cy);
    let mask = this.exploredBitmasks.get(k);
    if (!mask) {
      mask = new Uint8Array(CHUNK_BITMASK_BYTES);
      this.exploredBitmasks.set(k, mask);
      this.exploredChunkKeys.add(k);
    }
    const lx = posMod(col, CHUNK_SIZE);
    const ly = posMod(row, CHUNK_SIZE);
    const bitIdx = ly * CHUNK_SIZE + lx;
    const byteIdx = bitIdx >> 3;
    const bitMask = 1 << (bitIdx & 7);
    if ((mask[byteIdx] & bitMask) === 0) {
      mask[byteIdx] |= bitMask;
      this.exploredCount++;
    }
  }

  public forceShadowcastRefresh(): void {
    this.lastOriginCol = Number.NaN;
    this.lastOriginRow = Number.NaN;
  }

  public update(
    world: World,
    player: Player,
    elapsedTime: number,
    ambient: AmbientLightProfile
  ): void {
    this.originX = player.x;
    this.originY = player.y - 1.2;

    let ox = Math.floor(this.originX);
    let oy = Math.floor(this.originY);
    if (world.isOpaqueCell(ox, oy)) {
      ox = Math.floor(player.x);
      oy = Math.floor(player.y);
    }

    const dayExpand = Math.max(ambient.sunlight, ambient.ambientStrength * 0.85);
    const desiredSightY = Math.round(
      (this.nightSightRadiusY +
        (this.sunnySightRadiusY - this.nightSightRadiusY) * dayExpand) *
        Math.max(0.55, ambient.sightMultiplier)
    );
    const quantSightY = Math.max(18, Math.min(68, Math.round(desiredSightY / 2) * 2));

    if (
      ox !== this.lastOriginCol ||
      oy !== this.lastOriginRow ||
      quantSightY !== this.lastShadowRadiusY
    ) {
      this.sightRadiusY = quantSightY;
      this.sightRadiusX = Math.min(LOS_HALF_X - 4, Math.ceil(quantSightY * this.aspectRatio));
      this.recomputeShadowcast(world, ox, oy);
      this.lastOriginCol = ox;
      this.lastOriginRow = oy;
      this.lastShadowRadiusY = quantSightY;
    }

    const lowOil = player.oil > 0 && player.oil < 15;
    const flutterAmp = lowOil ? 0.085 : 0.036;
    this.flickerFactor =
      1 +
      Math.sin(elapsedTime * 3.1) * (flutterAmp * 0.55) +
      Math.sin(elapsedTime * 7.4) * flutterAmp +
      Math.sin(elapsedTime * 15.3) * (flutterAmp * 0.48) +
      Math.sin(elapsedTime * 24.1) * (flutterAmp * 0.22);

    const hasLantern = player.lanternOn && player.oil > 0;
    const hasTorch = player.hasTorchLit;
    const fogMult = ambient.sightMultiplier;

    this.ambientStrength = ambient.ambientStrength;
    this.currentSunlight = ambient.sunlight;
    this.ambientRadiusY = this.sightRadiusY * fogMult;
    this.ambientRadiusX = this.ambientRadiusY * this.aspectRatio;

    if (hasLantern) {
      const oilScale = lowOil ? 0.72 + (player.oil / 15) * 0.28 : 1;
      const baseRadiusY = (hasTorch ? 21.5 : 18.5) * player.lanternRangeMultiplier;
      this.activeRadiusY = baseRadiusY * oilScale * this.flickerFactor * (0.45 + fogMult * 0.55);
      this.lanternActive = true;
      this.lanternWarmth = 1;
    } else if (hasTorch) {
      this.activeRadiusY =
        10.5 * player.lanternRangeMultiplier * this.flickerFactor * (0.5 + fogMult * 0.5);
      this.lanternActive = true;
      this.lanternWarmth = 0.85;
    } else {
      this.activeRadiusY = (player.hasDarkSightRelic ? 5.2 : 3.8) * (0.65 + fogMult * 0.35);
      this.lanternActive = false;
      this.lanternWarmth = 0;
    }

    this.activeRadiusX = this.activeRadiusY * this.aspectRatio;

    this.nearbyLights.length = 0;
    const lights = world.getActiveLights();
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      const lrx = light.radius * this.aspectRatio;
      if (
        Math.abs(light.y - this.originY) > this.sightRadiusY + light.radius ||
        Math.abs(light.x - this.originX) > this.sightRadiusX + lrx
      ) {
        continue;
      }
      const seed = light.x * 1.73 + light.y * 2.41;
      const pulse = light.flicker
        ? 0.93 +
          Math.sin(elapsedTime * 4.3 + seed) * 0.045 +
          Math.sin(elapsedTime * 9.7 + seed * 1.6) * 0.035 +
          Math.sin(elapsedTime * 18.4 + seed * 0.7) * 0.018
        : 1;
      const radiusScale = light.flicker ? 0.95 + (pulse - 0.93) * 0.65 : 1;
      this.nearbyLights.push({
        x: light.x,
        y: light.y,
        radiusY: light.radius * radiusScale,
        radiusX: lrx * radiusScale,
        isWarm: light.color.includes('218') || light.color.includes('255, 92'),
        pulse,
      });
    }

    const exploreRx = Math.max(
      this.activeRadiusX,
      this.ambientStrength > 0.12 ? this.ambientRadiusX * 0.85 : 0
    );
    const exploreRy = Math.max(
      this.activeRadiusY,
      this.ambientStrength > 0.12 ? this.ambientRadiusY * 0.85 : 0
    );
    const rx2 = exploreRx * exploreRx;
    const ry2 = exploreRy * exploreRy;

    for (let i = 0; i < this.losIndices.length; i++) {
      const bufIdx = this.losIndices[i];
      if (this.losMask[bufIdx] < 18) continue;
      const by = Math.floor(bufIdx / LOS_W);
      const bx = bufIdx - by * LOS_W;
      const col = this.losOriginCol + (bx - LOS_HALF_X);
      const row = this.losOriginRow + (by - LOS_HALF_Y);

      const dx = col + 0.5 - this.originX;
      const dy = row + 0.5 - this.originY;
      if ((dx * dx) / rx2 + (dy * dy) / ry2 <= 1.0) {
        this.markExplored(col, row);
      }
    }
  }

  public sampleCellInto(col: number, row: number, out: CellIllumination): void {
    const losVis = this.getLosVisibility(col, row);
    const inLos = losVis >= 0.047;
    const explored = this.isExplored(col, row);

    if (!inLos) {
      out.inLos = false;
      out.explored = explored;
      out.intensity = 0;
      out.warmth = 0;
      out.sunlight = 0;
      out.cyanGlow = 0;
      return;
    }

    const dx = col + 0.5 - this.originX;
    const dy = row + 0.5 - this.originY;
    const normDist = Math.hypot(dx / this.activeRadiusX, dy / this.activeRadiusY);

    let intensity = 0;
    let warmth = 0;

    if (normDist < 1) {
      const falloff = smoothRadialFalloff(normDist) * losVis;
      if (this.lanternActive) {
        const flickerGlow = 0.96 + (this.flickerFactor - 1) * 0.6;
        intensity = Math.min(1, falloff * flickerGlow);
        warmth = Math.min(1, falloff * this.lanternWarmth * flickerGlow * (1 - this.currentSunlight * 0.82));
      } else {
        intensity = falloff * 0.34;
      }
    }

    let cellSun = 0;
    if (this.ambientStrength > 0.01) {
      const ambDist = Math.hypot(dx / this.ambientRadiusX, dy / this.ambientRadiusY);
      if (ambDist < 1) {
        const falloffPower = 0.38 * (1 - this.currentSunlight * 0.94);
        const ambFalloff = falloffPower < 0.04 ? 1.0 : Math.pow(1 - ambDist, falloffPower);
        const ambVal = this.ambientStrength * ambFalloff * losVis;
        if (ambVal > intensity) {
          intensity = ambVal;
        }
        cellSun = this.currentSunlight * ambFalloff * losVis;
      }
    }

    let cyanGlow = 0;
    const worldLightVis = 0.42 + 0.58 * losVis;
    for (let i = 0; i < this.nearbyLights.length; i++) {
      const light = this.nearbyLights[i];
      const ldy = row + 0.5 - light.y;
      if (Math.abs(ldy) > light.radiusY) continue;
      const ldx = col + 0.5 - light.x;
      if (Math.abs(ldx) > light.radiusX) continue;

      const lNorm = Math.hypot(ldx / light.radiusX, ldy / light.radiusY);
      if (lNorm >= 1) continue;

      const contrib = smoothRadialFalloff(lNorm) * 0.86 * light.pulse * worldLightVis;
      intensity = Math.min(1, intensity + contrib * (contrib > intensity ? 0.82 : 0.48));

      if (light.isWarm) {
        warmth = Math.min(1, warmth + contrib * 0.94);
      } else {
        cyanGlow = Math.min(1, cyanGlow + contrib * 0.95);
      }
    }

    out.inLos = true;
    out.explored = explored || intensity > 0.08;
    out.intensity = intensity;
    out.warmth = warmth;
    out.sunlight = cellSun;
    out.cyanGlow = cyanGlow;
  }

  public sampleCell(col: number, row: number): CellIllumination {
    const out: CellIllumination = {
      inLos: false,
      explored: false,
      intensity: 0,
      warmth: 0,
      sunlight: 0,
      cyanGlow: 0,
    };
    this.sampleCellInto(col, row, out);
    return out;
  }

  private recomputeShadowcast(world: World, ox: number, oy: number): void {
    for (let i = 0; i < this.losIndices.length; i++) {
      const idx = this.losIndices[i];
      this.losMask[idx] = 0;
      this.passMask[idx] = 0;
    }
    this.losIndices.length = 0;
    this.losOriginCol = ox;
    this.losOriginRow = oy;

    this.markVisible(ox, oy, 255, 255);

    const maxSteps = this.sightRadiusX;
    for (let oct = 0; oct < 8; oct++) {
      this.castLight(
        world,
        ox,
        oy,
        maxSteps,
        1,
        1.0,
        0.0,
        OCTANT_MULT[0][oct],
        OCTANT_MULT[1][oct],
        OCTANT_MULT[2][oct],
        OCTANT_MULT[3][oct]
      );
    }
  }

  private getPassValue(col: number, row: number): number {
    const bx = col - this.losOriginCol + LOS_HALF_X;
    const by = row - this.losOriginRow + LOS_HALF_Y;
    if (bx < 0 || bx >= LOS_W || by < 0 || by >= LOS_H) return 0;
    return this.passMask[by * LOS_W + bx];
  }

  private markVisible(col: number, row: number, incoming: number, outgoing: number): void {
    const bx = col - this.losOriginCol + LOS_HALF_X;
    const by = row - this.losOriginRow + LOS_HALF_Y;
    if (bx < 0 || bx >= LOS_W || by < 0 || by >= LOS_H) return;
    const idx = by * LOS_W + bx;
    if (this.losMask[idx] === 0 && this.passMask[idx] === 0) {
      this.losIndices.push(idx);
    }
    if (incoming > this.losMask[idx]) {
      this.losMask[idx] = incoming;
    }
    if (outgoing > this.passMask[idx]) {
      this.passMask[idx] = outgoing;
    }
  }

  private castLight(
    world: World,
    ox: number,
    oy: number,
    maxSteps: number,
    startRow: number,
    startSlope: number,
    endSlope: number,
    xx: number,
    xy: number,
    yx: number,
    yy: number
  ): void {
    if (startSlope < endSlope) return;

    let nextStartSlope = startSlope;
    const rx2 = this.sightRadiusX * this.sightRadiusX;
    const ry2 = this.sightRadiusY * this.sightRadiusY;

    for (let j = startRow; j <= maxSteps; j++) {
      let blocked = false;
      const dy = -j;
      const prevJ = j - 1;
      const prevDy = -prevJ;

      for (let dx = -j; dx <= 0; dx++) {
        const lSlope = (dx - 0.5) / (dy + 0.5);
        const rSlope = (dx + 0.5) / (dy - 0.5);

        if (startSlope < rSlope) continue;
        if (endSlope > lSlope) break;

        const deltaX = dx * xx + dy * xy;
        const deltaY = dx * yx + dy * yy;
        const mapX = ox + deltaX;
        const mapY = oy + deltaY;

        // Interpolate outgoing transmittance from the two parent cells in row j-1
        const px = (dx * prevJ) / j;
        const x0 = Math.max(-prevJ, Math.floor(px));
        const x1 = Math.min(0, x0 + 1);
        const frac = Math.max(0, Math.min(1, px - x0));

        const p0 = this.getPassValue(ox + x0 * xx + prevDy * xy, oy + x0 * yx + prevDy * yy);
        const p1 =
          x1 === x0
            ? p0
            : this.getPassValue(ox + x1 * xx + prevDy * xy, oy + x1 * yx + prevDy * yy);
        const incoming = Math.round(p0 + (p1 - p0) * frac);

        const trans = world.getLightTransmittance(mapX, mapY);
        const isOpaque = trans <= 0;

        const inSightEllipse = (deltaX * deltaX) / rx2 + (deltaY * deltaY) / ry2 <= 1.0;
        if (inSightEllipse && incoming > 0) {
          const outgoing = isOpaque ? 0 : Math.round(incoming * trans);
          this.markVisible(mapX, mapY, incoming, outgoing);
        }

        if (blocked) {
          if (isOpaque) {
            nextStartSlope = rSlope;
            continue;
          } else {
            blocked = false;
            startSlope = nextStartSlope;
          }
        } else if (isOpaque && j < maxSteps) {
          blocked = true;
          this.castLight(
            world,
            ox,
            oy,
            maxSteps,
            j + 1,
            startSlope,
            lSlope,
            xx,
            xy,
            yx,
            yy
          );
          nextStartSlope = rSlope;
        }
      }

      if (blocked) break;
    }
  }
}
