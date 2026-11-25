import type { Player } from './player';
import { hashSeedToUint32 } from './save';
import type {
  AsciiSprite,
  CityBossArchetype,
  Direction,
  EnemyAIState,
  EnemyKind,
  PoiKind,
  QuestBossSpec,
  RectBounds,
  SpriteCell,
  Vec2,
} from './types';
import { CHUNK_SIZE, createRng, type World } from './world';

const BG = '#09090b';

function sc(char: string, color: string): SpriteCell {
  return { char, color, bg: BG };
}

function buildGhoulSprite(
  facing: Direction,
  stepFrame: number,
  windingUp: boolean,
  hitFlash: boolean,
  veteran: boolean
): AsciiSprite {
  const skin = hitFlash
    ? '#ffffff'
    : windingUp
      ? '#ff8566'
      : veteran
        ? '#d96c62'
        : '#a6d977';
  const dark = hitFlash
    ? '#ffffff'
    : windingUp
      ? '#bf4938'
      : veteran
        ? '#823b36'
        : '#658c4d';
  const eye = hitFlash ? '#ffffff' : veteran ? '#ff7847' : '#ff4d38';

  const row0: (SpriteCell | null)[] = [sc('╭', dark), sc('ʌ', skin), sc('╮', dark)];

  let row1: (SpriteCell | null)[];
  if (facing === 'up') {
    row1 = [sc('(', skin), sc('▓', dark), sc(')', skin)];
  } else if (facing === 'left') {
    row1 = [sc('•', eye), sc('c', skin), sc(')', dark)];
  } else if (facing === 'right') {
    row1 = [sc('(', dark), sc('c', skin), sc('•', eye)];
  } else {
    row1 = [sc('(', skin), sc('¨', eye), sc(')', skin)];
  }

  let row2: (SpriteCell | null)[];
  if (windingUp) {
    row2 = [sc('╲', eye), sc('v', skin), sc('╱', eye)];
  } else if (stepFrame % 2 === 1) {
    row2 = [sc('╱', skin), sc('┴', dark), sc('│', skin)];
  } else {
    row2 = [sc('│', skin), sc('┴', dark), sc('╲', skin)];
  }

  return { width: 3, height: 3, cells: [row0, row1, row2] };
}

function buildSkeletonSprite(
  facing: Direction,
  stepFrame: number,
  windingUp: boolean,
  hitFlash: boolean,
  veteran: boolean
): AsciiSprite {
  const bone = hitFlash
    ? '#ffffff'
    : windingUp
      ? '#ffd8cc'
      : veteran
        ? '#f5e8c6'
        : '#ede5d5';
  const armor = hitFlash
    ? '#ffffff'
    : veteran
      ? '#a84f44'
      : '#8c96ab';
  const blade = hitFlash
    ? '#ffffff'
    : windingUp
      ? '#ff6b4a'
      : veteran
        ? '#f0b865'
        : '#c9d4e3';
  const eye = hitFlash ? '#ffffff' : '#ff4d38';

  const row0: (SpriteCell | null)[] = [
    sc(' ', bone),
    sc(facing === 'up' ? '○' : 'ö', bone),
    sc(windingUp ? '!' : '†', windingUp ? eye : blade),
  ];

  const row1: (SpriteCell | null)[] =
    facing === 'left'
      ? [sc('†', blade), sc('╬', armor), sc('┐', bone)]
      : [sc('┌', bone), sc('╬', armor), sc(windingUp ? '╱' : '│', blade)];

  const row2: (SpriteCell | null)[] =
    stepFrame % 2 === 1
      ? [sc('╱', bone), sc(' ', armor), sc('│', bone)]
      : [sc('│', bone), sc(' ', armor), sc('╲', bone)];

  return { width: 3, height: 3, cells: [row0, row1, row2] };
}

function buildBossGhoulSprite(
  facing: Direction,
  stepFrame: number,
  windingUp: boolean,
  hitFlash: boolean
): AsciiSprite {
  const skin = hitFlash ? '#ffffff' : windingUp ? '#ff8b70' : '#d6534b';
  const dark = hitFlash ? '#ffffff' : '#6e2320';
  const crown = hitFlash ? '#ffffff' : '#ffd263';
  const eye = hitFlash ? '#ffffff' : '#ffe885';

  const row0: (SpriteCell | null)[] = [sc('▲', crown), sc('♦', crown), sc('▲', crown)];
  let row1: (SpriteCell | null)[];
  if (facing === 'up') {
    row1 = [sc('(', skin), sc('▓', dark), sc(')', skin)];
  } else if (facing === 'left') {
    row1 = [sc('•', eye), sc('@', skin), sc(')', dark)];
  } else if (facing === 'right') {
    row1 = [sc('(', dark), sc('@', skin), sc('•', eye)];
  } else {
    row1 = [sc('(', skin), sc('¨', eye), sc(')', skin)];
  }
  const row2: (SpriteCell | null)[] = windingUp
    ? [sc('╲', eye), sc('X', skin), sc('╱', eye)]
    : stepFrame % 2 === 1
      ? [sc('╱', skin), sc('┴', dark), sc('│', skin)]
      : [sc('│', skin), sc('┴', dark), sc('╲', skin)];

  return { width: 3, height: 3, cells: [row0, row1, row2] };
}

function buildBossSkeletonSprite(
  facing: Direction,
  stepFrame: number,
  windingUp: boolean,
  hitFlash: boolean
): AsciiSprite {
  const bone = hitFlash ? '#ffffff' : windingUp ? '#ffd8cc' : '#f7efe0';
  const armor = hitFlash ? '#ffffff' : '#ab463e';
  const crown = hitFlash ? '#ffffff' : '#ffd263';
  const blade = hitFlash ? '#ffffff' : windingUp ? '#ff6a47' : '#e6ecf5';

  const row0: (SpriteCell | null)[] = [sc('▲', crown), sc('♦', crown), sc('▲', crown)];
  const row1: (SpriteCell | null)[] =
    facing === 'left'
      ? [sc('†', blade), sc('╬', armor), sc('╗', bone)]
      : [sc('╔', bone), sc('╬', armor), sc(windingUp ? '╱' : '│', blade)];
  const row2: (SpriteCell | null)[] =
    stepFrame % 2 === 1
      ? [sc('╱', bone), sc('╨', crown), sc('│', bone)]
      : [sc('│', bone), sc('╨', crown), sc('╲', bone)];

  return { width: 3, height: 3, cells: [row0, row1, row2] };
}

function buildIronFounderSprite(
  facing: Direction,
  stepFrame: number,
  windingUp: boolean,
  hitFlash: boolean
): AsciiSprite {
  const iron = hitFlash ? '#ffffff' : windingUp ? '#ff9c6e' : '#736d80';
  const dark = hitFlash ? '#ffffff' : '#2e2b36';
  const ember = hitFlash ? '#ffffff' : windingUp ? '#ffe280' : '#ff6f26';
  const hammer = hitFlash ? '#ffffff' : '#c7cfd9';

  const row0: (SpriteCell | null)[] = [sc('╤', ember), sc('Ω', ember), sc('╤', ember)];
  const row1: (SpriteCell | null)[] =
    facing === 'left'
      ? [sc('T', hammer), sc('╬', iron), sc('║', dark)]
      : [sc('║', dark), sc('╬', iron), sc(windingUp ? '!' : 'T', hammer)];
  const row2: (SpriteCell | null)[] =
    stepFrame % 2 === 1
      ? [sc('╱', iron), sc('█', ember), sc('│', iron)]
      : [sc('│', iron), sc('█', ember), sc('╲', iron)];

  return { width: 3, height: 3, cells: [row0, row1, row2] };
}

function buildMireAlchemistSprite(
  facing: Direction,
  stepFrame: number,
  windingUp: boolean,
  hitFlash: boolean
): AsciiSprite {
  const cloak = hitFlash ? '#ffffff' : windingUp ? '#98f5be' : '#2f5e4e';
  const hood = hitFlash ? '#ffffff' : '#43856d';
  const vial = hitFlash ? '#ffffff' : '#66f7aa';
  const eye = hitFlash ? '#ffffff' : '#a8ffd0';

  const row0: (SpriteCell | null)[] = [sc('╭', hood), sc('▲', hood), sc('╮', hood)];
  const row1: (SpriteCell | null)[] =
    facing === 'left'
      ? [sc('o', vial), sc('•', eye), sc(')', cloak)]
      : facing === 'right'
        ? [sc('(', cloak), sc('•', eye), sc('o', vial)]
        : [sc('o', vial), sc('¨', eye), sc('o', vial)];
  const row2: (SpriteCell | null)[] =
    stepFrame % 2 === 1
      ? [sc('╱', cloak), sc('~', vial), sc('│', cloak)]
      : [sc('│', cloak), sc('~', vial), sc('╲', cloak)];

  return { width: 3, height: 3, cells: [row0, row1, row2] };
}

function buildLastInquisitorSprite(
  facing: Direction,
  stepFrame: number,
  windingUp: boolean,
  hitFlash: boolean
): AsciiSprite {
  const ivory = hitFlash ? '#ffffff' : windingUp ? '#fff8e0' : '#ede7d5';
  const gold = hitFlash ? '#ffffff' : windingUp ? '#ffe875' : '#f2c152';
  const blade = hitFlash ? '#ffffff' : '#fff6cf';

  const row0: (SpriteCell | null)[] = [sc('✦', gold), sc('♦', gold), sc('✦', gold)];
  const row1: (SpriteCell | null)[] =
    facing === 'left'
      ? [sc('†', blade), sc('║', ivory), sc('╮', ivory)]
      : [sc('╭', ivory), sc('║', ivory), sc(windingUp ? '!' : '†', blade)];
  const row2: (SpriteCell | null)[] =
    stepFrame % 2 === 1
      ? [sc('╱', ivory), sc('╨', gold), sc('│', ivory)]
      : [sc('│', ivory), sc('╨', gold), sc('╲', ivory)];

  return { width: 3, height: 3, cells: [row0, row1, row2] };
}

export interface EnemyConfig {
  kind: EnemyKind;
  name: string;
  maxHp: number;
  patrolSpeed: number;
  chaseSpeed: number;
  damage: number;
  aggroRadius: number;
  leashRadius: number;
  attackRange: number;
  windupDuration: number;
  recoverDuration: number;
  knockbackResist: number;
}

function createScaledConfig(
  kind: EnemyKind,
  tier: number,
  isBoss = false,
  bossName?: string,
  archetype?: CityBossArchetype
): EnemyConfig {
  const clampedTier = Math.max(1, Math.min(6, tier));
  if (archetype === 'iron_founder') {
    return {
      kind: 'skeleton',
      name: bossName ?? 'Železný slévač',
      maxHp: 240,
      patrolSpeed: 3.8,
      chaseSpeed: 9.5,
      damage: 24,
      aggroRadius: 20,
      leashRadius: 36,
      attackRange: 4.0,
      windupDuration: 0.65,
      recoverDuration: 0.95,
      knockbackResist: 0.15,
    };
  }
  if (archetype === 'mire_alchemist') {
    return {
      kind: 'ghoul',
      name: bossName ?? 'Alchymista z hlubin',
      maxHp: 190,
      patrolSpeed: 4.8,
      chaseSpeed: 15.2,
      damage: 18,
      aggroRadius: 20,
      leashRadius: 36,
      attackRange: 3.4,
      windupDuration: 0.34,
      recoverDuration: 0.72,
      knockbackResist: 0.55,
    };
  }
  if (archetype === 'last_inquisitor') {
    return {
      kind: 'skeleton',
      name: bossName ?? 'Poslední inkvizitor',
      maxHp: 215,
      patrolSpeed: 4.6,
      chaseSpeed: 14.4,
      damage: 21,
      aggroRadius: 21,
      leashRadius: 38,
      attackRange: 3.8,
      windupDuration: 0.38,
      recoverDuration: 0.78,
      knockbackResist: 0.35,
    };
  }

  if (isBoss) {
    const bossScale = 1 + Math.max(0, clampedTier - 3) * 0.25;
    if (kind === 'ghoul') {
      return {
        kind: 'ghoul',
        name: bossName ?? 'Prastarý ghúl',
        maxHp: Math.round(145 * bossScale),
        patrolSpeed: 4.5,
        chaseSpeed: 15.2,
        damage: Math.round(16 * bossScale),
        aggroRadius: 19,
        leashRadius: 34,
        attackRange: 3.4,
        windupDuration: 0.36,
        recoverDuration: 0.78,
        knockbackResist: 0.25,
      };
    }
    return {
      kind: 'skeleton',
      name: bossName ?? 'Pán popela',
      maxHp: Math.round(185 * bossScale),
      patrolSpeed: 4.2,
      chaseSpeed: 10.6,
      damage: Math.round(24 * bossScale),
      aggroRadius: 19,
      leashRadius: 34,
      attackRange: 3.8,
      windupDuration: 0.54,
      recoverDuration: 1.0,
      knockbackResist: 0.25,
    };
  }

  const veteran = clampedTier >= 2;
  const elite = clampedTier >= 4;
  const hpMult = 1 + (clampedTier - 1) * 0.3;
  const dmgMult = 1 + (clampedTier - 1) * 0.22;

  if (kind === 'ghoul') {
    return {
      kind: 'ghoul',
      name: elite ? 'Krvežíznivý ghúl' : veteran ? 'Krvavý ghúl' : 'Ghúl',
      maxHp: Math.round(42 * hpMult),
      patrolSpeed: 5.5,
      chaseSpeed: elite ? 16.4 : veteran ? 15.4 : 14.2,
      damage: Math.round(10 * dmgMult),
      aggroRadius: 17,
      leashRadius: 30,
      attackRange: 3.1,
      windupDuration: 0.32,
      recoverDuration: 0.72,
      knockbackResist: 0.85,
    };
  }

  return {
    kind: 'skeleton',
    name: elite ? 'Rytíř popela' : veteran ? 'Prastarý kostlivec' : 'Kostlivec',
    maxHp: Math.round(82 * hpMult),
    patrolSpeed: 4.0,
    chaseSpeed: elite ? 11.0 : veteran ? 10.2 : 9.2,
    damage: Math.round(17 * dmgMult),
    aggroRadius: 16,
    leashRadius: 28,
    attackRange: 3.5,
    windupDuration: 0.5,
    recoverDuration: 1.02,
    knockbackResist: 0.45,
  };
}

export interface EnemyAttackEvent {
  enemy: Enemy;
  damage: number;
  dirX: number;
  dirY: number;
}

export interface BossSpecialTrigger {
  enemy: Enemy;
  kind: 'hammer_slam' | 'furnace_nova' | 'poison_mist' | 'light_lunge';
  x: number;
  y: number;
  angle: number;
  targetX: number;
  targetY: number;
  damage: number;
}

export class Enemy {
  public readonly id: string;
  public readonly chunkKey: string;
  public readonly kind: EnemyKind;
  public readonly tier: number;
  public readonly isBoss: boolean;
  public readonly isCityBoss: boolean;
  public readonly archetype?: CityBossArchetype;
  public readonly bossPoiId?: PoiKind;
  public readonly bossPoiUid?: string;
  public readonly name: string;
  public readonly config: EnemyConfig;

  public x: number;
  public y: number;
  public readonly homeX: number;
  public readonly homeY: number;

  public hp: number;
  public readonly maxHp: number;
  public alive = true;

  public facing: Direction = 'down';
  public state: EnemyAIState = 'patrol';
  public walkPhase = 0;
  public hitFlashTimer = 0;

  private readonly seedNum: number;
  private stateTimer = 0;
  private specialCooldown = 2.6;
  private specialToggle = false;
  private patrolTarget: Vec2;
  private patrolPauseTimer = 0;
  private investigateTarget: Vec2 | null = null;
  private investigateTimer = 0;
  private kbVx = 0;
  private kbVy = 0;

  private readonly hitboxHalfWidth = 1.0;
  private readonly hitboxTopOffset = 1.1;
  private readonly hitboxBottomOffset = 0.15;

  constructor(
    id: string,
    chunkKey: string,
    kind: EnemyKind,
    tier: number,
    spawnX: number,
    spawnY: number,
    bossSpec?: {
      name: string;
      poiId: PoiKind;
      poiUid: string;
      archetype?: CityBossArchetype;
      isCityBoss?: boolean;
    }
  ) {
    this.id = id;
    this.chunkKey = chunkKey;
    this.seedNum = hashSeedToUint32(id) % 997;
    this.kind = kind;
    this.tier = tier;
    this.isBoss = Boolean(bossSpec);
    this.isCityBoss = Boolean(bossSpec?.isCityBoss);
    this.archetype = bossSpec?.archetype;
    this.bossPoiId = bossSpec?.poiId;
    this.bossPoiUid = bossSpec?.poiUid;
    this.config = createScaledConfig(kind, tier, this.isBoss, bossSpec?.name, bossSpec?.archetype);
    this.name = this.config.name;
    this.x = spawnX;
    this.y = spawnY;
    this.homeX = spawnX;
    this.homeY = spawnY;
    this.hp = this.config.maxHp;
    this.maxHp = this.config.maxHp;
    this.patrolTarget = { x: spawnX, y: spawnY };
    this.patrolPauseTimer = 0.4 + ((this.seedNum * 0.73) % 1.4);
  }

  public getHitboxAt(x = this.x, y = this.y): RectBounds {
    return {
      minX: x - this.hitboxHalfWidth,
      maxX: x + this.hitboxHalfWidth,
      minY: y - this.hitboxTopOffset,
      maxY: y + this.hitboxBottomOffset,
    };
  }

  public takeDamage(amount: number, knockDirX: number, knockDirY: number): boolean {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashTimer = 0.16;

    const impulse = 22 * this.config.knockbackResist;
    this.kbVx = knockDirX * impulse;
    this.kbVy = knockDirY * impulse;

    if (this.state === 'patrol' || this.state === 'investigate') {
      this.state = 'chase';
      this.investigateTarget = null;
    }

    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  public hearSound(sx: number, sy: number, hearRadius: number): void {
    if (
      !this.alive ||
      this.state === 'chase' ||
      this.state === 'windup' ||
      this.state === 'recover'
    ) {
      return;
    }
    const distToSound = Math.hypot(sx - this.x, sy - this.y);
    if (distToSound > hearRadius) return;
    const distHomeToSound = Math.hypot(sx - this.homeX, sy - this.homeY);
    if (distHomeToSound > this.config.leashRadius * 1.2) return;

    this.state = 'investigate';
    this.investigateTarget = { x: sx, y: sy };
    this.investigateTimer = 5.0;
  }

  public computeDetectionRadius(
    player: Player,
    ambient: { nightFactor: number; fogIntensity: number }
  ): number {
    const lanternLit = (player.lanternOn && player.oil > 0) || player.hasTorchLit;
    const darkness = Math.max(ambient.nightFactor, ambient.fogIntensity * 0.85);

    let r = this.config.aggroRadius;
    if (lanternLit) {
      r *= 1.08 + darkness * 0.42;
    } else {
      r *= 1.0 - darkness * 0.42;
    }

    if (player.isSneaking) {
      r *= player.inUndergrowth ? 0.3 : 0.56;
    } else if (player.inUndergrowth) {
      r *= 0.85;
    }

    return Math.max(3.2, Math.min(30, r));
  }

  public update(
    dt: number,
    world: World,
    player: Player,
    ambient: { nightFactor: number; fogIntensity: number } = { nightFactor: 0, fogIntensity: 0 },
    outSpecials?: BossSpecialTrigger[]
  ): EnemyAttackEvent | null {
    if (!this.alive) return null;

    const dxToPlayer = player.x - this.x;
    const dyToPlayer = player.y - this.y;
    const distToPlayer = Math.hypot(dxToPlayer, dyToPlayer);

    // Sleep distant patrolling enemies outside render radius
    if (distToPlayer > 88 && this.state === 'patrol') {
      return null;
    }

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    }

    if (Math.abs(this.kbVx) > 0.1 || Math.abs(this.kbVy) > 0.1) {
      this.moveWithCollisions(this.kbVx * dt, this.kbVy * dt, world);
      const decay = Math.exp(-11 * dt);
      this.kbVx *= decay;
      this.kbVy *= decay;
    }

    const distFromHome = Math.hypot(this.x - this.homeX, this.y - this.homeY);
    const effectiveAggro = this.computeDetectionRadius(player, ambient);
    let attackEvent: EnemyAttackEvent | null = null;

    if (this.state === 'windup') {
      this.updateFacing(dxToPlayer, dyToPlayer);
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        if (!player.isDead && distToPlayer <= this.config.attackRange + 0.85) {
          const len = Math.max(0.001, distToPlayer);
          attackEvent = {
            enemy: this,
            damage: this.config.damage,
            dirX: dxToPlayer / len,
            dirY: dyToPlayer / len,
          };
        }
        this.state = 'recover';
        this.stateTimer = this.config.recoverDuration;
      }
      return attackEvent;
    }

    if (this.state === 'recover') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state =
          !player.isDead && distToPlayer <= effectiveAggro * 1.2 ? 'chase' : 'patrol';
      }
      return null;
    }

    if (this.state === 'patrol' || this.state === 'investigate') {
      if (!player.isDead && distToPlayer <= effectiveAggro) {
        this.state = 'chase';
        this.investigateTarget = null;
      }
    } else if (this.state === 'chase') {
      if (
        player.isDead ||
        distToPlayer > this.config.leashRadius ||
        distFromHome > this.config.leashRadius * 1.35
      ) {
        this.state = 'patrol';
        this.patrolTarget = { x: this.homeX, y: this.homeY };
      }
    }

    if (this.state === 'chase') {
      if (this.archetype && !player.isDead) {
        this.specialCooldown -= dt;
        if (this.specialCooldown <= 0) {
          const angleToPlayer = Math.atan2(dyToPlayer, dxToPlayer);
          if (this.archetype === 'iron_founder' && distToPlayer <= 8.5) {
            this.specialToggle = !this.specialToggle;
            this.updateFacing(dxToPlayer, dyToPlayer);
            outSpecials?.push({
              enemy: this,
              kind: this.specialToggle ? 'hammer_slam' : 'furnace_nova',
              x: this.x,
              y: this.y,
              angle: angleToPlayer,
              targetX: this.x,
              targetY: this.y,
              damage: this.specialToggle ? 28 : 22,
            });
            this.state = 'recover';
            this.stateTimer = this.specialToggle ? 0.9 : 1.05;
            this.specialCooldown = 4.6;
            return null;
          }
          if (this.archetype === 'mire_alchemist' && distToPlayer <= 13) {
            this.updateFacing(dxToPlayer, dyToPlayer);
            outSpecials?.push({
              enemy: this,
              kind: 'poison_mist',
              x: player.x,
              y: player.y,
              angle: angleToPlayer,
              targetX: player.x,
              targetY: player.y,
              damage: 8,
            });
            // Shadow-step flank through mist
            const stepAngles = [angleToPlayer + Math.PI * 0.65, angleToPlayer - Math.PI * 0.65, angleToPlayer + Math.PI];
            for (const sa of stepAngles) {
              const bx = player.x + Math.cos(sa) * 4.2;
              const by = player.y + Math.sin(sa) * 4.2;
              const box = this.getHitboxAt(bx, by);
              const c = world.getCell(Math.floor(bx), Math.floor(by));
              if (c && c.kind !== 'lava' && !world.collidesRect(box.minX, box.minY, box.maxX, box.maxY)) {
                this.x = bx;
                this.y = by;
                break;
              }
            }
            this.specialCooldown = 4.2;
          }
          if (this.archetype === 'last_inquisitor' && distToPlayer <= 12 && distToPlayer >= 2.2) {
            this.updateFacing(dxToPlayer, dyToPlayer);
            const maxStepDist = Math.min(9.0, distToPlayer + 1.4);
            const nx = Math.cos(angleToPlayer);
            const ny = Math.sin(angleToPlayer);
            let tx = this.x;
            let ty = this.y;
            for (let s = 1; s <= Math.floor(maxStepDist); s++) {
              const cx = this.x + nx * s;
              const cy = this.y + ny * s;
              const box = this.getHitboxAt(cx, cy);
              if (world.collidesRect(box.minX, box.minY, box.maxX, box.maxY)) break;
              tx = cx;
              ty = cy;
            }
            outSpecials?.push({
              enemy: this,
              kind: 'light_lunge',
              x: this.x,
              y: this.y,
              angle: angleToPlayer,
              targetX: tx,
              targetY: ty,
              damage: 24,
            });
            this.state = 'recover';
            this.stateTimer = 0.72;
            this.specialCooldown = 3.9;
            return null;
          }
        }
      }

      if (distToPlayer <= this.config.attackRange) {
        this.state = 'windup';
        this.stateTimer = this.config.windupDuration;
        this.updateFacing(dxToPlayer, dyToPlayer);
        return null;
      }

      if (distToPlayer > 0.01) {
        const nx = dxToPlayer / distToPlayer;
        const ny = dyToPlayer / distToPlayer;
        this.updateFacing(nx, ny);
        const moved = this.moveWithCollisions(
          nx * this.config.chaseSpeed * dt,
          ny * this.config.chaseSpeed * dt,
          world
        );
        if (moved) {
          this.walkPhase = (this.walkPhase + dt * (this.kind === 'ghoul' ? 10 : 6.5)) % 4;
        }
      }
    } else if (this.state === 'investigate') {
      this.investigateTimer -= dt;
      if (
        !this.investigateTarget ||
        this.investigateTimer <= 0 ||
        distFromHome > this.config.leashRadius * 1.35
      ) {
        this.state = 'patrol';
        this.investigateTarget = null;
        this.patrolTarget = { x: this.homeX, y: this.homeY };
        return null;
      }

      const idx = this.investigateTarget.x - this.x;
      const idy = this.investigateTarget.y - this.y;
      const iDist = Math.hypot(idx, idy);

      if (iDist < 1.2) {
        this.state = 'patrol';
        this.investigateTarget = null;
        this.patrolPauseTimer = 1.1;
      } else {
        const nx = idx / iDist;
        const ny = idy / iDist;
        this.updateFacing(nx, ny);
        const moved = this.moveWithCollisions(
          nx * this.config.patrolSpeed * 1.45 * dt,
          ny * this.config.patrolSpeed * 1.45 * dt,
          world
        );
        if (moved) {
          this.walkPhase = (this.walkPhase + dt * 6.8) % 4;
        } else {
          this.state = 'patrol';
          this.investigateTarget = null;
          this.patrolPauseTimer = 0.7;
        }
      }
    } else {
      if (this.patrolPauseTimer > 0) {
        this.patrolPauseTimer -= dt;
        return null;
      }

      const pdx = this.patrolTarget.x - this.x;
      const pdy = this.patrolTarget.y - this.y;
      const pDist = Math.hypot(pdx, pdy);

      if (pDist < 0.8) {
        this.pickNextPatrolTarget(world);
        this.patrolPauseTimer = 0.9 + ((this.seedNum * 1.17 + Math.abs(this.x) * 0.13) % 1.4);
      } else {
        const nx = pdx / pDist;
        const ny = pdy / pDist;
        this.updateFacing(nx, ny);
        const moved = this.moveWithCollisions(
          nx * this.config.patrolSpeed * dt,
          ny * this.config.patrolSpeed * dt,
          world
        );
        if (moved) {
          this.walkPhase = (this.walkPhase + dt * 5.2) % 4;
        } else {
          this.pickNextPatrolTarget(world);
          this.patrolPauseTimer = 0.5;
        }
      }
    }

    return null;
  }

  private pickNextPatrolTarget(world: World): void {
    const patrolRadius = this.kind === 'ghoul' ? 8 : 6;
    for (let attempt = 0; attempt < 6; attempt++) {
      const angle = (this.seedNum * 2.13 + attempt * 1.37 + performance.now() * 0.001) % (Math.PI * 2);
      const r = 2.5 + ((attempt * 1.7 + this.seedNum) % patrolRadius);
      const tx = this.homeX + Math.cos(angle) * r;
      const ty = this.homeY + Math.sin(angle) * r;
      const box = this.getHitboxAt(tx, ty);
      if (!world.collidesRect(box.minX, box.minY, box.maxX, box.maxY)) {
        this.patrolTarget = { x: tx, y: ty };
        return;
      }
    }
    this.patrolTarget = { x: this.homeX, y: this.homeY };
  }

  private moveWithCollisions(dx: number, dy: number, world: World): boolean {
    let moved = false;
    const maxStep = 0.35;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / maxStep));
    const sx = dx / steps;
    const sy = dy / steps;

    for (let i = 0; i < steps; i++) {
      if (sx !== 0) {
        const nextX = this.x + sx;
        const boxX = this.getHitboxAt(nextX, this.y);
        if (!world.collidesRect(boxX.minX, boxX.minY, boxX.maxX, boxX.maxY)) {
          this.x = nextX;
          moved = true;
        }
      }
      if (sy !== 0) {
        const nextY = this.y + sy;
        const boxY = this.getHitboxAt(this.x, nextY);
        if (!world.collidesRect(boxY.minX, boxY.minY, boxY.maxX, boxY.maxY)) {
          this.y = nextY;
          moved = true;
        }
      }
    }
    return moved;
  }

  private updateFacing(dx: number, dy: number): void {
    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx < 0 ? 'left' : 'right';
    } else {
      this.facing = dy < 0 ? 'up' : 'down';
    }
  }

  public getSprite(): AsciiSprite {
    const step = Math.floor(this.walkPhase) % 4;
    const windingUp = this.state === 'windup';
    const flash = this.hitFlashTimer > 0;
    if (this.archetype === 'iron_founder') {
      return buildIronFounderSprite(this.facing, step, windingUp, flash);
    }
    if (this.archetype === 'mire_alchemist') {
      return buildMireAlchemistSprite(this.facing, step, windingUp, flash);
    }
    if (this.archetype === 'last_inquisitor') {
      return buildLastInquisitorSprite(this.facing, step, windingUp, flash);
    }
    if (this.isBoss) {
      return this.kind === 'ghoul'
        ? buildBossGhoulSprite(this.facing, step, windingUp, flash)
        : buildBossSkeletonSprite(this.facing, step, windingUp, flash);
    }
    const veteran = this.tier >= 2;
    return this.kind === 'ghoul'
      ? buildGhoulSprite(this.facing, step, windingUp, flash, veteran)
      : buildSkeletonSprite(this.facing, step, windingUp, flash, veteran);
  }
}

export class EnemyManager {
  public readonly enemies: Enemy[] = [];
  private readonly loadedChunkKeys = new Set<string>();
  private readonly defeatedIds = new Set<string>();

  constructor(world: World, bossSpecs: readonly QuestBossSpec[] = []) {
    this.syncChunks(world, bossSpecs);
  }

  private computeDifficultyTier(x: number, y: number, world: World): number {
    const dist = Math.hypot(x, y);
    const biome = world.getBiomeAt(Math.floor(x), Math.floor(y));
    const biomeBonus =
      biome === 'volcanic'
        ? 160
        : biome === 'blood_forest'
          ? 120
          : biome === 'bone_plain' || biome === 'frost'
            ? 75
            : biome === 'ash' || biome === 'quarry'
              ? 45
              : 0;
    return Math.min(6, Math.max(1, 1 + Math.floor((dist + biomeBonus) / 145)));
  }

  public syncChunks(world: World, bossSpecs: readonly QuestBossSpec[]): void {
    const activeChunks = world.getActiveChunks();
    const activeSet = new Set<string>();
    for (let i = 0; i < activeChunks.length; i++) {
      activeSet.add(activeChunks[i].key);
    }

    // 1. Unload enemies belonging to evicted chunks (unless dead or far outside active set)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!activeSet.has(e.chunkKey)) {
        this.enemies.splice(i, 1);
      }
    }
    for (const key of Array.from(this.loadedChunkKeys)) {
      if (!activeSet.has(key)) {
        this.loadedChunkKeys.delete(key);
      }
    }

    // 2. Deterministically populate newly entered chunks
    for (let c = 0; c < activeChunks.length; c++) {
      const chunk = activeChunks[c];
      if (this.loadedChunkKeys.has(chunk.key)) continue;
      this.loadedChunkKeys.add(chunk.key);

      const rng = createRng(hashSeedToUint32(`${world.seed}:mobs:${chunk.cx},${chunk.cy}`));

      // a) POI guardians
      if (chunk.poi && chunk.poi.id !== 'shelter') {
        const poi = chunk.poi;
        const isCity = poi.id.startsWith('city_');
        const count = isCity ? 5 : poi.id === 'fortress' || poi.id === 'cathedral' ? 4 : 3;
        for (let j = 0; j < count; j++) {
          const eid = `poi:${chunk.cx},${chunk.cy}:${j}`;
          if (this.defeatedIds.has(eid)) continue;

          const angle = (j / count) * Math.PI * 2 + rng() * 0.6;
          const dist = isCity
            ? 9 + rng() * 11
            : 4 + rng() * Math.min(poi.radiusX, poi.radiusY) * 0.68;
          const tx = Math.round(poi.x + Math.cos(angle) * dist);
          const ty = Math.round(poi.y + Math.sin(angle) * dist);
          const kind: EnemyKind =
            poi.id === 'city_kaelvarr' || poi.id === 'city_aethelgard'
              ? 'skeleton'
              : poi.id === 'city_siltmoor'
                ? 'ghoul'
                : poi.id === 'fortress' || poi.id === 'cathedral'
                  ? j % 2 === 0
                    ? 'skeleton'
                    : 'ghoul'
                  : poi.id === 'village'
                    ? 'ghoul'
                    : j === 0
                      ? 'skeleton'
                      : 'ghoul';
          const tier = Math.max(isCity ? 3 : 1, this.computeDifficultyTier(tx, ty, world));
          const safe = this.findSafeSpawn(tx, ty, world);
          this.enemies.push(new Enemy(eid, chunk.key, kind, tier, safe.x, safe.y));
        }
      }

      // b) Quest & City Mini-Bosses belonging to this chunk
      for (let b = 0; b < bossSpecs.length; b++) {
        const spec = bossSpecs[b];
        if (spec.chunkX !== chunk.cx || spec.chunkY !== chunk.cy) continue;
        const bid = `boss:${spec.poiUid}`;
        if (this.defeatedIds.has(bid)) continue;

        const safe = this.findSafeSpawn(spec.x, spec.y, world);
        const tier = Math.max(spec.isCityBoss ? 4 : 3, this.computeDifficultyTier(safe.x, safe.y, world));
        this.enemies.push(
          new Enemy(bid, chunk.key, spec.kind, tier, safe.x, safe.y, {
            name: spec.bossName,
            poiId: spec.poiId,
            poiUid: spec.poiUid,
            archetype: spec.archetype,
            isCityBoss: spec.isCityBoss,
          })
        );
      }

      // c) Wilderness biome patrols (skeleton patrols on Bone Plain, crimson beasts in Blood Forest, etc.)
      const centerBiome = world.getBiomeAt(chunk.originX + 32, chunk.originY + 32);
      const wildCount =
        centerBiome === 'bone_plain' || centerBiome === 'blood_forest'
          ? 3
          : rng() < 0.45
            ? 2
            : 1;

      for (let j = 0; j < wildCount; j++) {
        const eid = `wild:${chunk.cx},${chunk.cy}:${j}`;
        if (this.defeatedIds.has(eid)) continue;

        const tx = chunk.originX + 8 + Math.floor(rng() * (CHUNK_SIZE - 16));
        const ty = chunk.originY + 8 + Math.floor(rng() * (CHUNK_SIZE - 16));
        if (Math.hypot(tx, ty) < 46) continue; // Keep starter clearing peaceful

        const biome = world.getBiomeAt(tx, ty);
        const kind: EnemyKind =
          biome === 'bone_plain' || biome === 'quarry' || biome === 'ash'
            ? rng() < 0.72
              ? 'skeleton'
              : 'ghoul'
            : biome === 'blood_forest' || biome === 'marsh'
              ? rng() < 0.72
                ? 'ghoul'
                : 'skeleton'
              : rng() < 0.55
                ? 'ghoul'
                : 'skeleton';

        const tier = this.computeDifficultyTier(tx, ty, world);
        const safe = this.findSafeSpawn(tx, ty, world);
        this.enemies.push(new Enemy(eid, chunk.key, kind, tier, safe.x, safe.y));
      }
    }
  }

  private findSafeSpawn(targetX: number, targetY: number, world: World): Vec2 {
    const temp = new Enemy('temp', '0,0', 'ghoul', 1, targetX, targetY);
    for (let radius = 0; radius <= 10; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const cx = targetX + dx;
          const cy = targetY + dy;
          const cell = world.getCell(cx, cy);
          if (!cell || cell.kind === 'lava' || cell.kind === 'marsh_water' || cell.kind === 'river_water') continue;
          const box = temp.getHitboxAt(cx, cy);
          if (!world.collidesRect(box.minX, box.minY, box.maxX, box.maxY)) {
            return { x: cx + 0.5, y: cy + 0.5 };
          }
        }
      }
    }
    return { x: targetX, y: targetY };
  }

  public markDefeated(enemyId: string): void {
    this.defeatedIds.add(enemyId);
  }

  public getDefeatedIds(): string[] {
    return Array.from(this.defeatedIds);
  }

  public applyDefeatedIds(ids: readonly string[]): void {
    this.defeatedIds.clear();
    for (let i = 0; i < ids.length; i++) {
      this.defeatedIds.add(ids[i]);
    }
    for (let i = 0; i < this.enemies.length; i++) {
      if (this.defeatedIds.has(this.enemies[i].id)) {
        this.enemies[i].alive = false;
        this.enemies[i].hp = 0;
      }
    }
  }

  public alertBySound(x: number, y: number, hearRadius: number): void {
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].hearSound(x, y, hearRadius);
    }
  }

  public update(
    dt: number,
    world: World,
    player: Player,
    ambient: { nightFactor: number; fogIntensity: number } = { nightFactor: 0, fogIntensity: 0 }
  ): { attacks: EnemyAttackEvent[]; specials: BossSpecialTrigger[] } {
    const attacks: EnemyAttackEvent[] = [];
    const specials: BossSpecialTrigger[] = [];
    for (let i = 0; i < this.enemies.length; i++) {
      const ev = this.enemies[i].update(dt, world, player, ambient, specials);
      if (ev) attacks.push(ev);
    }
    return { attacks, specials };
  }

  public getAliveCount(): number {
    let count = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      if (this.enemies[i].alive) count++;
    }
    return count;
  }
}
