import type { SaveData } from './types';

const SAVE_STORAGE_KEY = 'ashen_ascii_rpg_save_v2';
const SAVE_VERSION = 2;

const SEED_PREFIXES = ['ASH', 'GRIM', 'MIST', 'RUIN', 'CIND', 'BONE', 'DUSK', 'MOOR'] as const;

/** Generates a readable dark-fantasy random seed like ASH-8492 */
export function generateRandomSeed(): string {
  const prefix = SEED_PREFIXES[Math.floor(Math.random() * SEED_PREFIXES.length)];
  const num = 1000 + Math.floor(Math.random() * 9000);
  return `${prefix}-${num}`;
}

/** Normalizes user-entered seeds cleanly */
export function normalizeSeed(raw: string): string {
  const trimmed = raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  return trimmed.length > 0 ? trimmed.slice(0, 20) : generateRandomSeed();
}

/** Deterministic 32-bit FNV-1a string hash for seeding PRNG & 2D noise */
export function hashSeedToUint32(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // Extra avalanche mixing so similar seeds (e.g. ASH-1001 vs ASH-1002) diverge completely
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) || 0x9e3779b9;
}

export function hasSavedGame(): boolean {
  try {
    return window.localStorage.getItem(SAVE_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function loadSavedGame(): SaveData | null {
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (
      !parsed ||
      parsed.version !== SAVE_VERSION ||
      typeof parsed.seed !== 'string' ||
      !parsed.player ||
      !Array.isArray(parsed.inventory) ||
      !Array.isArray(parsed.exploredChunks)
    ) {
      return null;
    }
    return parsed as SaveData;
  } catch {
    return null;
  }
}

export function writeSavedGame(data: Omit<SaveData, 'version' | 'savedAt'>): boolean {
  try {
    const payload: SaveData = {
      ...data,
      version: SAVE_VERSION,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function formatSaveTime(timestamp: number): string {
  try {
    const d = new Date(timestamp);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mo}. ${hh}:${mm}`;
  } catch {
    return '';
  }
}
