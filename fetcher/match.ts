import { toProductUnits } from '../shared/pricing';
import type { Ingredient, Product } from '../shared/types';

/** Words that mark a processed product or ready meal rather than the plain ingredient. */
const PROCESSED = [
  'soep', 'saus', 'sauce', 'chips', 'crème', 'creme', 'salade', 'maaltijd', 'verspakket', 'drink', 'siroop', 'vla', 'ketchup',
  'zoetzuur', 'naan', 'burger', 'surimi', 'vegan', 'stamppot', 'stampot', 'opbak', 'gegrild', 'geroosterd', 'mix', 'yoghurt',
  'kaas', 'zuurkool', 'koek', 'snoep', 'chocola', 'spread', 'smaak', 'dressing', 'pizza', 'wrap', 'tapenade', 'hummus', 'puree',
  'bouillon', 'olie', 'gevuld', 'kant-en-klaar', 'diner', 'snack', 'kroket', 'borrel',
  'blokjes', 'gezeefd', 'passata', 'zongedroogd', 'gepeld', 'grissini', 'cracker', 'toast', 'pesto', 'tortilla',
  'polpa', 'pomodoro', 'baguette', 'shot', 'limonade', 'vitaminewater', 'sap', 'atjar', 'falafel', 'pangalicious', 'ovengroente',
  'meel', 'salsa', 'girasoli', 'focaccia', 'krokant', 'schnitzel', 'lasagne', 'appelmoes', 'jus', 'ballen', 'aardappelschijf',
  'sinaasappel', 'helder', 'oosterse', 'rijst', 'stroop', 'herten', 'truffel', 'aardappel',
];

/** Words that do not make a name less plain: store brand, freshness, cut, size and packaging words. */
const NEUTRAL = new Set([
  'jumbo', "jumbo's", 'biologisch', 'biologische', 'vers', 'verse', 'gesneden', 'voordeelverpakking', 'voordeel', 'naturel',
  'stuks', 'stuk', 'ca', 'x', 'extra', 'groot', 'grote', 'mini', 'kg', 'g', 'gr', 'ml', 'l', 'gram', 'de', 'het', 'van', 'en', 'in',
  'nederlandse', 'hollandse', 'zachte', 'witte', 'rode', 'gele', 'groene', 'scharrel', 'vrije', 'uitloop', 'kilo', 'liter', 'vlugkokend',
]);
const MAX_EXTRA_WORDS = 2;

/** Lowercase without accents and soft hyphens, so crème fraîche matches creme fraiche. */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ­]/g, '').toLowerCase();

/** A candidate is plain when no processed-word occurs that is not part of the ingredient's own name or term, and the term is not only in a "met …" description. */
function isPlain(title: string, ing: Ingredient, term: string): boolean {
  const own = norm(`${ing.name} ${term}`);
  if (PROCESSED.some((w) => title.includes(w) && !own.includes(w))) return false;
  const met = title.indexOf(' met ');
  return met < 0 || title.indexOf(term) < met;
}

/** Words in the name besides the search term, numbers and neutral words. Fewer means a plainer product. */
function extraWords(title: string, term: string): number {
  const termWords = term.split(/\s+/);
  return title.split(/[\s,.&()/+:-]+/)
    .filter((w) => w && !/\d/.test(w) && !NEUTRAL.has(w) && !termWords.some((t) => w.includes(t))).length;
}

/** The best product for an ingredient among one store's candidates: a plain product whose name contains the store's search term,
 *  with a convertible unit; the fewest extra words first, then the lowest unit price. */
export function pickProduct(ing: Ingredient, candidates: Product[]): Product | null {
  const store = candidates[0]?.store;
  const term = store && ing.search[store] && norm(ing.search[store]!);
  if (!term) return null;
  const target = (p: Product) => (p.packUnit === 'stuk' ? 4 : 500);
  const usable = candidates
    .map((p) => ({ p, title: norm(p.title ?? p.name) }))
    .filter(({ p, title }) => title.includes(term) && isPlain(title, ing, term) && toProductUnits(1, ing, p) != null)
    .map(({ p, title }) => ({ p, extra: extraWords(title, term) }))
    .filter(({ extra }) => extra <= MAX_EXTRA_WORDS);
  usable.sort((a, b) =>
    a.extra - b.extra ||
    a.p.price / a.p.packAmount - b.p.price / b.p.packAmount ||
    Math.abs(a.p.packAmount - target(a.p)) - Math.abs(b.p.packAmount - target(b.p)));
  return usable[0]?.p ?? null;
}
