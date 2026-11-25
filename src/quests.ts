import type { Enemy } from './enemies';
import { getBossTitle, getItemDescription, getItemName, getPoiName, t } from './i18n';
import type { Inventory } from './inventory';
import type { Player } from './player';
import type {
  EnemyKind,
  InventoryItem,
  PoiKind,
  PointOfInterest,
  QuestBossSpec,
  QuestEntry,
  QuestMapMarker,
  QuestObjective,
  QuestRelic,
  SerializedQuestState,
} from './types';
import { compassDir, createRng, type World } from './world';

const BOSS_KINDS: Record<PoiKind, EnemyKind> = {
  shelter: 'skeleton',
  cathedral: 'skeleton',
  fortress: 'skeleton',
  graveyard: 'skeleton',
  village: 'ghoul',
  watchtower: 'skeleton',
  abbey_crypt: 'skeleton',
  cave: 'ghoul',
  city_kaelvarr: 'skeleton',
  city_siltmoor: 'ghoul',
  city_aethelgard: 'skeleton',
};

const RELIC_SPECS: readonly { id: string; color: string }[] = [
  { id: 'relic-chalice', color: '#f0c465' },
  { id: 'relic-key', color: '#8edce8' },
  { id: 'relic-medallion', color: '#d7bdf0' },
];

const REWARD_TEMPLATES: {
  guardSword: Omit<InventoryItem, 'quantity'>;
  crimsonDraught: Omit<InventoryItem, 'quantity'>;
  oilFlask: Omit<InventoryItem, 'quantity'>;
} = {
  guardSword: {
    id: 'steel-guard-sword',
    name: 'Ocelový meč strážce',
    symbol: '†',
    category: 'weapon',
    categoryLabel: 'Zbraň',
    description:
      'Kalená čepel dávných strážců pohraničí. Na rukojeti jsou vyryté ochranné runy proti nemrtvým.',
    effectText: '+10 k útoku · Jednoruční zbraň (lze nasadit)',
    actionLabel: 'Nasadit',
    equipable: true,
    equipped: false,
    attackBonus: 10,
  },
  crimsonDraught: {
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
  oilFlask: {
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
};

export interface QuestHudInfo {
  title: string;
  progressLine: string;
  navLine: string;
  isReady: boolean;
}

export class QuestManager {
  private readonly quests: QuestEntry[] = [];
  private readonly bossSpecs: QuestBossSpec[] = [];
  private readonly relics: QuestRelic[] = [];
  private trackedQuestId: string | null = null;

  constructor(world: World) {
    this.generateForWorld(world);
  }

  private generateForWorld(world: World): void {
    const rng = createRng(world.numericSeed ^ 0x51ae57);

    // Deterministically query expedition POIs 250–600 cells from (0, 0)
    let candidatePois: PointOfInterest[] = world
      .findPoisInRange(250, 600)
      .filter((p) => !p.id.startsWith('city_'));
    if (candidatePois.length < 6) {
      candidatePois = world.findPoisInRange(180, 760).filter((p) => !p.id.startsWith('city_'));
    }

    // Deterministic Fisher-Yates shuffle
    const shuffled = [...candidatePois];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }

    // 1. Main Quest: Cleanse the Cursed Sites (prefer 3 distinct POI kinds)
    const cleansePois: PointOfInterest[] = [];
    const seenKinds = new Set<PoiKind>();
    for (const p of shuffled) {
      if (!seenKinds.has(p.id)) {
        seenKinds.add(p.id);
        cleansePois.push(p);
        if (cleansePois.length === 3) break;
      }
    }
    for (const p of shuffled) {
      if (cleansePois.length >= 3) break;
      if (!cleansePois.some((c) => c.uid === p.uid)) {
        cleansePois.push(p);
      }
    }

    const cleanseObjectives: QuestObjective[] = [];
    for (const poi of cleansePois) {
      const bossName = getBossTitle(poi.id);
      const poiName = getPoiName(poi.id);
      const spawnX = poi.x + Math.round((rng() - 0.5) * 2);
      const spawnY = poi.y + Math.round((rng() - 0.5) * 2);
      this.bossSpecs.push({
        poiUid: poi.uid,
        poiId: poi.id,
        poiName,
        bossName,
        kind: BOSS_KINDS[poi.id],
        chunkX: poi.chunkX,
        chunkY: poi.chunkY,
        x: spawnX,
        y: spawnY,
      });

      cleanseObjectives.push({
        id: `boss-${poi.uid}`,
        label: `${bossName} (${poiName})`,
        current: 0,
        target: 1,
        poiUid: poi.uid,
        poiId: poi.id,
        targetX: poi.x,
        targetY: poi.y,
        done: false,
      });
    }

    const poiNamesText = cleansePois.map((p) => getPoiName(p.id)).join(', ');
    this.quests.push({
      id: 'cleanse-cursed',
      kind: 'cleanse',
      title: t('quest.cleanse.title'),
      giverQuote: t('quest.cleanse.quote'),
      description: t('quest.cleanse.desc', { pois: poiNamesText }),
      rewardSummary: t('quest.cleanse.reward'),
      status: 'available',
      completionCount: 0,
      objectives: cleanseObjectives,
    });

    // 2. Exploration Quest: Forgotten Relics (3 glowing collectible relics across distinct POIs)
    const remainingPois = shuffled.filter((p) => !cleansePois.some((c) => c.uid === p.uid));
    const relicPool = remainingPois.length >= 3 ? remainingPois : shuffled;
    const relicPois: PointOfInterest[] = [];
    for (let i = 0; i < RELIC_SPECS.length && relicPool.length > 0; i++) {
      relicPois.push(relicPool[i % relicPool.length]);
    }

    const relicObjectives: QuestObjective[] = [];
    for (let i = 0; i < relicPois.length; i++) {
      const poi = relicPois[i];
      const spec = RELIC_SPECS[i];
      const relicName = getItemName({ id: spec.id, name: spec.id });
      const relicDesc = getItemDescription({ id: spec.id, description: '' });
      const poiName = getPoiName(poi.id);
      // Guaranteed 5x5 open sanctuary around (poi.x, poi.y) ensures safe collectible placement
      const rx = poi.x + (i % 2 === 0 ? 1.5 : -1.5);
      const ry = poi.y + 1.5;

      this.relics.push({
        id: spec.id,
        name: relicName,
        poiUid: poi.uid,
        poiId: poi.id,
        x: rx,
        y: ry,
        color: spec.color,
        description: relicDesc,
        collected: false,
      });

      relicObjectives.push({
        id: spec.id,
        label: `${relicName} (${poiName})`,
        current: 0,
        target: 1,
        poiUid: poi.uid,
        poiId: poi.id,
        targetX: rx,
        targetY: ry,
        done: false,
      });
    }

    this.quests.push({
      id: 'forgotten-relics',
      kind: 'relics',
      title: t('quest.relics.title'),
      giverQuote: t('quest.relics.quote'),
      description: t('quest.relics.desc'),
      rewardSummary: t('quest.relics.reward'),
      status: 'available',
      completionCount: 0,
      objectives: relicObjectives,
    });

    // 3. Repeatable Hunting Contract
    this.quests.push({
      id: 'hunt-contract',
      kind: 'hunt',
      title: t('quest.hunt.title'),
      giverQuote: t('quest.hunt.quote'),
      description: t('quest.hunt.desc_any'),
      rewardSummary: t('quest.hunt.reward_first'),
      status: 'available',
      repeatable: true,
      completionCount: 0,
      objectives: [
        {
          id: 'hunt-any',
          label: t('quest.hunt.obj_any'),
          current: 0,
          target: 5,
          done: false,
        },
      ],
    });
  }

  /** Re-applies localized text to all quests, objectives, relics, and boss specs in place */
  public refreshLocalization(): void {
    for (const spec of this.bossSpecs) {
      spec.poiName = getPoiName(spec.poiId);
      spec.bossName = getBossTitle(spec.poiId);
    }

    for (const relic of this.relics) {
      relic.name = getItemName({ id: relic.id, name: relic.name });
      relic.description = getItemDescription({ id: relic.id, description: relic.description });
    }

    for (const q of this.quests) {
      if (q.id === 'cleanse-cursed') {
        q.title = t('quest.cleanse.title');
        q.giverQuote = t('quest.cleanse.quote');
        const poiNames = q.objectives
          .map((o) => (o.poiId ? getPoiName(o.poiId) : ''))
          .filter((s) => s.length > 0)
          .join(', ');
        q.description = t('quest.cleanse.desc', { pois: poiNames });
        q.rewardSummary = t('quest.cleanse.reward');
        for (const o of q.objectives) {
          if (o.poiId) {
            o.label = `${getBossTitle(o.poiId)} (${getPoiName(o.poiId)})`;
          }
        }
      } else if (q.id === 'forgotten-relics') {
        q.title = t('quest.relics.title');
        q.giverQuote = t('quest.relics.quote');
        q.description = t('quest.relics.desc');
        q.rewardSummary = t('quest.relics.reward');
        for (const o of q.objectives) {
          const rName = getItemName({ id: o.id, name: o.id });
          const pName = o.poiId ? getPoiName(o.poiId) : '';
          o.label = pName ? `${rName} (${pName})` : rName;
        }
      } else if (q.id === 'hunt-contract') {
        q.title = t('quest.hunt.title');
        q.giverQuote = t('quest.hunt.quote');
        const obj = q.objectives[0];
        if (obj?.id === 'hunt-ghoul') {
          obj.label = t('quest.hunt.obj_ghoul');
          q.description = t('quest.hunt.desc_ghoul');
        } else if (obj?.id === 'hunt-skeleton') {
          obj.label = t('quest.hunt.obj_skeleton');
          q.description = t('quest.hunt.desc_skeleton');
        } else if (obj) {
          obj.label = t('quest.hunt.obj_any');
          q.description = t('quest.hunt.desc_any');
        }
        q.rewardSummary =
          q.completionCount === 0 ? t('quest.hunt.reward_first') : t('quest.hunt.reward_repeat');
      }
    }
  }

  public getQuests(): readonly QuestEntry[] {
    return this.quests;
  }

  public getBossSpecs(): readonly QuestBossSpec[] {
    return this.bossSpecs;
  }

  public getRelics(): readonly QuestRelic[] {
    return this.relics;
  }

  public getTrackedQuest(): QuestEntry | null {
    if (this.trackedQuestId) {
      const found = this.quests.find((q) => q.id === this.trackedQuestId);
      if (found && (found.status === 'active' || found.status === 'ready')) {
        return found;
      }
    }

    // Fallback to first ready or active quest
    const next =
      this.quests.find((q) => q.status === 'ready') ??
      this.quests.find((q) => q.status === 'active') ??
      null;
    this.trackedQuestId = next?.id ?? null;
    return next;
  }

  public setTrackedQuest(id: string): void {
    const q = this.quests.find((entry) => entry.id === id);
    if (q && (q.status === 'active' || q.status === 'ready')) {
      this.trackedQuestId = q.id;
    }
  }

  public acceptQuest(id: string): { ok: boolean; message: string } {
    const quest = this.quests.find((q) => q.id === id);
    if (!quest) {
      return { ok: false, message: t('quest.msg.not_found') };
    }
    if (quest.status !== 'available') {
      return { ok: false, message: t('quest.msg.already_accepted') };
    }

    const allDone = quest.objectives.every((o) => o.done);
    quest.status = allDone ? 'ready' : 'active';
    this.trackedQuestId = quest.id;

    return {
      ok: true,
      message: allDone
        ? t('quest.msg.accepted_ready', { title: quest.title })
        : t('quest.msg.accepted', { title: quest.title }),
    };
  }

  public turnInQuest(
    id: string,
    player: Player,
    inventory: Inventory
  ): { ok: boolean; message: string } {
    const quest = this.quests.find((q) => q.id === id);
    if (!quest || quest.status !== 'ready') {
      return { ok: false, message: t('quest.msg.not_ready') };
    }

    let rewardLog = '';
    if (quest.id === 'cleanse-cursed') {
      inventory.addItem(REWARD_TEMPLATES.guardSword, 1);
      inventory.addItem(REWARD_TEMPLATES.crimsonDraught, 2);
      player.upgradeMaxHp(25);
      rewardLog = t('quest.cleanse.reward_log');
    } else if (quest.id === 'forgotten-relics') {
      inventory.addItem(REWARD_TEMPLATES.oilFlask, 3);
      inventory.addItem(REWARD_TEMPLATES.crimsonDraught, 2);
      player.upgradeMaxStamina(25);
      rewardLog = t('quest.relics.reward_log');
    } else if (quest.id === 'hunt-contract') {
      inventory.addItem(REWARD_TEMPLATES.crimsonDraught, 2);
      inventory.addItem(REWARD_TEMPLATES.oilFlask, 2);
      if (quest.completionCount === 0) {
        player.upgradeMaxHp(5);
        rewardLog = t('quest.hunt.reward_log_first');
      } else {
        player.heal(20);
        rewardLog = t('quest.hunt.reward_log_repeat');
      }
    }

    quest.completionCount += 1;

    if (quest.repeatable) {
      // Reset repeatable hunt contract with rotating target flavor
      quest.status = 'available';
      const cycle = quest.completionCount % 3;
      const obj = quest.objectives[0];
      obj.current = 0;
      obj.done = false;
      if (cycle === 1) {
        obj.id = 'hunt-ghoul';
      } else if (cycle === 2) {
        obj.id = 'hunt-skeleton';
      } else {
        obj.id = 'hunt-any';
      }
      this.refreshLocalization();
    } else {
      quest.status = 'completed';
    }

    if (this.trackedQuestId === quest.id) {
      this.trackedQuestId = null;
      this.getTrackedQuest();
    }

    return {
      ok: true,
      message: t('quest.msg.completed', { rewardLog }),
    };
  }

  /** Updates kill/boss quest objectives when an enemy falls. Returns optional toast text. */
  public onEnemyKilled(enemy: Enemy): { toast: string | null; becameReady: boolean } {
    let toast: string | null = null;
    let becameReady = false;

    // 1. Check main boss cleansing quest (even if player hasn't spoken to board yet!)
    const cleanse = this.quests.find((q) => q.id === 'cleanse-cursed');
    if (cleanse && enemy.isBoss) {
      const obj = cleanse.objectives.find(
        (o) =>
          (enemy.bossPoiUid && o.poiUid === enemy.bossPoiUid) ||
          (!o.poiUid && enemy.bossPoiId && o.poiId === enemy.bossPoiId)
      );
      if (obj && !obj.done) {
        obj.current = 1;
        obj.done = true;

        const doneCount = cleanse.objectives.filter((o) => o.done).length;
        const allDone = doneCount === cleanse.objectives.length;
        if (cleanse.status === 'active') {
          if (allDone) {
            cleanse.status = 'ready';
            becameReady = true;
            toast = t('quest.msg.ready_toast', { title: cleanse.title });
          } else {
            toast = `${cleanse.title}: ${doneCount}/${cleanse.objectives.length}`;
          }
        }
      }
    }

    // 2. Check active repeatable hunting contract
    const hunt = this.quests.find((q) => q.id === 'hunt-contract');
    if (hunt && hunt.status === 'active') {
      const obj = hunt.objectives[0];
      const matches =
        obj.id === 'hunt-any' ||
        (obj.id === 'hunt-ghoul' && enemy.kind === 'ghoul') ||
        (obj.id === 'hunt-skeleton' && enemy.kind === 'skeleton');

      if (matches && !obj.done) {
        obj.current = Math.min(obj.target, obj.current + 1);
        if (obj.current >= obj.target) {
          obj.done = true;
          hunt.status = 'ready';
          becameReady = true;
          toast = t('quest.msg.ready_toast', { title: hunt.title });
        } else if (!toast) {
          toast = `${hunt.title}: ${obj.current}/${obj.target}`;
        }
      }
    }

    return { toast, becameReady };
  }

  public getNearbyRelic(x: number, y: number, maxDist = 3.8): QuestRelic | null {
    for (let i = 0; i < this.relics.length; i++) {
      const relic = this.relics[i];
      if (relic.collected) continue;
      if (Math.hypot(relic.x - x, relic.y - y) <= maxDist) {
        return relic;
      }
    }
    return null;
  }

  public collectRelic(
    relic: QuestRelic,
    inventory: Inventory
  ): { message: string; questReady: boolean } {
    if (relic.collected) {
      return { message: '', questReady: false };
    }
    relic.collected = true;

    const relicName = getItemName({ id: relic.id, name: relic.name });
    const relicDesc = getItemDescription({ id: relic.id, description: relic.description });

    inventory.addItem(
      {
        id: relic.id,
        name: relicName,
        symbol: '*',
        category: 'loot',
        categoryLabel: t('stats.buff_relic_meta'),
        description: relicDesc,
        effectText: t('item.relic-chalice.effect'),
        actionLabel: t('inv.action.inspect'),
      },
      1
    );

    let questReady = false;
    const relicQuest = this.quests.find((q) => q.id === 'forgotten-relics');
    if (relicQuest) {
      const obj = relicQuest.objectives.find((o) => o.id === relic.id);
      if (obj) {
        obj.current = 1;
        obj.done = true;
      }
      const doneCount = relicQuest.objectives.filter((o) => o.done).length;
      if (relicQuest.status === 'active' && doneCount === relicQuest.objectives.length) {
        relicQuest.status = 'ready';
        questReady = true;
      }
      return {
        message: questReady
          ? t('quest.msg.relic_collected_ready', { name: relicName })
          : t('quest.msg.relic_collected_prog', {
              name: relicName,
              done: doneCount,
              total: relicQuest.objectives.length,
            }),
        questReady,
      };
    }

    return { message: t('quest.msg.relic_collected', { name: relicName }), questReady: false };
  }

  /** Returns target markers for highlighting active/ready quests on the World Map (M) */
  public getActiveMapMarkers(world: World): QuestMapMarker[] {
    const markers: QuestMapMarker[] = [];
    let hasReady = false;

    for (let i = 0; i < this.quests.length; i++) {
      const q = this.quests[i];
      if (q.status === 'ready') {
        hasReady = true;
        continue;
      }
      if (q.status !== 'active') continue;

      for (let j = 0; j < q.objectives.length; j++) {
        const obj = q.objectives[j];
        if (obj.done || obj.targetX === undefined || obj.targetY === undefined) continue;

        const poiLabel = obj.poiId ? getPoiName(obj.poiId) : obj.label;
        markers.push({
          x: obj.targetX,
          y: obj.targetY,
          label: poiLabel,
          isTurnIn: false,
        });
      }
    }

    if (hasReady) {
      markers.push({
        x: world.questGiver.x,
        y: world.questGiver.y,
        label: t('quest.map_turn_in'),
        isTurnIn: true,
      });
    }

    return markers;
  }

  /** Returns compact HUD tracker summary for the top-right corner */
  public getHudTrackerInfo(playerX: number, playerY: number, world: World): QuestHudInfo | null {
    const quest = this.getTrackedQuest();
    if (!quest) return null;

    if (quest.status === 'ready') {
      const dir = compassDir(playerX, playerY, world.questGiver.x + 0.5, world.questGiver.y + 0.5);
      const dist = Math.round(
        Math.hypot(world.questGiver.x + 0.5 - playerX, world.questGiver.y + 0.5 - playerY)
      );
      return {
        title: quest.title,
        progressLine: t('quest.tracker.ready_prog'),
        navLine:
          dist <= 5
            ? t('quest.tracker.ready_near')
            : t('quest.tracker.ready_dir', { dir, dist }),
        isReady: true,
      };
    }

    if (quest.kind === 'hunt') {
      const obj = quest.objectives[0];
      return {
        title: quest.title,
        progressLine: `${obj.label}: ${obj.current}/${obj.target}`,
        navLine: t('quest.tracker.hunt_nav'),
        isReady: false,
      };
    }

    const doneCount = quest.objectives.filter((o) => o.done).length;
    // Find closest incomplete target objective for live compass guidance
    let nearestObj: QuestObjective | null = null;
    let nearestDist = Infinity;

    for (let i = 0; i < quest.objectives.length; i++) {
      const obj = quest.objectives[i];
      if (obj.done || obj.targetX === undefined || obj.targetY === undefined) continue;
      const d = Math.hypot(obj.targetX - playerX, obj.targetY - playerY);
      if (d < nearestDist) {
        nearestDist = d;
        nearestObj = obj;
      }
    }

    if (!nearestObj || nearestObj.targetX === undefined || nearestObj.targetY === undefined) {
      return {
        title: quest.title,
        progressLine: t('quest.tracker.fallback_prog', {
          done: doneCount,
          total: quest.objectives.length,
        }),
        navLine: t('quest.tracker.fallback_nav'),
        isReady: false,
      };
    }

    const targetName = nearestObj.poiId ? getPoiName(nearestObj.poiId) : nearestObj.label;
    const dir = compassDir(playerX, playerY, nearestObj.targetX, nearestObj.targetY);
    const dist = Math.round(nearestDist);

    return {
      title: quest.title,
      progressLine: `${targetName}: ${doneCount}/${quest.objectives.length}`,
      navLine: t('quest.tracker.target_nav', { dir, dist }),
      isReady: false,
    };
  }

  public getDebugSummary(): {
    activeCount: number;
    readyCount: number;
    completedCount: number;
    trackedTitle: string | null;
    relicsRemaining: number;
  } {
    let activeCount = 0;
    let readyCount = 0;
    let completedCount = 0;
    for (const q of this.quests) {
      if (q.status === 'active') activeCount++;
      else if (q.status === 'ready') readyCount++;
      else if (q.status === 'completed') completedCount++;
    }
    const relicsRemaining = this.relics.filter((r) => !r.collected).length;
    return {
      activeCount,
      readyCount,
      completedCount,
      trackedTitle: this.getTrackedQuest()?.title ?? null,
      relicsRemaining,
    };
  }

  public serialize(): SerializedQuestState {
    return {
      quests: this.quests.map((q) => ({
        id: q.id,
        status: q.status,
        completionCount: q.completionCount,
        objectives: q.objectives.map((o) => ({
          id: o.id,
          current: o.current,
          done: o.done,
        })),
      })),
      collectedRelicIds: this.relics.filter((r) => r.collected).map((r) => r.id),
      trackedQuestId: this.trackedQuestId,
    };
  }

  public restore(data: SerializedQuestState): void {
    const collectedSet = new Set(data.collectedRelicIds ?? []);
    for (const relic of this.relics) {
      relic.collected = collectedSet.has(relic.id);
    }

    for (const savedQ of data.quests ?? []) {
      const targetQ = this.quests.find((q) => q.id === savedQ.id);
      if (!targetQ) continue;
      targetQ.status = savedQ.status;
      targetQ.completionCount = savedQ.completionCount ?? 0;

      // Keep repeatable hunt objective id matching restored completionCount
      if (targetQ.id === 'hunt-contract' && targetQ.completionCount > 0) {
        const cycle = targetQ.completionCount % 3;
        const obj = targetQ.objectives[0];
        if (cycle === 1) {
          obj.id = 'hunt-ghoul';
        } else if (cycle === 2) {
          obj.id = 'hunt-skeleton';
        } else {
          obj.id = 'hunt-any';
        }
      }

      for (const savedObj of savedQ.objectives ?? []) {
        const targetObj = targetQ.objectives.find((o) => o.id === savedObj.id) ?? targetQ.objectives[0];
        if (targetObj) {
          targetObj.current = savedObj.current;
          targetObj.done = savedObj.done;
        }
      }
    }

    this.refreshLocalization();
    this.trackedQuestId = data.trackedQuestId ?? null;
    this.getTrackedQuest();
  }
}
