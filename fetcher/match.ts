import { toProductUnits } from '../shared/pricing';
import type { Ingredient, Product } from '../shared/types';

/** Words that mark a processed product or ready meal rather than the plain ingredient. */
const PROCESSED = [
  'soep', 'saus', 'sauce', 'chips', 'crème', 'creme', 'salade', 'maaltijd', 'verspakket', 'drink', 'siroop', 'vla', 'ketchup',
  'zoetzuur', 'naan', 'burger', 'surimi', 'vegan', 'stamppot', 'stampot', 'opbak', 'gegrild', 'geroosterd', 'mix', 'yoghurt',
  'kaas', 'zuurkool', 'koek', 'snoep', 'chocola', 'spread', 'smaak', 'dressing', 'pizza', 'wrap', 'tapenade', 'hummus', 'puree',
  'bouillon', 'olie', 'gevuld', 'kant-en-klaar', 'diner', 'snack', 'kroket', 'borrel',
  'blokjes', 'gezeefd', 'passata', 'zongedroogd', 'gepeld', 'grissini', 'cracker', 'toast', 'pesto', 'tortilla',
];

/** Lowercase without accents, so crème fraîche matches creme fraiche. */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** A candidate is plain when no processed-word occurs that is not part of the ingredient's own name or term, and the term is not only in a "met …" description. */
function isPlain(title: string, ing: Ingredient, term: string): boolean {
  const own = norm(`${ing.name} ${term}`);
  if (PROCESSED.some((w) => title.includes(w) && !own.includes(w))) return false;
  const met = title.indexOf(' met ');
  return met < 0 || title.indexOf(term) < met;
}

/** The best product for an ingredient among one store's candidates: plain product whose name contains the store's search term, convertible unit, lowest unit price. */
export function pickProduct(ing: Ingredient, candidates: Product[]): Product | null {
  const store = candidates[0]?.store;
  const term = store && ing.search[store] && norm(ing.search[store]!);
  if (!term) return null;
  const target = (p: Product) => (p.packUnit === 'stuk' ? 4 : 500);
  const usable = candidates.filter((p) => {
    const title = norm(p.title ?? p.name);
    return title.includes(term) && isPlain(title, ing, term) && toProductUnits(1, ing, p) != null;
  });
  usable.sort((a, b) =>
    a.price / a.packAmount - b.price / b.packAmount ||
    Math.abs(a.packAmount - target(a)) - Math.abs(b.packAmount - target(b)));
  return usable[0] ?? null;
}
