import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Heart, MessageCircle, Pin, Send, UsersRound } from 'lucide-react';
import { useStore } from '../store/store';
import type { Community, Role, StaffMember } from '../store/types';
import { currentUser, isLeader, personName, studentById, ROLE_LABEL } from '../lib/domain';
import { fmtDateTime, matches, uid } from '../lib/utils';
import { Avatar, ConfirmButton, Empty, Field, Modal, PageHead, colorFor, useToast } from '../components/ui';

export function StaffPage() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [edit, setEdit] = useState<{ m: StaffMember; students: string[] } | null>(null);
  const leader = isLeader(db);
  const open = (m: StaffMember) => setEdit({ m: structuredClone(m), students: db.students.filter((s) => s.coachId === m.id).map((s) => s.id) });
  return (
    <div className="page">
      <PageHead
        title="Staff"
        lead="A tua equipa. O responsável de equipa vê todos os alunos; cada treinador vê apenas os seus."
        actions={leader && <button className="btn btn-primary" onClick={() => setEdit({ m: { id: '', name: '', email: '', role: 'coach', status: 'convidado', chatIds: [], color: '#2E9E5B' }, students: [] })}><Plus size={16} /> Convidar membro</button>}
      />
      {!leader && <div className="sub mb small">Estás a ver como {currentUser(db).name}. Só o responsável de equipa pode convidar membros e distribuir alunos.</div>}
      <div className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Membro</th><th>Função</th><th>Alunos</th><th>Conversas</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {db.staff.map((m) => (
                <tr key={m.id}>
                  <td><div className="row"><Avatar name={m.name} size={32} color={m.color} /><div><div className="strong">{m.name}</div><div className="faint">{m.email}</div></div></div></td>
                  <td>{ROLE_LABEL[m.role]}</td>
                  <td className="num">{m.role === 'leader' ? 'Todos' : db.students.filter((s) => s.coachId === m.id).length}</td>
                  <td className="num">{m.role === 'leader' ? 'Todas' : m.chatIds.length}</td>
                  <td>{m.status === 'ativo' ? <span className="badge green">Ativo</span> : <span className="badge yellow">Convite enviado</span>}</td>
                  <td>{leader && <button className="btn btn-sm" onClick={() => open(m)}><Pencil size={14} /> Editar</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {edit && <MemberModal init={edit} onClose={() => setEdit(null)} onSave={(m, students) => {
        mutate((d) => {
          const id = m.id || uid('st_');
          const rec = { ...m, id };
          const i = d.staff.findIndex((x) => x.id === id);
          if (i >= 0) d.staff[i] = rec; else d.staff.push(rec);
          if (m.role !== 'leader') {
            d.students.forEach((s) => {
              if (students.includes(s.id)) s.coachId = id;
              else if (s.coachId === id) s.coachId = d.staff.find((x) => x.role === 'leader')!.id;
            });
          }
        });
        toast(m.id ? 'Membro atualizado' : `Convite enviado para ${m.email}`);
        setEdit(null);
      }} onRemove={(id) => {
        mutate((d) => {
          const lead = d.staff.find((x) => x.role === 'leader')!.id;
          d.students.forEach((s) => s.coachId === id && (s.coachId = lead));
          d.staff = d.staff.filter((x) => x.id !== id);
          if (d.currentUserId === id) d.currentUserId = lead;
        });
        toast('Membro removido. Os alunos passaram para o responsável de equipa.');
        setEdit(null);
      }} />}
    </div>
  );
}

function Picker({ title, items, sel, setSel }: { title: string; items: { id: string; label: string }[]; sel: string[]; setSel: (v: string[]) => void }) {
  const [q, setQ] = useState('');
  const shown = items.filter((i) => !q || matches(i.label, q));
  const all = shown.every((i) => sel.includes(i.id));
  return (
    <Field label={`${title} (${sel.length})`}>
      <div className="row">
        <div className="search" style={{ flex: 1 }}><Search size={16} /><input className="input sm" placeholder="Procurar" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <button type="button" className="btn btn-sm" onClick={() => setSel(all ? sel.filter((x) => !shown.some((i) => i.id === x)) : Array.from(new Set([...sel, ...shown.map((i) => i.id)])))}>{all ? 'Limpar' : 'Selecionar tudo'}</button>
      </div>
      <div className="stack-sm" style={{ maxHeight: 170, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
        {shown.map((i) => <label key={i.id} className="check"><input type="checkbox" checked={sel.includes(i.id)} onChange={(e) => setSel(e.target.checked ? [...sel, i.id] : sel.filter((x) => x !== i.id))} />{i.label}</label>)}
      </div>
    </Field>
  );
}

function MemberModal({ init, onClose, onSave, onRemove }: { init: { m: StaffMember; students: string[] }; onClose: () => void; onSave: (m: StaffMember, students: string[]) => void; onRemove: (id: string) => void }) {
  const { db } = useStore();
  const [m, setM] = useState(init.m);
  const [students, setStudents] = useState(init.students);
  const leader = isLeader(db);
  return (
    <Modal
      title={m.id ? `Editar ${m.name}` : 'Convidar membro'}
      onClose={onClose}
      footer={<>
        {m.id && m.role !== 'leader' && <span style={{ marginRight: 'auto' }}><ConfirmButton label="Confirmar: remover" onConfirm={() => onRemove(m.id)}><Trash2 size={15} /> Remover</ConfirmButton></span>}
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!m.name.trim() || !m.email.includes('@')} onClick={() => onSave({ ...m, color: m.color || colorFor(m.name) }, students)}>{m.id ? 'Guardar membro' : 'Enviar convite'}</button>
      </>}
    >
      <div className="grid g2">
        <Field label="Nome"><input className="input" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} autoFocus /></Field>
        <Field label="Email"><input className="input" type="email" value={m.email} onChange={(e) => setM({ ...m, email: e.target.value })} /></Field>
        <Field label="Função">
          <select className="select" value={m.role} onChange={(e) => setM({ ...m, role: e.target.value as Role })} disabled={init.m.role === 'leader'}>
            {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        {m.id && (
          <Field label="Estado">
            <select className="select" value={m.status} onChange={(e) => setM({ ...m, status: e.target.value as any })}>
              <option value="ativo">Ativo</option>
              <option value="convidado">Convite enviado</option>
            </select>
          </Field>
        )}
      </div>
      {m.role !== 'leader' && (
        <>
          <Picker title="Conversas a que tem acesso" items={db.chats.map((c) => ({ id: c.id, label: studentById(db, c.studentId)?.name ?? c.id }))} sel={m.chatIds} setSel={(chatIds) => setM({ ...m, chatIds })} />
          {leader && m.role === 'coach' && <Picker title="Alunos que acompanha" items={db.students.map((s) => ({ id: s.id, label: s.name }))} sel={students} setSel={setStudents} />}
        </>
      )}
    </Modal>
  );
}

export function CommunitiesPage() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [active, setActive] = useState<string | undefined>(db.communities[0]?.id);
  const [edit, setEdit] = useState<Community | null>(null);
  const [text, setText] = useState('');
  const [comment, setComment] = useState<Record<string, string>>({});
  const me = currentUser(db);
  const c = db.communities.find((x) => x.id === active);
  const upd = (fn: (c: Community) => void) => mutate((d) => fn(d.communities.find((x) => x.id === active)!));
  const posts = c ? [...c.posts].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at.localeCompare(a.at)) : [];
  return (
    <div className="page">
      <PageHead title="Comunidades" lead="Espaços onde os alunos partilham conquistas e tu lanças desafios." actions={<button className="btn btn-primary" onClick={() => setEdit({ id: '', name: '', description: '', memberIds: 'todos', posts: [] })}><Plus size={16} /> Nova comunidade</button>} />
      <div className="split-l">
        <aside className="panel">
          <div className="list">
            {db.communities.map((x) => (
              <div key={x.id} className="list-row click" style={{ background: x.id === active ? 'var(--blue-soft)' : undefined }} onClick={() => setActive(x.id)}>
                <UsersRound size={18} />
                <div style={{ minWidth: 0 }}>
                  <div className="strong">{x.name}</div>
                  <div className="faint">{x.memberIds === 'todos' ? 'Todos os alunos' : `${x.memberIds.length} membros`}, {x.posts.length} publicações</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
        {!c ? <div className="panel"><Empty title="Cria a primeira comunidade" /></div> : (
          <div className="stack">
            <div className="panel panel-pad row">
              <div><h3>{c.name}</h3><p className="faint">{c.description}</p></div>
              <span className="spacer" />
              <button className="btn btn-sm" onClick={() => setEdit(structuredClone(c))}><Pencil size={14} /> Editar</button>
            </div>
            <form className="panel panel-pad stack-sm" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; upd((x) => void x.posts.push({ id: uid('po_'), author: me.id, text: text.trim(), at: new Date().toISOString(), likes: [], pinned: false, comments: [] })); setText(''); toast('Publicado'); }}>
              <textarea className="textarea" rows={3} placeholder="Escreve para a comunidade: um desafio, uma dica, uma vitória de um aluno" value={text} onChange={(e) => setText(e.target.value)} aria-label="Nova publicação" />
              <div className="row"><span className="spacer" /><button className="btn btn-primary" disabled={!text.trim()}><Send size={15} /> Publicar</button></div>
            </form>
            {posts.length === 0 && <div className="panel"><Empty title="Ainda não há publicações" /></div>}
            {posts.map((p) => {
              const liked = p.likes.includes(me.id);
              return (
                <article key={p.id} className="panel panel-pad stack-sm">
                  <div className="row">
                    <Avatar name={personName(db, p.author)} size={32} />
                    <div><div className="strong">{personName(db, p.author)}</div><div className="faint">{fmtDateTime(p.at)}</div></div>
                    <span className="spacer" />
                    {p.pinned && <span className="badge blue"><Pin size={12} /> Fixada</span>}
                    <button className="icon-btn sm" onClick={() => upd((x) => void (x.posts.find((y) => y.id === p.id)!.pinned = !p.pinned))} aria-label={p.pinned ? 'Desafixar' : 'Fixar'}><Pin size={15} /></button>
                    <ConfirmButton className="icon-btn sm" label="✓" onConfirm={() => upd((x) => void (x.posts = x.posts.filter((y) => y.id !== p.id)))}><Trash2 size={15} /></ConfirmButton>
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{p.text}</p>
                  <div className="row">
                    <button className="btn btn-sm btn-ghost" onClick={() => upd((x) => { const y = x.posts.find((z) => z.id === p.id)!; y.likes = liked ? y.likes.filter((l) => l !== me.id) : [...y.likes, me.id]; })} style={{ color: liked ? 'var(--red)' : undefined }}>
                      <Heart size={15} fill={liked ? 'currentColor' : 'none'} /> {p.likes.length}
                    </button>
                    <span className="row small muted"><MessageCircle size={15} /> {p.comments.length}</span>
                  </div>
                  {p.comments.map((cm) => (
                    <div key={cm.id} className="sub small"><span className="strong">{personName(db, cm.author)}</span> {cm.text}</div>
                  ))}
                  <form className="row" onSubmit={(e) => { e.preventDefault(); const t = comment[p.id]?.trim(); if (!t) return; upd((x) => void x.posts.find((y) => y.id === p.id)!.comments.push({ id: uid('co_'), author: me.id, text: t, at: new Date().toISOString() })); setComment({ ...comment, [p.id]: '' }); }}>
                    <input className="input sm" placeholder="Comentar" value={comment[p.id] ?? ''} onChange={(e) => setComment({ ...comment, [p.id]: e.target.value })} aria-label="Comentário" />
                    <button className="btn btn-sm">Comentar</button>
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </div>
      {edit && (
        <Modal title={edit.id ? 'Editar comunidade' : 'Nova comunidade'} onClose={() => setEdit(null)} footer={<>
          {edit.id && <span style={{ marginRight: 'auto' }}><ConfirmButton label="Confirmar: apagar" onConfirm={() => { mutate((d) => void (d.communities = d.communities.filter((x) => x.id !== edit.id))); setActive(db.communities.find((x) => x.id !== edit.id)?.id); setEdit(null); toast('Comunidade apagada'); }}><Trash2 size={15} /> Apagar</ConfirmButton></span>}
          <button className="btn" onClick={() => setEdit(null)}>Cancelar</button>
          <button className="btn btn-primary" disabled={!edit.name.trim()} onClick={() => { const id = edit.id || uid('cm_'); mutate((d) => { const i = d.communities.findIndex((x) => x.id === id); if (i >= 0) d.communities[i] = edit; else d.communities.push({ ...edit, id }); }); setActive(id); setEdit(null); toast('Comunidade guardada'); }}>Guardar comunidade</button>
        </>}>
          <Field label="Nome"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></Field>
          <Field label="Descrição"><input className="input" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
          <label className="check"><input type="radio" checked={edit.memberIds === 'todos'} onChange={() => setEdit({ ...edit, memberIds: 'todos' })} /> Todos os alunos</label>
          <label className="check"><input type="radio" checked={edit.memberIds !== 'todos'} onChange={() => setEdit({ ...edit, memberIds: [] })} /> Alunos escolhidos</label>
          {edit.memberIds !== 'todos' && (
            <div className="stack-sm" style={{ maxHeight: 220, overflowY: 'auto', paddingLeft: 24 }}>
              {db.students.map((s) => <label key={s.id} className="check"><input type="checkbox" checked={(edit.memberIds as string[]).includes(s.id)} onChange={(e) => setEdit({ ...edit, memberIds: e.target.checked ? [...(edit.memberIds as string[]), s.id] : (edit.memberIds as string[]).filter((x) => x !== s.id) })} />{s.name}</label>)}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
