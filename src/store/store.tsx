import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { DB } from './types';
import { createSeed } from './seed';
import { clearDB, loadDB, saveDB } from './persist';
import { migrate } from '../lib/gyms';
import { SYNC_ENABLED, SyncEngine, type SyncStatus } from './remote';

interface StoreValue {
  db: DB;
  mutate: (fn: (draft: DB) => void) => void;
  replace: (db: DB) => void;
  reset: () => void;
  saved: boolean; // false quando o armazenamento do browser está cheio
  sync: SyncStatus; // 'local' quando não há servidor
  syncDetail: string;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDbState] = useState<DB>(() => {
    if (SYNC_ENABLED) return createSeed(); // substituído pelos dados do servidor antes de mostrar a app
    const saved = loadDB();
    return saved ? migrate(saved) : createSeed();
  });
  // O ref é a fonte de verdade síncrona: cada alteração é calculada sobre o estado mais recente.
  const ref = useRef(db);
  const setDb = useCallback((next: DB) => {
    ref.current = next;
    setDbState(next);
  }, []);
  const [saved, setSaved] = useState(true);
  const [sync, setSync] = useState<SyncStatus>(SYNC_ENABLED ? 'loading' : 'local');
  const [syncDetail, setSyncDetail] = useState('');
  const [ready, setReady] = useState(!SYNC_ENABLED);
  const engine = useRef<SyncEngine | null>(null);

  useEffect(() => {
    if (!SYNC_ENABLED) return;
    const e = new SyncEngine({
      get: () => ref.current,
      set: setDb,
      status: (s, d) => { setSync(s); setSyncDetail(d ?? ''); },
      seed: createSeed,
      migrate,
    });
    engine.current = e;
    e.start().then(() => setReady(true));
    return () => e.stop();
  }, [setDb]);

  useEffect(() => {
    if (SYNC_ENABLED) return; // online: o servidor guarda; as fotos não cabiam no browser
    const ok = saveDB(db);
    setSaved(ok);
    if (!ok) console.warn('Armazenamento local cheio: as alterações ficam só nesta sessão.');
  }, [db]);

  const mutate = useCallback((fn: (draft: DB) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    setDb(next);
    engine.current?.queue(fn);
  }, [setDb]);

  // Importar ou repor substitui tudo; no modo online também é enviado como alteração.
  const overwrite = useCallback((next: DB) => {
    const clean = migrate(structuredClone(next));
    setDb(clean);
    engine.current?.queue((d) => {
      for (const k of Object.keys(d)) delete (d as any)[k];
      Object.assign(d, structuredClone(clean));
    });
  }, [setDb]);

  const replace = useCallback((next: DB) => overwrite(next), [overwrite]);
  const reset = useCallback(() => {
    clearDB();
    overwrite(createSeed());
  }, [overwrite]);

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--chalk)', color: 'var(--ink-2)', padding: 24, textAlign: 'center' }}>
        <div>
          <div style={{ font: '600 28px/1 var(--display)', color: 'var(--ink)' }}>Pulso</div>
          <p style={{ marginTop: 10 }}>{sync === 'offline' ? 'Sem ligação. A tentar outra vez…' : sync === 'error' ? 'Não foi possível ler os dados. A tentar outra vez…' : 'A carregar os dados…'}</p>
          {sync === 'error' && <p style={{ marginTop: 8, fontSize: 12, maxWidth: 520 }}>{syncDetail}</p>}
        </div>
      </div>
    );
  }

  return <Ctx.Provider value={{ db, mutate, replace, reset, saved, sync, syncDetail }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore fora do StoreProvider');
  return v;
}
