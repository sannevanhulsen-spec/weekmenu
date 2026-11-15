import { describe, expect, it } from 'vitest';
import { assignProducts, mergeStore } from '../../fetcher/run';
import type { Ingredient, Product, StorePrices } from '../../shared/types';

const NOW = '2026-11-15T05:00:00Z';
const p = (name: string, price = 1): Product => ({ store: 'jumbo', name, title: name, packAmount: 500, packUnit: 'g', price });
const prev: StorePrices = { fetchedAt: '2026-11-14T05:00:00Z', stale: false, products: { kip: p('Kipfilet', 5) } };

describe('mergeStore', () => {
  it('uses new products on success', () => {
    expect(mergeStore(prev, { kip: p('Kipfilet', 6) }, NOW, 1)).toEqual({ fetchedAt: NOW, stale: false, products: { kip: p('Kipfilet', 6) } });
  });
  it('keeps previous products, marked stale, on an error', () => {
    expect(mergeStore(prev, new Error('down'), NOW, 1)).toEqual({ ...prev, stale: true });
  });
  it('gives empty stale data on an error without previous data', () => {
    expect(mergeStore(undefined, new Error('down'), NOW, 1)).toEqual({ fetchedAt: NOW, stale: true, products: {} });
  });
  it('treats a result with fewer than 30% of the catalogue as a failure', () => {
    expect(mergeStore(prev, { kip: p('Kipfilet', 6) }, NOW, 10)).toEqual({ ...prev, stale: true });
  });
});

describe('assignProducts', () => {
  const ing = (id: string, term: string): Ingredient =>
    ({ id, name: id, unit: 'g', nevoCode: null, pantry: false, aisle: 'x', search: { jumbo: term } });
  it('picks one product per ingredient and skips ingredients without a match', () => {
    const out = assignProducts([ing('kip', 'kipfilet'), ing('tofu', 'tofu')], [p('Jumbo Kipfilet', 5), p('Jumbo Kipfilet 1 kg', 8)]);
    expect(Object.keys(out)).toEqual(['kip']);
    expect(out.kip.name).toBe('Jumbo Kipfilet');
  });
});
