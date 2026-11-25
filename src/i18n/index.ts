import type {
  ActiveStatusEffect,
  BiomeKind,
  CityBossArchetype,
  EnemyKind,
  PoiKind,
  TravelerRole,
  WeatherKind,
} from '../types';
import { cs, type TranslationDictionary, type TranslationKey } from './cs';
import { en } from './en';

export type Language = 'cs' | 'en';
export type { TranslationKey, TranslationDictionary };

const LANG_STORAGE_KEY = 'uhliky_vaelu_lang';

const DICTIONARIES: Record<Language, TranslationDictionary> = { cs, en };

const TITLE_LOGOS: Record<Language, string> = {
  cs: String.raw`
 _   _ _   _ _     ___ _  ____   __  __     ___    _____ _     _   _ 
| | | | | | | |   |_ _| |/ /\ \ / /  \ \   / / \  | ____| |   | | | |
| | | | |_| | |    | || ' /  \ V /    \ \ / / _ \ |  _| | |   | | | |
| |_| |  _  | |___ | || . \   | |      \ V / ___ \| |___| |___| |_| |
 \___/|_| |_|_____|___|_|\_\  |_|       \_/_/   \_\_____|_____|\___/ 
`.replace(/^\n|\n$/g, ''),
  en: String.raw`
  ____ ___ _   _ ____  _____ ____  ____     ___  _____   __     ___    _____ _     
 / ___|_ _| \ | |  _ \| ____|  _ \/ ___|   / _ \|  ___|  \ \   / / \  | ____| |    
| |    | ||  \| | | | |  _| | |_) \___ \  | | | | |_      \ \ / / _ \ |  _| | |    
| |___ | || |\  | |_| | |___|  _ < ___) | | |_| |  _|      \ V / ___ \| |___| |___ 
 \____|___|_| \_|____/|_____|_| \_\____/   \___/|_|         \_/_/   \_\_____|_____|
`.replace(/^\n|\n$/g, ''),
};

type LanguageListener = (lang: Language) => void;
const listeners = new Set<LanguageListener>();

function loadInitialLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === 'en' || stored === 'cs') {
      return stored;
    }
  } catch {
    // Ignore storage errors (e.g. restricted sandbox)
  }
  return 'cs';
}

let currentLanguage: Language = loadInitialLanguage();

function syncDocumentMetadata(lang: Language): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.title = DICTIONARIES[lang]['app.title'];
}

syncDocumentMetadata(currentLanguage);

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(lang: Language): void {
  if (lang !== 'cs' && lang !== 'en') return;
  if (lang === currentLanguage) {
    syncDocumentMetadata(lang);
    return;
  }
  currentLanguage = lang;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Ignore storage errors
  }
  syncDocumentMetadata(lang);
  for (const cb of listeners) {
    cb(lang);
  }
}

export function toggleLanguage(): Language {
  const next: Language = currentLanguage === 'cs' ? 'en' : 'cs';
  setLanguage(next);
  return next;
}

export function onLanguageChange(listener: LanguageListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const dict = DICTIONARIES[currentLanguage];
  let text = dict[key] ?? cs[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function getTitleAsciiLogo(): string {
  return TITLE_LOGOS[currentLanguage];
}

export function getWeatherLabel(weather: WeatherKind): string {
  return t(`weather.${weather}` as TranslationKey);
}

export function getBiomeName(biome: BiomeKind): string {
  return t(`biome.${biome}` as TranslationKey);
}

export function getBiomeWarning(biome: BiomeKind): string {
  return t(`npc.warn.${biome}` as TranslationKey);
}

export function getPoiName(poiId: PoiKind): string {
  return t(`poi.${poiId}.name` as TranslationKey);
}

export function getPoiShortLabel(poiId: PoiKind): string {
  return t(`poi.${poiId}.short` as TranslationKey);
}

export function getBossTitle(poiId: PoiKind): string {
  return t(`boss.${poiId}` as TranslationKey);
}

export function getEnemyDisplayName(opts: {
  kind: EnemyKind;
  tier: number;
  isBoss: boolean;
  bossPoiId?: PoiKind;
  archetype?: CityBossArchetype;
}): string {
  if (opts.archetype === 'iron_founder') return t('boss.city_kaelvarr');
  if (opts.archetype === 'mire_alchemist') return t('boss.city_siltmoor');
  if (opts.archetype === 'last_inquisitor') return t('boss.city_aethelgard');
  if (opts.isBoss) {
    if (opts.bossPoiId) return getBossTitle(opts.bossPoiId);
    return opts.kind === 'ghoul' ? t('enemy.boss_ghoul_fallback') : t('enemy.boss_skeleton_fallback');
  }
  const clampedTier = Math.max(1, Math.min(6, opts.tier));
  const veteran = clampedTier >= 2;
  const elite = clampedTier >= 4;
  if (opts.kind === 'ghoul') {
    return elite ? t('enemy.ghoul_elite') : veteran ? t('enemy.ghoul_veteran') : t('enemy.ghoul');
  }
  return elite
    ? t('enemy.skeleton_elite')
    : veteran
      ? t('enemy.skeleton_veteran')
      : t('enemy.skeleton');
}

const KNOWN_ITEM_IDS = new Set([
  'rusted-fang',
  'steel-guard-sword',
  'crimson-draught',
  'old-parchment',
  'dying-torch',
  'lantern-oil-flask',
  'healing-herbs',
  'ember-shard',
  'relic-iron-hearth',
  'relic-mire-alembic',
  'relic-old-light',
  'crude-coal-oil',
  'mire-elixir',
  'lore-white-reliquary',
  'ghoul-claw',
  'ancient-bone-shard',
  'ashen-chalice',
  'relic-chalice',
  'relic-key',
  'relic-medallion',
]);

export function getItemName(item: { id: string; name: string }): string {
  if (KNOWN_ITEM_IDS.has(item.id)) {
    return t(`item.${item.id}.name` as TranslationKey);
  }
  return item.name;
}

export function getItemCategoryLabel(item: { id: string; categoryLabel: string }): string {
  if (KNOWN_ITEM_IDS.has(item.id)) {
    return t(`item.${item.id}.cat` as TranslationKey);
  }
  return item.categoryLabel;
}

export function getItemDescription(item: { id: string; description: string }): string {
  if (KNOWN_ITEM_IDS.has(item.id)) {
    return t(`item.${item.id}.desc` as TranslationKey);
  }
  return item.description;
}

export function getItemEffectText(item: { id: string; effectText: string }): string {
  if (KNOWN_ITEM_IDS.has(item.id)) {
    return t(`item.${item.id}.effect` as TranslationKey);
  }
  return item.effectText;
}

export function getItemLoreText(item: { id: string; loreText?: string }): string | undefined {
  if (item.id === 'old-parchment' || item.id === 'lore-white-reliquary') {
    return t(`item.${item.id}.lore` as TranslationKey);
  }
  return item.loreText;
}

export function getTravelerName(role: TravelerRole): string {
  return t(`npc.role.${role}.name` as TranslationKey);
}

export function getTravelerTitle(role: TravelerRole): string {
  return t(`npc.role.${role}.title` as TranslationKey);
}

export function getTravelerGreetings(role: TravelerRole): readonly string[] {
  return [
    t(`npc.${role}.greet.0` as TranslationKey),
    t(`npc.${role}.greet.1` as TranslationKey),
    t(`npc.${role}.greet.2` as TranslationKey),
  ];
}

export function getTravelerHistory(role: TravelerRole): readonly string[] {
  return [
    t(`npc.${role}.history.0` as TranslationKey),
    t(`npc.${role}.history.1` as TranslationKey),
    t(`npc.${role}.history.2` as TranslationKey),
  ];
}

export function getTravelerSurvival(role: TravelerRole): readonly string[] {
  return [
    t(`npc.${role}.survival.0` as TranslationKey),
    t(`npc.${role}.survival.1` as TranslationKey),
    t(`npc.${role}.survival.2` as TranslationKey),
  ];
}

export function getTravelerFarewells(role: TravelerRole): readonly string[] {
  return [
    t(`npc.${role}.farewell.0` as TranslationKey),
    t(`npc.${role}.farewell.1` as TranslationKey),
  ];
}

export function getStatusEffectDisplay(effect: ActiveStatusEffect): {
  name: string;
  description: string;
} {
  if (effect.id === 'wet') {
    return { name: t('buff.wet.name'), description: t('buff.wet.desc') };
  }
  if (effect.id === 'warmed') {
    return { name: t('buff.warmed.name'), description: t('buff.warmed.desc') };
  }
  if (effect.id === 'elixir-regen') {
    if (effect.sourceItemId === 'healing-herbs') {
      return { name: t('buff.elixir.herbs.name'), description: t('buff.elixir.desc') };
    }
    if (effect.sourceItemId === 'mire-elixir') {
      return { name: t('buff.elixir.mire.name'), description: t('buff.elixir.desc') };
    }
    return { name: t('buff.elixir.crimson.name'), description: t('buff.elixir.desc') };
  }
  return { name: effect.name, description: effect.description };
}
