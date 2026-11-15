import { describe, expect, it } from 'vitest';
import { pickProduct } from '../../fetcher/match';
import type { Ingredient, Product } from '../../shared/types';

const ing = (o: Partial<Ingredient> = {}): Ingredient =>
  ({ id: 'ui', name: 'ui', unit: 'stuk', gramsPerPiece: 100, nevoCode: null, pantry: false, aisle: 'groente', search: { jumbo: 'uien' }, ...o });
const p = (name: string, packAmount: number, price: number, packUnit: Product['packUnit'] = 'g'): Product =>
  ({ store: 'jumbo', name, title: name, packAmount, packUnit, price });

describe('pickProduct', () => {
  it('keeps only candidates whose name contains the search term', () => {
    expect(pickProduct(ing(), [p('Rode bieten', 500, 0.5), p('Jumbo Uien 1 kg', 1000, 1.2)])?.name).toBe('Jumbo Uien 1 kg');
  });
  it('drops candidates whose unit cannot be converted', () => {
    const noWeight = ing({ gramsPerPiece: undefined });
    expect(pickProduct(noWeight, [p('Uien 1 kg', 1000, 1.2)])).toBeNull();
  });
  it('picks the lowest price per unit', () => {
    expect(pickProduct(ing(), [p('Uien 1 kg', 1000, 1.2), p('Uien 3 kg', 3000, 2.4)])?.name).toBe('Uien 3 kg');
  });
  it('breaks a unit-price tie by the pack closest to 500 g', () => {
    expect(pickProduct(ing(), [p('Uien 2 kg', 2000, 4), p('Uien 500 g', 500, 1)])?.name).toBe('Uien 500 g');
  });
  it('returns null without candidates', () => {
    expect(pickProduct(ing(), [])).toBeNull();
  });
  it('returns null when the ingredient has no search term for that store', () => {
    expect(pickProduct(ing({ search: {} }), [p('Uien 1 kg', 1000, 1.2)])).toBeNull();
  });
});
