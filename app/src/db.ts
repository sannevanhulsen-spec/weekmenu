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

export function importBackup(json: string): AppState {
  try {
    const parsed = JSON.parse(json);
    if (parsed?.version !== 1 || typeof parsed.state !== 'object' || !Array.isArray(parsed.state.weeks)) throw new Error();
    return { ...defaultState(), ...parsed.state };
  } catch {
    throw new Error('Ongeldig back-upbestand');
  }
}

/** The planning week in progress: the last one started. */
export const currentWeek = (s: AppState): Week | undefined => s.weeks[s.weeks.length - 1];
