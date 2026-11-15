// Jumbo: public category pages (/producten/<categorie>/?offSet=N), which robots.txt allows. Search URLs are disallowed and not used.
import type { Product, ProductOffer } from '../../shared/types';
import { politeGet } from '../http';
import { parsePack } from './pack';

export const CATEGORIES = [
  'aardappelen,-groente-en-fruit', 'brood-en-gebak', 'vlees,-vis-en-vega', 'zuivel,-boter-en-eieren', 'vleeswaren,-kaas-en-tapas',
  'vega-en-plantaardig', 'conserven,-soepen,-sauzen,-olien', 'wereldkeukens,-kruiden,-pasta-en-rijst', 'diepvries',
];
const PAGE = 24;
const MAX_PAGES = 80;
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

const num = (s: string) => Number(s.replace(',', '.'));
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Period text like "wo 11 t/m di 17 nov" or "wo 7 jan t/m di 8 dec". */
function parsePeriod(period: string, today: string): { validFrom: string; validUntil: string } {
  const m = period.toLowerCase().match(/(\d{1,2})(?:\s+([a-z]{3}))?\s+t\/m\s+\S+\s+(\d{1,2})\s+([a-z]{3})/);
  if (!m) return { validFrom: today, validUntil: today };
  const endMonth = MONTHS.indexOf(m[4]);
  const startMonth = m[2] ? MONTHS.indexOf(m[2]) : endMonth;
  const [ty, tm] = today.split('-').map(Number);
  const endYear = endMonth < tm - 1 - 6 ? ty + 1 : ty;
  const startYear = startMonth > endMonth || (startMonth === endMonth && Number(m[1]) > Number(m[3])) ? endYear - 1 : endYear;
  return { validFrom: iso(startYear, startMonth, Number(m[1])), validUntil: iso(endYear, endMonth, Number(m[3])) };
}

export function parseOffer(label: string, period: string, today: string): ProductOffer | undefined {
  const l = label.toLowerCase().trim();
  const dates = () => parsePeriod(period, today);
  let m: RegExpMatchArray | null;
  if ((m = l.match(/^(\d+)\s*voor\s*(\d+(?:[,.]\d{2})?)$/))) return { kind: 'bundle', count: Number(m[1]), price: num(m[2]), ...dates(), label };
  if ((m = l.match(/^voor\s*(\d+(?:[,.]\d{2})?)$/))) return { kind: 'price', price: num(m[1]), ...dates(), label };
  if ((m = l.match(/^(\d+)\s*\+\s*(\d+)\s*gratis$/))) return { kind: 'multi', buy: Number(m[1]) + Number(m[2]), pay: Number(m[1]), ...dates(), label };
  if (/^2e\s*halve\s*prijs$/.test(l)) return { kind: 'multi', buy: 2, pay: 1.5, ...dates(), label };
  return undefined;
}

export function parse(html: string, today: string): Product[] {
  const clean = html.replace(/ data-v-[a-z0-9]+/g, '').replace(/<!--[[\]]?-->/g, '');
  const cards = clean.split('data-product-id="').slice(1);
  const out: Product[] = [];
  for (const card of cards) {
    const title = card.match(/class="title-link"[^>]*>([^<]+)</)?.[1];
    const subtitle = card.match(/data-testid="jum-card-subtitle"><p><span class="text">([^<]*)</)?.[1] ?? '';
    const price = card.match(/Prijs: €\s*(\d+,\d{2})/)?.[1];
    if (!title || !price) continue;
    const pack = parsePack(subtitle) ?? parsePack(title);
    if (!pack) continue;
    const name = decode(title);
    const product: Product = { store: 'jumbo', name, title: name, ...pack, price: num(price) };
    const period = card.match(/class="card-promotion">([^<]+)</)?.[1] ?? '';
    for (const t of card.matchAll(/class="tag-line">([^<]+)</g)) {
      const offer = parseOffer(decode(t[1]), period, today);
      if (offer) { product.offer = offer; break; }
    }
    out.push(product);
  }
  return out;
}

export async function fetchProducts(_terms: string[], today: string): Promise<Product[]> {
  const all: Product[] = [];
  for (const cat of CATEGORIES) {
    for (let page = 0; page < MAX_PAGES; page++) {
      const html = await politeGet(`https://www.jumbo.com/producten/${cat}/?offSet=${page * PAGE}`);
      const found = html ? parse(html, today) : [];
      if (!found.length) break;
      all.push(...found);
    }
  }
  return all;
}
