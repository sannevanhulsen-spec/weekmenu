import { realProduct, type Overrides } from './compare';
import { nutritionPerPortion } from './nutrition';
import { activeOffer, toProductUnits, usedCost } from './pricing';
import { STORES, type Ingredient, type NevoItem, type PriceFile, type Recipe } from './types';

export interface Filters { highProtein: boolean; maxKcal?: number; vegetarian: boolean; quick: boolean; maxPricePerPortion?: number }
export interface SuggestCtx {
  recipes: Recipe[]; ingredients: Map<string, Ingredient>; nevo: Map<number, NevoItem>; prices: PriceFile; overrides: Overrides; today: string;
  filters: Filters; dislikedRecipes: Set<string>; dislikedIngredients: Set<string>; favorites: Set<string>;
  /** chosen in the last 3 planning weeks */
  recentRecipeIds: Set<string>;
  /** already chosen or swapped away this week */
  excludeThisWeek: Set<string>;
}

export const HIGH_PROTEIN_G = 30;
export const QUICK_MINUTES = 30;

const nonPantry = (r: Recipe, ctx: SuggestCtx) =>
  r.lines.flatMap((l) => { const ing = ctx.ingredients.get(l.ingredientId); return ing && !ing.pantry ? [{ line: l, ing }] : []; });

/** Price for 2 persons of the used amounts, cheapest real store per line. Approximate when a line has no price. */
export function recipePrice(r: Recipe, ctx: SuggestCtx): { price: number; estimated: boolean } {
  let price = 0;
  let estimated = false;
  for (const { line, ing } of nonPantry(r, ctx)) {
    const costs = STORES.flatMap((s) => {
      const p = realProduct(s, ing, ctx.prices, ctx.overrides);
      const needed = p && toProductUnits(line.amount, ing, p);
      return p && needed != null ? [usedCost(p, needed, ctx.today)] : [];
    });
    if (costs.length) price += Math.min(...costs); else estimated = true;
  }
  return { price: Math.round(price * 100) / 100, estimated };
}

function offerShare(r: Recipe, ctx: SuggestCtx): number {
  const lines = nonPantry(r, ctx);
  if (!lines.length) return 0;
  const withOffer = lines.filter(({ ing }) => STORES.some((s) => {
    const p = ctx.prices.stores[s]?.products[ing.id];
    return p && activeOffer(p, ctx.today);
  }));
  return withOffer.length / lines.length;
}

function passes(r: Recipe, ctx: SuggestCtx): boolean {
  const f = ctx.filters;
  if (ctx.dislikedRecipes.has(r.id) || ctx.excludeThisWeek.has(r.id)) return false;
  if (r.lines.some((l) => ctx.dislikedIngredients.has(l.ingredientId))) return false;
  if (f.vegetarian && !r.vegetarian) return false;
  if (f.quick && r.minutes > QUICK_MINUTES) return false;
  if (f.highProtein || f.maxKcal != null) {
    const n = nutritionPerPortion(r, ctx.ingredients, ctx.nevo);
    if (f.highProtein && n.protein < HIGH_PROTEIN_G) return false;
    if (f.maxKcal != null && n.kcal > f.maxKcal) return false;
  }
  if (f.maxPricePerPortion != null && recipePrice(r, ctx).price / 2 > f.maxPricePerPortion) return false;
  return true;
}

export function suggest(ctx: SuggestCtx, count: number): Recipe[] {
  const score = (r: Recipe) => offerShare(r, ctx) + (ctx.favorites.has(r.id) ? 0.2 : 0) - (ctx.recentRecipeIds.has(r.id) ? 0.5 : 0);
  return ctx.recipes
    .filter((r) => passes(r, ctx))
    .map((r) => ({ r, s: score(r) }))
    .sort((a, b) => b.s - a.s || a.r.id.localeCompare(b.r.id))
    .slice(0, count)
    .map((x) => x.r);
}
