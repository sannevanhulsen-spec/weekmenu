import type { SuggestCtx } from '../../shared/suggest';
import type { AppData } from './data';
import { currentWeek, type AppState, type Week } from './db';

export function suggestCtx(data: AppData, state: AppState, today: string): SuggestCtx {
  const week = currentWeek(state);
  const previous = state.weeks.slice(0, -1).slice(-3);
  return {
    recipes: data.recipes, ingredients: data.ingredients, nevo: data.nevo, prices: data.prices, overrides: state.overrides, today,
    filters: state.filters,
    dislikedRecipes: new Set(state.dislikedRecipes),
    dislikedIngredients: new Set(state.dislikedIngredients),
    favorites: new Set(state.favorites),
    recentRecipeIds: new Set(previous.flatMap((w) => w.chosen)),
    excludeThisWeek: new Set([...(week?.chosen ?? []), ...(week?.swappedAway ?? [])]),
  };
}

/** Returns a new state with the current week changed. */
export function withWeek(state: AppState, change: (w: Week) => Week): AppState {
  const weeks = [...state.weeks];
  weeks[weeks.length - 1] = change(weeks[weeks.length - 1]);
  return { ...state, weeks };
}

export const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
