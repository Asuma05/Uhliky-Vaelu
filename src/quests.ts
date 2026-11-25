import type { Enemy } from './enemies';
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

const BOSS_TITLES: Record<PoiKind, { name: string; kind: EnemyKind }> = {
  shelter: { name: 'Strážce mýtiny', kind: 'skeleton' },
  cathedral: { name: 'Kněz popela', kind: 'skeleton' },
  fortress: { name: 'Pán rozvalin', kind: 'skeleton' },
  graveyard: { name: 'Strážce krypty', kind: 'skeleton' },
  village: { name: 'Utopený netvor', kind: 'ghoul' },
  watchtower: { name: 'Kapitán hlídky', kind: 'skeleton' },
  abbey_crypt: { name: 'Opat z kostí', kind: 'skeleton' },
  cave: { name: 'Hlídač sluje', kind: 'ghoul' },
  city_kaelvarr: { name: 'Železný slévač', kind: 'skeleton' },
  city_siltmoor: { name: 'Alchymista z hlubin', kind: 'ghoul' },
  city_aethelgard: { name: 'Poslední inkvizitor', kind: 'skeleton' },
};

const RELIC_TEMPLATES: readonly {
  id: string;
  name: string;
  color: string;
  description: string;
}[] = [
  {
    id: 'relic-chalice',
    name: 'Popelavý kalich',
    color: '#f0c465',
    description: 'Zčernalý obřadní kalich vytepaný ze starého zlata. V jeho středu doutná studený popel.',
  },
  {
    id: 'relic-key',
    name: 'Zrezivělý klíč od krypty',
    color: '#8edce8',
    description: 'Těžký železný klíč pokrytý modravou rzí a runami dávné stráže pohraničí.',
  },
  {
    id: 'relic-medallion',
    name: 'Stříbrný medailon',
    color: '#d7bdf0',
    description: 'Zašlý medailon s vyrytým znakem luny, jenž tiše světélkuje i v hluboké tmě.',
  },
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

    // 1. Main Quest: Očištění prokletých míst (prefer 3 distinct POI kinds)
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
      const bossTemplate = BOSS_TITLES[poi.id];
      const spawnX = poi.x + Math.round((rng() - 0.5) * 2);
      const spawnY = poi.y + Math.round((rng() - 0.5) * 2);
      this.bossSpecs.push({
        poiUid: poi.uid,
        poiId: poi.id,
        poiName: poi.name,
        bossName: bossTemplate.name,
        kind: bossTemplate.kind,
        chunkX: poi.chunkX,
        chunkY: poi.chunkY,
        x: spawnX,
        y: spawnY,
      });

      cleanseObjectives.push({
        id: `boss-${poi.uid}`,
        label: `${bossTemplate.name} (${poi.name})`,
        current: 0,
        target: 1,
        poiUid: poi.uid,
        poiId: poi.id,
        targetX: poi.x,
        targetY: poi.y,
        done: false,
      });
    }

    const poiNamesText = cleansePois.map((p) => p.name).join(', ');
    this.quests.push({
      id: 'cleanse-cursed',
      kind: 'cleanse',
      title: 'Očištění prokletých míst',
      giverQuote:
        '„Temnota se probudila v dalekých rozvalinách. Pokud nepadnou jejich strážci, mlha pohltí i toto útočiště.“',
      description: `Vypátrej a poraz prastaré strážce (mini-bosse) v těchto třech vzdálených lokacích (250–600 buněk od startu): ${poiNamesText}.`,
      rewardSummary: 'Ocelový meč strážce (+10 útok), +25 Max HP, 2× Karmínový odvar',
      status: 'available',
      completionCount: 0,
      objectives: cleanseObjectives,
    });

    // 2. Exploration Quest: Zapomenuté relikvie (3 glowing collectible relics across distinct POIs)
    const remainingPois = shuffled.filter((p) => !cleansePois.some((c) => c.uid === p.uid));
    const relicPool = remainingPois.length >= 3 ? remainingPois : shuffled;
    const relicPois: PointOfInterest[] = [];
    for (let i = 0; i < RELIC_TEMPLATES.length && relicPool.length > 0; i++) {
      relicPois.push(relicPool[i % relicPool.length]);
    }

    const relicObjectives: QuestObjective[] = [];
    for (let i = 0; i < relicPois.length; i++) {
      const poi = relicPois[i];
      const tpl = RELIC_TEMPLATES[i];
      // Guaranteed 5x5 open sanctuary around (poi.x, poi.y) ensures safe collectible placement
      const rx = poi.x + (i % 2 === 0 ? 1.5 : -1.5);
      const ry = poi.y + 1.5;

      this.relics.push({
        id: tpl.id,
        name: tpl.name,
        poiUid: poi.uid,
        poiId: poi.id,
        x: rx,
        y: ry,
        color: tpl.color,
        description: tpl.description,
        collected: false,
      });

      relicObjectives.push({
        id: tpl.id,
        label: `${tpl.name} (${poi.name})`,
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
      title: 'Zapomenuté relikvie',
      giverQuote:
        '„Poutníci před tebou ztratili v troskách tři posvátné předměty. Jejich slabá záře stále volá z temnoty.“',
      description:
        'Prohledej označené lokace, najdi tři zářící relikvie (*) a posbírej je pomocí klávesy [E].',
      rewardSummary: '+25 Max Stamina, 3× Olej do lucerny, 2× Karmínový odvar',
      status: 'available',
      completionCount: 0,
      objectives: relicObjectives,
    });

    // 3. Repeatable Hunting Contract: Lovecký kontrakt
    this.quests.push({
      id: 'hunt-contract',
      kind: 'hunt',
      title: 'Lovecký kontrakt',
      giverQuote:
        '„Okolní stezky se hemží nemrtvými. Každý padlý ghúl či kostlivec znamená bezpečnější noc pro poutníky.“',
      description: 'Vyraz do pohraničí a pobij 5 nepřátel (ghúlů nebo kostlivců), poté se vrať pro odměnu.',
      rewardSummary: '2× Karmínový odvar, 2× Olej do lucerny (+5 Max HP poprvé)',
      status: 'available',
      repeatable: true,
      completionCount: 0,
      objectives: [
        {
          id: 'hunt-any',
          label: 'Zabij nepřátele v pohraničí',
          current: 0,
          target: 5,
          done: false,
        },
      ],
    });
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
      return { ok: false, message: 'Úkol nebyl nalezen.' };
    }
    if (quest.status !== 'available') {
      return { ok: false, message: 'Tento úkol již byl přijat nebo dokončen.' };
    }

    const allDone = quest.objectives.every((o) => o.done);
    quest.status = allDone ? 'ready' : 'active';
    this.trackedQuestId = quest.id;

    return {
      ok: true,
      message: allDone
        ? `Úkol přijat a připraven k odevzdání: ${quest.title}!`
        : `Přijal jsi úkol: ${quest.title}.`,
    };
  }

  public turnInQuest(
    id: string,
    player: Player,
    inventory: Inventory
  ): { ok: boolean; message: string } {
    const quest = this.quests.find((q) => q.id === id);
    if (!quest || quest.status !== 'ready') {
      return { ok: false, message: 'Cíle tohoto úkolu ještě nejsou splněny.' };
    }

    let rewardLog = '';
    if (quest.id === 'cleanse-cursed') {
      inventory.addItem(REWARD_TEMPLATES.guardSword, 1);
      inventory.addItem(REWARD_TEMPLATES.crimsonDraught, 2);
      player.upgradeMaxHp(25);
      rewardLog = 'Odměna: Ocelový meč strážce (+10), +25 Max HP, 2× Karmínový odvar.';
    } else if (quest.id === 'forgotten-relics') {
      inventory.addItem(REWARD_TEMPLATES.oilFlask, 3);
      inventory.addItem(REWARD_TEMPLATES.crimsonDraught, 2);
      player.upgradeMaxStamina(25);
      rewardLog = 'Odměna: +25 Max Stamina, 3× Olej do lucerny, 2× Karmínový odvar.';
    } else if (quest.id === 'hunt-contract') {
      inventory.addItem(REWARD_TEMPLATES.crimsonDraught, 2);
      inventory.addItem(REWARD_TEMPLATES.oilFlask, 2);
      if (quest.completionCount === 0) {
        player.upgradeMaxHp(5);
        rewardLog = 'Odměna: +5 Max HP, 2× Karmínový odvar, 2× Olej do lucerny.';
      } else {
        player.heal(20);
        rewardLog = 'Odměna: 2× Karmínový odvar, 2× Olej do lucerny (+20 HP).';
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
        obj.label = 'Zabij 5 ghúlů v pohraničí';
        quest.description = 'Vyraz do okolí hřbitova či vesnice a zneškodni 5 rychlých ghúlů.';
      } else if (cycle === 2) {
        obj.id = 'hunt-skeleton';
        obj.label = 'Zabij 5 kostlivců v pohraničí';
        quest.description = 'Vydej se do ruin a rozdrť 5 kostlivých strážců.';
      } else {
        obj.id = 'hunt-any';
        obj.label = 'Zabij nepřátele v pohraničí';
        quest.description =
          'Vyraz do pohraničí a pobij 5 nepřátel (ghúlů nebo kostlivců), poté se vrať pro odměnu.';
      }
      quest.rewardSummary = '2× Karmínový odvar, 2× Olej do lucerny (+20 HP)';
    } else {
      quest.status = 'completed';
    }

    if (this.trackedQuestId === quest.id) {
      this.trackedQuestId = null;
      this.getTrackedQuest();
    }

    return {
      ok: true,
      message: `Úkol splněn! ${rewardLog}`,
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
            toast = `Úkol připraven k odevzdání: ${cleanse.title}!`;
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
          toast = `Úkol připraven k odevzdání: ${hunt.title}!`;
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

    inventory.addItem(
      {
        id: relic.id,
        name: relic.name,
        symbol: '*',
        category: 'loot',
        categoryLabel: 'Relikvie',
        description: relic.description,
        effectText: 'Úkolový předmět — odevzdej u úkolové tabule na startovní mýtině',
        actionLabel: 'Prohlédnout',
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
          ? `Sebrána relikvie: ${relic.name} — vrať se k úkolové tabuli!`
          : `Sebrána relikvie: ${relic.name} (${doneCount}/${relicQuest.objectives.length})`,
        questReady,
      };
    }

    return { message: `Sebrána relikvie: ${relic.name}`, questReady: false };
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

        const match = /\(([^)]+)\)/.exec(obj.label);
        markers.push({
          x: obj.targetX,
          y: obj.targetY,
          label: match ? match[1] : obj.label,
          isTurnIn: false,
        });
      }
    }

    if (hasReady) {
      markers.push({
        x: world.questGiver.x,
        y: world.questGiver.y,
        label: 'ODEVZDAT',
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
        progressLine: 'Splněno · Odevzdej u tabule [!]',
        navLine: dist <= 5 ? 'Útočiště (u tabule [E])' : `Směr: ${dir} · ~${dist} buněk`,
        isReady: true,
      };
    }

    if (quest.kind === 'hunt') {
      const obj = quest.objectives[0];
      return {
        title: quest.title,
        progressLine: `${obj.label}: ${obj.current}/${obj.target}`,
        navLine: 'Pohraničí a prokleté lokace',
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
        progressLine: `Postup: ${doneCount}/${quest.objectives.length}`,
        navLine: 'Odevzdej u úkolové tabule',
        isReady: false,
      };
    }

    const match = /\(([^)]+)\)/.exec(nearestObj.label);
    const targetName = match ? match[1] : nearestObj.label;
    const dir = compassDir(playerX, playerY, nearestObj.targetX, nearestObj.targetY);
    const dist = Math.round(nearestDist);

    return {
      title: quest.title,
      progressLine: `${targetName}: ${doneCount}/${quest.objectives.length}`,
      navLine: `Cíl: ${dir} · ~${dist} buněk`,
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

      // Keep repeatable hunt objective text matching restored completionCount
      if (targetQ.id === 'hunt-contract' && targetQ.completionCount > 0) {
        const cycle = targetQ.completionCount % 3;
        const obj = targetQ.objectives[0];
        if (cycle === 1) {
          obj.id = 'hunt-ghoul';
          obj.label = 'Zabij 5 ghúlů v pohraničí';
        } else if (cycle === 2) {
          obj.id = 'hunt-skeleton';
          obj.label = 'Zabij 5 kostlivců v pohraničí';
        }
      }

      for (const savedObj of savedQ.objectives ?? []) {
        const targetObj = targetQ.objectives.find((o) => o.id === savedObj.id) ?? targetQ.objectives[0];
        if (targetObj && targetQ.id !== 'hunt-contract') {
          targetObj.current = savedObj.current;
          targetObj.done = savedObj.done;
        } else if (targetObj && targetQ.id === 'hunt-contract') {
          targetObj.current = savedObj.current;
          targetObj.done = savedObj.done;
        }
      }
    }

    this.trackedQuestId = data.trackedQuestId ?? null;
    this.getTrackedQuest();
  }
}
