// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Settings } from '../../app/src/screens/Settings';
import { compareStores } from '../../shared/compare';
import { harness, makeData, stateWithWeek, TODAY } from './fixtures';

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(`${TODAY}T12:00:00+01:00`)); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Settings', () => {
  it('shows the NEVO attribution and the price disclaimer', () => {
    const { Wrapper } = harness(Settings, makeData(), stateWithWeek());
    render(<Wrapper />);
    expect(screen.getByText('NEVO-online versie 2025/9.0, RIVM, Bilthoven')).toBeTruthy();
    expect(screen.getByText('Prijzen zijn indicatief; ~ = geschat')).toBeTruthy();
  });

  it('puts a disliked recipe and ingredient back', async () => {
    const { Wrapper, ref } = harness(Settings, makeData(), stateWithWeek({ dislikedRecipes: ['kip'], dislikedIngredients: ['spruitjes'] }));
    render(<Wrapper />);
    await userEvent.click(screen.getByRole('button', { name: 'Terugzetten: Recept kip' }));
    await userEvent.click(screen.getByRole('button', { name: 'Terugzetten: spruitjes' }));
    expect(ref.latest.dislikedRecipes).toEqual([]);
    expect(ref.latest.dislikedIngredients).toEqual([]);
  });

  it('shows an error for an invalid backup file', async () => {
    const { Wrapper } = harness(Settings, makeData(), stateWithWeek());
    render(<Wrapper />);
    const file = new File(['nonsense'], 'backup.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText('Back-up importeren'), file);
    expect(await screen.findByText('Ongeldig back-upbestand')).toBeTruthy();
  });

  it('restores a valid backup', async () => {
    const { Wrapper, ref } = harness(Settings, makeData(), stateWithWeek());
    render(<Wrapper />);
    const backup = JSON.stringify({ version: 1, state: { ...stateWithWeek(), favorites: ['kip'] } });
    await userEvent.upload(screen.getByLabelText('Back-up importeren'), new File([backup], 'b.json', { type: 'application/json' }));
    await screen.findByText('Back-up teruggezet');
    expect(ref.latest.favorites).toEqual(['kip']);
  });

  it('stores a manual AH price that the comparison then treats as real', async () => {
    const data = makeData();
    const { Wrapper, ref } = harness(Settings, data, stateWithWeek());
    render(<Wrapper />);
    const ah = screen.getByRole('region', { name: 'Prijzen Albert Heijn' });
    await userEvent.click(within(ah).getByRole('button', { name: /^kip/ }));
    const price = within(ah).getByLabelText('Prijs');
    await userEvent.clear(price);
    await userEvent.type(price, '4,99');
    const pack = within(ah).getByLabelText('Verpakking');
    await userEvent.clear(pack);
    await userEvent.type(pack, '1000');
    await userEvent.click(within(ah).getByRole('button', { name: 'Opslaan' }));
    expect(ref.latest.overrides.ah.kip).toEqual({ price: 4.99, packAmount: 1000, packUnit: 'g', enteredAt: TODAY });
    expect(within(ah).getByText(/ingevuld op 15-11/)).toBeTruthy();
    const r = compareStores([{ ingredientId: 'kip', amount: 300 }], data.ingredients, data.prices, ref.latest.overrides, TODAY);
    expect(r.all.find((o) => o.stores.join() === 'ah')!.picks[0]).toMatchObject({ estimated: false, cost: 4.99 });
  });
});
