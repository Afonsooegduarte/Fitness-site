import { useEffect, useRef, useState } from 'react';
import { Send, Search, MailOpen, Megaphone, User, Zap } from 'lucide-react';
import { DictateButton } from '../components/capture';
import { QuickReplies } from '../components/QuickReplies';
import { useStore } from '../store/store';
import type { Route } from '../lib/router';
import { navigate } from '../lib/router';
import { studentById, visibleChats, visibleStudents } from '../lib/domain';
import { sendCoachMessage } from '../lib/actions';
import { fmtDate, fmtDateTime, matches } from '../lib/utils';
import { Avatar, Empty, Field, Modal, PageHead, Popover, useToast } from '../components/ui';

export const UNREAD_COLORS = [
  { c: '#D63A2F', name: 'Urgente' },
  { c: '#E8772E', name: 'Hoje' },
  { c: '#F2B705', name: 'À espera de resposta' },
  { c: '#2E9E5B', name: 'Boa notícia' },
  { c: '#0E7C86', name: 'Plano' },
  { c: '#1F5FBF', name: 'Rever à noite' },
  { c: '#8A4FBF', name: 'Pagamentos' },
  { c: '#7A8494', name: 'Outro' },
];

export function MessagesPage({ route }: { route: Route }) {
  const { db, mutate } = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<string>('todas');
  const [text, setText] = useState('');
  const [mark, setMark] = useState(false);
  const [broadcast, setBroadcast] = useState(false);
  const [replies, setReplies] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const chats = visibleChats(db)
    .filter((c) => studentById(db, c.studentId))
    .sort((a, b) => (b.messages.at(-1)?.at ?? '').localeCompare(a.messages.at(-1)?.at ?? ''));
  const activeId = route.query.get('c') ?? chats[0]?.id;
  const active = chats.find((c) => c.id === activeId);
  const list = chats.filter((c) => {
    const s = studentById(db, c.studentId)!;
    if (q && !matches(s.name, q)) return false;
    if (filter === 'naolidas') return c.unread;
    if (filter !== 'todas') return c.color === filter;
    return true;
  });

  // Abrir uma conversa marca-a como lida, exceto se tiver cor (fica sinalizada até ser tratada).
  useEffect(() => {
    if (active?.unread && !active.color) mutate((d) => void (d.chats.find((c) => c.id === active.id)!.unread = false));
  }, [active?.id]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [active?.id, active?.messages.length]);

  const s = active ? studentById(db, active.studentId) : null;
  const send = () => {
    if (!text.trim() || !active) return;
    mutate((d) => sendCoachMessage(d, active.studentId, text.trim()));
    setText('');
  };

  return (
    <div className="page" style={{ maxWidth: 'none' }}>
      <PageHead
        title="Mensagens"
        actions={<button className="btn" onClick={() => setBroadcast(true)}><Megaphone size={16} /> Mensagem para vários alunos</button>}
      />
      <div className="row-wrap mb">
        <button className={`chip ${filter === 'todas' ? 'on' : ''}`} onClick={() => setFilter('todas')}>Todas <span className="n">{chats.length}</span></button>
        <button className={`chip ${filter === 'naolidas' ? 'on' : ''}`} onClick={() => setFilter('naolidas')}>Não lidas <span className="n">{chats.filter((c) => c.unread).length}</span></button>
        {UNREAD_COLORS.map((u) => {
          const n = chats.filter((c) => c.color === u.c).length;
          if (!n && filter !== u.c) return null;
          return (
            <button key={u.c} className={`chip ${filter === u.c ? 'on' : ''}`} onClick={() => setFilter(u.c)} title={u.name}>
              <span className="color-dot" style={{ background: u.c }} /> {u.name} <span className="n">{n}</span>
            </button>
          );
        })}
      </div>
      <div className="panel chat-layout">
        <div className="chat-list">
          <div style={{ padding: 10, borderBottom: '1px solid var(--line-2)' }}>
            <div className="search">
              <Search size={16} />
              <input className="input sm" placeholder="Procurar conversa" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Procurar conversa" />
            </div>
          </div>
          {list.length === 0 && <p className="faint" style={{ padding: 16 }}>Sem conversas.</p>}
          {list.map((c) => {
            const st = studentById(db, c.studentId)!;
            const last = c.messages.at(-1);
            return (
              <div key={c.id} className={`chat-item ${c.id === activeId ? 'on' : ''}`} onClick={() => navigate('/mensagens?c=' + c.id)}>
                <Avatar name={st.name} size={36} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row">
                    <span className={c.unread ? 'strong' : ''}>{st.name}</span>
                    <span className="spacer" />
                    <span className="faint" style={{ fontSize: 12 }}>{last ? fmtDate(last.at.slice(0, 10)) : ''}</span>
                  </div>
                  <div className="row">
                    <span className="faint ellipsis" style={{ flex: 1 }}>{last ? (last.from === 'coach' ? 'Eu: ' : '') + last.text : 'Sem mensagens'}</span>
                    {c.color ? <span className="color-dot" style={{ background: c.color }} /> : c.unread && <span className="color-dot" style={{ background: 'var(--blue)' }} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="chat-thread">
          {!active || !s ? (
            <Empty title="Escolhe uma conversa" />
          ) : (
            <>
              <div className="row" style={{ padding: '10px 16px', borderBottom: '1px solid var(--line-2)' }}>
                <Avatar name={s.name} size={32} />
                <div>
                  <div className="strong">{s.name}</div>
                  <div className="faint">{s.email}</div>
                </div>
                <span className="spacer" />
                <button className="btn btn-sm btn-ghost" onClick={() => navigate('/alunos/' + s.id)}><User size={15} /> Ficha</button>
                <Popover
                  open={mark}
                  setOpen={setMark}
                  trigger={<button className="btn btn-sm" onClick={() => setMark(!mark)}><MailOpen size={15} /> Marcar como não lida</button>}
                >
                  <div style={{ padding: 10, width: 230 }}>
                    <div className="faint" style={{ marginBottom: 6 }}>Escolhe uma cor para organizar</div>
                    {UNREAD_COLORS.map((u) => (
                      <button key={u.c} className="nav-item" style={{ color: 'var(--ink)' }} onClick={() => { mutate((d) => { const c = d.chats.find((x) => x.id === active.id)!; c.unread = true; c.color = u.c; }); setMark(false); }}>
                        <span className="color-dot" style={{ background: u.c }} /> {u.name}
                      </button>
                    ))}
                    <button className="nav-item" style={{ color: 'var(--ink)' }} onClick={() => { mutate((d) => { const c = d.chats.find((x) => x.id === active.id)!; c.unread = true; c.color = null; }); setMark(false); }}>
                      <span className="color-dot" style={{ background: 'transparent', border: '1px solid var(--line)' }} /> Sem cor
                    </button>
                    {active.color && (
                      <button className="nav-item" style={{ color: 'var(--ink)' }} onClick={() => { mutate((d) => { const c = d.chats.find((x) => x.id === active.id)!; c.unread = false; c.color = null; }); setMark(false); }}>
                        Marcar como tratada
                      </button>
                    )}
                  </div>
                </Popover>
              </div>
              <div className="chat-msgs">
                {active.messages.map((m) => (
                  <div key={m.id} className={`bubble ${m.from === 'coach' ? 'me' : ''}`}>
                    {m.text}
                    <time>{fmtDateTime(m.at)}</time>
                  </div>
                ))}
                <div ref={end} />
              </div>
              {replies && (
                <div style={{ padding: '10px 14px 0', borderTop: '1px solid var(--line-2)' }}>
                  <QuickReplies current={text} onPick={(t) => setText((x) => (x.trim() ? x.replace(/\s+$/, '') + ' ' + t : t))} />
                </div>
              )}
              <form className="chat-compose" onSubmit={(e) => (e.preventDefault(), send())}>
                <button type="button" className="btn" aria-pressed={replies} aria-label="Respostas rápidas" title="Respostas rápidas" onClick={() => setReplies(!replies)} style={replies ? { borderColor: 'var(--yellow)' } : undefined}><Zap size={16} /></button>
                <input className="input" placeholder={`Escrever a ${s.name.split(' ')[0]}`} value={text} onChange={(e) => setText(e.target.value)} aria-label="Mensagem" />
                <DictateButton compact value={text} onChange={setText} color="var(--blue)" />
                <button className="btn btn-primary" disabled={!text.trim()}><Send size={16} /> Enviar</button>
              </form>
            </>
          )}
        </div>
      </div>
      {broadcast && <BroadcastModal onClose={() => setBroadcast(false)} />}
    </div>
  );
}

function BroadcastModal({ onClose }: { onClose: () => void }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const students = visibleStudents(db).filter((s) => s.status === 'ativo');
  const [sel, setSel] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const shown = students.filter((s) => !q || matches(s.name, q));
  return (
    <Modal
      title="Mensagem para vários alunos"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!sel.length || !text.trim()} onClick={() => { mutate((d) => sel.forEach((id) => sendCoachMessage(d, id, text.replace(/\{nome\}/g, d.students.find((x) => x.id === id)!.name.split(' ')[0])))); toast(`Mensagem enviada a ${sel.length} alunos`); onClose(); }}>
            Enviar a {sel.length} alunos
          </button>
        </>
      }
    >
      <Field label="Mensagem" hint="Usa {nome} para pôr o primeiro nome de cada aluno.">
        <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} />
        <DictateButton value={text} onChange={setText} color="var(--blue)" />
      </Field>
      <div className="row">
        <div className="search" style={{ flex: 1 }}>
          <Search size={16} />
          <input className="input sm" placeholder="Procurar" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn btn-sm" onClick={() => setSel(sel.length === students.length ? [] : students.map((s) => s.id))}>{sel.length === students.length ? 'Limpar' : 'Selecionar todos'}</button>
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto' }} className="stack-sm">
        {shown.map((s) => (
          <label key={s.id} className="check">
            <input type="checkbox" checked={sel.includes(s.id)} onChange={(e) => setSel(e.target.checked ? [...sel, s.id] : sel.filter((x) => x !== s.id))} />
            {s.name}
          </label>
        ))}
      </div>
    </Modal>
  );
}
