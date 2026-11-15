import { useState } from 'react';

export const unitLabel = (u: string) => (u === 'stuk' ? 'st' : u);

/** Inline form for entering your own price and pack size. */
export function PriceEditor({ price, packAmount, unit, onSave, onCancel }: {
  price: number; packAmount: number; unit: string; onSave: (price: number, packAmount: number) => void; onCancel: () => void;
}) {
  const [priceText, setPrice] = useState(price.toFixed(2).replace('.', ','));
  const [pack, setPack] = useState(String(packAmount));
  const parse = (s: string) => Number(s.replace(',', '.'));
  const valid = parse(priceText) > 0 && parse(pack) > 0;
  return (
    <div className="mt-1 flex flex-wrap items-end gap-2 rounded bg-gray-50 p-2 text-sm">
      <label className="flex flex-col">Prijs<input aria-label="Prijs" inputMode="decimal" className="w-20 rounded border px-1" value={priceText} onChange={(e) => setPrice(e.target.value)} /></label>
      <label className="flex flex-col">Verpakking ({unitLabel(unit)})<input aria-label="Verpakking" inputMode="decimal" className="w-20 rounded border px-1" value={pack} onChange={(e) => setPack(e.target.value)} /></label>
      <button disabled={!valid} onClick={() => onSave(parse(priceText), parse(pack))} className="rounded bg-green-700 px-2 py-1 text-white disabled:opacity-40">Opslaan</button>
      <button onClick={onCancel} className="px-2 py-1 text-gray-500">Annuleer</button>
    </div>
  );
}
