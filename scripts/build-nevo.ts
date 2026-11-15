// Reads the NEVO-online 2025/9.0 CSV (extracted to .cache/nevo/), resolves each ingredient's `nevo` name from
// scripts/data-src.ts to a NEVO code, and writes data/nevo-codes.json + data/nevo.json (values copied unchanged).
// Usage: npx tsx scripts/build-nevo.ts [path-to-NEVO2025_v9.0.csv]
import { readFileSync, writeFileSync } from 'node:fs';
import type { NevoItem } from '../shared/types';
import { INGREDIENTS } from './data-src';

const file = process.argv[2] ?? '.cache/nevo/NEVO2025_v9.0.csv';
const rows = readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => l.split('|').map((c) => c.replace(/^"|"$/g, '')));
const head = rows[0];
const col = (name: string) => { const i = head.findIndex((h) => h.startsWith(name)); if (i < 0) throw new Error(`kolom ${name} ontbreekt`); return i; };
const C = { code: col('NEVO-code'), name: col('Voedingsmiddelnaam'), kcal: col('ENERCC'), prot: col('PROT (g)'), cho: col('CHO (g)'), fat: col('FAT (g)'), fib: col('FIBT'), na: col('NA (mg)') };
const num = (s: string) => (s === '' ? 0 : Number(s.replace(',', '.')));

const foods: NevoItem[] = rows.slice(1).map((r) => ({
  code: Number(r[C.code]), name: r[C.name],
  kcal: num(r[C.kcal]), protein: num(r[C.prot]), carbs: num(r[C.cho]), fat: num(r[C.fat]), fiber: num(r[C.fib]), na: num(r[C.na]),
}));
const byName = new Map(foods.map((f) => [f.name.toLowerCase(), f]));

const codes: Record<string, number> = {};
const missing: string[] = [];
for (const ing of INGREDIENTS) {
  const hit = byName.get(ing.nevo.toLowerCase());
  if (hit) { codes[ing.id] = hit.code; continue; }
  const words = ing.nevo.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const near = foods.filter((f) => words.every((w) => f.name.toLowerCase().includes(w.replace(/-$/, '')))).slice(0, 6).map((f) => `${f.code} ${f.name}`);
  const first = foods.filter((f) => f.name.toLowerCase().startsWith(words[0] ?? '')).slice(0, 8).map((f) => `${f.code} ${f.name}`);
  missing.push(`${ing.id} ← "${ing.nevo}"\n    ${(near.length ? near : first).join('\n    ') || '(niets)'}`);
}
const used = new Set(Object.values(codes));
writeFileSync('data/nevo-codes.json', JSON.stringify(codes, null, 1));
writeFileSync('data/nevo.json', JSON.stringify(foods.filter((f) => used.has(f.code)), null, 1));
console.log(`${Object.keys(codes).length}/${INGREDIENTS.length} gekoppeld`);
if (missing.length) console.log(`Niet gevonden:\n${missing.join('\n')}`);
