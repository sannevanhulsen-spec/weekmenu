import { useState } from 'react';
import type { AppData } from '../../app/src/data';
import { defaultState, type AppState } from '../../app/src/db';
import type { ScreenProps } from '../../app/src/screens/props';
import type { Ingredient, NevoItem, PriceFile, Product, Recipe, StoreId } from '../../shared/types';

export const TODAY = '2026-11-15';
const ing = (id: string, o: Partial<Ingredient> = {}): Ingredient =>
  ({ id, name: id, unit: 'g', nevoCode: null, pantry: false, aisle: 'overig', search: {}, ...o });
const recipe = (id: string, lines: Recipe['lines'], o: Partial<Recipe> = {}): Recipe =>
  ({ id, title: `Recept ${id}`, minutes: 25, tags: [], vegetarian: false, steps: ['Kook alles.'], lines, ...o });
const prod = (store: StoreId, price: number, o: Partial<Product> = {}): Product =>
  ({ store, name: `${store} product`, packAmount: 1000, packUnit: 'g', price, ...o });
const sp = (products: Record<string, Product>) => ({ fetchedAt: '2026-11-15T05:00:00Z', stale: false, products });

export function makeData(): AppData {
  const ingredients = [
    ing('kip', { nevoCode: 1, aisle: 'vlees' }), ing('rijst', { aisle: 'pasta en rijst' }),
    ing('spruitjes', { aisle: 'groente' }), ing('zout', { pantry: true }), ing('saffraan'),
  ];
  const nevo: NevoItem[] = [{ code: 1, name: 'kip', kcal: 110, protein: 23, carbs: 0, fat: 2, fiber: 0, salt: 0.1 }];
  const recipes = [
    recipe('kip', [{ ingredientId: 'kip', amount: 300 }, { ingredientId: 'rijst', amount: 150 }, { ingredientId: 'zout', amount: 5 }]),
    recipe('spruit', [{ ingredientId: 'spruitjes', amount: 400 }, { ingredientId: 'rijst', amount: 150 }], { vegetarian: true }),
    ...Array.from({ length: 13 }, (_, i) => recipe(`r${i}`, [{ ingredientId: 'rijst', amount: 100 + i }], { vegetarian: true })),
  ];
  const prices: PriceFile = {
    generatedAt: TODAY,
    stores: {
      ah: sp({}), lidl: sp({}),
      jumbo: sp({ kip: prod('jumbo', 8, { offer: { kind: 'price', price: 6, validFrom: '2026-11-10', validUntil: '2026-11-16', label: 'voor 6,00' } }), rijst: prod('jumbo', 2), spruitjes: prod('jumbo', 3, { offer: { kind: 'multi', buy: 2, pay: 1, validFrom: '2026-11-10', validUntil: '2026-11-16', label: '1+1 gratis' } }) }),
      aldi: sp({ kip: prod('aldi', 9), rijst: prod('aldi', 1.8, { packAmount: 500 }) }),
    },
  };
  return {
    recipes,
    ingredients: new Map(ingredients.map((i) => [i.id, i])),
    nevo: new Map(nevo.map((n) => [n.code, n])),
    prices,
  };
}

export const stateWithWeek = (o: Partial<AppState> = {}): AppState => ({
  ...defaultState(),
  weeks: [{ id: 'w1', startedAt: TODAY, chosen: [], swappedAway: [], checked: [], declinedHints: [] }],
  ...o,
});

/** Renders a screen with real state updates; `latest` exposes the last saved state. */
export function harness(Screen: (p: ScreenProps) => React.ReactNode, data: AppData, initial: AppState) {
  const ref = { latest: initial };
  function Wrapper() {
    const [state, setState] = useState(initial);
    return <Screen data={data} state={state} update={(s) => { ref.latest = s; setState(s); }} />;
  }
  return { Wrapper, ref };
}
