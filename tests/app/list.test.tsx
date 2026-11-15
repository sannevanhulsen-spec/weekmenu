// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShoppingList } from '../../app/src/screens/ShoppingList';
import { harness, makeData, stateWithWeek, TODAY } from './fixtures';

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(`${TODAY}T12:00:00+01:00`)); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const week = (chosen: string[]) => [{ id: 'w1', startedAt: TODAY, chosen, swappedAway: [], checked: [], declinedHints: [] }];
const storeHeadings = () => screen.queryAllByRole('heading', { level: 2 }).map((h) => h.textContent);

describe('ShoppingList', () => {
  it('asks to choose recipes when the week is empty', () => {
    const { Wrapper } = harness(ShoppingList, makeData(), stateWithWeek());
    render(<Wrapper />);
    expect(screen.getByText('Kies eerst recepten bij Voorstellen.')).toBeTruthy();
  });

  it('keeps a ticked item after reloading the state', async () => {
    const data = makeData();
    const { Wrapper, ref } = harness(ShoppingList, data, stateWithWeek({ weeks: week(['kip']) }));
    render(<Wrapper />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'kip' }));
    cleanup();
    const again = harness(ShoppingList, data, ref.latest);
    render(<again.Wrapper />);
    expect((screen.getByRole('checkbox', { name: 'kip' }) as HTMLInputElement).checked).toBe(true);
  });

  it('shows an offer that ends tomorrow', () => {
    const { Wrapper } = harness(ShoppingList, makeData(), stateWithWeek({ weeks: week(['kip']) }));
    render(<Wrapper />);
    expect(screen.getByText('aanbieding t/m 16-11')).toBeTruthy();
  });

  it('shows a multi-buy hint and hides it after Nee', async () => {
    const { Wrapper, ref } = harness(ShoppingList, makeData(), stateWithWeek({ weeks: week(['spruit']) }));
    render(<Wrapper />);
    expect(screen.getByText('neem 2, dan betaal je €3,00 i.p.v. €6,00')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Nee' }));
    expect(screen.queryByText(/^neem 2/)).toBeNull();
    expect(ref.latest.weeks[0].declinedHints).toEqual(['spruitjes']);
  });

  it('uses at most two stores', () => {
    const { Wrapper } = harness(ShoppingList, makeData(), stateWithWeek({ weeks: week(['kip', 'spruit']) }));
    render(<Wrapper />);
    expect(storeHeadings().length).toBeLessThanOrEqual(2);
  });

  it('replaces an estimate with your own price and updates the total', async () => {
    const data = makeData();
    delete data.prices.stores.jumbo.products.kip;
    delete data.prices.stores.aldi.products.rijst;
    // kip only at Aldi, rijst only at Jumbo → one store always has one estimate
    const { Wrapper, ref } = harness(ShoppingList, data, stateWithWeek({ weeks: week(['kip']), listMode: 'single' }));
    render(<Wrapper />);
    const estimate = screen.getByRole('button', { name: /^~/ });
    const store = ref.latest.listMode === 'single' ? storeHeadings()[0]! : '';
    await userEvent.click(estimate);
    const price = screen.getByLabelText('Prijs');
    await userEvent.clear(price);
    await userEvent.type(price, '1,25');
    await userEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
    expect(screen.queryByRole('button', { name: /^~/ })).toBeNull();
    expect(within(screen.getByTestId('single')).queryByText(/items? geschat/)).toBeNull();
    const key = store === 'Jumbo' ? 'jumbo' : 'aldi';
    expect(Object.values(ref.latest.overrides[key] ?? {})[0]).toMatchObject({ price: 1.25, enteredAt: TODAY });
    expect(within(screen.getByTestId('single')).getByText(/€/)).toBeTruthy();
  });
});

describe('ShoppingList review fixes', () => {
  it('shows no offer or hint on an estimated line', () => {
    const data = makeData();
    delete data.prices.stores.jumbo.products.rijst;
    data.prices.stores.aldi.products.kip = { ...data.prices.stores.aldi.products.kip, price: 4 };
    // best single store is Aldi (kip €4, rijst €1,80, spruitjes estimated from Jumbo's 1+1 product)
    const { Wrapper } = harness(ShoppingList, data, stateWithWeek({ weeks: week(['kip', 'spruit']), listMode: 'single' }));
    expect(screen.queryByText('schatting', { exact: false })).toBeNull();
    render(<Wrapper />);
    expect(screen.getByRole('heading', { level: 2, name: 'Aldi' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^~/ })).toBeTruthy();
    expect(screen.queryByText(/^neem 2/)).toBeNull();
    expect(screen.queryByText(/aanbieding t\/m/)).toBeNull();
  });

  it('says when a store’s prices are old', () => {
    const data = makeData();
    data.prices.stores.aldi = { ...data.prices.stores.aldi, stale: true, fetchedAt: '2026-11-13T05:00:00Z' };
    const { Wrapper } = harness(ShoppingList, data, stateWithWeek({ weeks: week(['kip']) }));
    render(<Wrapper />);
    expect(screen.getByText('Aldi: prijzen van 13-11')).toBeTruthy();
  });

  it('lets you enter a price for an item without any price', async () => {
    const data = makeData();
    data.recipes.push({ id: 'saf', title: 'Recept saf', minutes: 10, tags: [], vegetarian: true, steps: [], lines: [{ ingredientId: 'saffraan', amount: 1 }] });
    const { Wrapper, ref } = harness(ShoppingList, data, stateWithWeek({ weeks: week(['kip', 'saf']) }));
    render(<Wrapper />);
    await userEvent.click(screen.getByRole('button', { name: 'Prijs invullen: saffraan' }));
    const price = screen.getByLabelText('Prijs');
    await userEvent.clear(price);
    await userEvent.type(price, '2,50');
    await userEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
    const saved = Object.values(ref.latest.overrides).flatMap((o) => Object.entries(o));
    expect(saved).toContainEqual(['saffraan', expect.objectContaining({ price: 2.5 })]);
    expect(screen.queryByText('Zonder prijs')).toBeNull();
  });

  it('saves an own price in the product’s unit for a piece ingredient', async () => {
    const data = makeData();
    data.ingredients.set('ui', { id: 'ui', name: 'ui', unit: 'stuk', gramsPerPiece: 100, nevoCode: null, pantry: false, aisle: 'groente', search: {} });
    data.prices.stores.jumbo.products.ui = { store: 'jumbo', name: 'Uien 1 kg', packAmount: 1000, packUnit: 'g', price: 1 };
    data.recipes.push({ id: 'uien', title: 'Recept uien', minutes: 10, tags: [], vegetarian: true, steps: [], lines: [{ ingredientId: 'ui', amount: 2 }] });
    const { Wrapper, ref } = harness(ShoppingList, data, stateWithWeek({ weeks: week(['uien']) }));
    render(<Wrapper />);
    await userEvent.click(screen.getByRole('button', { name: '€1,00' }));
    await userEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
    expect(ref.latest.overrides.jumbo.ui).toMatchObject({ packAmount: 1000, packUnit: 'g' });
  });
});
