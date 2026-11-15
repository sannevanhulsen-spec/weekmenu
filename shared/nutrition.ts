import type { Ingredient, NevoItem, Nutrition, Recipe } from './types';

const DIRECT = ['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const;
/** Salt (g) = sodium (mg) × 2.5 / 1000; NEVO stores sodium unchanged. */
const SALT_PER_MG_NA = 2.5 / 1000;

/** Grams for an amount in the ingredient's unit; ml counts as g. Null when pieces cannot be weighed. */
export function gramsOf(amount: number, ing: Ingredient): number | null {
  if (ing.unit !== 'stuk') return amount;
  return ing.gramsPerPiece ? amount * ing.gramsPerPiece : null;
}

export function nutritionPerPortion(recipe: Recipe, ingredients: Map<string, Ingredient>, nevo: Map<number, NevoItem>): Nutrition {
  const total: Nutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, salt: 0 };
  for (const line of recipe.lines) {
    const ing = ingredients.get(line.ingredientId);
    const item = ing?.nevoCode != null ? nevo.get(ing.nevoCode) : undefined;
    const grams = ing ? gramsOf(line.amount, ing) : null;
    if (!item || grams == null) continue;
    for (const k of DIRECT) total[k] += (grams / 100) * item[k];
    total.salt += (grams / 100) * item.na * SALT_PER_MG_NA;
  }
  for (const k of [...DIRECT, 'salt'] as const) total[k] /= 2;
  return total;
}
