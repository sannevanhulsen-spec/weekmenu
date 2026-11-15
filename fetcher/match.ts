import { toProductUnits } from '../shared/pricing';
import type { Ingredient, Product } from '../shared/types';

/** The best product for an ingredient among one store's candidates: name contains the store's search term, convertible unit, lowest unit price. */
export function pickProduct(ing: Ingredient, candidates: Product[]): Product | null {
  const store = candidates[0]?.store;
  const term = store && ing.search[store]?.toLowerCase();
  if (!term) return null;
  const target = (p: Product) => (p.packUnit === 'stuk' ? 4 : 500);
  const usable = candidates.filter((p) => (p.title ?? p.name).toLowerCase().includes(term) && toProductUnits(1, ing, p) != null);
  usable.sort((a, b) =>
    a.price / a.packAmount - b.price / b.packAmount ||
    Math.abs(a.packAmount - target(a)) - Math.abs(b.packAmount - target(b)));
  return usable[0] ?? null;
}
