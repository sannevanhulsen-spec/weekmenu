import { nutritionPerPortion } from '../../../shared/nutrition';
import type { Recipe } from '../../../shared/types';
import { toggle } from '../ctx';
import type { ScreenProps } from './props';

const fmtAmount = (amount: number, unit: string) => (unit === 'stuk' ? `${amount} st` : `${amount} ${unit}`);

export function RecipeDetail({ data, state, update, recipe, onBack }: ScreenProps & { recipe: Recipe; onBack: () => void }) {
  const n = nutritionPerPortion(recipe, data.ingredients, data.nevo);
  const favorite = state.favorites.includes(recipe.id);
  const rows: [string, string][] = [
    ['Energie', `${Math.round(n.kcal)} kcal`], ['Eiwit', `${Math.round(n.protein)} g`], ['Koolhydraten', `${Math.round(n.carbs)} g`],
    ['Vet', `${Math.round(n.fat)} g`], ['Vezels', `${Math.round(n.fiber)} g`], ['Zout', `${n.salt.toFixed(1).replace('.', ',')} g`],
  ];
  return (
    <div className="p-4">
      <button onClick={onBack} className="mb-3 text-sm text-green-700">Terug</button>
      <h1 className="text-xl font-semibold">{recipe.title}</h1>
      <p className="text-sm text-gray-500">{recipe.minutes} min · voor 2 personen</p>
      <button onClick={() => update({ ...state, favorites: toggle(state.favorites, recipe.id) })}
        aria-pressed={favorite} className={`mt-2 rounded-full border px-3 py-1 text-sm ${favorite ? 'border-green-700 bg-green-50 text-green-800' : ''}`}>
        {favorite ? '♥ Lekker' : '♡ Lekker'}
      </button>

      <h2 className="mt-5 font-medium">Per portie</h2>
      <dl className="mt-1 grid grid-cols-2 gap-x-4 text-sm">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between border-b py-1"><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>

      <h2 className="mt-5 font-medium">Ingrediënten</h2>
      <ul className="mt-1 text-sm">
        {recipe.lines.map((l) => {
          const ing = data.ingredients.get(l.ingredientId);
          if (!ing) return null;
          const disliked = state.dislikedIngredients.includes(ing.id);
          return (
            <li key={ing.id} className="flex items-center justify-between border-b py-1.5">
              <span>{fmtAmount(l.amount, ing.unit)} {ing.name}{ing.pantry && <span className="text-gray-400"> (voorraad)</span>}</span>
              <button aria-label={`Lust ik niet: ${ing.name}`} onClick={() => update({ ...state, dislikedIngredients: toggle(state.dislikedIngredients, ing.id) })}
                className={`text-xs ${disliked ? 'text-red-700' : 'text-gray-400'}`}>
                {disliked ? 'Lust ik niet ✓' : 'Lust ik niet'}
              </button>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-5 font-medium">Bereiding</h2>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">{recipe.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
    </div>
  );
}
