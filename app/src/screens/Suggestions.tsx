import { useState } from 'react';
import { nutritionPerPortion } from '../../../shared/nutrition';
import { activeOffer } from '../../../shared/pricing';
import { recipePrice, suggest, type Filters, type SuggestCtx } from '../../../shared/suggest';
import { STORES, type Recipe } from '../../../shared/types';
import { suggestCtx, toggle, withWeek } from '../ctx';
import { euro, todayIso } from '../data';
import { currentWeek } from '../db';
import type { ScreenProps } from './props';
import { RecipeDetail } from './RecipeDetail';

const COUNT = 12;

function hasOffer(r: Recipe, ctx: SuggestCtx) {
  return r.lines.some((l) => STORES.some((s) => {
    const p = ctx.prices.stores[s]?.products[l.ingredientId];
    return p && !ctx.ingredients.get(l.ingredientId)?.pantry && activeOffer(p, ctx.today);
  }));
}

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const box = (key: 'highProtein' | 'vegetarian' | 'quick', label: string) => (
    <label className="flex items-center gap-1.5">
      <input type="checkbox" checked={filters[key]} onChange={(e) => onChange({ ...filters, [key]: e.target.checked })} />
      {label}
    </label>
  );
  const num = (key: 'maxKcal' | 'maxPricePerPortion', label: string, step: string) => (
    <label className="flex items-center gap-1.5">
      {label}
      <input type="number" inputMode="decimal" step={step} min="0" className="w-16 rounded border px-1 py-0.5"
        value={filters[key] ?? ''} onChange={(e) => onChange({ ...filters, [key]: e.target.value === '' ? undefined : Number(e.target.value) })} />
    </label>
  );
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 border-b px-4 py-3 text-sm">
      {box('highProtein', 'Veel eiwit')}{box('vegetarian', 'Vegetarisch')}{box('quick', 'Snel')}
      {num('maxKcal', 'Max kcal', '50')}{num('maxPricePerPortion', 'Max €/portie', '0.5')}
    </div>
  );
}

export function Suggestions(props: ScreenProps) {
  const { data, state, update } = props;
  const [openId, setOpenId] = useState<string | null>(null);
  const today = todayIso();
  const week = currentWeek(state);

  const startWeek = () => update({
    ...state,
    weeks: [...state.weeks, { id: `${today}-${state.weeks.length + 1}`, startedAt: today, chosen: [], swappedAway: [], checked: [], declinedHints: [] }],
  });

  const open = openId ? data.recipes.find((r) => r.id === openId) : undefined;
  if (open) return <RecipeDetail {...props} recipe={open} onBack={() => setOpenId(null)} />;

  if (!week) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">Weekmenu</h1>
        <p className="mt-2 text-sm text-gray-600">Begin een nieuwe week om recepten te kiezen.</p>
        <button onClick={startWeek} className="mt-4 rounded-lg bg-green-700 px-4 py-2 text-white">Nieuw weekmenu</button>
      </div>
    );
  }

  const ctx = suggestCtx(data, state, today);
  const list = suggest(ctx, COUNT);
  const chosen = week.chosen.map((id) => data.recipes.find((r) => r.id === id)).filter((r): r is Recipe => !!r);

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-xl font-semibold">Voorstellen</h1>
        <button onClick={startWeek} className="text-sm text-green-700">Nieuw weekmenu</button>
      </div>
      <FilterBar filters={state.filters} onChange={(filters) => update({ ...state, filters })} />

      {chosen.length > 0 && (
        <section className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">Gekozen ({chosen.length})</h2>
          <ul className="mt-1 text-sm">
            {chosen.map((r) => (
              <li key={r.id} className="flex justify-between py-0.5">
                <button onClick={() => setOpenId(r.id)} className="text-left">{r.title}</button>
                <button aria-label={`Verwijder ${r.title}`} className="text-gray-400"
                  onClick={() => update(withWeek(state, (w) => ({ ...w, chosen: w.chosen.filter((x) => x !== r.id) })))}>✕</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {list.length < COUNT && <p className="px-4 pt-3 text-sm text-amber-700">Minder voorstellen door je filters</p>}
      <div className="space-y-3 p-4">
        {list.map((r) => {
          const n = nutritionPerPortion(r, data.ingredients, data.nevo);
          const price = recipePrice(r, ctx);
          return (
            <article key={r.id} aria-label={r.title} className="rounded-xl border p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => setOpenId(r.id)} className="text-left font-medium">{r.title}</button>
                {hasOffer(r, ctx) && <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-800">Aanbieding</span>}
              </div>
              <p className="mt-1 text-sm text-gray-600">
                <span>{price.estimated ? '~' : ''}{euro(price.price)}</span> voor 2 · {r.minutes} min · {Math.round(n.kcal)} kcal · {Math.round(n.protein)} g eiwit p.p.
              </p>
              <div className="mt-2 flex gap-2 text-sm">
                <button className="rounded-lg bg-green-700 px-3 py-1 text-white"
                  onClick={() => update(withWeek(state, (w) => ({ ...w, chosen: [...w.chosen, r.id] })))}>Kies</button>
                <button className="rounded-lg border px-3 py-1"
                  onClick={() => update(withWeek(state, (w) => ({ ...w, swappedAway: [...w.swappedAway, r.id] })))}>Wissel</button>
                <button className="ml-auto px-2 py-1 text-gray-500"
                  onClick={() => update({ ...state, dislikedRecipes: toggle(state.dislikedRecipes, r.id) })}>Lust ik niet</button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
