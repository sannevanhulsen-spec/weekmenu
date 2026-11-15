import type { Ingredient, NevoItem, PriceFile, Recipe, StoreId, StorePrices } from '../../shared/types';

export interface AppData { recipes: Recipe[]; ingredients: Map<string, Ingredient>; nevo: Map<number, NevoItem>; prices: PriceFile }

const emptyStore = (): StorePrices => ({ fetchedAt: '', stale: false, products: {} });
export const emptyPrices = (): PriceFile => ({
  generatedAt: '',
  stores: { ah: emptyStore(), jumbo: emptyStore(), aldi: emptyStore(), lidl: emptyStore() } as Record<StoreId, StorePrices>,
});

async function json<T>(path: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(import.meta.env.BASE_URL + path);
    return r.ok ? await r.json() : fallback;
  } catch {
    return fallback;
  }
}

export async function loadData(): Promise<AppData> {
  const [recipes, ingredients, nevo, prices] = await Promise.all([
    json<Recipe[]>('recipes.json', []),
    json<Ingredient[]>('ingredients.json', []),
    json<NevoItem[]>('nevo.json', []),
    json<PriceFile>('prices/latest.json', emptyPrices()),
  ]);
  return {
    recipes,
    ingredients: new Map(ingredients.map((i) => [i.id, i])),
    nevo: new Map(nevo.map((n) => [n.code, n])),
    prices,
  };
}

/** Today in Amsterdam as yyyy-mm-dd. */
export const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date());
export const euro = (n: number) => '€' + n.toFixed(2).replace('.', ',');
export const ddmm = (iso: string) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}`;
