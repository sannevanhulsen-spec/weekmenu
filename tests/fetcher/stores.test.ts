import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as aldi from '../../fetcher/stores/aldi';
import * as jumbo from '../../fetcher/stores/jumbo';
import { parsePack } from '../../fetcher/stores/pack';

const fx = (p: string) => readFileSync(new URL(`../fixtures/${p}`, import.meta.url), 'utf8');

describe('parsePack', () => {
  it.each([
    ['400 g', { packAmount: 400, packUnit: 'g' }],
    ['Gesponsord • 2 x 100 g', { packAmount: 200, packUnit: 'g' }],
    ['1.5 KG', { packAmount: 1500, packUnit: 'g' }],
    ['300 GRAM', { packAmount: 300, packUnit: 'g' }],
    ['Diepvries • 450 G', { packAmount: 450, packUnit: 'g' }],
    ['6x200 ml', { packAmount: 1200, packUnit: 'ml' }],
    ['1 l', { packAmount: 1000, packUnit: 'ml' }],
    ['4 stuks, 360 g', { packAmount: 360, packUnit: 'g' }],
    ['30-70 g', { packAmount: 30, packUnit: 'g' }],
    ['10 stuks', { packAmount: 10, packUnit: 'stuk' }],
  ])('%s', (text, expected) => expect(parsePack(text)).toEqual(expected));
  it('returns null when there is no size', () => expect(parsePack('Gesponsord  ')).toBeNull());
});

describe('jumbo.parseOffer', () => {
  const today = '2026-11-15';
  it('maps "2 voor 5,00" to a bundle', () => {
    expect(jumbo.parseOffer('2 voor 5,00', 'wo 11 t/m di 17 nov', today))
      .toEqual({ kind: 'bundle', count: 2, price: 5, validFrom: '2026-11-11', validUntil: '2026-11-17', label: '2 voor 5,00' });
  });
  it('maps "voor 1,99" to a price offer', () => {
    expect(jumbo.parseOffer('voor 1,99', 'wo 11 t/m di 17 nov', today)).toMatchObject({ kind: 'price', price: 1.99 });
  });
  it('maps 1+1 gratis, 2+1 gratis and 2e halve prijs to multi-buys', () => {
    expect(jumbo.parseOffer('1+1 gratis', 'wo 11 t/m di 17 nov', today)).toMatchObject({ kind: 'multi', buy: 2, pay: 1 });
    expect(jumbo.parseOffer('2+1 gratis', 'wo 11 t/m di 17 nov', today)).toMatchObject({ kind: 'multi', buy: 3, pay: 2 });
    expect(jumbo.parseOffer('2e halve prijs', 'wo 11 t/m di 17 nov', today)).toMatchObject({ kind: 'multi', buy: 2, pay: 1.5 });
  });
  it('puts a start month after the end month in the previous year', () => {
    expect(jumbo.parseOffer('voor 1,99', 'wo 7 jan t/m di 8 dec', today)).toMatchObject({ validFrom: '2026-01-07', validUntil: '2026-12-08' });
  });
  it('ignores labels that are not price offers', () => {
    expect(jumbo.parseOffer('Goedkoopje', 'wo 11 t/m di 17 nov', today)).toBeUndefined();
    expect(jumbo.parseOffer('Bij elke 2 stuks', 'wo 11 t/m di 17 nov', today)).toBeUndefined();
  });
});

describe('jumbo.parse', () => {
  const products = jumbo.parse(fx('jumbo/vlees.html'), '2026-11-15');
  it('reads products with name, size and price', () => {
    expect(products.length).toBeGreaterThanOrEqual(20);
    for (const p of products) {
      expect(p.store).toBe('jumbo');
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.price).toBeGreaterThan(0);
      expect(p.packAmount).toBeGreaterThan(0);
    }
  });
  it('reads the "2 voor 5,00" offer on the page', () => {
    expect(products.some((p) => p.offer?.kind === 'bundle' && p.offer.price === 5 && p.offer.validUntil === '2026-12-08')).toBe(true);
  });
});

describe('aldi.parse', () => {
  it('reads a regular product', () => {
    expect(aldi.parse(fx('aldi/normal.html'))).toEqual([
      { store: 'aldi', name: 'Gerookte kipfilet', title: 'Gerookte kipfilet', packAmount: 150, packUnit: 'g', price: 2.69 },
    ]);
  });
  it('reads a strike price as the shelf price and the current price as the offer', () => {
    const [p] = aldi.parse(fx('aldi/offer.html'));
    expect(p).toMatchObject({ price: 5.99, packAmount: 400, packUnit: 'g' });
    expect(p.offer).toEqual({ kind: 'price', price: 4.99, validFrom: '2026-11-09', validUntil: '2026-11-15', label: 'van 5,99 voor 4,99' });
  });
  it('returns nothing for a page without a price', () => {
    expect(aldi.parse('<html></html>')).toEqual([]);
  });
});
