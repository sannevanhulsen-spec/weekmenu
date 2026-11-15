// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Suggestions } from '../../app/src/screens/Suggestions';
import { harness, makeData, stateWithWeek, TODAY } from './fixtures';

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(`${TODAY}T12:00:00+01:00`)); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const card = (title: string) => screen.getByRole('article', { name: title });
const titles = () => screen.queryAllByRole('article').map((a) => a.getAttribute('aria-label'));

describe('Suggestions', () => {
  it('starts a new week from the button', async () => {
    const { Wrapper, ref } = harness(Suggestions, makeData(), stateWithWeek({ weeks: [] }));
    render(<Wrapper />);
    await userEvent.click(screen.getByRole('button', { name: 'Nieuw weekmenu' }));
    expect(ref.latest.weeks).toHaveLength(1);
    expect(titles()).toHaveLength(12);
  });

  it('removes a recipe for good with Lust ik niet', async () => {
    const data = makeData();
    const { Wrapper, ref } = harness(Suggestions, data, stateWithWeek());
    render(<Wrapper />);
    await userEvent.click(within(card('Recept kip')).getByRole('button', { name: 'Lust ik niet' }));
    expect(titles()).not.toContain('Recept kip');
    cleanup();
    const again = harness(Suggestions, data, ref.latest);
    render(<again.Wrapper />);
    expect(titles()).not.toContain('Recept kip');
  });

  it('replaces a card with a different recipe on Wissel', async () => {
    const { Wrapper, ref } = harness(Suggestions, makeData(), stateWithWeek());
    render(<Wrapper />);
    const before = titles();
    await userEvent.click(within(card('Recept kip')).getByRole('button', { name: 'Wissel' }));
    expect(titles()).not.toContain('Recept kip');
    expect(titles()).toHaveLength(12);
    expect(titles().filter((t) => !before.includes(t))).toHaveLength(1);
    expect(ref.latest.weeks[0].swappedAway).toEqual(['kip']);
  });

  it('adds a recipe to the week with Kies', async () => {
    const { Wrapper, ref } = harness(Suggestions, makeData(), stateWithWeek());
    render(<Wrapper />);
    await userEvent.click(within(card('Recept kip')).getByRole('button', { name: 'Kies' }));
    expect(ref.latest.weeks[0].chosen).toEqual(['kip']);
    expect(screen.getByText('Gekozen (1)')).toBeTruthy();
  });

  it('removes every recipe with an ingredient disliked in the detail view', async () => {
    const { Wrapper, ref } = harness(Suggestions, makeData(), stateWithWeek());
    render(<Wrapper />);
    await userEvent.click(within(card('Recept spruit')).getByRole('button', { name: 'Recept spruit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Lust ik niet: spruitjes' }));
    await userEvent.click(screen.getByRole('button', { name: 'Terug' }));
    expect(ref.latest.dislikedIngredients).toEqual(['spruitjes']);
    expect(titles()).not.toContain('Recept spruit');
  });

  it('shows only high-protein recipes with the Veel eiwit filter and says there are fewer', async () => {
    const { Wrapper } = harness(Suggestions, makeData(), stateWithWeek());
    render(<Wrapper />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Veel eiwit' }));
    expect(titles()).toEqual(['Recept kip']);
    expect(screen.getByText('Minder voorstellen door je filters')).toBeTruthy();
  });

  it('marks an incomplete price with ~', () => {
    const data = makeData();
    data.recipes.push({ id: 'saf', title: 'Recept saf', minutes: 10, tags: [], vegetarian: true, steps: [], lines: [{ ingredientId: 'saffraan', amount: 1 }] });
    data.recipes.splice(2, 13);
    const { Wrapper } = harness(Suggestions, data, stateWithWeek());
    render(<Wrapper />);
    expect(within(card('Recept saf')).getByText(/^~/)).toBeTruthy();
  });
});

describe('Nieuw weekmenu guard', () => {
  it('asks before replacing a week that has chosen recipes, and keeps it on cancel', async () => {
    const confirm = vi.fn().mockReturnValue(false);
    vi.stubGlobal('confirm', confirm);
    const { Wrapper, ref } = harness(Suggestions, makeData(), stateWithWeek({ weeks: [{ id: 'w1', startedAt: TODAY, chosen: ['kip'], swappedAway: [], checked: [], declinedHints: [] }] }));
    render(<Wrapper />);
    await userEvent.click(screen.getByRole('button', { name: 'Nieuw weekmenu' }));
    expect(confirm).toHaveBeenCalled();
    expect(ref.latest.weeks).toHaveLength(1);
    vi.unstubAllGlobals();
  });
  it('does not stack empty weeks', async () => {
    const { Wrapper, ref } = harness(Suggestions, makeData(), stateWithWeek());
    render(<Wrapper />);
    await userEvent.click(screen.getByRole('button', { name: 'Nieuw weekmenu' }));
    expect(ref.latest.weeks).toHaveLength(1);
  });
});
