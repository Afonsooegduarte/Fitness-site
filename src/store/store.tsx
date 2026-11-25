import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { DB } from './types';
import { createSeed } from './seed';
import { clearDB, loadDB, saveDB } from './persist';
import { migrate } from '../lib/gyms';

interface StoreValue {
  db: DB;
  mutate: (fn: (draft: DB) => void) => void;
  replace: (db: DB) => void;
  reset: () => void;
  saved: boolean; // false quando o armazenamento do browser está cheio
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => {
    const saved = loadDB();
    return saved ? migrate(saved) : createSeed();
  });
  const first = useRef(true);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
    }
    const ok = saveDB(db);
    setSaved(ok);
    if (!ok) console.warn('Armazenamento local cheio: as alterações ficam só nesta sessão.');
  }, [db]);

  const mutate = useCallback((fn: (draft: DB) => void) => {
    setDb((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const replace = useCallback((next: DB) => setDb(migrate(next)), []);
  const reset = useCallback(() => {
    clearDB();
    setDb(createSeed());
  }, []);

  return <Ctx.Provider value={{ db, mutate, replace, reset, saved }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore fora do StoreProvider');
  return v;
}
