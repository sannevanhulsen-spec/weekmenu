import { describe, expect, it } from 'vitest';
import { buildList, compareStores, type Overrides } from '../../shared/compare';
import type { Ingredient, PriceFile, Product, Recipe, StoreId, StorePrices } from '../../shared/types';

const TODAY = '2026-11-15';
const ing = (id: string, o: Partial<Ingredient> = {}): Ingredient =>
  ({ id, name: id, unit: 'g', nevoCode: null, pantry: false, aisle: 'x', search: {}, ...o });
const ingredients = new Map([
  ['kipfilet', ing('kipfilet')],
  ['ui', ing('ui', { unit: 'stuk', gramsPerPiece: 100 })],
  ['olie', ing('olie', { unit: 'ml', pantry: true })],
  ['saffraan', ing('saffraan')],
]);
const recipe = (id: string, lines: Recipe['lines']): Recipe => ({ id, title: id, minutes: 20, tags: [], vegetarian: false, steps: [], lines });
const prod = (store: StoreId, price: number, o: Partial<Product> = {}): Product =>
  ({ store, name: `${store}-p`, packAmount: 500, packUnit: 'g', price, ...o });
const storePrices = (products: Record<string, Product>): StorePrices => ({ fetchedAt: TODAY, stale: false, products });
const priceFile = (s: Partial<Record<StoreId, Record<string, Product>>>): PriceFile => ({
  generatedAt: TODAY,
  stores: { ah: storePrices(s.ah ?? {}), jumbo: storePrices(s.jumbo ?? {}), aldi: storePrices(s.aldi ?? {}), lidl: storePrices(s.lidl ?? {}) },
});

describe('buildList', () => {
  const recipes = [
    recipe('a', [{ ingredientId: 'kipfilet', amount: 300 }, { ingredientId: 'olie', amount: 20 }]),
    recipe('b', [{ ingredientId: 'kipfilet', amount: 200 }, { ingredientId: 'ui', amount: 2 }]),
  ];
  it('sums the same ingredient across recipes', () => {
    expect(buildList(recipes, ingredients, false)).toEqual([
      { ingredientId: 'kipfilet', amount: 500 },
      { ingredientId: 'ui', amount: 2 },
    ]);
  });
  it('includes pantry items only when asked', () => {
    expect(buildList(recipes, ingredients, true).map((l) => l.ingredientId)).toContain('olie');
  });
});

describe('compareStores', () => {
  const list = [{ ingredientId: 'kipfilet', amount: 500 }, { ingredientId: 'ui', amount: 4 }];
  const prices = priceFile({
    ah: { kipfilet: prod('ah', 5) },
    jumbo: { kipfilet: prod('jumbo', 6), ui: prod('jumbo', 1.5, { packAmount: 1000 }) },
    aldi: { kipfilet: prod('aldi', 5.5), ui: prod('aldi', 1, { packAmount: 1000 }) },
  });

  it('returns 4 singles and 6 pairs', () => {
    const r = compareStores(list, ingredients, prices, {}, TODAY);
    expect(r.all.filter((o) => o.stores.length === 1)).toHaveLength(4);
    expect(r.all.filter((o) => o.stores.length === 2)).toHaveLength(6);
  });

  it('gives each line to the cheaper store of a pair', () => {
    const r = compareStores(list, ingredients, prices, {}, TODAY);
    const ahAldi = r.all.find((o) => o.stores.join() === 'ah,aldi')!;
    expect(ahAldi.picks.map((p) => [p.ingredientId, p.store])).toEqual([['kipfilet', 'ah'], ['ui', 'aldi']]);
    expect(ahAldi.total).toBeCloseTo(6);
  });

  it('estimates a missing price from the cheapest other store, and the real price wins a tie', () => {
    const r = compareStores(list, ingredients, prices, {}, TODAY);
    const lidl = r.all.find((o) => o.stores.join() === 'lidl')!;
    const kip = lidl.picks.find((p) => p.ingredientId === 'kipfilet')!;
    expect(kip).toMatchObject({ store: 'lidl', estimated: true, cost: 5 });
    expect(lidl.estimatedCount).toBe(2);
    const ahLidl = r.all.find((o) => o.stores.join() === 'ah,lidl')!;
    expect(ahLidl.picks.find((p) => p.ingredientId === 'kipfilet')).toMatchObject({ store: 'ah', estimated: false });
  });

  it('never lets a cheaper estimate beat a real price inside a pair', () => {
    const r = compareStores(list, ingredients, prices, {}, TODAY);
    const jumboLidl = r.all.find((o) => o.stores.join() === 'jumbo,lidl')!;
    expect(jumboLidl.picks.every((p) => p.store === 'jumbo' && !p.estimated)).toBe(true);
  });

  it('never ranks an option with estimates above a fully real option', () => {
    const r = compareStores(list, ingredients, prices, {}, TODAY);
    expect(r.bestSingle.stores).toEqual(['aldi']);
    expect(r.bestSingle.estimatedCount).toBe(0);
    expect(r.bestPair.estimatedCount).toBe(0);
  });

  it('treats a user-entered price as real', () => {
    const overrides: Overrides = { lidl: { kipfilet: { price: 4.5, packAmount: 500, enteredAt: TODAY } } };
    const r = compareStores(list, ingredients, prices, overrides, TODAY);
    const ahLidl = r.all.find((o) => o.stores.join() === 'ah,lidl')!;
    expect(ahLidl.picks.find((p) => p.ingredientId === 'kipfilet')).toMatchObject({ store: 'lidl', estimated: false, cost: 4.5 });
  });

  it('leaves an ingredient without any price out of the total', () => {
    const r = compareStores([...list, { ingredientId: 'saffraan', amount: 1 }], ingredients, prices, {}, TODAY);
    expect(r.bestSingle.unpricedIds).toEqual(['saffraan']);
    expect(r.bestSingle.picks.some((p) => p.ingredientId === 'saffraan')).toBe(false);
  });

  it('never has a best pair more expensive than the best single store', () => {
    const r = compareStores(list, ingredients, prices, {}, TODAY);
    expect(r.bestPair.total).toBeLessThanOrEqual(r.bestSingle.total);
  });
});

describe('review fixes', () => {
  const onion = new Map([['ui', ing('ui', { unit: 'stuk', gramsPerPiece: 100 })], ['spruit', ing('spruit')]]);

  it('keeps the unit of an own price for a piece ingredient bought by weight', () => {
    const overrides: Overrides = { ah: { ui: { price: 1.29, packAmount: 1000, packUnit: 'g', enteredAt: TODAY } } };
    const r = compareStores([{ ingredientId: 'ui', amount: 12 }], onion, priceFile({}), overrides, TODAY);
    // 12 onions = 1200 g → 2 bags of 1 kg
    expect(r.all.find((o) => o.stores.join() === 'ah')!.picks[0]).toMatchObject({ packs: 2, cost: 2.58, estimated: false });
  });

  it('does not copy another store’s offer or multi-buy hint onto an estimate', () => {
    const offer = { kind: 'multi' as const, buy: 2, pay: 1, validFrom: '2026-11-10', validUntil: '2026-11-16', label: '1+1 gratis' };
    const prices = priceFile({ jumbo: { spruit: prod('jumbo', 3, { packAmount: 1000, offer }) } });
    const r = compareStores([{ ingredientId: 'spruit', amount: 400 }], onion, prices, {}, TODAY);
    const ah = r.all.find((o) => o.stores.join() === 'ah')!.picks[0];
    expect(ah.estimated).toBe(true);
    expect(ah.hint).toBeUndefined();
    expect(ah.product.offer).toBeUndefined();
  });

  it('lets fresh fetched data replace an older own price at a fetched store', () => {
    const prices = priceFile({ jumbo: { spruit: prod('jumbo', 2.5) } });
    const overrides: Overrides = { jumbo: { spruit: { price: 4, packAmount: 500, packUnit: 'g', enteredAt: '2026-11-01' } } };
    const r = compareStores([{ ingredientId: 'spruit', amount: 400 }], onion, prices, overrides, TODAY);
    expect(r.all.find((o) => o.stores.join() === 'jumbo')!.picks[0].cost).toBe(2.5);
  });

  it('keeps an own price entered after the last fetch', () => {
    const prices = priceFile({ jumbo: { spruit: prod('jumbo', 2.5) } });
    const overrides: Overrides = { jumbo: { spruit: { price: 4, packAmount: 500, packUnit: 'g', enteredAt: TODAY } } };
    const r = compareStores([{ ingredientId: 'spruit', amount: 400 }], onion, prices, overrides, TODAY);
    expect(r.all.find((o) => o.stores.join() === 'jumbo')!.picks[0].cost).toBe(4);
  });
});
