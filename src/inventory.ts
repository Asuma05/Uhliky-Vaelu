import type { InventoryItem } from './types';
import type { Player } from './player';

export interface ItemActionResult {
  ok: boolean;
  message: string;
}

export const OIL_FLASK_TEMPLATE: Omit<InventoryItem, 'quantity'> = {
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
};

export const HEALING_HERBS_TEMPLATE: Omit<InventoryItem, 'quantity'> = {
  id: 'healing-herbs',
  name: 'Léčivé byliny z Vaelu',
  symbol: '"',
  category: 'consumable',
  categoryLabel: 'Elixír',
  description:
    'Svazek sušených horských bylin a popelavého mechu, převázaný konopnou nití. Rychle tiší bolest a zaceluje rány.',
  effectText: 'Obnoví +45 Zdraví (HP) · Spotřebuje 1 ks',
  actionLabel: 'Použít',
  healAmount: 45,
};

export const EMBER_SHARD_TEMPLATE: Omit<InventoryItem, 'quantity'> = {
  id: 'ember-shard',
  name: 'Žhavý uhlík',
  symbol: '*',
  category: 'loot',
  categoryLabel: 'Surovina',
  description:
    'Tlející krystal popelavého jádra, jenž si uchovává jiskru dávných výhní. Poutníci za něj směňují zásoby.',
  effectText: 'Cenná surovina pro směnu u pocestných',
  actionLabel: 'Prohlédnout',
};

export const RELIC_IRON_HEARTH: Omit<InventoryItem, 'quantity'> = {
  id: 'relic-iron-hearth',
  name: 'Srdce železné výhně',
  symbol: 'Ω',
  category: 'relic',
  categoryLabel: 'Relikvie Vaelu',
  description:
    'Těžký železný medailon s věčně žhavým uhlíkem z Kael’Varru. Zpevňuje zbroj a zpomaluje spotřebu oleje.',
  effectText: 'Pasivní: +35 % výdrže oleje · -22 % utrpěného poškození',
  actionLabel: 'Sundat',
  equipable: true,
  equipped: true,
  oilEfficiencyBonus: 0.35,
  damageReductionBonus: 0.22,
};

export const RELIC_MIRE_ALEMBIC: Omit<InventoryItem, 'quantity'> = {
  id: 'relic-mire-alembic',
  name: 'Alchymistický destilátor z hlubin',
  symbol: 'δ',
  category: 'relic',
  categoryLabel: 'Relikvie Vaelu',
  description:
    'Křivule ze Siltmooru naplněná světélkujícím bahenním výtažkem. Dodává tělu neúnavný dech a šetří olej.',
  effectText: 'Pasivní: +45 % regenerace výdrže · +20 % výdrže oleje',
  actionLabel: 'Sundat',
  equipable: true,
  equipped: true,
  staminaRegenBonus: 0.45,
  oilEfficiencyBonus: 0.2,
};

export const RELIC_OLD_LIGHT: Omit<InventoryItem, 'quantity'> = {
  id: 'relic-old-light',
  name: 'Relikvie starého světla',
  symbol: '✦',
  category: 'relic',
  categoryLabel: 'Relikvie Vaelu',
  description:
    'Posvátný sluneční prstenec z Bílého relikviáře Aethelgardu. Rozšiřuje svit lucerny a odhaluje skryté nepřátele v temnotě.',
  effectText: 'Pasivní: +45 % dosahu lucerny · Odhaluje nepřátele v temnotě',
  actionLabel: 'Sundat',
  equipable: true,
  equipped: true,
  lanternRangeBonus: 0.45,
  revealsEnemiesInDark: true,
};

export const CRUDE_COAL_OIL_TEMPLATE: Omit<InventoryItem, 'quantity'> = {
  id: 'crude-coal-oil',
  name: 'Surový uhelný olej',
  symbol: 'o',
  category: 'consumable',
  categoryLabel: 'Palivo',
  description: 'Hustý hořlavý olej z kováren Kael’Varru. Hoří sytým oranžovým plamenem.',
  effectText: 'Doplní +70 Oleje do lucerny · Spotřebuje 1 ks',
  actionLabel: 'Dolít',
  oilAmount: 70,
};

export const MIRE_ELIXIR_TEMPLATE: Omit<InventoryItem, 'quantity'> = {
  id: 'mire-elixir',
  name: 'Bahenní elixír regenerace',
  symbol: '!',
  category: 'consumable',
  categoryLabel: 'Elixír',
  description: 'Čirý zelenkavý destilát ze vzácných bažinných bylin Siltmooru.',
  effectText: 'Obnoví +55 Zdraví (HP) · Spotřebuje 1 ks',
  actionLabel: 'Vypít',
  healAmount: 55,
};

export const LORE_WHITE_RELIQUARY_TEMPLATE: Omit<InventoryItem, 'quantity'> = {
  id: 'lore-white-reliquary',
  name: 'Kronika bílého relikviáře',
  symbol: '?',
  category: 'lore',
  categoryLabel: 'Vzácný svitek',
  description:
    'Bledý pergamen se zlatou pečetí Aethelgardu, popisující poslední dny tří velkých měst Vaelu.',
  effectText: 'Obsahuje záznam o pádu Kael’Varru, Siltmooru a Aethelgardu',
  actionLabel: 'Přečíst',
  loreText:
    '„Kael’Varr ukoval poslední brány, Siltmoor utopil své poklady v bažinách a Aethelgard zapečetil světlo před přílivem tmy.“',
};

export class Inventory {
  private readonly items: InventoryItem[];
  private selectedIndex = 0;
  private readonly newItemIds = new Set<string>();

  constructor() {
    this.items = [
      {
        id: 'rusted-fang',
        name: 'Zrezivělý tesák',
        symbol: '/',
        category: 'weapon',
        categoryLabel: 'Zbraň',
        description:
          'Oprýskaná krátká čepel nalezená v popelu staré hlásky. Rez jí vzala lesk, ne však hlad po krvi.',
        effectText: '+4 k útoku · Jednoruční zbraň (lze nasadit)',
        actionLabel: 'Nasadit',
        quantity: 1,
        equipable: true,
        equipped: false,
        attackBonus: 4,
      },
      {
        id: 'crimson-draught',
        name: 'Lahvička karmínového odvaru',
        symbol: '!',
        category: 'consumable',
        categoryLabel: 'Elixír',
        description:
          'Hustá trpká tekutina v zakaleném skle. Na okamžik zažene lezavý chlad z kostí a scelí rány.',
        effectText: 'Obnoví +35 Zdraví (HP) · Spotřebuje 1 ks',
        actionLabel: 'Vypít',
        quantity: 2,
        healAmount: 35,
      },
      {
        id: 'old-parchment',
        name: 'Starý pergamen',
        symbol: '?',
        category: 'lore',
        categoryLabel: 'Zápis',
        description:
          'Zčernalý svitek svázaný hrubou nití. Okraje jsou ožehnuté a písmo se třese spěchem.',
        effectText: 'Obsahuje zašlý vzkaz o severních ruinách',
        actionLabel: 'Přečíst',
        quantity: 1,
        loreText:
          '„Pod severním obloukem spí popel, který nezapomíná. Nevstupuj do průchodu bez plamene.“',
      },
      {
        id: 'dying-torch',
        name: 'Dohořívající pochodeň',
        symbol: 'i',
        category: 'light',
        categoryLabel: 'Světlo',
        description:
          'Smolná hůl omotaná zetlelým suknem. Její slabý jantarový plamen rozhání nejhlubší šero.',
        effectText: 'Po zapálení zesílí dosvit nebo poslouží bez lucerny',
        actionLabel: 'Zapálit',
        quantity: 1,
        equipable: true,
        equipped: false,
      },
      {
        ...OIL_FLASK_TEMPLATE,
        quantity: 2,
      },
      {
        ...EMBER_SHARD_TEMPLATE,
        quantity: 3,
      },
    ];
    this.sortByCategoryGroup();
  }

  private static getCategoryOrder(category: InventoryItem['category']): number {
    if (category === 'weapon') return 0;
    if (category === 'light') return 1;
    if (category === 'relic') return 2;
    if (category === 'consumable') return 3;
    if (category === 'lore') return 4;
    return 5;
  }

  private sortByCategoryGroup(): void {
    const selectedId = this.items[this.selectedIndex]?.id;
    this.items.sort(
      (a, b) => Inventory.getCategoryOrder(a.category) - Inventory.getCategoryOrder(b.category)
    );
    if (selectedId) {
      const nextIdx = this.items.findIndex((it) => it.id === selectedId);
      if (nextIdx !== -1) this.selectedIndex = nextIdx;
    }
  }

  public getItems(): readonly InventoryItem[] {
    return this.items;
  }

  public serialize(): InventoryItem[] {
    return this.items.map((item) => ({ ...item }));
  }

  public restore(savedItems: InventoryItem[]): void {
    this.items.length = 0;
    this.newItemIds.clear();
    for (const item of savedItems) {
      this.items.push({ ...item });
    }
    this.sortByCategoryGroup();
    this.selectedIndex = 0;
  }

  public isItemNew(id: string): boolean {
    return this.newItemIds.has(id);
  }

  public hasNewItems(): boolean {
    return this.newItemIds.size > 0;
  }

  public markItemSeen(id: string): void {
    this.newItemIds.delete(id);
  }

  public clearAllNewItems(): void {
    this.newItemIds.clear();
  }

  public getSelectedIndex(): number {
    return this.selectedIndex;
  }

  public getSelectedItem(): InventoryItem | null {
    if (this.items.length === 0) return null;
    const clamped = Math.max(0, Math.min(this.selectedIndex, this.items.length - 1));
    return this.items[clamped] ?? null;
  }

  public select(index: number): void {
    if (this.items.length === 0) {
      this.selectedIndex = 0;
      return;
    }
    this.selectedIndex = ((index % this.items.length) + this.items.length) % this.items.length;
    const selected = this.items[this.selectedIndex];
    if (selected) {
      this.newItemIds.delete(selected.id);
    }
  }

  public moveSelection(delta: number): void {
    this.select(this.selectedIndex + delta);
  }

  /** Adds looted items to the backpack, stacking identical item IDs. */
  public addItem(template: Omit<InventoryItem, 'quantity'>, quantity = 1): void {
    const existing = this.items.find((it) => it.id === template.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({ ...template, quantity });
      this.sortByCategoryGroup();
    }
    if (quantity > 0) {
      this.newItemIds.add(template.id);
    }
  }

  public countItem(id: string): number {
    const existing = this.items.find((it) => it.id === id);
    return existing ? existing.quantity : 0;
  }

  public removeItem(id: string, quantity = 1): boolean {
    const idx = this.items.findIndex((it) => it.id === id);
    if (idx === -1) return false;
    const item = this.items[idx];
    if (item.quantity < quantity) return false;
    item.quantity -= quantity;
    if (item.quantity <= 0) {
      this.items.splice(idx, 1);
      if (this.selectedIndex >= this.items.length) {
        this.selectedIndex = Math.max(0, this.items.length - 1);
      }
    }
    return true;
  }

  public findFirstTradable(acceptedIds: readonly string[]): InventoryItem | null {
    for (let i = 0; i < acceptedIds.length; i++) {
      const found = this.items.find((it) => it.id === acceptedIds[i] && it.quantity > 0);
      if (found) return found;
    }
    return null;
  }

  public getActionLabel(item: InventoryItem): string {
    if (item.category === 'relic') {
      return item.equipped !== false ? 'Sundat' : 'Nasadit';
    }
    if (item.equipable) {
      if (item.category === 'light') {
        return item.equipped ? 'Uhasit' : 'Zapálit';
      }
      return item.equipped ? 'Sundat' : 'Nasadit';
    }
    return item.actionLabel;
  }

  public useSelectedItem(player: Player): ItemActionResult {
    const item = this.getSelectedItem();
    if (!item) {
      return { ok: false, message: 'Batoh je prázdný.' };
    }

    if (item.category === 'consumable' && item.healAmount) {
      if (player.hp >= player.maxHp) {
        return {
          ok: false,
          message: 'Zdraví je již plné — odvar není třeba plýtvat.',
        };
      }
      const healed = player.heal(item.healAmount);
      const buffName =
        item.id === 'healing-herbs'
          ? 'Účinek léčivých bylin'
          : item.id === 'mire-elixir'
            ? 'Bahenní vitalita'
            : 'Síla karmínového odvaru';
      const duration = item.id === 'mire-elixir' ? 18 : 15;
      player.addOrRefreshEffect({
        id: 'elixir-regen',
        name: buffName,
        description: '+1.5 HP/s · +15 % regenerace výdrže',
        kind: 'buff',
        remainingSeconds: duration,
        durationSeconds: duration,
        hpRegenPerSec: 1.5,
        staminaRegenBonus: 0.15,
      });
      item.quantity -= 1;
      if (item.quantity <= 0) {
        this.items.splice(this.selectedIndex, 1);
        if (this.selectedIndex >= this.items.length) {
          this.selectedIndex = Math.max(0, this.items.length - 1);
        }
      }
      return {
        ok: true,
        message: `Použil jsi ${item.name.toLowerCase()} (+${healed} HP).`,
      };
    }

    if (item.category === 'consumable' && item.oilAmount) {
      if (player.oil >= player.maxOil) {
        return {
          ok: false,
          message: 'Nádržka lucerny je již plná oleje.',
        };
      }
      const refilled = player.refillOil(item.oilAmount);
      item.quantity -= 1;
      if (item.quantity <= 0) {
        this.items.splice(this.selectedIndex, 1);
        if (this.selectedIndex >= this.items.length) {
          this.selectedIndex = Math.max(0, this.items.length - 1);
        }
      }
      return {
        ok: true,
        message: `Dolil jsi olej do lucerny (+${refilled} oleje).`,
      };
    }

    if (item.category === 'relic') {
      const nextState = item.equipped === false;
      item.equipped = nextState;
      player.syncRelicBonuses(this);
      return {
        ok: true,
        message: nextState
          ? `Nasadil jsi relikvii ${item.name}. ${item.effectText}`
          : `Sundal jsi relikvii ${item.name}. Její pasivní bonus byl pozastaven.`,
      };
    }

    if (item.equipable) {
      const nextState = !item.equipped;
      // Unequip other items of the same slot/category
      for (const other of this.items) {
        if (other !== item && other.category === item.category) {
          other.equipped = false;
        }
      }
      item.equipped = nextState;

      if (item.category === 'light') {
        player.hasTorchLit = nextState;
        return {
          ok: true,
          message: nextState
            ? `Zapálil jsi ${item.name.toLowerCase()}. Okolí ozářil slabý plamen.`
            : `Uhasil jsi ${item.name.toLowerCase()}. Tma se opět přiblížila.`,
        };
      }

      if (item.category === 'weapon') {
        player.equippedWeapon = nextState ? item.name : null;
        player.weaponAttackBonus = nextState ? (item.attackBonus ?? 0) : 0;
        return {
          ok: true,
          message: nextState
            ? `Nasadil jsi ${item.name} (+${item.attackBonus ?? 0} útok).`
            : `Uložil jsi ${item.name} zpět do batohu.`,
        };
      }
    }

    if (item.category === 'loot') {
      return {
        ok: true,
        message: `Prohlédl sis ${item.name.toLowerCase()} — temná trofej z padlého nepřítele.`,
      };
    }

    if (item.category === 'lore' && item.loreText) {
      return {
        ok: true,
        message: item.loreText,
      };
    }

    return { ok: false, message: `Předmět ${item.name} nelze použít.` };
  }
}
