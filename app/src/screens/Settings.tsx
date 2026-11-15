import { useState } from 'react';
import { realProduct } from '../../../shared/compare';
import { STORE_NAMES, STORES, type Ingredient, type StoreId } from '../../../shared/types';
import { toggle } from '../ctx';
import { ddmm, euro, todayIso } from '../data';
import { exportBackup, importBackup } from '../db';
import { PriceEditor, unitLabel } from './PriceEditor';
import type { ScreenProps } from './props';

const MANUAL_STORES: StoreId[] = ['ah', 'lidl'];

function ManualPrices({ store, data, state, update }: ScreenProps & { store: StoreId }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const today = todayIso();
  const ingredients = [...data.ingredients.values()]
    .filter((i) => !i.pantry && i.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  const cheapestElsewhere = (ing: Ingredient) => STORES.filter((s) => s !== store)
    .map((s) => realProduct(s, ing, data.prices, state.overrides))
    .filter((p) => !!p)
    .sort((a, b) => a!.price / a!.packAmount - b!.price / b!.packAmount)[0];

  return (
    <section aria-label={`Prijzen ${STORE_NAMES[store]}`} className="mt-6">
      <h2 className="font-medium">Prijzen {STORE_NAMES[store]}</h2>
      <p className="text-xs text-gray-500">Vul in wat je in de winkel ziet. Zonder prijs rekent de app met een schatting (~).</p>
      <input placeholder="Zoek ingrediënt" value={query} onChange={(e) => setQuery(e.target.value)} className="mt-2 w-full rounded border px-2 py-1 text-sm" />
      <ul className="mt-1 max-h-96 overflow-y-auto text-sm">
        {ingredients.map((ing) => {
          const own = state.overrides[store]?.[ing.id];
          const est = own ? undefined : cheapestElsewhere(ing);
          const text = own
            ? `${euro(own.price)} · ${own.packAmount} ${unitLabel(ing.unit)} · ingevuld op ${ddmm(own.enteredAt)}`
            : est ? `~ ${euro(est.price)} · ${est.packAmount} ${unitLabel(est.packUnit)}` : 'geen prijs';
          return (
            <li key={ing.id} className="border-b py-1.5">
              <button onClick={() => setEditing(ing.id)} className="flex w-full justify-between text-left">
                <span>{ing.name}</span><span className={own ? '' : 'text-gray-400'}>{text}</span>
              </button>
              {editing === ing.id && (
                <PriceEditor price={own?.price ?? est?.price ?? 1} packAmount={own?.packAmount ?? (est?.packUnit === ing.unit ? est.packAmount : ing.unit === 'stuk' ? 1 : 500)} unit={ing.unit}
                  onCancel={() => setEditing(null)}
                  onSave={(price, packAmount) => {
                    update({ ...state, overrides: { ...state.overrides, [store]: { ...state.overrides[store], [ing.id]: { price, packAmount, enteredAt: today } } } });
                    setEditing(null);
                  }} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Settings(props: ScreenProps) {
  const { data, state, update } = props;
  const [message, setMessage] = useState('');

  const download = () => {
    const blob = new Blob([exportBackup(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `weekmenu-backup-${todayIso()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      update(importBackup(await file.text()));
      setMessage('Back-up teruggezet');
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  const recipeTitle = (id: string) => data.recipes.find((r) => r.id === id)?.title ?? id;
  const ingName = (id: string) => data.ingredients.get(id)?.name ?? id;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Instellingen</h1>

      <section className="mt-4">
        <h2 className="font-medium">Back-up</h2>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <button onClick={download} className="rounded-lg border px-3 py-1">Back-up exporteren</button>
          <label className="rounded-lg border px-3 py-1">
            Back-up importeren
            <input aria-label="Back-up importeren" type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void restore(e.target.files?.[0])} />
          </label>
        </div>
        {message && <p role="status" className="mt-1 text-sm">{message}</p>}
      </section>

      <section className="mt-6">
        <h2 className="font-medium">Lust ik niet</h2>
        {!state.dislikedRecipes.length && !state.dislikedIngredients.length && <p className="text-sm text-gray-500">Nog niets.</p>}
        <ul className="text-sm">
          {state.dislikedRecipes.map((id) => (
            <li key={id} className="flex justify-between border-b py-1"><span>{recipeTitle(id)}</span>
              <button aria-label={`Terugzetten: ${recipeTitle(id)}`} className="text-green-700" onClick={() => update({ ...state, dislikedRecipes: toggle(state.dislikedRecipes, id) })}>Terugzetten</button></li>
          ))}
          {state.dislikedIngredients.map((id) => (
            <li key={id} className="flex justify-between border-b py-1"><span>{ingName(id)} (ingrediënt)</span>
              <button aria-label={`Terugzetten: ${ingName(id)}`} className="text-green-700" onClick={() => update({ ...state, dislikedIngredients: toggle(state.dislikedIngredients, id) })}>Terugzetten</button></li>
          ))}
        </ul>
      </section>

      {MANUAL_STORES.map((s) => <ManualPrices key={s} store={s} {...props} />)}

      <section className="mt-6 text-sm text-gray-600">
        <h2 className="font-medium text-gray-900">Over</h2>
        <p>Voedingswaarden:</p>
        <p>NEVO-online versie 2025/9.0, RIVM, Bilthoven</p>
        <p className="mt-1">Prijzen zijn indicatief; ~ = geschat</p>
        <p className="mt-1">Jumbo en Aldi worden dagelijks opgehaald, laatst: {data.prices.generatedAt ? ddmm(data.prices.generatedAt.slice(0, 10)) : 'nog nooit'}.</p>
      </section>
    </div>
  );
}
