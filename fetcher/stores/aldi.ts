// Aldi: product sitemap + product pages, both allowed by robots.txt. Only products whose slug contains a search term are fetched.
import type { Product } from '../../shared/types';
import { politeGet } from '../http';
import { parsePack } from './pack';

const SITEMAP = 'https://www.aldi.nl/sitemaps/.aldi-nord-sitemap-products.xml';
const isoDay = (epochSeconds: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' }).format(new Date(epochSeconds * 1000));
const euro = (n: number) => n.toFixed(2).replace('.', ',');

interface AldiProduct {
  name: string; salesUnit?: string; shortDescription?: string;
  currentPrice?: { priceValue: number; validFrom: number; validUntil: number; strikePrice?: { strikePriceValue: number } };
}

export function parse(html: string): Product[] {
  const next = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)?.[1];
  const api = next?.match(/"apiData":"(.*?)","/s)?.[1];
  if (!api) return [];
  const p: AldiProduct | undefined = JSON.parse(JSON.parse(`"${api}"`))?.[0]?.[1]?.res?.products?.[0];
  const cp = p?.currentPrice;
  const pack = p && parsePack(p.salesUnit ?? p.shortDescription ?? '');
  if (!p || !cp?.priceValue || !pack) return [];
  const strike = cp.strikePrice?.strikePriceValue;
  const product: Product = { store: 'aldi', name: p.name, title: p.name, ...pack, price: strike ?? cp.priceValue };
  if (strike) {
    product.offer = {
      kind: 'price', price: cp.priceValue, validFrom: isoDay(cp.validFrom), validUntil: isoDay(cp.validUntil),
      label: `van ${euro(strike)} voor ${euro(cp.priceValue)}`,
    };
  }
  return [product];
}

/** Sitemap product URLs whose slug contains one of the terms. */
export function matchingUrls(sitemap: string, terms: string[]): string[] {
  const lower = terms.map((t) => t.toLowerCase().replace(/\s+/g, '-'));
  return [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    .filter((u) => { const slug = u.split('/').pop()!; return lower.some((t) => slug.includes(t)); });
}

export async function fetchProducts(terms: string[]): Promise<Product[]> {
  const sitemap = await politeGet(SITEMAP);
  if (!sitemap) throw new Error('Aldi sitemap niet bereikbaar');
  const all: Product[] = [];
  for (const url of matchingUrls(sitemap, terms)) {
    const html = await politeGet(url);
    if (html) all.push(...parse(html));
  }
  return all;
}
