import { useEffect, useRef, useState } from 'react';
import { FileDown, Check, ClipboardCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { DictateButton } from '../components/capture';
import { QuickReplies, appendReply } from '../components/QuickReplies';
import { useStore } from '../store/store';
import type { Assessment, AssessmentType, DB } from '../store/types';
import type { Route } from '../lib/router';
import { navigate } from '../lib/router';
import { lastM, studentById, visibleStudents, METRICS, metricValue } from '../lib/domain';
import { sendCoachMessage } from '../lib/actions';
import { fmtDate, num } from '../lib/utils';
import { Avatar, Drawer, Empty, Field, PageHead, Seg, useToast } from '../components/ui';
import { ProgressPhoto } from '../components/charts';

export const TYPE_LABEL: Record<AssessmentType, string> = { diario: 'Registos diários', inicial: 'Iniciais', periodico: 'Periódicas' };
const TYPE_ONE: Record<AssessmentType, string> = { diario: 'Registo diário', inicial: 'Avaliação inicial', periodico: 'Avaliação periódica' };

function PrintSheet({ db, items }: { db: DB; items: Assessment[] }) {
  return (
    <div className="print-area print-only">
      {items.map((a) => {
        const s = studentById(db, a.studentId)!;
        const m = lastM(s);
        return (
          <div key={a.id} className="print-page">
            <h2>{s.name}</h2>
            <p>{TYPE_ONE[a.type]}, {fmtDate(a.date, true)}</p>
            <h3 style={{ marginTop: 16 }}>Respostas</h3>
            <table>
              <tbody>{a.answers.map((x) => <tr key={x.question}><th>{x.question}</th><td style={{ whiteSpace: 'pre-wrap' }}>{x.answer}</td></tr>)}</tbody>
            </table>
            {m && (
              <>
                <h3 style={{ marginTop: 16 }}>Medições ({fmtDate(m.date, true)})</h3>
                <table>
                  <tbody>{METRICS.map((x) => <tr key={x.key}><th>{x.label}</th><td>{num(metricValue(s, m, x.key))} {x.unit}</td></tr>)}</tbody>
                </table>
              </>
            )}
            <h3 style={{ marginTop: 16 }}>Feedback</h3>
            <p>{a.feedback || 'Sem feedback.'}</p>
            {a.hasPhotos && (
              <>
                <h3 style={{ marginTop: 16 }}>Fotos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 160px)', gap: 8 }}>
                  {a.photos?.length
                    ? a.photos.map((src, i) => <img key={i} src={src} alt={`Foto ${i + 1}`} style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 6 }} />)
                    : (['frente', 'costas', 'lado'] as const).map((p) => <ProgressPhoto key={p} seed={s.id + p} pose={p} label={p} />)}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function usePrint() {
  const [items, setItems] = useState<Assessment[] | null>(null);
  useEffect(() => {
    if (!items) return;
    const t = setTimeout(() => {
      window.print();
      setItems(null);
    }, 80);
    return () => clearTimeout(t);
  }, [items]);
  return [items, setItems] as const;
}

export function AssessmentsPage({ route }: { route: Route }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [type, setType] = useState<AssessmentType | 'todas'>('todas');
  const [status, setStatus] = useState<'pendente' | 'revisto' | 'todas'>('pendente');
  const [sel, setSel] = useState<string[]>([]);
  const [printing, setPrinting] = usePrint();
  const onlyStudent = route.query.get('aluno');
  const openId = route.query.get('ver');
  const ids = new Set(visibleStudents(db, true).map((s) => s.id));
  const base = db.assessments.filter((a) => ids.has(a.studentId) && (!onlyStudent || a.studentId === onlyStudent));
  const byStatus = base.filter((a) => status === 'todas' || a.status === status);
  const list = byStatus.filter((a) => type === 'todas' || a.type === type);
  const count = (t: AssessmentType) => byStatus.filter((a) => a.type === t).length;

  // Agrupar por aluno: quem tem mais pendentes aparece primeiro.
  const groups = Object.values(
    list.reduce<Record<string, Assessment[]>>((acc, a) => ((acc[a.studentId] ??= []).push(a), acc), {}),
  ).sort((a, b) => b.length - a.length);
  const open = db.assessments.find((a) => a.id === openId);
  // Ordem da fila de revisão: a mesma que aparece no ecrã.
  const order = groups.flatMap((g) => [...g].sort((a, b) => b.date.localeCompare(a.date)));
  const pos = open ? order.findIndex((x) => x.id === open.id) : -1;
  const goTo = (id: string) => navigate(`/avaliacoes?ver=${id}${onlyStudent ? '&aluno=' + onlyStudent : ''}`);

  return (
    <div className="page">
      <PageHead
        title="Avaliações"
        lead={onlyStudent ? `A mostrar apenas ${studentById(db, onlyStudent)?.name}.` : 'Alunos ordenados por quem tem mais avaliações à espera, para começares onde a fila é mais funda.'}
        actions={
          <>
            {onlyStudent && <button className="btn" onClick={() => navigate('/avaliacoes')}>Ver todos os alunos</button>}
            <button className="btn" disabled={!sel.length} onClick={() => setPrinting(db.assessments.filter((a) => sel.includes(a.id)))}>
              <FileDown size={16} /> Exportar seleção em PDF ({sel.length})
            </button>
          </>
        }
      />
      <div className="row-wrap mb">
        <Seg options={[{ id: 'pendente', label: 'Por rever' }, { id: 'revisto', label: 'Revistas' }, { id: 'todas', label: 'Todas' }]} value={status} onChange={setStatus} />
        <span style={{ width: 8 }} />
        <button className={`chip ${type === 'todas' ? 'on' : ''}`} onClick={() => setType('todas')}>Todos os tipos <span className="n">{byStatus.length}</span></button>
        {(Object.keys(TYPE_LABEL) as AssessmentType[]).map((t) => (
          <button key={t} className={`chip ${type === t ? 'on' : ''}`} onClick={() => setType(t)}>
            {TYPE_LABEL[t]} <span className="n">{count(t)}</span>
          </button>
        ))}
        <span className="spacer" />
        {list.length > 0 && (
          <button className="btn btn-sm btn-ghost" onClick={() => setSel(sel.length === list.length ? [] : list.map((a) => a.id))}>
            {sel.length === list.length ? 'Limpar seleção' : 'Selecionar todas'}
          </button>
        )}
      </div>
      {groups.length === 0 ? (
        <div className="panel"><Empty icon={<ClipboardCheck size={28} />} title="Nada por rever" text="Quando um aluno enviar uma avaliação, aparece aqui." /></div>
      ) : (
        <div className="stack">
          {groups.map((g) => {
            const s = studentById(db, g[0].studentId)!;
            return (
              <section key={s.id} className="panel">
                <div className="panel-head">
                  <Avatar name={s.name} size={32} />
                  <div>
                    <h3>{s.name}</h3>
                    <div className="faint">{g.filter((a) => a.status === 'pendente').length} por rever</div>
                  </div>
                  <div className="actions">
                    <button className="btn btn-sm btn-ghost" onClick={() => navigate('/alunos/' + s.id)}>Ficha do aluno</button>
                  </div>
                </div>
                <div className="list">
                  {g.sort((a, b) => b.date.localeCompare(a.date)).map((a) => (
                    <div key={a.id} className="list-row">
                      <input type="checkbox" checked={sel.includes(a.id)} onChange={(e) => setSel(e.target.checked ? [...sel, a.id] : sel.filter((x) => x !== a.id))} aria-label="Selecionar" />
                      <div className="plate" style={{ ['--plate' as any]: a.status === 'pendente' ? 'var(--yellow)' : 'var(--green)', flex: 1 }}>
                        <div className="strong">{TYPE_ONE[a.type]}</div>
                        <div className="faint">{fmtDate(a.date, true)}{a.photos?.length ? `, ${a.photos.length} ${a.photos.length === 1 ? 'foto' : 'fotos'}` : a.hasPhotos ? ', com fotos' : ''}</div>
                      </div>
                      <button className="btn btn-sm btn-ghost" onClick={() => setPrinting([a])}><FileDown size={15} /> PDF</button>
                      <button className="btn btn-sm" onClick={() => navigate(`/avaliacoes?ver=${a.id}${onlyStudent ? '&aluno=' + onlyStudent : ''}`)}>{a.status === 'pendente' ? 'Rever' : 'Abrir'}</button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {open && (
        <ReviewDrawer
          key={open.id}
          a={open}
          pos={pos}
          count={order.length}
          pendingLeft={order.filter((x) => x.status === 'pendente' && x.id !== open.id).length}
          onPrev={pos > 0 ? () => goTo(order[pos - 1].id) : undefined}
          onNext={pos >= 0 && pos < order.length - 1 ? () => goTo(order[pos + 1].id) : undefined}
          onClose={() => navigate('/avaliacoes' + (onlyStudent ? '?aluno=' + onlyStudent : ''))}
          onPrint={() => setPrinting([open])}
          onDone={(feedback, send) => {
            mutate((d) => {
              const x = d.assessments.find((y) => y.id === open.id)!;
              x.status = 'revisto';
              x.feedback = feedback;
              if (send && feedback.trim()) sendCoachMessage(d, x.studentId, feedback.trim());
            });
            toast('Avaliação marcada como revista');
            // Segue para a próxima por rever, pela ordem da lista (a seguir a esta, depois do início).
            const after = pos >= 0 ? [...order.slice(pos + 1), ...order.slice(0, pos)] : order;
            const next = after.find((x) => x.id !== open.id && x.status === 'pendente');
            if (next) goTo(next.id);
            else {
              toast('Fila vazia: não há mais avaliações por rever');
              navigate('/avaliacoes' + (onlyStudent ? '?aluno=' + onlyStudent : ''));
            }
          }}
        />
      )}
      {printing && <PrintSheet db={db} items={printing} />}
    </div>
  );
}

function ReviewDrawer({ a, pos, count, pendingLeft, onPrev, onNext, onClose, onDone, onPrint }: {
  a: Assessment; pos: number; count: number; pendingLeft: number;
  onPrev?: () => void; onNext?: () => void;
  onClose: () => void; onDone: (f: string, send: boolean) => void; onPrint: () => void;
}) {
  const { db } = useStore();
  const s = studentById(db, a.studentId)!;
  const [fb, setFb] = useState(a.feedback);
  const [send, setSend] = useState(true);
  const [zoom, setZoom] = useState<number | null>(null);
  const real = a.photos ?? [];
  const done = () => onDone(fb, send);

  // Atalhos: Ctrl+Enter marca como revista e passa à seguinte; Alt+↑ e Alt+↓ navegam na fila (Alt+← é o "voltar" do browser).
  const keys = useRef({ done, onPrev, onNext });
  keys.current = { done, onPrev, onNext };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); keys.current.done(); }
      else if (e.altKey && e.key === 'ArrowDown' && keys.current.onNext) { e.preventDefault(); keys.current.onNext(); }
      else if (e.altKey && e.key === 'ArrowUp' && keys.current.onPrev) { e.preventDefault(); keys.current.onPrev(); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  return (
    <Drawer
      title={`${TYPE_ONE[a.type]} de ${s.name.split(' ')[0]}`}
      onClose={onClose}
      actions={
        <>
          {pos >= 0 && <span className="faint small num" style={{ marginRight: 4 }}>{pos + 1} de {count}</span>}
          <button className="icon-btn sm" onClick={onPrev} disabled={!onPrev} aria-label="Anterior (Alt+↑)" title="Anterior (Alt+↑)"><ChevronLeft size={16} /></button>
          <button className="icon-btn sm" onClick={onNext} disabled={!onNext} aria-label="Seguinte (Alt+↓)" title="Seguinte (Alt+↓)"><ChevronRight size={16} /></button>
          <button className="btn btn-sm" onClick={onPrint}><FileDown size={15} /> PDF</button>
        </>
      }
      footer={
        <>
          <label className="check small" style={{ marginRight: 'auto' }}>
            <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} /> Enviar o feedback por mensagem
          </label>
          <span className="faint small hide-sm">Ctrl+Enter</span>
          <button className="btn btn-primary" onClick={done} title="Ctrl+Enter"><Check size={16} /> {pendingLeft ? 'Revista, seguinte' : 'Marcar como revista'}</button>
        </>
      }
    >
      <div className="faint">{fmtDate(a.date, true)}{a.status === 'revisto' ? ', já revista' : ''}. {pendingLeft ? `Faltam mais ${pendingLeft} por rever.` : 'É a última por rever.'}</div>
      <div className="stack-sm">
        {a.answers.map((x) => (
          <div key={x.question} className="sub">
            <div className="faint">{x.question}</div>
            <div className="strong" style={{ whiteSpace: 'pre-wrap' }}>{x.answer}</div>
          </div>
        ))}
      </div>
      {real.length > 0 ? (
        <div>
          <h4 style={{ marginBottom: 8 }}>Fotos enviadas ({real.length})</h4>
          <div className="grid g3">
            {real.map((src, i) => (
              <button key={i} type="button" onClick={() => setZoom(i)} aria-label={`Ampliar foto ${i + 1}`} style={{ padding: 0, border: 0, background: 'none', cursor: 'zoom-in', aspectRatio: '1', borderRadius: 8, overflow: 'hidden' }}>
                <img src={src} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>
        </div>
      ) : a.hasPhotos && (
        <div>
          <h4 style={{ marginBottom: 8 }}>Fotos de progresso</h4>
          <div className="grid g3">
            {(['frente', 'costas', 'lado'] as const).map((p) => <ProgressPhoto key={p} seed={s.id + p} pose={p} label={p} />)}
          </div>
        </div>
      )}
      {zoom !== null && real[zoom] && (
        <div
          role="dialog"
          aria-label="Foto ampliada"
          onClick={() => setZoom(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.stopPropagation(); setZoom(null); } // fecha só a foto, não a gaveta
            if (e.key === 'ArrowRight') setZoom((zoom + 1) % real.length);
            if (e.key === 'ArrowLeft') setZoom((zoom - 1 + real.length) % real.length);
          }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.85)', display: 'grid', placeItems: 'center', cursor: 'zoom-out', outline: 'none' }}
        >
          <img src={real[zoom]} alt={`Foto ${zoom + 1}`} style={{ maxWidth: '92vw', maxHeight: '86vh', borderRadius: 8 }} />
          <div style={{ position: 'absolute', bottom: 18, color: '#fff', fontSize: 13 }}>Foto {zoom + 1} de {real.length}. Clica para fechar{real.length > 1 ? ', setas para navegar' : ''}.</div>
        </div>
      )}
      <Field label="Feedback para o aluno">
        <textarea className="textarea" rows={5} value={fb} onChange={(e) => setFb(e.target.value)} placeholder="O que correu bem, o que ajustar na próxima semana." />
      </Field>
      <DictateButton value={fb} onChange={setFb} color="var(--blue)" />
      <QuickReplies current={fb} onPick={(t) => setFb((x) => appendReply(x, t))} />
    </Drawer>
  );
}
