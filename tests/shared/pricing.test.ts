import { describe, expect, it } from 'vitest';
import { activeOffer, purchase, toProductUnits, usedCost } from '../../shared/pricing';
import type { Ingredient, Product, ProductOffer } from '../../shared/types';

const ing = (o: Partial<Ingredient>): Ingredient =>
  ({ id: 'x', name: 'x', unit: 'g', nevoCode: null, pantry: false, aisle: 'x', search: {}, ...o });
const product = (o: Partial<Product> = {}): Product =>
  ({ store: 'jumbo', name: 'p', packAmount: 500, packUnit: 'g', price: 2, ...o });
const offer = (o: Partial<ProductOffer> & Pick<ProductOffer, 'kind'>): ProductOffer =>
  ({ validFrom: '2026-11-10', validUntil: '2026-11-16', label: 'actie', ...o } as ProductOffer);
const TODAY = '2026-11-15';

describe('toProductUnits', () => {
  it('converts pieces to grams with gramsPerPiece', () => {
    expect(toProductUnits(2, ing({ unit: 'stuk', gramsPerPiece: 100 }), product({ packAmount: 1000 }))).toBe(200);
  });
  it('returns null for pieces without gramsPerPiece', () => {
    expect(toProductUnits(2, ing({ unit: 'stuk' }), product())).toBeNull();
  });
  it('returns null for a weight ingredient against a piece product', () => {
    expect(toProductUnits(200, ing({ unit: 'g' }), product({ packUnit: 'stuk', packAmount: 6 }))).toBeNull();
  });
  it('keeps pieces against a piece product', () => {
    expect(toProductUnits(3, ing({ unit: 'stuk' }), product({ packUnit: 'stuk', packAmount: 6 }))).toBe(3);
  });
});

describe('activeOffer', () => {
  const p = product({ offer: offer({ kind: 'price', price: 1, validUntil: '2026-11-16' }) });
  it('is active on the last day (inclusive)', () => expect(activeOffer(p, '2026-11-16')).toBeDefined());
  it('is gone the day after', () => expect(activeOffer(p, '2026-11-17')).toBeUndefined());
  it('is not active before validFrom', () => expect(activeOffer(p, '2026-11-09')).toBeUndefined());
});

describe('purchase', () => {
  it('rounds up to whole packs without an offer', () => {
    expect(purchase(product({ price: 2 }), 600, TODAY)).toEqual({ packs: 2, cost: 4 });
  });
  it('1+1 gratis: one pack needed, hints that two cost the same', () => {
    const p = product({ price: 3.32, offer: offer({ kind: 'multi', buy: 2, pay: 1 }) });
    expect(purchase(p, 400, TODAY)).toEqual({ packs: 1, cost: 3.32, hint: { packs: 2, cost: 3.32 } });
  });
  it('2e halve prijs: two packs needed cost 1.5 × price', () => {
    const p = product({ price: 2, offer: offer({ kind: 'multi', buy: 2, pay: 1.5 }) });
    expect(purchase(p, 900, TODAY).cost).toBeCloseTo(3);
  });
  it('bundle: no hint when the extra pack costs more than €1.00', () => {
    const p = product({ price: 2.99, offer: offer({ kind: 'bundle', count: 2, price: 5 }) });
    expect(purchase(p, 500, TODAY)).toEqual({ packs: 1, cost: 2.99 });
  });
  it('bundle: hint when the extra pack costs at most €1.00 more', () => {
    const p = product({ price: 2.99, offer: offer({ kind: 'bundle', count: 2, price: 3.5 }) });
    expect(purchase(p, 500, TODAY)).toEqual({ packs: 1, cost: 2.99, hint: { packs: 2, cost: 3.5 } });
  });
  it('price offer replaces the shelf price', () => {
    const p = product({ price: 2.19, offer: offer({ kind: 'price', price: 1.49 }) });
    expect(purchase(p, 500, TODAY).cost).toBeCloseTo(1.49);
  });
  it('ignores an expired offer', () => {
    const p = product({ price: 2.19, offer: offer({ kind: 'price', price: 1.49, validUntil: '2026-11-14' }) });
    expect(purchase(p, 500, TODAY).cost).toBeCloseTo(2.19);
  });
});

describe('usedCost', () => {
  it('charges only the used share at the unit price', () => {
    expect(usedCost(product({ price: 2 }), 200, TODAY)).toBeCloseTo(0.8);
  });
  it('uses the deal unit price under 1+1', () => {
    const p = product({ price: 2, offer: offer({ kind: 'multi', buy: 2, pay: 1 }) });
    expect(usedCost(p, 200, TODAY)).toBeCloseTo(0.4);
  });
});
