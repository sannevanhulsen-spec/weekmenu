import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nutritionPerPortion } from '../../shared/nutrition';
import type { Ingredient, NevoItem, Recipe } from '../../shared/types';

const load = <T,>(f: string): T => JSON.parse(readFileSync(new URL(`../../data/${f}`, import.meta.url), 'utf8'));
const ingredients = load<Ingredient[]>('ingredients.json');
const recipes = load<Recipe[]>('recipes.json');
const nevo = load<NevoItem[]>('nevo.json');
const ingMap = new Map(ingredients.map((i) => [i.id, i]));
const nevoMap = new Map(nevo.map((n) => [n.code, n]));
const per = (r: Recipe) => nutritionPerPortion(r, ingMap, nevoMap);

describe('data integrity', () => {
  it('every recipe line refers to a catalogue ingredient', () => {
    const missing = recipes.flatMap((r) => r.lines.filter((l) => !ingMap.has(l.ingredientId)).map((l) => `${r.id}:${l.ingredientId}`));
    expect(missing).toEqual([]);
  });
  it('every ingredient has a NEVO code that exists in nevo.json', () => {
    expect(ingredients.filter((i) => i.nevoCode == null || !nevoMap.has(i.nevoCode)).map((i) => i.id)).toEqual([]);
  });
  it('every piece ingredient has gramsPerPiece', () => {
    expect(ingredients.filter((i) => i.unit === 'stuk' && !i.gramsPerPiece).map((i) => i.id)).toEqual([]);
  });
  it('every non-pantry ingredient has Jumbo and Aldi search terms', () => {
    expect(ingredients.filter((i) => !i.pantry && (!i.search.jumbo || !i.search.aldi)).map((i) => i.id)).toEqual([]);
  });
  it('recipe ids are unique', () => {
    expect(new Set(recipes.map((r) => r.id)).size).toBe(recipes.length);
  });
  it('has at least 50 recipes with enough variety', () => {
    expect(recipes.length).toBeGreaterThanOrEqual(50);
    expect(recipes.filter((r) => r.vegetarian).length).toBeGreaterThanOrEqual(15);
    expect(recipes.filter((r) => per(r).protein >= 30).length).toBeGreaterThanOrEqual(12);
    expect(recipes.filter((r) => r.minutes <= 30).length).toBeGreaterThanOrEqual(15);
  });
  it('no recipe has more than 1200 kcal per portion', () => {
    expect(recipes.filter((r) => per(r).kcal > 1200).map((r) => `${r.id} ${Math.round(per(r).kcal)}`)).toEqual([]);
  });
});
