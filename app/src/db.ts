import { openDB } from 'idb';
import type { Overrides } from '../../shared/compare';
import type { Filters } from '../../shared/suggest';

export interface Week { id: string; startedAt: string; chosen: string[]; swappedAway: string[]; checked: string[]; declinedHints: string[] }
export interface AppState {
  weeks: Week[]; dislikedRecipes: string[]; dislikedIngredients: string[]; favorites: string[];
  filters: Filters; overrides: Overrides; includePantry: boolean; listMode: 'pair' | 'single';
}

export const defaultState = (): AppState => ({
  weeks: [], dislikedRecipes: [], dislikedIngredients: [], favorites: [],
  filters: { highProtein: false, vegetarian: false, quick: false },
  overrides: {}, includePantry: false, listMode: 'pair',
});

const db = () => openDB('weekmenu', 1, { upgrade: (d) => d.createObjectStore('state') });

export async function loadState(): Promise<AppState> {
  const saved = await (await db()).get('state', 'app');
  return { ...defaultState(), ...(saved ?? {}) };
}

export async function saveState(s: AppState): Promise<void> {
  await (await db()).put('state', s, 'app');
}

export function exportBackup(s: AppState): string {
  return JSON.stringify({ version: 1, state: s });
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStrings = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isWeek = (w: unknown) => isObj(w) && typeof w.id === 'string' && typeof w.startedAt === 'string'
  && (['chosen', 'swappedAway', 'checked', 'declinedHints'] as const).every((k) => isStrings(w[k]));
const isOverrides = (v: unknown) => isObj(v) && Object.values(v).every((byIng) => isObj(byIng)
  && Object.values(byIng).every((o) => isObj(o) && typeof o.price === 'number' && typeof o.packAmount === 'number' && typeof o.enteredAt === 'string'));

/** Parses a backup; every field present must have the right shape, missing optional fields get defaults. */
export function importBackup(json: string): AppState {
  try {
    const parsed = JSON.parse(json);
    const s = parsed?.state;
    const ok = parsed?.version === 1 && isObj(s) && Array.isArray(s.weeks) && s.weeks.every(isWeek)
      && (['dislikedRecipes', 'dislikedIngredients', 'favorites'] as const).every((k) => s[k] === undefined || isStrings(s[k]))
      && (s.filters === undefined || isObj(s.filters))
      && (s.overrides === undefined || isOverrides(s.overrides))
      && (s.includePantry === undefined || typeof s.includePantry === 'boolean')
      && (s.listMode === undefined || s.listMode === 'pair' || s.listMode === 'single');
    if (!ok) throw new Error();
    const d = defaultState();
    return { ...d, ...s, filters: { ...d.filters, ...(s.filters as object | undefined) } } as AppState;
  } catch {
    throw new Error('Ongeldig back-upbestand');
  }
}

/** The planning week in progress: the last one started. */
export const currentWeek = (s: AppState): Week | undefined => s.weeks[s.weeks.length - 1];
