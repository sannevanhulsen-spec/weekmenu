import { purchase, toProductUnits } from './pricing';
import { STORES, type Ingredient, type PriceFile, type Product, type Recipe, type StoreId, type Unit } from './types';

export interface ListLine { ingredientId: string; amount: number }
/** Own prices per store and ingredient. packUnit is the unit of packAmount (defaults to the ingredient's unit). */
export interface Override { price: number; packAmount: number; packUnit?: Unit; enteredAt: string }
export interface Overrides { [store: string]: { [ingredientId: string]: Override } }
export interface Pick { ingredientId: string; store: StoreId; product: Product; packs: number; cost: number; estimated: boolean; hint?: { packs: number; cost: number } }
export interface Option { stores: StoreId[]; total: number; picks: Pick[]; estimatedCount: number; unpricedIds: string[] }

export function buildList(recipes: Recipe[], ingredients: Map<string, Ingredient>, includePantry: boolean): ListLine[] {
  const sums = new Map<string, number>();
  for (const r of recipes) for (const l of r.lines) {
    const ing = ingredients.get(l.ingredientId);
    if (!ing || (ing.pantry && !includePantry)) continue;
    sums.set(l.ingredientId, (sums.get(l.ingredientId) ?? 0) + l.amount);
  }
  return [...sums].map(([ingredientId, amount]) => ({ ingredientId, amount }));
}

/** A real product for this store: the user's own price, unless the store has fetched a price for it after that price was entered. */
export function realProduct(store: StoreId, ing: Ingredient, prices: PriceFile, overrides: Overrides): Product | undefined {
  const o = overrides[store]?.[ing.id];
  const sp = prices.stores[store];
  const fetched = sp?.products[ing.id];
  const fetchedNewer = fetched && sp.fetchedAt.slice(0, 10) > o?.enteredAt!;
  if (o && !fetchedNewer) return { store, name: ing.name, packAmount: o.packAmount, packUnit: o.packUnit ?? ing.unit, price: o.price };
  return fetched;
}

function pickFor(store: StoreId, product: Product, line: ListLine, ing: Ingredient, today: string, estimated: boolean): Pick | null {
  const needed = toProductUnits(line.amount, ing, product);
  if (needed == null) return null;
  const { packs, cost, hint } = purchase(product, needed, today);
  return { ingredientId: line.ingredientId, store, product: { ...product, store }, packs, cost, estimated, ...(hint && { hint }) };
}

/** Best pick per store for one line: real when available, else an estimate copied from the cheapest real store. */
export function picksPerStore(line: ListLine, ing: Ingredient, prices: PriceFile, overrides: Overrides, today: string): Map<StoreId, Pick> {
  const real = new Map<StoreId, Pick>();
  for (const s of STORES) {
    const p = realProduct(s, ing, prices, overrides);
    const pick = p && pickFor(s, p, line, ing, today, false);
    if (pick) real.set(s, pick);
  }
  const cheapest = [...real.values()].sort((a, b) => a.cost - b.cost)[0];
  const out = new Map(real);
  // An estimate copies the cheapest real price, but never that store's offer or multi-buy hint.
  if (cheapest) {
    const { hint: _hint, ...base } = cheapest;
    for (const s of STORES) if (!out.has(s)) out.set(s, { ...base, store: s, product: { ...cheapest.product, store: s, offer: undefined }, estimated: true });
  }
  return out;
}

/** A real price always beats an estimate (spec §8.4); otherwise the cheaper one wins. */
const better = (a: Pick, b: Pick) => (a.estimated !== b.estimated ? !a.estimated : a.cost < b.cost);

export function compareStores(list: ListLine[], ingredients: Map<string, Ingredient>, prices: PriceFile, overrides: Overrides, today: string): { bestPair: Option; bestSingle: Option; all: Option[] } {
  const perLine = list.map((line) => {
    const ing = ingredients.get(line.ingredientId);
    return { line, picks: ing ? picksPerStore(line, ing, prices, overrides, today) : new Map<StoreId, Pick>() };
  });
  const combos: StoreId[][] = [...STORES.map((s) => [s])];
  STORES.forEach((a, i) => STORES.slice(i + 1).forEach((b) => combos.push([a, b])));

  const all = combos.map((stores): Option => {
    const picks: Pick[] = [];
    const unpricedIds: string[] = [];
    for (const { line, picks: byStore } of perLine) {
      let best: Pick | undefined;
      for (const s of stores) { const p = byStore.get(s); if (p && (!best || better(p, best))) best = p; }
      if (best) picks.push(best); else unpricedIds.push(line.ingredientId);
    }
    const total = Math.round(picks.reduce((t, p) => t + p.cost, 0) * 100) / 100;
    return { stores, total, picks, estimatedCount: picks.filter((p) => p.estimated).length, unpricedIds };
  });
  const rank = (a: Option, b: Option) => a.estimatedCount - b.estimatedCount || a.total - b.total;
  const bestPair = all.filter((o) => o.stores.length === 2).sort(rank)[0];
  const bestSingle = all.filter((o) => o.stores.length === 1).sort(rank)[0];
  return { bestPair, bestSingle, all };
}
