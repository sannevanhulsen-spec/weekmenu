// Feasibility spike (Task 1): can we read Jumbo and Aldi prices from robots.txt-allowed public pages?
// Throwaway: prints one summary line per store and exits non-zero if a store finds fewer than 7 of 10 terms.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const TERMS = ['kipfilet', 'gehakt', 'ui', 'paprika', 'rijst', 'pasta', 'melk', 'eieren', 'broccoli', 'kaas'];
const JUMBO_CATS = [
  'aardappelen,-groente-en-fruit', 'vlees,-vis-en-vega', 'zuivel,-boter-en-eieren',
  'vleeswaren,-kaas-en-tapas', 'wereldkeukens,-kruiden,-pasta-en-rijst',
];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const codes = new Map<string, number[]>();

async function get(store: string, url: string): Promise<string> {
  const r = await fetch(url, { headers: { 'user-agent': UA } });
  codes.set(store, [...(codes.get(store) ?? []), r.status]);
  await sleep(500);
  return r.ok ? r.text() : '';
}

async function jumbo(): Promise<string[]> {
  const titles: string[] = [];
  for (const cat of JUMBO_CATS) {
    for (let off = 0; off < 24 * 5; off += 24) {
      const html = await get('jumbo', `https://www.jumbo.com/producten/${cat}/?offSet=${off}`);
      const found = [...html.matchAll(/class="title-link"[^>]*><!--\[-->([^<]+)</g)].map((m) => m[1]);
      if (!found.length) break;
      titles.push(...found);
    }
  }
  return titles;
}

async function aldi(): Promise<string[]> {
  const sm = await get('aldi', 'https://www.aldi.nl/sitemaps/.aldi-nord-sitemap-products.xml');
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const titles: string[] = [];
  for (const t of TERMS) {
    for (const u of urls.filter((x) => x.split('/').pop()!.includes(t)).slice(0, 5)) {
      const html = await get('aldi', u);
      const next = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)?.[1];
      const api = next?.match(/"apiData":"(.*?)","/s)?.[1];
      if (!api) continue;
      const data = JSON.parse(JSON.parse(`"${api}"`));
      const p = data[0]?.[1]?.res?.products?.[0];
      if (p?.currentPrice?.priceValue) { titles.push(`${p.name} ${p.salesUnit} €${p.currentPrice.priceValue}`); break; }
    }
  }
  return titles;
}

let failed = false;
for (const [store, fn] of [['jumbo', jumbo], ['aldi', aldi]] as const) {
  const titles = await fn();
  const hit = TERMS.filter((t) => titles.some((x) => x.toLowerCase().includes(t)));
  console.log(`${store}: ${hit.length}/10 found (${titles.length} products), http=${[...new Set(codes.get(store))].join(',')}`);
  if (hit.length < 7) failed = true;
}
process.exit(failed ? 1 : 0);

export {};
