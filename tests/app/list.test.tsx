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
