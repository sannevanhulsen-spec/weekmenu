import { useState } from 'react';
import { buildList, compareStores, type Option, type Pick } from '../../../shared/compare';
import { activeOffer } from '../../../shared/pricing';
import { STORE_NAMES, type Recipe, type StoreId } from '../../../shared/types';
import { withWeek } from '../ctx';
import { ddmm, euro, todayIso } from '../data';
import { currentWeek } from '../db';
import type { ScreenProps } from './props';

const DAY = 86_400_000;
const endsSoon = (until: string, today: string) => (Date.parse(until) - Date.parse(today)) / DAY <= 2;
const unitLabel = (u: string) => (u === 'stuk' ? 'st' : u);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function OptionSummary({ label, option, active, onPick, testId }: { label: string; option: Option; active: boolean; onPick: () => void; testId: string }) {
  return (
    <button data-testid={testId} onClick={onPick} aria-pressed={active}
      className={`flex-1 rounded-lg border p-2 text-left text-sm ${active ? 'border-green-700 bg-green-50' : ''}`}>
      <div className="font-medium">{label}</div>
      <div>{option.stores.map((s) => STORE_NAMES[s]).join(' + ')}</div>
      <div className="text-lg font-semibold">{euro(option.total)}</div>
      {option.estimatedCount > 0 && <div className="text-xs text-amber-700">{plural(option.estimatedCount, 'item geschat', 'items geschat')}</div>}
      {option.unpricedIds.length > 0 && <div className="text-xs text-gray-500">{plural(option.unpricedIds.length, 'item zonder prijs', 'items zonder prijs')}</div>}
    </button>
  );
}

function PriceEditor({ pick, onSave, onCancel }: { pick: Pick; onSave: (price: number, packAmount: number) => void; onCancel: () => void }) {
  const [price, setPrice] = useState(pick.product.price.toFixed(2).replace('.', ','));
  const [pack, setPack] = useState(String(pick.product.packAmount));
  const parse = (s: string) => Number(s.replace(',', '.'));
  const valid = parse(price) > 0 && parse(pack) > 0;
  return (
    <div className="mt-1 flex flex-wrap items-end gap-2 rounded bg-gray-50 p-2 text-sm">
      <label className="flex flex-col">Prijs<input aria-label="Prijs" inputMode="decimal" className="w-20 rounded border px-1" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
      <label className="flex flex-col">Verpakking ({unitLabel(pick.product.packUnit)})<input aria-label="Verpakking" inputMode="decimal" className="w-20 rounded border px-1" value={pack} onChange={(e) => setPack(e.target.value)} /></label>
      <button disabled={!valid} onClick={() => onSave(parse(price), parse(pack))} className="rounded bg-green-700 px-2 py-1 text-white disabled:opacity-40">Opslaan</button>
      <button onClick={onCancel} className="px-2 py-1 text-gray-500">Annuleer</button>
    </div>
  );
}

export function ShoppingList({ data, state, update }: ScreenProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const today = todayIso();
  const week = currentWeek(state);
  const recipes = (week?.chosen ?? []).map((id) => data.recipes.find((r) => r.id === id)).filter((r): r is Recipe => !!r);
  if (!week || !recipes.length) return <p className="p-4 text-gray-600">Kies eerst recepten bij Voorstellen.</p>;

  const list = buildList(recipes, data.ingredients, state.includePantry);
  const { bestPair, bestSingle } = compareStores(list, data.ingredients, data.prices, state.overrides, today);
  const option = state.listMode === 'pair' ? bestPair : bestSingle;
  const diff = Math.round((bestSingle.total - bestPair.total) * 100) / 100;

  const saveOverride = (pick: Pick, price: number, packAmount: number) => {
    update({
      ...state,
      overrides: { ...state.overrides, [pick.store]: { ...state.overrides[pick.store], [pick.ingredientId]: { price, packAmount, enteredAt: today } } },
    });
    setEditing(null);
  };

  const byStore = new Map<StoreId, Pick[]>();
  for (const p of option.picks) byStore.set(p.store, [...(byStore.get(p.store) ?? []), p]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Boodschappenlijst</h1>
      <div className="mt-3 flex gap-2">
        <OptionSummary testId="pair" label="Twee winkels" option={bestPair} active={state.listMode === 'pair'} onPick={() => update({ ...state, listMode: 'pair' })} />
        <OptionSummary testId="single" label="Eén winkel" option={bestSingle} active={state.listMode === 'single'} onPick={() => update({ ...state, listMode: 'single' })} />
      </div>
      {diff > 0 && <p className="mt-2 text-sm text-green-800">Twee winkels: {euro(diff)} goedkoper</p>}
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={state.includePantry} onChange={(e) => update({ ...state, includePantry: e.target.checked })} />
        Basisvoorraad meenemen
      </label>

      {[...byStore].map(([store, picks]) => {
        const sp = data.prices.stores[store];
        const total = picks.reduce((t, p) => t + p.cost, 0);
        const aisles = new Map<string, Pick[]>();
        for (const p of picks) {
          const aisle = data.ingredients.get(p.ingredientId)?.aisle ?? 'overig';
          aisles.set(aisle, [...(aisles.get(aisle) ?? []), p]);
        }
        return (
          <section key={store} className="mt-5">
            <div className="flex items-baseline justify-between border-b pb-1">
              <h2 className="text-lg font-semibold">{STORE_NAMES[store]}</h2>
              <span className="text-sm">{euro(total)}</span>
            </div>
            {sp?.stale && <p className="text-xs text-amber-700">{STORE_NAMES[store]}: prijzen van {ddmm(sp.fetchedAt.slice(0, 10))}</p>}
            {[...aisles].map(([aisle, items]) => (
              <div key={aisle} className="mt-2">
                <h3 className="text-xs uppercase tracking-wide text-gray-500">{aisle}</h3>
                <ul>
                  {items.map((p) => {
                    const ing = data.ingredients.get(p.ingredientId)!;
                    const checked = week.checked.includes(p.ingredientId);
                    const offer = activeOffer(p.product, today);
                    const showHint = p.hint && !week.declinedHints.includes(p.ingredientId);
                    return (
                      <li key={p.ingredientId} className="border-b py-2 text-sm">
                        <div className="flex items-start gap-2">
                          <input id={`c-${p.ingredientId}`} type="checkbox" className="mt-1" checked={checked} aria-label={ing.name}
                            onChange={() => update(withWeek(state, (w) => ({ ...w, checked: checked ? w.checked.filter((x) => x !== p.ingredientId) : [...w.checked, p.ingredientId] })))} />
                          <label htmlFor={`c-${p.ingredientId}`} className={`flex-1 ${checked ? 'text-gray-400 line-through' : ''}`}>
                            <span className="font-medium">{ing.name}</span>
                            <span className="block text-xs text-gray-500">{p.estimated ? 'schatting' : p.product.name} · {p.packs} × {p.product.packAmount} {unitLabel(p.product.packUnit)}</span>
                          </label>
                          {p.estimated
                            ? <button onClick={() => setEditing(p.ingredientId)} className="text-amber-700 underline">~{euro(p.cost)}</button>
                            : <button onClick={() => setEditing(p.ingredientId)} className="text-gray-900">{euro(p.cost)}</button>}
                        </div>
                        {offer && endsSoon(offer.validUntil, today) && <p className="ml-6 text-xs text-red-700">aanbieding t/m {ddmm(offer.validUntil)}</p>}
                        {showHint && (
                          <p className="ml-6 flex items-center gap-2 text-xs text-green-800">
                            <span>neem {p.hint!.packs}, dan betaal je {euro(p.hint!.cost)} i.p.v. {euro(p.hint!.packs * p.product.price)}</span>
                            <button className="rounded border px-1.5" onClick={() => update(withWeek(state, (w) => ({ ...w, declinedHints: [...w.declinedHints, p.ingredientId] })))}>Nee</button>
                          </p>
                        )}
                        {editing === p.ingredientId && <PriceEditor pick={p} onSave={(price, pack) => saveOverride(p, price, pack)} onCancel={() => setEditing(null)} />}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        );
      })}

      {option.unpricedIds.length > 0 && (
        <section className="mt-5">
          <h2 className="text-lg font-semibold">Zonder prijs</h2>
          <ul className="text-sm text-gray-600">{option.unpricedIds.map((id) => <li key={id}>{data.ingredients.get(id)?.name ?? id}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
