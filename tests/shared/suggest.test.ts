import { describe, expect, it } from 'vitest';
import { recipePrice, suggest, type Filters, type SuggestCtx } from '../../shared/suggest';
import type { Ingredient, NevoItem, PriceFile, Product, Recipe, StoreId } from '../../shared/types';

const TODAY = '2026-11-15';
const ing = (id: string, o: Partial<Ingredient> = {}): Ingredient =>
  ({ id, name: id, unit: 'g', nevoCode: null, pantry: false, aisle: 'x', search: {}, ...o });
const ingredients = new Map([
  ['kip', ing('kip', { nevoCode: 1 })],
  ['tofu', ing('tofu', { nevoCode: 2 })],
  ['spruitjes', ing('spruitjes')],
  ['rijst', ing('rijst')],
  ['zout', ing('zout', { pantry: true })],
]);
const nevo = new Map<number, NevoItem>([
  [1, { code: 1, name: 'kip', kcal: 110, protein: 23, carbs: 0, fat: 2, fiber: 0, salt: 0.1 }],
  [2, { code: 2, name: 'tofu', kcal: 120, protein: 12, carbs: 2, fat: 7, fiber: 1, salt: 0 }],
]);
const r = (id: string, lines: Recipe['lines'], o: Partial<Recipe> = {}): Recipe =>
  ({ id, title: id, minutes: 25, tags: [], vegetarian: false, steps: [], lines, ...o });
const prod = (store: StoreId, price: number, o: Partial<Product> = {}): Product =>
  ({ store, name: 'p', packAmount: 1000, packUnit: 'g', price, ...o });
const sp = (products: Record<string, Product>) => ({ fetchedAt: TODAY, stale: false, products });
const onOffer = prod('jumbo', 8, { offer: { kind: 'price', price: 6, validFrom: '2026-11-10', validUntil: '2026-11-20', label: 'actie' } });
const prices: PriceFile = {
  generatedAt: TODAY,
  stores: { ah: sp({}), lidl: sp({}), jumbo: sp({ kip: onOffer, rijst: prod('jumbo', 2) }), aldi: sp({ kip: prod('aldi', 9), tofu: prod('aldi', 5), rijst: prod('aldi', 1.8) }) },
};
const noFilters: Filters = { highProtein: false, vegetarian: false, quick: false };
const ctx = (recipes: Recipe[], o: Partial<SuggestCtx> = {}): SuggestCtx => ({
  recipes, ingredients, nevo, prices, overrides: {}, today: TODAY, filters: noFilters,
  dislikedRecipes: new Set(), dislikedIngredients: new Set(), favorites: new Set(), recentRecipeIds: new Set(), excludeThisWeek: new Set(), ...o,
});

const kipRijst = r('kip-rijst', [{ ingredientId: 'kip', amount: 300 }, { ingredientId: 'rijst', amount: 150 }]);
const tofuRijst = r('tofu-rijst', [{ ingredientId: 'tofu', amount: 300 }, { ingredientId: 'rijst', amount: 150 }], { vegetarian: true, minutes: 40 });
const rijstSpruit = r('rijst-spruit', [{ ingredientId: 'rijst', amount: 150 }, { ingredientId: 'spruitjes', amount: 300 }], { vegetarian: true });
const ids = (rs: Recipe[]) => rs.map((x) => x.id);

describe('recipePrice', () => {
  it('sums the cheapest used cost per line, without pantry', () => {
    const withSalt = r('x', [...kipRijst.lines, { ingredientId: 'zout', amount: 5 }]);
    // kip 300 g at €6/kg = 1.80, rijst 150 g at €1.80/kg = 0.27
    expect(recipePrice(withSalt, ctx([]))).toEqual({ price: 2.07, estimated: false });
  });
  it('marks the price approximate when a line has no price anywhere', () => {
    expect(recipePrice(rijstSpruit, ctx([])).estimated).toBe(true);
  });
});

describe('suggest', () => {
  const all = [kipRijst, tofuRijst, rijstSpruit];
  it('drops disliked recipes, recipes with disliked ingredients and this week’s exclusions', () => {
    expect(ids(suggest(ctx(all, { dislikedRecipes: new Set(['kip-rijst']) }), 12))).not.toContain('kip-rijst');
    expect(ids(suggest(ctx(all, { dislikedIngredients: new Set(['spruitjes']) }), 12))).not.toContain('rijst-spruit');
    expect(ids(suggest(ctx(all, { excludeThisWeek: new Set(['tofu-rijst']) }), 12))).not.toContain('tofu-rijst');
  });
  it('applies filters', () => {
    expect(ids(suggest(ctx(all, { filters: { ...noFilters, highProtein: true } }), 12))).toEqual(['kip-rijst']);
    expect(ids(suggest(ctx(all, { filters: { ...noFilters, vegetarian: true } }), 12)).sort()).toEqual(['rijst-spruit', 'tofu-rijst']);
    expect(ids(suggest(ctx(all, { filters: { ...noFilters, quick: true } }), 12))).not.toContain('tofu-rijst');
    expect(ids(suggest(ctx(all, { filters: { ...noFilters, maxKcal: 100 } }), 12))).toEqual(['rijst-spruit']);
    // per portion: kip-rijst 1.035, tofu-rijst 0.885, rijst-spruit 0.135
    expect(ids(suggest(ctx(all, { filters: { ...noFilters, maxPricePerPortion: 0.9 } }), 12)).sort()).toEqual(['rijst-spruit', 'tofu-rijst']);
  });
  it('ranks recipes with more offers higher', () => {
    expect(ids(suggest(ctx(all), 12))[0]).toBe('kip-rijst');
  });
  it('favourites rank above equals, recent recipes below', () => {
    const a = r('a', [{ ingredientId: 'rijst', amount: 100 }]);
    const b = r('b', [{ ingredientId: 'rijst', amount: 100 }]);
    expect(ids(suggest(ctx([a, b], { favorites: new Set(['b']) }), 12))).toEqual(['b', 'a']);
    expect(ids(suggest(ctx([a, b], { recentRecipeIds: new Set(['a']) }), 12))).toEqual(['b', 'a']);
  });
  it('returns fewer than asked, without duplicates, when few recipes are left', () => {
    const out = suggest(ctx(all), 12);
    expect(out).toHaveLength(3);
    expect(new Set(ids(out)).size).toBe(3);
  });
});
