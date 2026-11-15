import { describe, expect, it } from 'vitest';
import { nutritionPerPortion } from '../../shared/nutrition';
import type { Ingredient, NevoItem, Recipe } from '../../shared/types';

const ing = (o: Partial<Ingredient> & Pick<Ingredient, 'id' | 'unit'>): Ingredient =>
  ({ name: o.id, nevoCode: null, pantry: false, aisle: 'x', search: {}, ...o });
const nevoItem = (code: number, o: Partial<NevoItem>): NevoItem =>
  ({ code, name: String(code), kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, salt: 0, ...o });

const ingredients = new Map([
  ['kip', ing({ id: 'kip', unit: 'g', nevoCode: 1 })],
  ['ui', ing({ id: 'ui', unit: 'stuk', gramsPerPiece: 100, nevoCode: 2 })],
  ['olie', ing({ id: 'olie', unit: 'ml', nevoCode: 3, pantry: true })],
  ['geheim', ing({ id: 'geheim', unit: 'g', nevoCode: null })],
]);
const nevo = new Map([
  [1, nevoItem(1, { protein: 23.1, kcal: 110 })],
  [2, nevoItem(2, { kcal: 30 })],
  [3, nevoItem(3, { kcal: 900, fat: 100 })],
]);
const recipe = (lines: Recipe['lines']): Recipe => ({ id: 'r', title: 'r', minutes: 20, tags: [], vegetarian: false, steps: [], lines });

describe('nutritionPerPortion', () => {
  it('sums grams × per-100g values and halves for 2 persons', () => {
    const n = nutritionPerPortion(recipe([{ ingredientId: 'kip', amount: 200 }]), ingredients, nevo);
    expect(n.protein).toBeCloseTo(23.1);
    expect(n.kcal).toBeCloseTo(110);
  });

  it('converts pieces with gramsPerPiece', () => {
    const n = nutritionPerPortion(recipe([{ ingredientId: 'ui', amount: 2 }]), ingredients, nevo);
    expect(n.kcal).toBeCloseTo(30);
  });

  it('counts ingredients without a NEVO code as zero', () => {
    const n = nutritionPerPortion(recipe([{ ingredientId: 'geheim', amount: 500 }]), ingredients, nevo);
    expect(n).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, salt: 0 });
  });

  it('includes pantry ingredients', () => {
    const n = nutritionPerPortion(recipe([{ ingredientId: 'olie', amount: 20 }]), ingredients, nevo);
    expect(n.fat).toBeCloseTo(10);
  });
});
