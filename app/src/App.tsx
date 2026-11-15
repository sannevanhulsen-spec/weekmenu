import { useEffect, useState } from 'react';
import { defaultState, loadState, saveState, type AppState } from './db';
import { loadData, type AppData } from './data';
import { ShoppingList } from './screens/ShoppingList';
import { Settings } from './screens/Settings';
import { Suggestions } from './screens/Suggestions';

type Tab = 'voorstellen' | 'lijst' | 'instellingen';
const TABS: [Tab, string][] = [['voorstellen', 'Voorstellen'], ['lijst', 'Lijst'], ['instellingen', 'Instellingen']];

export function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [state, setState] = useState<AppState>(defaultState());
  const [tab, setTab] = useState<Tab>('voorstellen');

  useEffect(() => {
    Promise.all([loadData(), loadState()]).then(([d, s]) => { setData(d); setState(s); });
    navigator.storage?.persist?.();
  }, []);

  const update = (next: AppState) => { setState(next); void saveState(next); };

  if (!data) return <p className="p-4 text-gray-500">Laden…</p>;
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col bg-white text-gray-900">
      <main className="flex-1 overflow-y-auto pb-20">
        {tab === 'voorstellen' && <Suggestions data={data} state={state} update={update} />}
        {tab === 'lijst' && <ShoppingList data={data} state={state} update={update} />}
        {tab === 'instellingen' && <Settings data={data} state={state} update={update} />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-xl border-t bg-white pb-[env(safe-area-inset-bottom)]">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 py-3 text-sm font-medium ${tab === id ? 'text-green-700' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
