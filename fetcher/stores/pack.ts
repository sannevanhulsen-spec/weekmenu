import type { Unit } from '../../shared/types';

const NUM = String.raw`(\d+(?:\.\d+)?)`;
const UNIT = String.raw`(kilo|kg|gram|gr|g|ml|cl|liter|ltr|l)`;
const FACTOR: Record<string, [number, Unit]> = {
  kilo: [1000, 'g'], kg: [1000, 'g'], gram: [1, 'g'], gr: [1, 'g'], g: [1, 'g'],
  ml: [1, 'ml'], cl: [10, 'ml'], liter: [1000, 'ml'], ltr: [1000, 'ml'], l: [1000, 'ml'],
};

/** Pack size from a store text like "2 x 100 g", "1.5 KG", "4 stuks, 360 g". Weight/volume wins over pieces. */
export function parsePack(text: string): { packAmount: number; packUnit: Unit } | null {
  const t = text.toLowerCase().replace(/(\d),(\d)/g, '$1.$2');
  const multi = t.match(new RegExp(String.raw`(\d+)\s*x\s*${NUM}\s*${UNIT}\b`));
  if (multi) {
    const [f, u] = FACTOR[multi[3]];
    return { packAmount: Math.round(Number(multi[1]) * Number(multi[2]) * f), packUnit: u };
  }
  const single = t.match(new RegExp(String.raw`${NUM}\s*(?:-\s*\d+(?:\.\d+)?\s*)?${UNIT}\b`));
  if (single) {
    const [f, u] = FACTOR[single[2]];
    return { packAmount: Math.round(Number(single[1]) * f), packUnit: u };
  }
  const pieces = t.match(/(\d+)\s*(?:stuks|stuk|st)\b/);
  return pieces ? { packAmount: Number(pieces[1]), packUnit: 'stuk' } : null;
}
