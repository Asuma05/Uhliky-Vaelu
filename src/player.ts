import { t } from './i18n';
import type { Inventory } from './inventory';
import type {
  ActiveStatusEffect,
  AsciiSprite,
  Direction,
  RectBounds,
  SpriteCell,
  Vec2,
} from './types';
import type { World } from './world';

const CLOAK_EDGE = '#e3dac8';
const CLOAK_DARK = '#4d5061';
const CLOAK_HEM = '#a89f91';
const EYE_GLINT = '#ffe394';
const BLADE_STEEL = '#d8e3f2';
const BLADE_RUNIC = '#8ae3ff';
const HURT_FLASH = '#ff6354';
const DASH_TINT = '#f5ebd2';
const SILHOUETTE_BG = '#09090b';

function cell(char: string, color: string): SpriteCell {
  return { char, color, bg: SILHOUETTE_BG };
}

/**
 * Builds a compact 3x3 hooded dark-fantasy silhouette with a crisp outline
 * and a clearly visible drawn blade oriented to movement facing.
 */
function buildHoodedSprite(
  facing: Direction,
  stepFrame: number,
  hurtFlash: boolean,
  dashing: boolean,
  hasRunicWeapon: boolean
): AsciiSprite {
  const edge = hurtFlash ? HURT_FLASH : dashing ? DASH_TINT : CLOAK_EDGE;
  const dark = hurtFlash ? '#a63329' : CLOAK_DARK;
  const hem = hurtFlash ? HURT_FLASH : CLOAK_HEM;
  const eye = hurtFlash ? '#ffffff' : EYE_GLINT;
  const blade = hurtFlash ? '#ffffff' : hasRunicWeapon ? BLADE_RUNIC : BLADE_STEEL;

  // Row 0: crisp pointed hood + raised blade tip when facing left/right/up
  let row0: (SpriteCell | null)[];
  if (facing === 'up') {
    row0 = [cell('╱', edge), cell('▲', edge), cell('†', blade)];
  } else if (facing === 'left') {
    row0 = [cell('╲', blade), cell('∩', edge), cell('╲', edge)];
  } else if (facing === 'right') {
    row0 = [cell('╱', edge), cell('∩', edge), cell('╱', blade)];
  } else {
    row0 = [cell('╭', edge), cell('▲', edge), cell('╮', edge)];
  }

  // Row 1: shadowed face/eyes & cloaked torso + held weapon
  let row1: (SpriteCell | null)[];
  if (facing === 'up') {
    row1 = [cell('│', edge), cell('▓', dark), cell('│', blade)];
  } else if (facing === 'left') {
    row1 = [cell('†', blade), cell('•', eye), cell('│', edge)];
  } else if (facing === 'right') {
    row1 = [cell('│', edge), cell('•', eye), cell('†', blade)];
  } else {
    row1 = [cell('(', edge), cell('¨', eye), cell('†', blade)];
  }

  // Row 2: agile animated stride & cloak hem
  let row2: (SpriteCell | null)[];
  if (stepFrame === 1) {
    row2 = [cell('╱', hem), cell('╨', dark), cell('│', hem)];
  } else if (stepFrame === 3) {
    row2 = [cell('│', hem), cell('╨', dark), cell('╲', hem)];
  } else {
    row2 = [cell('└', hem), cell('┼', dark), cell('┘', hem)];
  }

  return {
    width: 3,
    height: 3,
    cells: [row0, row1, row2],
  };
}

export class Player {
  /** World coordinates (in cell units) of the character's feet center */
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;

  /** Movement speeds in world cells per second */
  public readonly walkSpeed = 18;
  public readonly sneakSpeed = this.walkSpeed * 0.6;
  public readonly sprintSpeed = 30;
  public readonly dashSpeed = 58;
  public facing: Direction = 'down';
  public isMoving = false;
  public isSprinting = false;
  public isSneaking = false;
  public inUndergrowth = false;
  public isDashing = false;
  public isDead = false;
  public walkPhase = 0;

  /** RPG vital stats */
  public readonly baseMaxHp = 100;
  public maxHp = 100;
  public hp = 80;
  public readonly baseMaxStamina = 100;
  public maxStamina = 100;
  public stamina = 100;
  public exhausted = false;

  /** Combat stats & timers */
  public readonly baseAttackDamage = 16;
  public weaponAttackBonus = 0;
  public dashCooldown = 0;
  public hurtFlashTimer = 0;
  private dashTimer = 0;
  private dashDir: Vec2 = { x: 0, y: 1 };
  private invulnTimer = 0;
  private kbVx = 0;
  private kbVy = 0;

  /** Lantern & oil state (toggled via F) */
  public readonly maxOil = 100;
  public oil = 100;
  public lanternOn = true;
  public readonly oilDrainRate = 0.8;

  private readonly staminaDrainRate = 28;
  public readonly staminaRegenRate = 22;
  private readonly staminaRegenDelay = 0.75;
  private readonly exhaustedRecoveryThreshold = 18;
  private staminaRegenCooldown = 0;

  /** Active temporary buffs & environmental status effects */
  public readonly activeEffects: ActiveStatusEffect[] = [];

  /** Equipment states driven by Inventory */
  public hasTorchLit = false;
  public equippedWeapon: string | null = null;
  public oilDrainMultiplier = 1;
  public damageReduction = 0;
  public staminaRegenMultiplier = 1;
  public lanternRangeMultiplier = 1;
  public hasDarkSightRelic = false;
  public activeRelicCount = 0;
  public inColdBiome = false;
  public inWater = false;
  private lavaBurnCooldown = 0;
  private waterExhaustToastCooldown = 0;

  public collidedX = false;
  public collidedY = false;

  /** Feet hitbox dimensions relative to (x, y) for clean top-down 2.5D collisions */
  private readonly hitboxHalfWidth = 0.92;
  private readonly hitboxTopOffset = 1.05;
  private readonly hitboxBottomOffset = 0.15;

  constructor(spawn: Vec2) {
    this.x = spawn.x;
    this.y = spawn.y;
  }

  public getAttackDamage(): number {
    return this.baseAttackDamage + this.weaponAttackBonus;
  }

  public addOrRefreshEffect(effect: ActiveStatusEffect): void {
    const existing = this.activeEffects.find((e) => e.id === effect.id);
    if (existing) {
      existing.name = effect.name;
      existing.description = effect.description;
      existing.kind = effect.kind;
      existing.remainingSeconds = Math.max(existing.remainingSeconds, effect.remainingSeconds);
      existing.durationSeconds = Math.max(existing.durationSeconds, effect.durationSeconds);
      existing.staminaRegenBonus = effect.staminaRegenBonus;
      existing.walkSpeedMultiplier = effect.walkSpeedMultiplier;
      existing.hpRegenPerSec = effect.hpRegenPerSec;
      existing.sourceItemId = effect.sourceItemId;
    } else {
      this.activeEffects.push({ ...effect });
    }
  }

  public removeEffect(id: string): void {
    const idx = this.activeEffects.findIndex((e) => e.id === id);
    if (idx !== -1) {
      this.activeEffects.splice(idx, 1);
    }
  }

  private getEffectStaminaRegenBonus(): number {
    let bonus = 0;
    for (const eff of this.activeEffects) {
      bonus += eff.staminaRegenBonus ?? 0;
    }
    return bonus;
  }

  private getEffectWalkSpeedMultiplier(): number {
    let mult = 1;
    for (const eff of this.activeEffects) {
      if (eff.walkSpeedMultiplier !== undefined) {
        mult *= eff.walkSpeedMultiplier;
      }
    }
    return mult;
  }

  public getEffectiveStaminaRegenRate(): number {
    const biomeMult = this.inColdBiome ? 0.42 : 1;
    const effectMult = Math.max(0.25, 1 + this.getEffectStaminaRegenBonus());
    return this.staminaRegenRate * biomeMult * this.staminaRegenMultiplier * effectMult;
  }

  public getEffectiveOilDrainRate(): number {
    return this.oilDrainRate * this.oilDrainMultiplier;
  }

  public getLanternLightRange(): { base: number; total: number; bonus: number; isLit: boolean } {
    const hasLantern = this.lanternOn && this.oil > 0;
    const hasTorch = this.hasTorchLit;
    if (hasLantern) {
      const base = hasTorch ? 21.5 : 18.5;
      const total = base * this.lanternRangeMultiplier;
      return { base, total, bonus: total - 18.5, isLit: true };
    }
    if (hasTorch) {
      const base = 10.5;
      const total = base * this.lanternRangeMultiplier;
      return { base, total, bonus: total - base, isLit: true };
    }
    const base = 3.8;
    const total = this.hasDarkSightRelic ? 5.2 : 3.8;
    return { base, total, bonus: total - base, isLit: false };
  }

  public getEffectiveWalkSpeed(): { base: number; total: number; delta: number } {
    const base = this.walkSpeed;
    const effMult = this.getEffectWalkSpeedMultiplier();
    let total = base * effMult;
    if (this.inWater) {
      total = this.exhausted
        ? base * 0.16
        : this.isSneaking
          ? base * 0.36
          : base * 0.5;
    } else if (this.isSneaking) {
      total = this.sneakSpeed * effMult;
    }
    return { base, total, delta: total - base };
  }

  public getEnemyDetectionInfo(
    ambient: { nightFactor: number; fogIntensity: number } = { nightFactor: 0, fogIntensity: 0 }
  ): { base: number; total: number; multiplier: number; label: string } {
    const base = 18;
    const lanternLit = (this.lanternOn && this.oil > 0) || this.hasTorchLit;
    const darkness = Math.max(ambient.nightFactor, ambient.fogIntensity * 0.85);

    let mult = lanternLit ? 1.08 + darkness * 0.42 : 1.0 - darkness * 0.42;
    if (this.isSneaking) {
      mult *= this.inUndergrowth ? 0.3 : 0.56;
    } else if (this.inUndergrowth) {
      mult *= 0.85;
    }

    const total = Math.max(3.2, Math.min(30, base * mult));
    const reasons: string[] = [];
    if (this.isSneaking) {
      reasons.push(
        this.inUndergrowth ? t('stats.detect.sneak_cover') : t('stats.detect.sneak')
      );
    } else if (this.inUndergrowth) {
      reasons.push(t('stats.detect.cover'));
    }
    reasons.push(lanternLit ? t('stats.detect.lit') : t('stats.detect.unlit'));

    return { base, total, multiplier: mult, label: reasons.join(', ') };
  }

  public syncRelicBonuses(inventory: Inventory): void {
    let oilEff = 0;
    let dmgRed = 0;
    let stamBonus = 0;
    let lanternBonus = 0;
    let darkSight = false;
    let relicCount = 0;

    for (const item of inventory.getItems()) {
      if (item.category !== 'relic' || item.quantity <= 0 || item.equipped === false) continue;
      relicCount += item.quantity;
      oilEff += item.oilEfficiencyBonus ?? 0;
      dmgRed += item.damageReductionBonus ?? 0;
      stamBonus += item.staminaRegenBonus ?? 0;
      lanternBonus += item.lanternRangeBonus ?? 0;
      if (item.revealsEnemiesInDark) darkSight = true;
    }

    this.oilDrainMultiplier = Math.max(0.35, 1 - Math.min(0.65, oilEff));
    this.damageReduction = Math.min(0.6, dmgRed);
    this.staminaRegenMultiplier = 1 + stamBonus;
    this.lanternRangeMultiplier = 1 + lanternBonus;
    this.hasDarkSightRelic = darkSight;
    this.activeRelicCount = relicCount;
  }

  public heal(amount: number): number {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + Math.max(0, amount));
    return Math.round(this.hp - before);
  }

  public upgradeMaxHp(amount: number): void {
    this.maxHp += Math.max(0, amount);
    this.hp = Math.min(this.maxHp, this.hp + Math.max(0, amount));
  }

  public upgradeMaxStamina(amount: number): void {
    this.maxStamina += Math.max(0, amount);
    this.stamina = Math.min(this.maxStamina, this.stamina + Math.max(0, amount));
  }

  public refillOil(amount: number): number {
    const before = this.oil;
    this.oil = Math.min(this.maxOil, this.oil + Math.max(0, amount));
    return Math.round(this.oil - before);
  }

  public toggleLantern(): boolean {
    if (this.lanternOn) {
      this.lanternOn = false;
      return false;
    }
    if (this.oil <= 0) {
      this.lanternOn = false;
      return false;
    }
    this.lanternOn = true;
    return true;
  }

  public toggleStealth(): boolean {
    if (this.isDead) return false;
    this.isSneaking = !this.isSneaking;
    if (this.isSneaking) {
      this.isSprinting = false;
    }
    return this.isSneaking;
  }

  /**
   * Attempts to spend stamina for an active combat action (attack / dash).
   * Returns false when exhausted or below minimum threshold.
   */
  public consumeStamina(amount: number): boolean {
    if (this.exhausted || this.stamina < Math.min(amount * 0.55, 10)) {
      return false;
    }
    this.stamina = Math.max(0, this.stamina - amount);
    this.staminaRegenCooldown = this.staminaRegenDelay;
    if (this.stamina <= 0) {
      this.stamina = 0;
      this.exhausted = true;
    }
    return true;
  }

  public startDash(dir: Vec2): void {
    const len = Math.max(0.001, Math.hypot(dir.x, dir.y));
    this.dashDir = { x: dir.x / len, y: dir.y / len };
    this.isDashing = true;
    this.isSneaking = false;
    this.dashTimer = 0.18;
    this.dashCooldown = 0.42;
    this.invulnTimer = Math.max(this.invulnTimer, 0.24);

    if (Math.abs(this.dashDir.x) > Math.abs(this.dashDir.y)) {
      this.facing = this.dashDir.x < 0 ? 'left' : 'right';
    } else {
      this.facing = this.dashDir.y < 0 ? 'up' : 'down';
    }
  }

  public takeDamage(amount: number, knockDirX: number, knockDirY: number): boolean {
    if (this.isDead || this.invulnTimer > 0) return false;

    const finalDamage = Math.max(1, Math.round(amount * (1 - this.damageReduction)));
    this.hp = Math.max(0, this.hp - finalDamage);
    this.hurtFlashTimer = 0.26;
    this.invulnTimer = 0.55;
    this.kbVx = knockDirX * 20;
    this.kbVy = knockDirY * 20;

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      this.isMoving = false;
      this.isSprinting = false;
      this.isSneaking = false;
      this.isDashing = false;
    }
    return true;
  }

  public respawn(spawn: Vec2): void {
    this.x = spawn.x;
    this.y = spawn.y;
    this.hp = Math.round(this.maxHp * 0.8);
    this.stamina = this.maxStamina;
    this.oil = this.maxOil;
    this.lanternOn = true;
    this.exhausted = false;
    this.isDead = false;
    this.isSneaking = false;
    this.inUndergrowth = false;
    this.isDashing = false;
    this.dashTimer = 0;
    this.invulnTimer = 1.0;
    this.hurtFlashTimer = 0;
    this.inWater = false;
    this.waterExhaustToastCooldown = 0;
    this.activeEffects.length = 0;
    this.kbVx = 0;
    this.kbVy = 0;
  }

  public getHitboxAt(x = this.x, y = this.y): RectBounds {
    return {
      minX: x - this.hitboxHalfWidth,
      maxX: x + this.hitboxHalfWidth,
      minY: y - this.hitboxTopOffset,
      maxY: y + this.hitboxBottomOffset,
    };
  }

  public update(
    moveDir: Vec2,
    wantsSprint: boolean,
    dt: number,
    world: World,
    onHazardDamage?: (damage: number, label: string) => void,
    onWaterExhausted?: (message: string) => void
  ): void {
    this.collidedX = false;
    this.collidedY = false;

    if (this.hurtFlashTimer > 0) this.hurtFlashTimer = Math.max(0, this.hurtFlashTimer - dt);
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.lavaBurnCooldown > 0) this.lavaBurnCooldown = Math.max(0, this.lavaBurnCooldown - dt);
    if (this.waterExhaustToastCooldown > 0) {
      this.waterExhaustToastCooldown = Math.max(0, this.waterExhaustToastCooldown - dt);
    }

    if (this.isDead) {
      this.vx = 0;
      this.vy = 0;
      this.inColdBiome = false;
      this.inWater = false;
      this.inUndergrowth = false;
      this.isSneaking = false;
      return;
    }

    const curCol = Math.floor(this.x);
    const curRow = Math.floor(this.y);
    this.inColdBiome = world.getBiomeAt(curCol, curRow) === 'frost';
    const footCell = world.getCell(curCol, curRow);
    this.inWater = footCell?.kind === 'river_water' || footCell?.kind === 'marsh_water';
    this.inUndergrowth =
      world.isUndergrowthCell(curCol, curRow) || world.isUndergrowthCell(curCol, curRow - 1);

    // Tick temporary status effects and apply passive HP regeneration
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const eff = this.activeEffects[i];
      if (eff.hpRegenPerSec && this.hp < this.maxHp) {
        this.hp = Math.min(this.maxHp, this.hp + eff.hpRegenPerSec * dt);
      }
      eff.remainingSeconds -= dt;
      if (eff.remainingSeconds <= 0) {
        this.activeEffects.splice(i, 1);
      }
    }

    // Environmental statuses: Wet from wading, Warmed near braziers
    if (this.inWater) {
      this.addOrRefreshEffect({
        id: 'wet',
        name: t('buff.wet.name'),
        description: t('buff.wet.desc'),
        kind: 'debuff',
        remainingSeconds: 12,
        durationSeconds: 12,
        staminaRegenBonus: -0.15,
        walkSpeedMultiplier: 0.9,
      });
    } else {
      let nearBrazier = false;
      for (let dy = -4; dy <= 4 && !nearBrazier; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          if (dx * dx + dy * dy <= 16 && world.getCell(curCol + dx, curRow + dy)?.kind === 'brazier') {
            nearBrazier = true;
            break;
          }
        }
      }
      if (nearBrazier) {
        this.removeEffect('wet');
        this.addOrRefreshEffect({
          id: 'warmed',
          name: t('buff.warmed.name'),
          description: t('buff.warmed.desc'),
          kind: 'buff',
          remainingSeconds: 18,
          durationSeconds: 18,
          staminaRegenBonus: 0.2,
        });
      }
    }

    // Burn lantern oil gradually while lit
    if (this.lanternOn) {
      this.oil = Math.max(0, this.oil - this.getEffectiveOilDrainRate() * dt);
      if (this.oil <= 0) {
        this.oil = 0;
        this.lanternOn = false;
      }
    }

    // Apply knockback decay
    if (Math.abs(this.kbVx) > 0.1 || Math.abs(this.kbVy) > 0.1) {
      this.moveWithCollisions(this.kbVx * dt, this.kbVy * dt, world);
      const decay = Math.exp(-12 * dt);
      this.kbVx *= decay;
      this.kbVy *= decay;
    }

    // Active dash overrides normal movement with fast collision-safe burst
    if (this.isDashing) {
      this.dashTimer -= dt;
      const startX = this.x;
      const startY = this.y;
      this.moveWithCollisions(
        this.dashDir.x * this.dashSpeed * dt,
        this.dashDir.y * this.dashSpeed * dt,
        world
      );
      this.vx = dt > 0 ? (this.x - startX) / dt : 0;
      this.vy = dt > 0 ? (this.y - startY) / dt : 0;
      this.isMoving = true;
      this.isSprinting = false;

      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
      return;
    }

    const moving = moveDir.x !== 0 || moveDir.y !== 0;
    this.isMoving = moving;

    // Sprint & Stamina state update (wading through water drains stamina; Frost slows regen)
    const canSprint = moving && wantsSprint && !this.inWater && !this.exhausted && this.stamina > 0;
    this.isSprinting = canSprint;
    if (canSprint) {
      this.isSneaking = false;
    }

    if (this.inWater && moving) {
      if (!this.exhausted && this.stamina > 0) {
        this.stamina = Math.max(0, this.stamina - 15 * dt);
        this.staminaRegenCooldown = this.staminaRegenDelay;
        if (this.stamina <= 0) {
          this.stamina = 0;
          this.exhausted = true;
          this.isSprinting = false;
          if (this.waterExhaustToastCooldown <= 0) {
            onWaterExhausted?.(t('toast.water_exhausted'));
            this.waterExhaustToastCooldown = 3.2;
          }
        }
      } else if (this.exhausted && this.waterExhaustToastCooldown <= 0) {
        onWaterExhausted?.(t('toast.water_exhausted'));
        this.waterExhaustToastCooldown = 3.2;
      }
    } else if (this.isSprinting) {
      this.stamina = Math.max(0, this.stamina - this.staminaDrainRate * dt);
      this.staminaRegenCooldown = this.staminaRegenDelay;
      if (this.stamina <= 0) {
        this.stamina = 0;
        this.exhausted = true;
        this.isSprinting = false;
      }
    } else {
      if (this.staminaRegenCooldown > 0) {
        this.staminaRegenCooldown = Math.max(0, this.staminaRegenCooldown - dt);
      } else if (this.stamina < this.maxStamina) {
        const regenRate = this.getEffectiveStaminaRegenRate();
        this.stamina = Math.min(this.maxStamina, this.stamina + regenRate * dt);
        if (this.exhausted && this.stamina >= this.exhaustedRecoveryThreshold) {
          this.exhausted = false;
        }
      }
    }

    if (moving) {
      if (Math.abs(moveDir.x) > Math.abs(moveDir.y)) {
        this.facing = moveDir.x < 0 ? 'left' : 'right';
      } else {
        this.facing = moveDir.y < 0 ? 'up' : 'down';
      }

      const effWalkMult = this.getEffectWalkSpeedMultiplier();
      const activeSpeed = this.inWater
        ? this.exhausted
          ? this.walkSpeed * 0.16
          : this.isSneaking
            ? this.walkSpeed * 0.36
            : this.walkSpeed * 0.5
        : this.isSprinting
          ? this.sprintSpeed * effWalkMult
          : this.isSneaking
            ? this.sneakSpeed * effWalkMult
            : this.walkSpeed * effWalkMult;
      const startX = this.x;
      const startY = this.y;

      this.moveWithCollisions(moveDir.x * activeSpeed * dt, moveDir.y * activeSpeed * dt, world);

      this.vx = dt > 0 ? (this.x - startX) / dt : 0;
      this.vy = dt > 0 ? (this.y - startY) / dt : 0;

      const speedRatio = Math.hypot(this.vx, this.vy) / this.walkSpeed;
      this.walkPhase = (this.walkPhase + dt * (5.5 + speedRatio * 4.2)) % 4;
    } else {
      this.vx = 0;
      this.vy = 0;
      this.walkPhase = 0;
    }

    // Lava fissure environmental contact damage (avoided by dashing over!)
    if (footCell?.kind === 'lava' && this.lavaBurnCooldown <= 0) {
      const dmg = 12;
      this.hp = Math.max(0, this.hp - dmg);
      this.hurtFlashTimer = 0.26;
      this.lavaBurnCooldown = 0.85;
      if (this.hp <= 0) {
        this.hp = 0;
        this.isDead = true;
        this.isMoving = false;
        this.isSprinting = false;
        this.isSneaking = false;
      }
      onHazardDamage?.(dmg, t('combat.lava'));
    }
  }

  private moveWithCollisions(dx: number, dy: number, world: World): void {
    const maxStep = 0.35;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / maxStep));
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 0; i < steps; i++) {
      if (stepX !== 0) {
        const nextX = this.x + stepX;
        const boxX = this.getHitboxAt(nextX, this.y);
        if (!world.collidesRect(boxX.minX, boxX.minY, boxX.maxX, boxX.maxY)) {
          this.x = nextX;
        } else {
          this.collidedX = true;
        }
      }

      if (stepY !== 0) {
        const nextY = this.y + stepY;
        const boxY = this.getHitboxAt(this.x, nextY);
        if (!world.collidesRect(boxY.minX, boxY.minY, boxY.maxX, boxY.maxY)) {
          this.y = nextY;
        } else {
          this.collidedY = true;
        }
      }
    }
  }

  /** Subtle vertical stride bob in cell units */
  public getWalkBobOffset(): number {
    if (!this.isMoving || this.isDashing) return 0;
    const amp = this.isSprinting ? 0.2 : this.isSneaking ? 0.08 : 0.14;
    return -Math.abs(Math.sin(this.walkPhase * (Math.PI / 2))) * amp;
  }

  public getSprite(): AsciiSprite {
    const stepFrame = this.isMoving ? Math.floor(this.walkPhase) % 4 : 0;
    return buildHoodedSprite(
      this.facing,
      stepFrame,
      this.hurtFlashTimer > 0,
      this.isDashing,
      Boolean(this.equippedWeapon)
    );
  }
}
