import { useRef, useState } from 'react';
import { Plus, Trash2, Pencil, ArrowUp, ArrowDown, Upload, Download, Folder, FileText, Video, Users, Eye } from 'lucide-react';
import { useStore } from '../store/store';
import type { Course, Protocol, Question, QuestionType, Questionnaire, Supplement, VaultFile } from '../store/types';
import { studentById, visibleStudents } from '../lib/domain';
import { downloadDataUrl, fmtDate, fmtSize, readFileAsDataUrl, today, uid } from '../lib/utils';
import { ConfirmButton, Empty, Field, Modal, PageHead, Tabs, Toggle, useToast } from '../components/ui';

/* ---------------- Suplementação ---------------- */
export function SupplementsPage() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<'protocolos' | 'suplementos'>('protocolos');
  const [sup, setSup] = useState<Supplement | null>(null);
  const [pro, setPro] = useState<Protocol | null>(null);
  const users = (pid: string) => db.students.filter((s) => s.protocolId === pid).length;
  return (
    <div className="page">
      <PageHead
        title="Suplementação"
        lead="Protocolos com dose e momento de toma, atribuídos a cada aluno na ficha."
        actions={tab === 'protocolos'
          ? <button className="btn btn-primary" onClick={() => setPro({ id: '', name: '', items: [] })}><Plus size={16} /> Novo protocolo</button>
          : <button className="btn btn-primary" onClick={() => setSup({ id: '', name: '', brand: '', defaultDose: '', notes: '' })}><Plus size={16} /> Novo suplemento</button>}
      />
      <Tabs tabs={[{ id: 'protocolos', label: 'Protocolos' }, { id: 'suplementos', label: 'Suplementos' }]} value={tab} onChange={setTab} />
      {tab === 'protocolos' ? (
        <div className="grid g3">
          {db.protocols.map((p) => (
            <div key={p.id} className="panel panel-pad stack">
              <div className="row"><h3>{p.name}</h3><span className="spacer" /><span className="faint">{users(p.id)} alunos</span></div>
              <div className="stack-sm">
                {p.items.map((it, i) => (
                  <div key={i} className="row small"><span>{db.supplements.find((s) => s.id === it.supplementId)?.name}</span><span className="spacer" /><span className="muted">{it.dose}, {it.timing.toLowerCase()}</span></div>
                ))}
              </div>
              <div><button className="btn btn-sm" onClick={() => setPro(structuredClone(p))}><Pencil size={14} /> Editar</button></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel">
          <table className="table">
            <thead><tr><th>Suplemento</th><th>Marca</th><th>Dose habitual</th><th>Notas</th></tr></thead>
            <tbody>
              {db.supplements.map((s) => (
                <tr key={s.id} className="click" onClick={() => setSup(structuredClone(s))}><td className="strong">{s.name}</td><td>{s.brand}</td><td>{s.defaultDose}</td><td className="muted">{s.notes}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sup && (
        <Modal title={sup.id ? 'Editar suplemento' : 'Novo suplemento'} onClose={() => setSup(null)} footer={<>
          {sup.id && <span style={{ marginRight: 'auto' }}><ConfirmButton label="Confirmar: apagar" onConfirm={() => { mutate((d) => { d.supplements = d.supplements.filter((x) => x.id !== sup.id); d.protocols.forEach((p) => (p.items = p.items.filter((i) => i.supplementId !== sup.id))); }); setSup(null); toast('Suplemento apagado'); }}><Trash2 size={15} /> Apagar</ConfirmButton></span>}
          <button className="btn" onClick={() => setSup(null)}>Cancelar</button>
          <button className="btn btn-primary" disabled={!sup.name.trim()} onClick={() => { mutate((d) => { if (sup.id) d.supplements[d.supplements.findIndex((x) => x.id === sup.id)] = sup; else d.supplements.push({ ...sup, id: uid('sp_') }); }); setSup(null); toast('Suplemento guardado'); }}>Guardar suplemento</button>
        </>}>
          <Field label="Nome"><input className="input" value={sup.name} onChange={(e) => setSup({ ...sup, name: e.target.value })} autoFocus /></Field>
          <div className="grid g2">
            <Field label="Marca"><input className="input" value={sup.brand} onChange={(e) => setSup({ ...sup, brand: e.target.value })} /></Field>
            <Field label="Dose habitual"><input className="input" value={sup.defaultDose} onChange={(e) => setSup({ ...sup, defaultDose: e.target.value })} /></Field>
          </div>
          <Field label="Notas"><textarea className="textarea" value={sup.notes} onChange={(e) => setSup({ ...sup, notes: e.target.value })} /></Field>
        </Modal>
      )}
      {pro && (
        <Modal title={pro.id ? 'Editar protocolo' : 'Novo protocolo'} onClose={() => setPro(null)} footer={<>
          {pro.id && <span style={{ marginRight: 'auto' }}><ConfirmButton label="Confirmar: apagar" onConfirm={() => { mutate((d) => { d.protocols = d.protocols.filter((x) => x.id !== pro.id); d.students.forEach((s) => s.protocolId === pro.id && (s.protocolId = null)); }); setPro(null); toast('Protocolo apagado'); }}><Trash2 size={15} /> Apagar</ConfirmButton></span>}
          <button className="btn" onClick={() => setPro(null)}>Cancelar</button>
          <button className="btn btn-primary" disabled={!pro.name.trim()} onClick={() => { mutate((d) => { if (pro.id) d.protocols[d.protocols.findIndex((x) => x.id === pro.id)] = pro; else d.protocols.push({ ...pro, id: uid('pr_') }); }); setPro(null); toast('Protocolo guardado'); }}>Guardar protocolo</button>
        </>}>
          <Field label="Nome"><input className="input" value={pro.name} onChange={(e) => setPro({ ...pro, name: e.target.value })} autoFocus /></Field>
          {pro.items.map((it, i) => (
            <div key={i} className="row">
              <select className="select sm" value={it.supplementId} onChange={(e) => setPro({ ...pro, items: pro.items.map((x, j) => (j === i ? { ...x, supplementId: e.target.value } : x)) })} aria-label="Suplemento">
                {db.supplements.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input className="input sm" style={{ width: 110 }} value={it.dose} onChange={(e) => setPro({ ...pro, items: pro.items.map((x, j) => (j === i ? { ...x, dose: e.target.value } : x)) })} placeholder="Dose" aria-label="Dose" />
              <input className="input sm" style={{ width: 140 }} value={it.timing} onChange={(e) => setPro({ ...pro, items: pro.items.map((x, j) => (j === i ? { ...x, timing: e.target.value } : x)) })} placeholder="Quando" aria-label="Momento" />
              <button className="icon-btn sm" onClick={() => setPro({ ...pro, items: pro.items.filter((_, j) => j !== i) })} aria-label="Remover"><Trash2 size={14} /></button>
            </div>
          ))}
          <div><button className="btn btn-sm" onClick={() => setPro({ ...pro, items: [...pro.items, { supplementId: db.supplements[0]?.id, dose: db.supplements[0]?.defaultDose ?? '', timing: 'Pequeno-almoço' }] })}><Plus size={14} /> Suplemento</button></div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- Questionários ---------------- */
const QTYPE: Record<QuestionType, string> = { texto: 'Texto livre', numero: 'Número', escolha: 'Escolha múltipla', escala: 'Escala de 1 a 5', sim_nao: 'Sim ou não', foto: 'Fotos' };
const QKIND = { inicial: 'Avaliação inicial', periodico: 'Avaliação periódica', diario: 'Registo diário' };

export function QuestionnairesPage() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [edit, setEdit] = useState<Questionnaire | null>(null);
  const [preview, setPreview] = useState(false);
  if (edit) {
    const setQ = (i: number, patch: Partial<Question>) => setEdit({ ...edit, questions: edit.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
    const move = (i: number, dir: number) => { const qs = [...edit.questions]; const j = i + dir; if (j < 0 || j >= qs.length) return; [qs[i], qs[j]] = [qs[j], qs[i]]; setEdit({ ...edit, questions: qs }); };
    return (
      <div className="page">
        <PageHead
          back={{ label: 'Questionários', to: '/questionarios' }}
          title={edit.id ? 'Editar questionário' : 'Novo questionário'}
          actions={<>
            <button className="btn" onClick={() => setPreview(true)}><Eye size={16} /> Pré-visualizar</button>
            {edit.id && <ConfirmButton className="btn btn-danger" label="Confirmar: apagar" onConfirm={() => { mutate((d) => void (d.questionnaires = d.questionnaires.filter((x) => x.id !== edit.id))); setEdit(null); toast('Questionário apagado'); }}><Trash2 size={15} /> Apagar</ConfirmButton>}
            <button className="btn btn-primary" disabled={!edit.name.trim()} onClick={() => { mutate((d) => { if (edit.id) d.questionnaires[d.questionnaires.findIndex((x) => x.id === edit.id)] = edit; else d.questionnaires.push({ ...edit, id: uid('qs_') }); }); toast('Questionário guardado'); setEdit(null); }}>Guardar questionário</button>
          </>}
        />
        <div className="panel panel-pad grid g2 mb">
          <Field label="Nome"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
          <Field label="Usado em">
            <select className="select" value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as any })}>
              {Object.entries(QKIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        <div className="stack">
          {edit.questions.map((q, i) => (
            <div key={q.id} className="panel panel-pad stack-sm">
              <div className="row">
                <span className="faint num" style={{ width: 22 }}>{i + 1}.</span>
                <input className="input" value={q.label} onChange={(e) => setQ(i, { label: e.target.value })} placeholder="Pergunta" aria-label="Pergunta" />
                <select className="select" style={{ width: 190 }} value={q.type} onChange={(e) => setQ(i, { type: e.target.value as QuestionType, options: e.target.value === 'escolha' && !q.options.length ? ['Opção 1', 'Opção 2'] : q.options })} aria-label="Tipo">
                  {Object.entries(QTYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button className="icon-btn sm" onClick={() => move(i, -1)} aria-label="Subir"><ArrowUp size={15} /></button>
                <button className="icon-btn sm" onClick={() => move(i, 1)} aria-label="Descer"><ArrowDown size={15} /></button>
                <button className="icon-btn sm" onClick={() => setEdit({ ...edit, questions: edit.questions.filter((_, j) => j !== i) })} aria-label="Remover"><Trash2 size={15} /></button>
              </div>
              {q.type === 'escolha' && (
                <Field label="Opções (uma por linha)">
                  <textarea className="textarea" rows={3} value={q.options.join('\n')} onChange={(e) => setQ(i, { options: e.target.value.split('\n') })} />
                </Field>
              )}
              <label className="check small" style={{ marginLeft: 32 }}><input type="checkbox" checked={q.required} onChange={(e) => setQ(i, { required: e.target.checked })} /> Obrigatória</label>
            </div>
          ))}
          <div><button className="btn" onClick={() => setEdit({ ...edit, questions: [...edit.questions, { id: uid('q'), label: '', type: 'texto', options: [], required: false }] })}><Plus size={16} /> Pergunta</button></div>
        </div>
        {preview && (
          <Modal title={edit.name || 'Pré-visualização'} onClose={() => setPreview(false)}>
            {edit.questions.map((q) => (
              <Field key={q.id} label={q.label + (q.required ? ' *' : '')}>
                {q.type === 'texto' && <textarea className="textarea" rows={2} />}
                {q.type === 'numero' && <input className="input" type="number" />}
                {q.type === 'escolha' && <select className="select">{q.options.map((o) => <option key={o}>{o}</option>)}</select>}
                {q.type === 'escala' && <div className="row">{[1, 2, 3, 4, 5].map((n) => <button key={n} className="chip">{n}</button>)}</div>}
                {q.type === 'sim_nao' && <div className="row"><button className="chip">Sim</button><button className="chip">Não</button></div>}
                {q.type === 'foto' && <button className="btn btn-sm"><Upload size={14} /> Enviar fotos</button>}
              </Field>
            ))}
          </Modal>
        )}
      </div>
    );
  }
  return (
    <div className="page">
      <PageHead title="Questionários" lead="Formulários para a avaliação inicial, avaliações periódicas e registos diários dos alunos." actions={<button className="btn btn-primary" onClick={() => setEdit({ id: '', name: '', kind: 'periodico', questions: [] })}><Plus size={16} /> Novo questionário</button>} />
      <div className="grid g3">
        {db.questionnaires.map((q) => (
          <div key={q.id} className="panel panel-pad stack">
            <div><span className="badge">{QKIND[q.kind]}</span><h3 className="mt-sm">{q.name}</h3></div>
            <p className="faint">{q.questions.length} perguntas: {q.questions.slice(0, 3).map((x) => x.label).join(', ')}{q.questions.length > 3 ? '…' : ''}</p>
            <div><button className="btn btn-sm" onClick={() => setEdit(structuredClone(q))}><Pencil size={14} /> Editar</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Cursos ---------------- */
export function CoursesPage() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [edit, setEdit] = useState<Course | null>(null);
  const [enroll, setEnroll] = useState<Course | null>(null);
  const enrolled = (cid: string) => db.students.filter((s) => s.courseIds.includes(cid)).length;
  if (edit) {
    const updMod = (mi: number, fn: (m: Course['modules'][number]) => void) => { const c = structuredClone(edit); fn(c.modules[mi]); setEdit(c); };
    return (
      <div className="page">
        <PageHead
          back={{ label: 'Cursos', to: '/cursos' }}
          title={edit.id ? 'Editar curso' : 'Novo curso'}
          actions={<>
            <label className="row small"><Toggle on={edit.published} onChange={(v) => setEdit({ ...edit, published: v })} label="Publicado" /> Publicado</label>
            {edit.id && <ConfirmButton className="btn btn-danger" label="Confirmar: apagar" onConfirm={() => { mutate((d) => { d.courses = d.courses.filter((x) => x.id !== edit.id); d.students.forEach((s) => (s.courseIds = s.courseIds.filter((c) => c !== edit.id))); }); setEdit(null); toast('Curso apagado'); }}><Trash2 size={15} /> Apagar</ConfirmButton>}
            <button className="btn btn-primary" disabled={!edit.title.trim()} onClick={() => { mutate((d) => { if (edit.id) d.courses[d.courses.findIndex((x) => x.id === edit.id)] = edit; else d.courses.push({ ...edit, id: uid('cs_') }); }); toast('Curso guardado'); setEdit(null); }}>Guardar curso</button>
          </>}
        />
        <div className="panel panel-pad stack mb">
          <Field label="Título"><input className="input" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
          <Field label="Descrição"><textarea className="textarea" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
        </div>
        <div className="stack">
          {edit.modules.map((m, mi) => (
            <section key={m.id} className="panel">
              <div className="panel-head">
                <span className="faint">Módulo {mi + 1}</span>
                <input className="input sm" style={{ maxWidth: 320 }} value={m.title} onChange={(e) => updMod(mi, (x) => void (x.title = e.target.value))} aria-label="Título do módulo" />
                <div className="actions">
                  <button className="btn btn-sm" onClick={() => updMod(mi, (x) => void x.lessons.push({ id: uid('le_'), title: 'Nova aula', kind: 'video', content: '', minutes: 5 }))}><Plus size={14} /> Aula</button>
                  <button className="icon-btn sm" onClick={() => setEdit({ ...edit, modules: edit.modules.filter((_, j) => j !== mi) })} aria-label="Remover módulo"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="panel-body stack-sm">
                {m.lessons.length === 0 && <p className="faint">Sem aulas neste módulo.</p>}
                {m.lessons.map((l, li) => (
                  <div key={l.id} className="row-wrap">
                    {l.kind === 'video' ? <Video size={16} /> : <FileText size={16} />}
                    <input className="input sm" style={{ flex: '1 1 200px' }} value={l.title} onChange={(e) => updMod(mi, (x) => void (x.lessons[li].title = e.target.value))} aria-label="Título da aula" />
                    <select className="select sm" style={{ width: 100 }} value={l.kind} onChange={(e) => updMod(mi, (x) => void (x.lessons[li].kind = e.target.value as any))} aria-label="Tipo"><option value="video">Vídeo</option><option value="texto">Texto</option></select>
                    <input className="input sm" style={{ flex: '2 1 240px' }} value={l.content} onChange={(e) => updMod(mi, (x) => void (x.lessons[li].content = e.target.value))} placeholder={l.kind === 'video' ? 'Link do vídeo' : 'Texto da aula'} aria-label="Conteúdo" />
                    <input className="input sm num" type="number" style={{ width: 70 }} value={l.minutes} onChange={(e) => updMod(mi, (x) => void (x.lessons[li].minutes = +e.target.value))} aria-label="Minutos" />
                    <span className="faint">min</span>
                    <button className="icon-btn sm" onClick={() => updMod(mi, (x) => void x.lessons.splice(li, 1))} aria-label="Remover aula"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </section>
          ))}
          <div><button className="btn" onClick={() => setEdit({ ...edit, modules: [...edit.modules, { id: uid('mo_'), title: 'Novo módulo', lessons: [] }] })}><Plus size={16} /> Módulo</button></div>
        </div>
      </div>
    );
  }
  return (
    <div className="page">
      <PageHead title="Cursos" lead="Conteúdo em módulos e aulas para os alunos verem na app." actions={<button className="btn btn-primary" onClick={() => setEdit({ id: '', title: '', description: '', published: false, modules: [] })}><Plus size={16} /> Novo curso</button>} />
      <div className="grid g3">
        {db.courses.map((c) => {
          const lessons = c.modules.flatMap((m) => m.lessons);
          return (
            <div key={c.id} className="panel panel-pad stack">
              <div className="row">{c.published ? <span className="badge green">Publicado</span> : <span className="badge">Rascunho</span>}<span className="spacer" /><span className="faint">{enrolled(c.id)} alunos</span></div>
              <div><h3>{c.title}</h3><p className="faint mt-sm">{c.description}</p></div>
              <div className="small muted">{c.modules.length} módulos, {lessons.length} aulas, {lessons.reduce((a, l) => a + l.minutes, 0)} min</div>
              <div className="row-wrap">
                <button className="btn btn-sm" onClick={() => setEdit(structuredClone(c))}><Pencil size={14} /> Editar</button>
                <button className="btn btn-sm" onClick={() => setEnroll(c)}><Users size={14} /> Alunos</button>
              </div>
            </div>
          );
        })}
      </div>
      {enroll && <EnrollModal course={enroll} onClose={() => setEnroll(null)} />}
    </div>
  );
}

function EnrollModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const students = visibleStudents(db);
  const [sel, setSel] = useState(students.filter((s) => s.courseIds.includes(course.id)).map((s) => s.id));
  return (
    <Modal title={`Alunos em “${course.title}”`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={() => { mutate((d) => d.students.forEach((s) => { if (!students.some((v) => v.id === s.id)) return; const has = s.courseIds.includes(course.id); if (sel.includes(s.id) && !has) s.courseIds.push(course.id); if (!sel.includes(s.id) && has) s.courseIds = s.courseIds.filter((c) => c !== course.id); })); toast('Inscrições guardadas'); onClose(); }}>Guardar inscrições</button></>}>
      <div className="row"><span className="faint">{sel.length} selecionados</span><span className="spacer" /><button className="btn btn-sm" onClick={() => setSel(sel.length === students.length ? [] : students.map((s) => s.id))}>{sel.length === students.length ? 'Limpar' : 'Selecionar todos'}</button></div>
      <div className="stack-sm" style={{ maxHeight: 320, overflowY: 'auto' }}>
        {students.map((s) => <label key={s.id} className="check"><input type="checkbox" checked={sel.includes(s.id)} onChange={(e) => setSel(e.target.checked ? [...sel, s.id] : sel.filter((x) => x !== s.id))} />{s.name}</label>)}
      </div>
    </Modal>
  );
}

/* ---------------- Cofre ---------------- */
export function VaultPage() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const folders = Array.from(new Set(db.vault.map((f) => f.folder))).sort();
  const [folder, setFolder] = useState<string>('');
  const [share, setShare] = useState<VaultFile | null>(null);
  const [newFolder, setNewFolder] = useState('');
  const list = db.vault.filter((f) => !folder || f.folder === folder).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = db.vault.reduce((a, f) => a + f.size, 0);
  const upload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 2_000_000) { toast(`${file.name} tem mais de 2 MB e não foi guardado`); continue; }
      const dataUrl = await readFileAsDataUrl(file);
      mutate((d) => void d.vault.push({ id: uid('vf_'), name: file.name, folder: folder || newFolder || 'Geral', size: file.size, mime: file.type, dataUrl, sharedWith: [], createdAt: today() }));
    }
    toast('Ficheiros carregados');
  };
  return (
    <div className="page">
      <PageHead
        title="Cofre"
        lead={`Documentos, guias e contratos num só sítio. Partilha com todos os alunos ou só com alguns. ${fmtSize(total)} usados.`}
        actions={<><button className="btn btn-primary" onClick={() => input.current?.click()}><Upload size={16} /> Carregar ficheiros</button><input ref={input} type="file" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} /></>}
      />
      <div className="split-l">
        <aside className="panel panel-pad stack-sm">
          <button className={`nav-item ${!folder ? 'active' : ''}`} style={{ color: !folder ? undefined : 'var(--ink)' }} onClick={() => setFolder('')}><Folder size={16} /> Todos os ficheiros <span className="spacer" />{db.vault.length}</button>
          {folders.map((f) => (
            <button key={f} className={`nav-item ${folder === f ? 'active' : ''}`} style={{ color: folder === f ? undefined : 'var(--ink)' }} onClick={() => setFolder(f)}><Folder size={16} /> {f}<span className="spacer" />{db.vault.filter((x) => x.folder === f).length}</button>
          ))}
          <div className="divider" />
          <Field label="Pasta para novos ficheiros" hint="Escreve um nome para criar uma pasta nova.">
            <input className="input sm" value={folder || newFolder} onChange={(e) => { setFolder(''); setNewFolder(e.target.value); }} placeholder="Geral" />
          </Field>
        </aside>
        <div
          className="panel"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}
        >
          {list.length === 0 ? <Empty icon={<Upload size={28} />} title="Sem ficheiros" text="Arrasta ficheiros para aqui ou usa o botão de carregar. Máximo de 2 MB por ficheiro." /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Nome</th><th>Pasta</th><th>Tamanho</th><th>Partilhado com</th><th>Data</th><th /></tr></thead>
                <tbody>
                  {list.map((f) => (
                    <tr key={f.id}>
                      <td><div className="row"><FileText size={16} /><span className="strong">{f.name}</span></div></td>
                      <td>{f.folder}</td>
                      <td className="num">{fmtSize(f.size)}</td>
                      <td><button className="btn btn-sm btn-ghost" onClick={() => setShare(f)}>{f.sharedWith === 'todos' ? 'Todos os alunos' : f.sharedWith.length ? `${f.sharedWith.length} alunos` : 'Só a equipa'}</button></td>
                      <td>{fmtDate(f.createdAt, true)}</td>
                      <td>
                        <div className="row" style={{ gap: 2 }}>
                          <button className="icon-btn sm" onClick={() => downloadDataUrl(f.name, f.dataUrl)} aria-label="Descarregar"><Download size={15} /></button>
                          <ConfirmButton className="icon-btn sm" label="✓" onConfirm={() => { mutate((d) => void (d.vault = d.vault.filter((x) => x.id !== f.id))); toast('Ficheiro apagado'); }}><Trash2 size={15} /></ConfirmButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {share && <ShareModal file={share} onClose={() => setShare(null)} />}
    </div>
  );
}

function ShareModal({ file, onClose }: { file: VaultFile; onClose: () => void }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [mode, setMode] = useState<'equipa' | 'todos' | 'alguns'>(file.sharedWith === 'todos' ? 'todos' : file.sharedWith.length ? 'alguns' : 'equipa');
  const [sel, setSel] = useState<string[]>(Array.isArray(file.sharedWith) ? file.sharedWith : []);
  return (
    <Modal title={`Partilhar “${file.name}”`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={() => { mutate((d) => void (d.vault.find((x) => x.id === file.id)!.sharedWith = mode === 'todos' ? 'todos' : mode === 'alguns' ? sel : [])); toast('Partilha guardada'); onClose(); }}>Guardar partilha</button></>}>
      {(['equipa', 'todos', 'alguns'] as const).map((m) => (
        <label key={m} className="check"><input type="radio" name="share" checked={mode === m} onChange={() => setMode(m)} /> {{ equipa: 'Só a equipa', todos: 'Todos os alunos', alguns: 'Alunos escolhidos' }[m]}</label>
      ))}
      {mode === 'alguns' && (
        <div className="stack-sm" style={{ maxHeight: 240, overflowY: 'auto', paddingLeft: 24 }}>
          {visibleStudents(db).map((s) => <label key={s.id} className="check"><input type="checkbox" checked={sel.includes(s.id)} onChange={(e) => setSel(e.target.checked ? [...sel, s.id] : sel.filter((x) => x !== s.id))} />{s.name}</label>)}
        </div>
      )}
      {mode === 'alguns' && sel.length > 0 && <p className="faint">{sel.map((id) => studentById(db, id)?.name).join(', ')}</p>}
    </Modal>
  );
}
