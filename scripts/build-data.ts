// Builds data/ingredients.json and data/recipes.json from scripts/data-src.ts.
// NEVO codes come from data/nevo-codes.json ({ ingredientId: code }), written by scripts/build-nevo.ts.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { Ingredient, Recipe } from '../shared/types';
import { INGREDIENTS, RECIPES } from './data-src';

const codes: Record<string, number> = existsSync('data/nevo-codes.json') ? JSON.parse(readFileSync('data/nevo-codes.json', 'utf8')) : {};

const ingredients: Ingredient[] = INGREDIENTS.map((i) => ({
  id: i.id, name: i.name, unit: i.unit, ...(i.gpp && { gramsPerPiece: i.gpp }),
  nevoCode: codes[i.id] ?? null, pantry: !!i.pantry, aisle: i.aisle,
  search: { jumbo: i.s, aldi: i.aldi ?? i.s },
}));

const recipes: Recipe[] = RECIPES.map((r) => ({
  id: r.id, title: r.title, minutes: r.min, tags: r.tags, vegetarian: !!r.veg, steps: r.steps,
  lines: r.lines.trim().split(/\s+/).map((pair) => {
    const [ingredientId, amount] = pair.split(':');
    return { ingredientId, amount: Number(amount) };
  }),
}));

writeFileSync('data/ingredients.json', JSON.stringify(ingredients, null, 1));
writeFileSync('data/recipes.json', JSON.stringify(recipes, null, 1));
console.log(`${ingredients.length} ingrediënten, ${recipes.length} recepten, ${Object.keys(codes).length} NEVO-codes`);
