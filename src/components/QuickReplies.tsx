import { useState } from 'react';
import { Plus, Settings2, X, Zap } from 'lucide-react';
import { useStore } from '../store/store';

// Frases guardadas pelo treinador, inseridas com um clique no feedback ou nas mensagens.
export function QuickReplies({ current, onPick }: { current: string; onPick: (text: string) => void }) {
  const { db, mutate } = useStore();
  const [manage, setManage] = useState(false);
  const [draft, setDraft] = useState('');
  const list = db.quickReplies ?? [];
  const cur = current.trim();
  const add = (t: string) => {
    const v = t.trim();
    if (!v || list.includes(v)) return;
    mutate((d) => void (d.quickReplies = [...(d.quickReplies ?? []), v]));
  };
  return (
    <div className="stack-sm">
      <div className="row small">
        <Zap size={14} color="var(--yellow)" aria-hidden />
        <span className="muted">Respostas rápidas</span>
        <span className="spacer" />
        {cur && !list.includes(cur) && <button type="button" className="btn btn-sm btn-ghost" onClick={() => add(cur)}><Plus size={13} /> Guardar texto atual</button>}
        <button type="button" className="btn btn-sm btn-ghost" aria-pressed={manage} onClick={() => setManage(!manage)}><Settings2 size={13} /> {manage ? 'Feito' : 'Gerir'}</button>
      </div>
      <div className="row-wrap" style={{ gap: 6 }}>
        {list.length === 0 && <span className="faint small">Ainda não tens respostas guardadas.</span>}
        {list.map((t) => (
          <span key={t} className="chip" style={{ maxWidth: '100%', paddingRight: manage ? 4 : undefined }}>
            <button type="button" onClick={() => onPick(t)} title={t} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{t}</button>
            {manage && (
              <button type="button" aria-label={`Apagar “${t}”`} onClick={() => mutate((d) => void (d.quickReplies = (d.quickReplies ?? []).filter((x) => x !== t)))} style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--red)', display: 'grid', placeItems: 'center', padding: 2 }}>
                <X size={13} />
              </button>
            )}
          </span>
        ))}
      </div>
      {manage && (
        <form className="row" onSubmit={(e) => { e.preventDefault(); add(draft); setDraft(''); }}>
          <input className="input sm" placeholder="Nova resposta rápida" aria-label="Nova resposta rápida" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button className="btn btn-sm" disabled={!draft.trim()}><Plus size={13} /> Acrescentar</button>
        </form>
      )}
    </div>
  );
}

// Junta a resposta ao texto que já está escrito, numa linha nova.
export const appendReply = (text: string, reply: string) => (text.trim() ? text.replace(/\s+$/, '') + '\n' + reply : reply);
