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
  it('skips processed products such as soup, sauce or ready meals', () => {
    const champ = ing({ id: 'champ', name: 'champignons', unit: 'g', search: { jumbo: 'champignons' } });
    expect(pickProduct(champ, [p('Jumbo Champignonsoep 800ML', 800, 1.65, 'ml'), p('Jumbo Champignons 400 g', 400, 1.49)])?.name).toBe('Jumbo Champignons 400 g');
    const tomaat = ing({ id: 'tomaat', name: 'tomaat', search: { jumbo: 'tomat' } });
    expect(pickProduct(tomaat, [p('Jumbo Tomatenketchup 890ML', 996, 0.77), p('Jumbo Trostomaten 500 g', 500, 1.99)])?.name).toBe('Jumbo Trostomaten 500 g');
  });
  it('allows a product word that is part of the ingredient itself', () => {
    const kaas = ing({ id: 'kaas', name: 'geraspte kaas', unit: 'g', search: { jumbo: 'geraspte kaas' } });
    expect(pickProduct(kaas, [p('Jumbo Geraspte Kaas Belegen 200 g', 200, 2.49)])?.name).toBe('Jumbo Geraspte Kaas Belegen 200 g');
  });
  it('skips products where the term is only part of a "met" description', () => {
    const peterselie = ing({ id: 'peterselie', name: 'verse peterselie', unit: 'g', search: { jumbo: 'peterselie' } });
    expect(pickProduct(peterselie, [p('Bertolli Pastasaus met Mascarpone en Peterselie 460 g', 460, 4.49)])).toBeNull();
  });
  it('ignores accents when matching', () => {
    const cf = ing({ id: 'cf', name: 'crème fraîche', unit: 'g', search: { jumbo: 'creme fraiche' } });
    expect(pickProduct(cf, [p('Jumbo Crème Fraîche 125 g', 125, 0.89)])?.name).toBe('Jumbo Crème Fraîche 125 g');
  });
  it('prefers fresh tomatoes over tinned or sieved ones', () => {
    const tomaat = ing({ id: 'tomaat', name: 'tomaat', search: { jumbo: 'tomaten' } });
    const out = pickProduct(tomaat, [p('Jumbo Tomatenblokjes 400 g', 400, 0.35), p('Jumbo Tomaten Gezeefd Passata 500 g', 500, 0.6), p('Jumbo Tomaten 500 g', 500, 1.49)]);
    expect(out?.name).toBe('Jumbo Tomaten 500 g');
  });
  it('returns null without candidates', () => {
    expect(pickProduct(ing(), [])).toBeNull();
  });
  it('returns null when the ingredient has no search term for that store', () => {
    expect(pickProduct(ing({ search: {} }), [p('Uien 1 kg', 1000, 1.2)])).toBeNull();
  });
});
