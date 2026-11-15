import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { defaultState, exportBackup, importBackup, loadState, saveState, type AppState } from '../../app/src/db';

describe('db', () => {
  it('returns defaults on an empty database', async () => {
    const s = await loadState();
    expect(s).toEqual(defaultState());
    expect(s.filters).toEqual({ highProtein: false, vegetarian: false, quick: false });
  });

  it('round-trips saved state', async () => {
    const s: AppState = { ...defaultState(), dislikedRecipes: ['a'], favorites: ['b'] };
    await saveState(s);
    expect(await loadState()).toEqual(s);
  });

  it('round-trips a backup', () => {
    const s: AppState = { ...defaultState(), dislikedIngredients: ['spruitjes'] };
    expect(importBackup(exportBackup(s))).toEqual(s);
  });

  it('rejects an invalid backup', () => {
    expect(() => importBackup('{}')).toThrow('Ongeldig back-upbestand');
    expect(() => importBackup('nonsense')).toThrow('Ongeldig back-upbestand');
  });
});

describe('importBackup validation', () => {
  const wrap = (state: unknown) => JSON.stringify({ version: 1, state });
  it('rejects malformed weeks, filters and overrides', () => {
    expect(() => importBackup(wrap({ weeks: [{}] }))).toThrow('Ongeldig back-upbestand');
    expect(() => importBackup(wrap({ weeks: [], filters: null }))).toThrow('Ongeldig back-upbestand');
    expect(() => importBackup(wrap({ weeks: [], overrides: 'x' }))).toThrow('Ongeldig back-upbestand');
    expect(() => importBackup(wrap({ weeks: [], dislikedRecipes: 'a' }))).toThrow('Ongeldig back-upbestand');
  });
  it('fills missing optional fields with defaults', () => {
    expect(importBackup(wrap({ weeks: [] }))).toEqual(defaultState());
  });
});
