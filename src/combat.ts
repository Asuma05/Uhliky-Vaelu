import type { AudioEngine } from './audio';
import type { Enemy, EnemyManager } from './enemies';
import {
  CRUDE_COAL_OIL_TEMPLATE,
  LORE_WHITE_RELIQUARY_TEMPLATE,
  MIRE_ELIXIR_TEMPLATE,
  RELIC_IRON_HEARTH,
  RELIC_MIRE_ALEMBIC,
  RELIC_OLD_LIGHT,
  type Inventory,
} from './inventory';
import type { Player } from './player';
import { hashSeedToUint32 } from './save';
import type {
  BossTelegraph,
  DashGhost,
  Direction,
  FloatingText,
  InventoryItem,
  LootDrop,
  SlashEffect,
  SoundWave,
  SoundWaveKind,
  Vec2,
} from './types';
import type { World } from './world';

const ATTACK_STAMINA_COST = 18;
const ATTACK_COOLDOWN = 0.34;
const ATTACK_REACH = 5.4;
const SLASH_DURATION = 0.2;

const DASH_STAMINA_COST = 24;
const LOOT_PICKUP_RADIUS = 2.6;

const SOUND_WAVE_CONFIGS: Record<
  SoundWaveKind,
  { maxRadius: number; hearRadius: number; duration: number; color: string }
> = {
  run: { maxRadius: 3.4, hearRadius: 14, duration: 0.42, color: '#9aa4b2' },
  sprint: { maxRadius: 5.5, hearRadius: 26, duration: 0.52, color: '#e0d3a6' },
  dash: { maxRadius: 6.0, hearRadius: 25, duration: 0.5, color: '#ebd494' },
  combat: { maxRadius: 6.8, hearRadius: 29, duration: 0.55, color: '#eb9d6c' },
  wade: { maxRadius: 5.2, hearRadius: 24, duration: 0.55, color: '#7ccbe6' },
};

const LOOT_TEMPLATES: Record<string, { item: Omit<InventoryItem, 'quantity'>; color: string }> = {
  crimsonDraught: {
    color: '#d94848',
    item: {
      id: 'crimson-draught',
      name: 'Lahvička karmínového odvaru',
      symbol: '!',
      category: 'consumable',
      categoryLabel: 'Elixír',
      description:
        'Hustá trpká tekutina v zakaleném skle. Na okamžik zažene lezavý chlad z kostí a scelí rány.',
      effectText: 'Obnoví +35 Zdraví (HP) · Spotřebuje 1 ks',
      actionLabel: 'Vypít',
      healAmount: 35,
    },
  },
  oilFlask: {
    color: '#e0913d',
    item: {
      id: 'lantern-oil-flask',
      name: 'Lahvička oleje do lucerny',
      symbol: 'o',
      category: 'consumable',
      categoryLabel: 'Palivo',
      description:
        'Tmavý smolný olej v opletené baňce. Hoří pomalu a vydává teplý, neklidný jantarový svit.',
      effectText: 'Doplní +50 Oleje do lucerny · Spotřebuje 1 ks',
      actionLabel: 'Dolít',
      oilAmount: 50,
    },
  },
  ghoulClaw: {
    color: '#9ec488',
    item: {
      id: 'ghoul-claw',
      name: 'Ghúlí dráp',
      symbol: ',',
      category: 'loot',
      categoryLabel: 'Kořist',
      description:
        'Zčernalý, zakřivený pařát vytržený hřbitovnímu ghúlovi. Páchne hlínou a zatuchlým masem.',
      effectText: 'Trofej z padlého ghúla · Cenný alchymistický úlomek',
      actionLabel: 'Prohlédnout',
    },
  },
  boneShard: {
    color: '#dcd6c8',
    item: {
      id: 'ancient-bone-shard',
      name: 'Úlomek prastaré kosti',
      symbol: '*',
      category: 'loot',
      categoryLabel: 'Kořist',
      description:
        'Zkamenělý kus žeberního pancíře kostlivého strážce, popsaný zašlou runou věčné stráže.',
      effectText: 'Trofej z padlého kostlivce · Temná relikvie',
      actionLabel: 'Prohlédnout',
    },
  },
  ashenChalice: {
    color: '#e5b864',
    item: {
      id: 'ashen-chalice',
      name: 'Zčernalý relikviář',
      symbol: 'U',
      category: 'loot',
      categoryLabel: 'Vzácná kořist',
      description:
        'Těžký stříbrný kalich nalezený v odlehlých končinách pohraničí. Stále z něj sálá chlad dávných rituálů.',
      effectText: 'Vzácná relikvie ze vzdálené lokace',
      actionLabel: 'Prohlédnout',
    },
  },
  emberShard: {
    color: '#f08e3c',
    item: {
      id: 'ember-shard',
      name: 'Žhavý uhlík',
      symbol: '*',
      category: 'loot',
      categoryLabel: 'Surovina',
      description:
        'Tlející krystal popelavého jádra, jenž si uchovává jiskru dávných výhní. Poutníci za něj směňují zásoby.',
      effectText: 'Cenná surovina pro směnu u pocestných',
      actionLabel: 'Prohlédnout',
    },
  },
};

function directionToAngle(dir: Direction): number {
  switch (dir) {
    case 'right':
      return 0;
    case 'down':
      return Math.PI / 2;
    case 'left':
      return Math.PI;
    case 'up':
      return -Math.PI / 2;
  }
}

function angleToDirection(angle: number): Direction {
  const absCos = Math.abs(Math.cos(angle));
  const absSin = Math.abs(Math.sin(angle));
  if (absCos >= absSin) {
    return Math.cos(angle) >= 0 ? 'right' : 'left';
  }
  return Math.sin(angle) >= 0 ? 'down' : 'up';
}

export class CombatSystem {
  public readonly slashes: SlashEffect[] = [];
  public readonly floatingTexts: FloatingText[] = [];
  public readonly dashGhosts: DashGhost[] = [];
  public readonly lootDrops: LootDrop[] = [];
  public readonly soundWaves: SoundWave[] = [];
  public readonly bossTelegraphs: BossTelegraph[] = [];

  public enemiesDefeated = 0;

  private attackCooldownTimer = 0;
  private dashGhostSpawnTimer = 0;
  private nextLootId = 1;
  private nextTelegraphId = 1;
  private readonly collectedCacheIds = new Set<string>();
  private readonly loadedLootChunkKeys = new Set<string>();
  private readonly audio: AudioEngine;
  private readonly onToast: (message: string) => void;
  private readonly onProgressEvent?: () => void;
  private readonly onEnemyKilled?: (enemy: Enemy) => void;

  constructor(
    audio: AudioEngine,
    onToast: (message: string) => void,
    world?: World,
    onProgressEvent?: () => void,
    onEnemyKilled?: (enemy: Enemy) => void
  ) {
    this.audio = audio;
    this.onToast = onToast;
    this.onProgressEvent = onProgressEvent;
    this.onEnemyKilled = onEnemyKilled;

    if (world) {
      this.syncChunkLoot(world);
    }
  }

  public getCollectedCacheIds(): string[] {
    return Array.from(this.collectedCacheIds);
  }

  public applyCollectedCacheIds(ids: readonly string[]): void {
    this.collectedCacheIds.clear();
    for (let i = 0; i < ids.length; i++) {
      this.collectedCacheIds.add(ids[i]);
    }
    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const cid = this.lootDrops[i].worldCacheId;
      if (cid && this.collectedCacheIds.has(cid)) {
        this.lootDrops.splice(i, 1);
      }
    }
  }

  public syncChunkLoot(world: World): void {
    const activeChunks = world.getActiveChunks();
    const activeSet = new Set<string>();
    for (let i = 0; i < activeChunks.length; i++) {
      activeSet.add(activeChunks[i].key);
    }

    // Remove world-cache drops belonging to evicted chunks so loot doesn't bloat RAM
    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const d = this.lootDrops[i];
      if (d.worldCacheId && d.chunkKey && !activeSet.has(d.chunkKey)) {
        this.lootDrops.splice(i, 1);
      }
    }
    for (const k of Array.from(this.loadedLootChunkKeys)) {
      if (!activeSet.has(k)) {
        this.loadedLootChunkKeys.delete(k);
      }
    }

    for (let c = 0; c < activeChunks.length; c++) {
      const chunk = activeChunks[c];
      if (this.loadedLootChunkKeys.has(chunk.key)) continue;
      this.loadedLootChunkKeys.add(chunk.key);

      for (let i = 0; i < chunk.lootSpots.length; i++) {
        const spot = chunk.lootSpots[i];
        if (this.collectedCacheIds.has(spot.id)) continue;

        const choice =
          spot.tier >= 3
            ? LOOT_TEMPLATES.ashenChalice
            : spot.tier === 2
              ? i % 3 === 0
                ? LOOT_TEMPLATES.crimsonDraught
                : i % 3 === 1
                  ? LOOT_TEMPLATES.emberShard
                  : LOOT_TEMPLATES.oilFlask
              : i % 2 === 0
                ? LOOT_TEMPLATES.emberShard
                : LOOT_TEMPLATES.oilFlask;
        this.lootDrops.push({
          id: this.nextLootId++,
          worldCacheId: spot.id,
          chunkKey: chunk.key,
          x: spot.x,
          y: spot.y,
          itemTemplate: choice.item,
          quantity: spot.tier >= 2 && choice.item.category === 'consumable' ? 2 : 1,
          color: choice.color,
          age: 0,
        });
      }
    }
  }

  public tryPlayerAttack(
    player: Player,
    enemies: EnemyManager,
    aimWorld?: Vec2
  ): boolean {
    if (player.isDead || this.attackCooldownTimer > 0) return false;

    if (!player.consumeStamina(ATTACK_STAMINA_COST)) {
      this.spawnFloatingText(player.x, player.y - 3.6, 'Bez výdrže!', '#c29542');
      return false;
    }

    let angle: number;
    if (aimWorld) {
      angle = Math.atan2(aimWorld.y - (player.y - 1.2), aimWorld.x - player.x);
      player.facing = angleToDirection(angle);
    } else {
      angle = directionToAngle(player.facing);
    }

    this.attackCooldownTimer = ATTACK_COOLDOWN;
    this.audio.playSlash();
    this.emitSoundWave(player.x, player.y, 'combat', enemies);

    // Visual ASCII sword/blade slash arc directly in front of the player
    this.slashes.push({
      x: player.x,
      y: player.y - 1.1,
      angle,
      age: 0,
      duration: SLASH_DURATION,
      reach: ATTACK_REACH,
    });

    const damage = player.getAttackDamage();
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Hit all living enemies inside the generous melee cone in front of the player
    for (let i = 0; i < enemies.enemies.length; i++) {
      const enemy = enemies.enemies[i];
      if (!enemy.alive) continue;

      const dx = enemy.x - player.x;
      const dy = (enemy.y - 0.8) - (player.y - 1.1);
      // Slight horizontal aspect compensation so left/right & up/down reach feel balanced
      const dist = Math.hypot(dx * 0.85, dy);
      if (dist > ATTACK_REACH + 1.1) continue;

      let inCone = dist < 2.2;
      if (!inCone && dist > 0.001) {
        const dot = (dx / Math.hypot(dx, dy)) * cosA + (dy / Math.hypot(dx, dy)) * sinA;
        inCone = dot >= 0.22; // ~155-degree sweeping slash arc
      }

      if (!inCone) continue;

      const len = Math.max(0.001, Math.hypot(dx, dy));
      const killed = enemy.takeDamage(damage, dx / len, dy / len);
      this.audio.playHit(enemy.kind, killed);
      this.spawnFloatingText(enemy.x, enemy.y - 3.5, `-${damage}`, '#f0d8a8');

      if (killed) {
        enemies.markDefeated(enemy.id);
        this.handleEnemyDeath(enemy);
      }
    }

    return true;
  }

  public tryPlayerDash(
    player: Player,
    moveDir: Vec2,
    enemies: EnemyManager,
    aimWorld?: Vec2
  ): boolean {
    if (player.isDead || player.isDashing || player.dashCooldown > 0) return false;

    if (!player.consumeStamina(DASH_STAMINA_COST)) {
      this.spawnFloatingText(player.x, player.y - 3.6, 'Bez výdrže!', '#c29542');
      return false;
    }

    let dirX = moveDir.x;
    let dirY = moveDir.y;

    if (dirX === 0 && dirY === 0) {
      if (aimWorld) {
        const dx = aimWorld.x - player.x;
        const dy = aimWorld.y - (player.y - 1.0);
        const len = Math.hypot(dx, dy);
        if (len > 0.01) {
          dirX = dx / len;
          dirY = dy / len;
        }
      }
      if (dirX === 0 && dirY === 0) {
        const angle = directionToAngle(player.facing);
        dirX = Math.cos(angle);
        dirY = Math.sin(angle);
      }
    }

    player.startDash({ x: dirX, y: dirY });
    this.audio.playDash();
    this.emitSoundWave(player.x, player.y, 'dash', enemies);
    this.dashGhosts.push({ x: player.x, y: player.y, age: 0, duration: 0.24 });
    this.dashGhostSpawnTimer = 0.04;
    return true;
  }

  public emitSoundWave(
    x: number,
    y: number,
    kind: SoundWaveKind,
    enemies: EnemyManager
  ): void {
    const cfg = SOUND_WAVE_CONFIGS[kind];
    if (this.soundWaves.length >= 24) {
      this.soundWaves.shift();
    }
    this.soundWaves.push({
      x,
      y,
      radius: 0.8,
      maxRadius: cfg.maxRadius,
      hearRadius: cfg.hearRadius,
      age: 0,
      duration: cfg.duration,
      kind,
      color: cfg.color,
    });
    enemies.alertBySound(x, y, cfg.hearRadius);
  }

  private handleEnemyDeath(enemy: Enemy): void {
    this.enemiesDefeated += 1;
    this.spawnFloatingText(enemy.x, enemy.y - 4.5, `${enemy.name} padl`, '#c94c38');
    this.onToast(`Porazil jsi: ${enemy.name}`);

    if (enemy.archetype === 'iron_founder') {
      this.lootDrops.push(
        {
          id: this.nextLootId++,
          x: enemy.x - 0.8,
          y: enemy.y,
          itemTemplate: RELIC_IRON_HEARTH,
          quantity: 1,
          color: '#ff9642',
          age: 0,
        },
        {
          id: this.nextLootId++,
          x: enemy.x + 1.1,
          y: enemy.y + 0.4,
          itemTemplate: CRUDE_COAL_OIL_TEMPLATE,
          quantity: 4,
          color: '#f08e3c',
          age: 0,
        }
      );
      this.onEnemyKilled?.(enemy);
      this.onProgressEvent?.();
      return;
    }

    if (enemy.archetype === 'mire_alchemist') {
      this.lootDrops.push(
        {
          id: this.nextLootId++,
          x: enemy.x - 0.8,
          y: enemy.y,
          itemTemplate: RELIC_MIRE_ALEMBIC,
          quantity: 1,
          color: '#62f2a2',
          age: 0,
        },
        {
          id: this.nextLootId++,
          x: enemy.x + 1.1,
          y: enemy.y + 0.4,
          itemTemplate: MIRE_ELIXIR_TEMPLATE,
          quantity: 3,
          color: '#4ae3c5',
          age: 0,
        }
      );
      this.onEnemyKilled?.(enemy);
      this.onProgressEvent?.();
      return;
    }

    if (enemy.archetype === 'last_inquisitor') {
      this.lootDrops.push(
        {
          id: this.nextLootId++,
          x: enemy.x - 0.8,
          y: enemy.y,
          itemTemplate: RELIC_OLD_LIGHT,
          quantity: 1,
          color: '#ffe885',
          age: 0,
        },
        {
          id: this.nextLootId++,
          x: enemy.x + 1.1,
          y: enemy.y + 0.4,
          itemTemplate: LORE_WHITE_RELIQUARY_TEMPLATE,
          quantity: 1,
          color: '#ede7d5',
          age: 0,
        }
      );
      this.onEnemyKilled?.(enemy);
      this.onProgressEvent?.();
      return;
    }

    // Drop thematic loot scaled by enemy tier / distance from start!
    const roll = (hashSeedToUint32(enemy.id) + this.enemiesDefeated * 17) % 10;
    const lootChoice = enemy.isBoss
      ? LOOT_TEMPLATES.ashenChalice
      : enemy.tier >= 3 && roll < 3
        ? LOOT_TEMPLATES.ashenChalice
        : enemy.kind === 'ghoul'
          ? roll < 3
            ? LOOT_TEMPLATES.crimsonDraught
            : roll < 6
              ? LOOT_TEMPLATES.ghoulClaw
              : roll < 8
                ? LOOT_TEMPLATES.emberShard
                : LOOT_TEMPLATES.oilFlask
          : roll < 3
            ? LOOT_TEMPLATES.oilFlask
            : roll < 6
              ? LOOT_TEMPLATES.boneShard
              : roll < 8
                ? LOOT_TEMPLATES.emberShard
                : LOOT_TEMPLATES.crimsonDraught;

    this.lootDrops.push({
      id: this.nextLootId++,
      x: enemy.x,
      y: enemy.y,
      itemTemplate: lootChoice.item,
      quantity: enemy.isBoss || (enemy.tier >= 2 && lootChoice.item.category === 'consumable') ? 2 : 1,
      color: lootChoice.color,
      age: 0,
    });
    if (enemy.isBoss) {
      this.lootDrops.push({
        id: this.nextLootId++,
        x: enemy.x + 1.1,
        y: enemy.y,
        itemTemplate: LOOT_TEMPLATES.crimsonDraught.item,
        quantity: 1,
        color: LOOT_TEMPLATES.crimsonDraught.color,
        age: 0,
      });
    }
    this.onEnemyKilled?.(enemy);
    this.onProgressEvent?.();
  }

  public spawnFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({ x, y, text, color, age: 0, duration: 0.85 });
  }

  public update(
    dt: number,
    world: World,
    player: Player,
    enemies: EnemyManager,
    inventory: Inventory,
    ambient: { nightFactor: number; fogIntensity: number } = { nightFactor: 0, fogIntensity: 0 }
  ): void {
    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - dt);
    }

    // Spawn fading dash afterimages while dashing
    if (player.isDashing) {
      this.dashGhostSpawnTimer -= dt;
      if (this.dashGhostSpawnTimer <= 0) {
        this.dashGhosts.push({ x: player.x, y: player.y, age: 0, duration: 0.22 });
        this.dashGhostSpawnTimer = 0.045;
      }
    }

    // Update enemy AI and process incoming hits + city boss telegraphed specials
    const { attacks: enemyHits, specials } = enemies.update(dt, world, player, ambient);
    for (let i = 0; i < enemyHits.length; i++) {
      const hit = enemyHits[i];
      this.audio.playEnemyAttack(hit.enemy.kind);
      const prevHp = player.hp;
      const damaged = player.takeDamage(hit.damage, hit.dirX, hit.dirY);
      if (damaged) {
        const dealt = Math.max(1, Math.round(prevHp - player.hp));
        this.audio.playPlayerHurt();
        this.spawnFloatingText(player.x, player.y - 3.8, `-${dealt} HP`, '#df4444');
        if (player.isDead) {
          this.onToast('Padl jsi v popelu… Stiskni [R] pro návrat k rozcestí.');
        }
      } else if (player.isDashing) {
        this.spawnFloatingText(player.x, player.y - 3.8, 'ÚSKOK!', '#d9c082');
      }
    }

    for (let i = 0; i < specials.length; i++) {
      const sp = specials[i];
      this.audio.playBossTelegraph();
      if (sp.kind === 'hammer_slam') {
        this.bossTelegraphs.push({
          id: this.nextTelegraphId++,
          x: sp.x,
          y: sp.y,
          radius: 6.5,
          angle: sp.angle,
          coneHalfAngle: Math.PI * 0.34,
          kind: 'hammer_slam',
          age: 0,
          duration: 0.85,
          color: '#ff8a3d',
          label: 'DRTIVÉ KLADIVO!',
          damage: sp.damage,
          enemyId: sp.enemy.id,
        });
        this.spawnFloatingText(sp.x, sp.y - 4.0, 'KLADIVO!', '#ff9b4a');
      } else if (sp.kind === 'furnace_nova') {
        this.bossTelegraphs.push({
          id: this.nextTelegraphId++,
          x: sp.x,
          y: sp.y,
          radius: 6.2,
          kind: 'furnace_nova',
          age: 0,
          duration: 1.0,
          color: '#ff5c24',
          label: 'VÝBUCH PECE!',
          damage: sp.damage,
          enemyId: sp.enemy.id,
        });
        this.spawnFloatingText(sp.x, sp.y - 4.0, 'VÝBUCH PECE!', '#ff6229');
      } else if (sp.kind === 'poison_mist') {
        this.bossTelegraphs.push({
          id: this.nextTelegraphId++,
          x: sp.x,
          y: sp.y,
          radius: 4.5,
          kind: 'poison_mist',
          age: 0,
          duration: 4.2,
          color: '#62f2a2',
          label: 'JEDOVATÁ MLHA!',
          damage: sp.damage,
          enemyId: sp.enemy.id,
          tickTimer: 0.45,
        });
        this.spawnFloatingText(sp.enemy.x, sp.enemy.y - 4.0, 'JEDOVATÁ MLHA!', '#62f2a2');
      } else if (sp.kind === 'light_lunge') {
        this.bossTelegraphs.push({
          id: this.nextTelegraphId++,
          x: sp.x,
          y: sp.y,
          radius: 2.3,
          angle: sp.angle,
          targetX: sp.targetX,
          targetY: sp.targetY,
          kind: 'light_lunge',
          age: 0,
          duration: 0.65,
          color: '#ffe678',
          label: 'SVĚTELNÝ VÝPAD!',
          damage: sp.damage,
          enemyId: sp.enemy.id,
        });
        this.spawnFloatingText(sp.x, sp.y - 4.0, 'SVĚTELNÝ VÝPAD!', '#ffe678');
      }
    }

    this.updateBossTelegraphs(dt, player, enemies);

    // Auto-collect nearby loot drops into the player's inventory
    if (!player.isDead) {
      for (let i = this.lootDrops.length - 1; i >= 0; i--) {
        const drop = this.lootDrops[i];
        drop.age += dt;
        const dist = Math.hypot(drop.x - player.x, drop.y - player.y);
        if (dist <= LOOT_PICKUP_RADIUS) {
          if (drop.worldCacheId) {
            this.collectedCacheIds.add(drop.worldCacheId);
          }
          inventory.addItem(drop.itemTemplate, drop.quantity);
          player.syncRelicBonuses(inventory);
          this.audio.playLootPickup();
          this.spawnFloatingText(drop.x, drop.y - 2.2, `+ ${drop.itemTemplate.name}`, drop.color);
          this.onToast(`Sebráno: ${drop.itemTemplate.name}${drop.quantity > 1 ? ` ×${drop.quantity}` : ''}`);
          this.lootDrops.splice(i, 1);
          this.onProgressEvent?.();
        }
      }
    }

    // Tick transient combat visuals
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      this.slashes[i].age += dt;
      if (this.slashes[i].age >= this.slashes[i].duration) {
        this.slashes.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].age += dt;
      if (this.floatingTexts[i].age >= this.floatingTexts[i].duration) {
        this.floatingTexts.splice(i, 1);
      }
    }

    for (let i = this.dashGhosts.length - 1; i >= 0; i--) {
      this.dashGhosts[i].age += dt;
      if (this.dashGhosts[i].age >= this.dashGhosts[i].duration) {
        this.dashGhosts.splice(i, 1);
      }
    }

    for (let i = this.soundWaves.length - 1; i >= 0; i--) {
      const wave = this.soundWaves[i];
      wave.age += dt;
      if (wave.age >= wave.duration) {
        this.soundWaves.splice(i, 1);
      } else {
        wave.radius = 0.8 + (wave.age / wave.duration) * (wave.maxRadius - 0.8);
      }
    }
  }

  private updateBossTelegraphs(dt: number, player: Player, enemies: EnemyManager): void {
    for (let i = this.bossTelegraphs.length - 1; i >= 0; i--) {
      const t = this.bossTelegraphs[i];
      t.age += dt;
      const owner = enemies.enemies.find((e) => e.id === t.enemyId);
      if (t.kind !== 'poison_mist' && (!owner || !owner.alive)) {
        this.bossTelegraphs.splice(i, 1);
        continue;
      }

      if (t.kind === 'poison_mist') {
        t.tickTimer = (t.tickTimer ?? 0.9) - dt;
        if (t.tickTimer <= 0) {
          t.tickTimer = 0.9;
          if (!player.isDead && Math.hypot(player.x - t.x, player.y - t.y) <= t.radius) {
            const prevHp = player.hp;
            if (player.takeDamage(t.damage, 0, 0)) {
              const dealt = Math.max(1, Math.round(prevHp - player.hp));
              this.audio.playPlayerHurt();
              this.spawnFloatingText(player.x, player.y - 3.8, `-${dealt} (Jed)`, '#62f2a2');
              if (player.isDead) {
                this.onToast('Udusila tě alchymistická mlha… Stiskni [R] pro návrat k rozcestí.');
              }
            }
          }
        }
        if (t.age >= t.duration) {
          this.bossTelegraphs.splice(i, 1);
        }
        continue;
      }

      if (!t.resolved && t.age >= t.duration) {
        t.resolved = true;
        this.emitSoundWave(t.x, t.y, 'combat', enemies);

        if (t.kind === 'hammer_slam') {
          this.slashes.push({
            x: t.x,
            y: t.y - 0.8,
            angle: t.angle ?? 0,
            age: 0,
            duration: 0.25,
            reach: t.radius,
          });
          const dx = player.x - t.x;
          const dy = player.y - t.y;
          const dist = Math.hypot(dx, dy);
          let hit = dist <= 1.8;
          if (!hit && dist <= t.radius && dist > 0.01) {
            const dot = (dx / dist) * Math.cos(t.angle ?? 0) + (dy / dist) * Math.sin(t.angle ?? 0);
            hit = dot >= Math.cos(t.coneHalfAngle ?? Math.PI * 0.34);
          }
          if (hit && !player.isDead) {
            const len = Math.max(0.01, dist);
            const prevHp = player.hp;
            if (player.takeDamage(t.damage, dx / len, dy / len)) {
              const dealt = Math.max(1, Math.round(prevHp - player.hp));
              this.audio.playPlayerHurt();
              this.spawnFloatingText(player.x, player.y - 3.8, `-${dealt} HP`, '#ff8a3d');
            } else if (player.isDashing) {
              this.spawnFloatingText(player.x, player.y - 3.8, 'ÚSKOK!', '#d9c082');
            }
          }
        } else if (t.kind === 'furnace_nova') {
          const dx = player.x - t.x;
          const dy = player.y - t.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= t.radius && !player.isDead) {
            const len = Math.max(0.01, dist);
            const prevHp = player.hp;
            if (player.takeDamage(t.damage, dx / len, dy / len)) {
              const dealt = Math.max(1, Math.round(prevHp - player.hp));
              this.audio.playPlayerHurt();
              this.spawnFloatingText(player.x, player.y - 3.8, `-${dealt} HP`, '#ff5c24');
            } else if (player.isDashing) {
              this.spawnFloatingText(player.x, player.y - 3.8, 'ÚSKOK!', '#d9c082');
            }
          }
        } else if (t.kind === 'light_lunge') {
          const ax = t.x;
          const ay = t.y;
          const bx = t.targetX ?? t.x;
          const by = t.targetY ?? t.y;
          if (owner && owner.alive) {
            owner.x = bx;
            owner.y = by;
          }
          const abx = bx - ax;
          const aby = by - ay;
          const abLen2 = Math.max(0.001, abx * abx + aby * aby);
          const proj = Math.max(0, Math.min(1, ((player.x - ax) * abx + (player.y - ay) * aby) / abLen2));
          const cx = ax + proj * abx;
          const cy = ay + proj * aby;
          const dist = Math.hypot(player.x - cx, player.y - cy);
          if (dist <= t.radius && !player.isDead) {
            const dirLen = Math.max(0.01, Math.hypot(abx, aby));
            const prevHp = player.hp;
            if (player.takeDamage(t.damage, abx / dirLen, aby / dirLen)) {
              const dealt = Math.max(1, Math.round(prevHp - player.hp));
              this.audio.playPlayerHurt();
              this.spawnFloatingText(player.x, player.y - 3.8, `-${dealt} HP`, '#ffe678');
            } else if (player.isDashing) {
              this.spawnFloatingText(player.x, player.y - 3.8, 'ÚSKOK!', '#d9c082');
            }
          }
        }

        if (player.isDead) {
          this.onToast('Padl jsi v popelu… Stiskni [R] pro návrat k rozcestí.');
        }
        this.bossTelegraphs.splice(i, 1);
      }
    }
  }
}
