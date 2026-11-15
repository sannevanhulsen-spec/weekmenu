// Daily price job: fetches Jumbo and Aldi, keeps last known data when a store fails, writes data/prices/latest.json.
// AH and Lidl are manual (owner decision 2026-11-15): written as empty, their prices come from the app's overrides.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Ingredient, PriceFile, Product, StoreId, StorePrices } from '../shared/types';
import { pickProduct } from './match';
import * as aldi from './stores/aldi';
import * as jumbo from './stores/jumbo';

const MIN_SHARE = 0.3;

export function mergeStore(prev: StorePrices | undefined, result: Record<string, Product> | Error, now: string, expected: number): StorePrices {
  const failed = result instanceof Error || Object.keys(result).length < expected * MIN_SHARE;
  if (!failed) return { fetchedAt: now, stale: false, products: result as Record<string, Product> };
  return prev ? { ...prev, stale: true } : { fetchedAt: now, stale: true, products: {} };
}

export function assignProducts(ingredients: Ingredient[], candidates: Product[]): Record<string, Product> {
  const out: Record<string, Product> = {};
  for (const ing of ingredients) {
    const best = pickProduct(ing, candidates);
    if (best) out[ing.id] = best;
  }
  return out;
}

async function main() {
  const now = new Date().toISOString();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date());
  const ingredients: Ingredient[] = JSON.parse(readFileSync('data/ingredients.json', 'utf8'));
  const file = 'data/prices/latest.json';
  const prev: PriceFile | undefined = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined;
  const empty = (): StorePrices => ({ fetchedAt: now, stale: false, products: {} });
  const stores: Record<StoreId, StorePrices> = { ah: empty(), lidl: empty(), jumbo: empty(), aldi: empty() };

  const fetchers = { jumbo: (t: string[]) => jumbo.fetchProducts(t, today), aldi: (t: string[]) => aldi.fetchProducts(t) };
  for (const [store, fetchProducts] of Object.entries(fetchers) as [StoreId, (t: string[]) => Promise<Product[]>][]) {
    const relevant = ingredients.filter((i) => i.search[store]);
    let result: Record<string, Product> | Error;
    try {
      result = assignProducts(relevant, await fetchProducts(relevant.map((i) => i.search[store]!)));
    } catch (e) {
      result = e instanceof Error ? e : new Error(String(e));
    }
    stores[store] = mergeStore(prev?.stores[store], result, now, relevant.length);
    const n = Object.keys(stores[store].products).length;
    console.log(`${store}: ${n}/${relevant.length} ingrediënten${stores[store].stale ? ' (MISLUKT, oude data behouden)' : ''}`);
  }
  mkdirSync('data/prices', { recursive: true });
  writeFileSync(file, JSON.stringify({ generatedAt: now, stores } satisfies PriceFile, null, 1));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
