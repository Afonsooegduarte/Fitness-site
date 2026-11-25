import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, ArrowUp, ArrowDown, Trash2, History, Copy, Save, Clock, Users, Shuffle, Pencil, Dumbbell } from 'lucide-react';
import { useStore } from '../store/store';
import type { Exercise, WorkoutPlan, WorkoutItem } from '../store/types';
import type { Route } from '../lib/router';
import { navigate } from '../lib/router';
import { dayDuration, studentById, visibleStudents } from '../lib/domain';
import { assignWorkout, savePlanVersion, ensureBaseline } from '../lib/actions';
import { fmtDuration, matches, relative, today, uid } from '../lib/utils';
import { EQUIPMENT_CATEGORIES, gymOf, missingEquipment } from '../lib/gyms';
import type { Gym } from '../store/types';
import { AlertTriangle, Building2 } from 'lucide-react';
import { ConfirmButton, Empty, Field, Modal, PageHead, Tabs, useToast } from '../components/ui';
import { PlanHistoryDrawer } from './PlanHistory';

export function WorkoutsPage({ route }: { route: Route }) {
  const [tab, setTab] = useState<'planos' | 'alunos' | 'exercicios'>((route.query.get('tab') as any) || 'planos');
  return (
    <div className="page">
      <PageHead title="Treinos" lead="Modelos de planos, planos de cada aluno e a biblioteca de exercícios." />
      <Tabs tabs={[{ id: 'planos', label: 'Modelos' }, { id: 'alunos', label: 'Planos dos alunos' }, { id: 'exercicios', label: 'Exercícios' }]} value={tab} onChange={setTab} />
      {tab === 'planos' && <TemplateList />}
      {tab === 'alunos' && <StudentPlans />}
      {tab === 'exercicios' && <ExerciseLibrary initialQ={route.query.get('q') ?? ''} />}
    </div>
  );
}

function TemplateList() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [assign, setAssign] = useState<WorkoutPlan | null>(null);
  const tpls = db.workoutPlans.filter((p) => !p.studentId);
  const create = () => {
    const p: WorkoutPlan = { id: uid('wp_'), name: 'Novo modelo', description: '', studentId: null, updatedAt: today(), days: [{ id: uid('wd_'), name: 'Treino A', items: [] }] };
    mutate((d) => void d.workoutPlans.push(p));
    navigate('/treinos/plano/' + p.id);
  };
  return (
    <>
      <div className="row mb">
        <span className="faint">{tpls.length} modelos</span>
        <span className="spacer" />
        <button className="btn btn-primary" onClick={create}><Plus size={16} /> Novo modelo</button>
      </div>
      <div className="grid g3">
        {tpls.map((p) => (
          <div key={p.id} className="panel panel-pad stack">
            <div>
              <h3>{p.name}</h3>
              <p className="faint mt-sm">{p.description || 'Sem descrição.'}</p>
            </div>
            <div className="row-wrap small muted">
              <span>{p.days.length} dias</span>
              <span>{p.days.reduce((a, d) => a + d.items.length, 0)} exercícios</span>
              <span>~{fmtDuration(dayDuration(p.days[0] ?? { id: '', name: '', items: [] }))} por sessão</span>
            </div>
            <div className="row-wrap">
              <button className="btn btn-sm" onClick={() => navigate('/treinos/plano/' + p.id)}><Pencil size={14} /> Editar</button>
              <button className="btn btn-sm" onClick={() => setAssign(p)}><Users size={14} /> Atribuir</button>
              <button className="btn btn-sm btn-ghost" onClick={() => { mutate((d) => void d.workoutPlans.push({ ...structuredClone(p), id: uid('wp_'), name: p.name + ' (cópia)' })); toast('Modelo duplicado'); }}><Copy size={14} /> Duplicar</button>
            </div>
          </div>
        ))}
      </div>
      {assign && <AssignModal kind="treino" planName={assign.name} onClose={() => setAssign(null)} onAssign={(ids) => { mutate((d) => ids.forEach((id) => assignWorkout(d, id, assign.id))); toast(`Plano atribuído a ${ids.length} alunos`); setAssign(null); }} />}
    </>
  );
}

export function AssignModal({ planName, onClose, onAssign, kind }: { planName: string; kind: 'treino' | 'nutricao'; onClose: () => void; onAssign: (ids: string[]) => void }) {
  const { db } = useStore();
  const [sel, setSel] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const students = visibleStudents(db).filter((s) => s.status === 'ativo' && (!q || matches(s.name, q)));
  return (
    <Modal
      title={`Atribuir “${planName}”`}
      onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!sel.length} onClick={() => onAssign(sel)}>Atribuir a {sel.length} alunos</button></>}
    >
      <p className="faint">Cada aluno recebe uma cópia própria, que podes ajustar sem mexer no modelo. O plano {kind === 'treino' ? 'de treino' : 'alimentar'} atual do aluno é substituído.</p>
      <div className="row">
        <div className="search" style={{ flex: 1 }}><Search size={16} /><input className="input sm" placeholder="Procurar" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <button className="btn btn-sm" onClick={() => setSel(sel.length === students.length ? [] : students.map((s) => s.id))}>{sel.length === students.length ? 'Limpar' : 'Selecionar todos'}</button>
      </div>
      <div className="stack-sm" style={{ maxHeight: 280, overflowY: 'auto' }}>
        {students.map((s) => (
          <label key={s.id} className="check"><input type="checkbox" checked={sel.includes(s.id)} onChange={(e) => setSel(e.target.checked ? [...sel, s.id] : sel.filter((x) => x !== s.id))} />{s.name}</label>
        ))}
      </div>
    </Modal>
  );
}

function StudentPlans() {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const ids = new Set(visibleStudents(db).map((s) => s.id));
  const plans = db.workoutPlans.filter((p) => p.studentId && ids.has(p.studentId) && studentById(db, p.studentId)?.workoutPlanId === p.id && (!q || matches(studentById(db, p.studentId)!.name + p.name, q)));
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="search" style={{ width: 280 }}><Search size={16} /><input className="input sm" placeholder="Procurar aluno ou plano" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Aluno</th><th>Plano</th><th>Dias</th><th>Atualizado</th><th>Versões</th></tr></thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="click" onClick={() => navigate('/treinos/plano/' + p.id)}>
                <td className="strong">{studentById(db, p.studentId)?.name}</td>
                <td>{p.name}</td>
                <td>{p.days.length}</td>
                <td>{relative(p.updatedAt)}</td>
                <td>{db.planVersions.filter((v) => v.planId === p.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExerciseLibrary({ initialQ }: { initialQ: string }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [q, setQ] = useState(initialQ);
  const [muscle, setMuscle] = useState('');
  const [edit, setEdit] = useState<Exercise | null>(null);
  const muscles = Array.from(new Set(db.exercises.map((e) => e.muscle))).sort();
  const list = db.exercises.filter((e) => (!q || matches(e.name, q)) && (!muscle || e.muscle === muscle));
  return (
    <div className="panel">
      <div className="panel-head" style={{ flexWrap: 'wrap' }}>
        <div className="search" style={{ width: 260 }}><Search size={16} /><input className="input sm" placeholder="Procurar exercício" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="select sm" style={{ width: 160 }} value={muscle} onChange={(e) => setMuscle(e.target.value)} aria-label="Grupo muscular">
          <option value="">Todos os grupos</option>
          {muscles.map((m) => <option key={m}>{m}</option>)}
        </select>
        <div className="actions">
          <button className="btn btn-sm btn-primary" onClick={() => setEdit({ id: '', name: '', muscle: 'Pernas', equipment: '', needs: [], videoUrl: '', instructions: '' })}><Plus size={15} /> Novo exercício</button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Exercício</th><th>Grupo</th><th>Material</th><th>Equipamento necessário</th><th>Vídeo</th></tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className="click" onClick={() => setEdit(e)}>
                <td className="strong">{e.name}</td>
                <td>{e.muscle}</td>
                <td>{e.equipment}</td>
                <td className="muted">{e.needs.length ? e.needs.map((n) => db.equipment.find((x) => x.id === n)?.name).filter(Boolean).join(', ') : <span className="faint">Nenhum</span>}</td>
                <td>{e.videoUrl ? <span className="badge blue">Com vídeo</span> : <span className="faint">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal
          title={edit.id ? 'Editar exercício' : 'Novo exercício'}
          onClose={() => setEdit(null)}
          footer={
            <>
              {edit.id && <span style={{ marginRight: 'auto' }}><ConfirmButton label="Confirmar: apagar" onConfirm={() => { mutate((d) => void (d.exercises = d.exercises.filter((x) => x.id !== edit.id))); setEdit(null); toast('Exercício apagado'); }}><Trash2 size={15} /> Apagar</ConfirmButton></span>}
              <button className="btn" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={!edit.name.trim()} onClick={() => { mutate((d) => { if (edit.id) d.exercises[d.exercises.findIndex((x) => x.id === edit.id)] = edit; else d.exercises.push({ ...edit, id: uid('ex_') }); }); setEdit(null); toast('Exercício guardado'); }}>Guardar exercício</button>
            </>
          }
        >
          <Field label="Nome"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
          <div className="grid g2">
            <Field label="Grupo muscular"><input className="input" list="muscles" value={edit.muscle} onChange={(e) => setEdit({ ...edit, muscle: e.target.value })} /></Field>
            <Field label="Material"><input className="input" value={edit.equipment} onChange={(e) => setEdit({ ...edit, equipment: e.target.value })} /></Field>
          </div>
          <datalist id="muscles">{muscles.map((m) => <option key={m} value={m} />)}</datalist>
          <div className="stack-sm">
            <span className="small strong">Equipamento necessário</span>
            <span className="faint small">Serve para saber em que ginásios dá para fazer este exercício. Sem nada marcado, dá para fazer em qualquer sítio.</span>
            <div style={{ maxHeight: 200, overflowY: 'auto' }} className="stack-sm">
              {EQUIPMENT_CATEGORIES.map((cat) => {
                const items = db.equipment.filter((x) => x.category === cat);
                if (!items.length) return null;
                return (
                  <div key={cat}>
                    <div className="faint small">{cat}</div>
                    <div className="row-wrap" style={{ gap: '4px 14px' }}>
                      {items.map((x) => (
                        <label key={x.id} className="check small">
                          <input type="checkbox" checked={edit.needs.includes(x.id)} onChange={(ev) => setEdit({ ...edit, needs: ev.target.checked ? [...edit.needs, x.id] : edit.needs.filter((n) => n !== x.id) })} />
                          {x.name}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <Field label="Link do vídeo"><input className="input" value={edit.videoUrl} onChange={(e) => setEdit({ ...edit, videoUrl: e.target.value })} placeholder="https://" /></Field>
          <Field label="Instruções"><textarea className="textarea" value={edit.instructions} onChange={(e) => setEdit({ ...edit, instructions: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}

function ExercisePicker({ onPick, onClose, multi, initial = [], gym }: { onPick: (ids: string[]) => void; onClose: () => void; multi?: boolean; initial?: string[]; gym?: Gym }) {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string[]>(initial);
  const [onlyGym, setOnlyGym] = useState(!!gym);
  const list = db.exercises.filter((e) => (!q || matches(e.name + ' ' + e.muscle, q)) && (!onlyGym || missingEquipment(db, e, gym).length === 0));
  return (
    <Modal
      title={multi ? 'Alternativas ao exercício' : 'Adicionar exercício'}
      onClose={onClose}
      footer={multi ? <><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={() => onPick(sel)}>Guardar alternativas</button></> : undefined}
    >
      <div className="search"><Search size={16} /><input className="input" placeholder="Procurar por nome ou grupo muscular" value={q} onChange={(e) => setQ(e.target.value)} autoFocus /></div>
      {gym && (
        <label className="check small">
          <input type="checkbox" checked={onlyGym} onChange={(e) => setOnlyGym(e.target.checked)} />
          Só o que dá para fazer em {gym.name}
        </label>
      )}
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {list.length === 0 && <p className="faint small">Nenhum exercício encontrado.</p>}
        {list.map((e) => {
          const miss = missingEquipment(db, e, gym);
          const warn = miss.length > 0 && <span className="badge yellow" title={'Falta: ' + miss.map((m) => m.name).join(', ')}>Não há em {gym!.name}</span>;
          return multi ? (
            <label key={e.id} className="check" style={{ padding: '6px 0', display: 'flex' }}>
              <input type="checkbox" checked={sel.includes(e.id)} onChange={(ev) => setSel(ev.target.checked ? [...sel, e.id] : sel.filter((x) => x !== e.id))} />
              {e.name} <span className="faint">{e.muscle}</span> {warn}
            </label>
          ) : (
            <button key={e.id} className="nav-item" style={{ color: 'var(--ink)' }} onClick={() => onPick([e.id])}>
              {e.name} {warn}<span className="spacer" /><span className="faint">{e.muscle}, {e.equipment}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

const nextGroup = (g: string) => (g === '' ? 'A' : g === 'D' ? '' : String.fromCharCode(g.charCodeAt(0) + 1));

export function WorkoutEditorPage({ id }: { id: string }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const saved = db.workoutPlans.find((p) => p.id === id);
  const [plan, setPlan] = useState<WorkoutPlan | null>(saved ? structuredClone(saved) : null);
  const [day, setDay] = useState(0);
  const [pick, setPick] = useState(false);
  const [alt, setAlt] = useState<WorkoutItem | null>(null);
  const [hist, setHist] = useState(false);
  const [sync, setSync] = useState(false);
  const dirty = useMemo(() => JSON.stringify(plan) !== JSON.stringify(saved), [plan, saved]);
  useEffect(() => {
    if (sync && saved) {
      setPlan(structuredClone(saved));
      setSync(false);
    }
  }, [sync, saved]);
  useEffect(() => {
    const on = (e: BeforeUnloadEvent) => dirty && e.preventDefault();
    window.addEventListener('beforeunload', on);
    return () => window.removeEventListener('beforeunload', on);
  }, [dirty]);
  if (!plan || !saved) return <div className="page"><Empty title="Plano não encontrado" /></div>;
  const student = studentById(db, plan.studentId);
  const gym = gymOf(db, student);
  const d = plan.days[day] ?? plan.days[0];
  const notAvailable = gym ? plan.days.flatMap((x) => x.items).filter((it) => missingEquipment(db, db.exercises.find((e) => e.id === it.exerciseId), gym).length > 0).length : 0;
  const upd = (fn: (p: WorkoutPlan) => void) => setPlan((p) => { const n = structuredClone(p!); fn(n); return n; });
  const updItem = (itemId: string, patch: Partial<WorkoutItem>) => upd((p) => Object.assign(p.days[day].items.find((i) => i.id === itemId)!, patch));
  const move = (i: number, dir: -1 | 1) => upd((p) => { const it = p.days[day].items; const j = i + dir; if (j < 0 || j >= it.length) return; [it[i], it[j]] = [it[j], it[i]]; });
  const save = () => {
    const next = { ...plan, updatedAt: today() };
    mutate((x) => {
      const idx = x.workoutPlans.findIndex((p) => p.id === id);
      ensureBaseline(x, 'treino', x.workoutPlans[idx]);
      x.workoutPlans[idx] = next;
      savePlanVersion(x, 'treino', next);
    });
    setPlan(next);
    toast(student ? `Plano guardado. ${student.name.split(' ')[0]} vai ver o que mudou na app.` : 'Modelo guardado');
  };
  const saveAsTemplate = () => {
    mutate((x) => void x.workoutPlans.push({ ...structuredClone(plan), id: uid('wp_'), studentId: null, name: plan.name + ' (modelo)' }));
    toast('Guardado como modelo na biblioteca');
  };

  return (
    <div className="page">
      <PageHead
        back={student ? { label: student.name, to: '/alunos/' + student.id + '?tab=planos' } : { label: 'Treinos', to: '/treinos' }}
        title={<input className="input" value={plan.name} onChange={(e) => upd((p) => void (p.name = e.target.value))} style={{ font: '600 30px var(--display)', height: 46, border: '1px dashed transparent', padding: '0 6px', marginLeft: -6, background: 'transparent' }} aria-label="Nome do plano" />}
        lead={student ? `Plano de ${student.name}` : 'Modelo da biblioteca'}
        actions={
          <>
            <button className="btn" onClick={() => setHist(true)}><History size={16} /> Alterações do plano</button>
            {student && <button className="btn" onClick={saveAsTemplate}><Copy size={16} /> Guardar como modelo</button>}
            <button className="btn btn-primary" disabled={!dirty} onClick={save}><Save size={16} /> {dirty ? 'Guardar plano' : 'Guardado'}</button>
          </>
        }
      />
      <Field label="Descrição"><input className="input" value={plan.description} onChange={(e) => upd((p) => void (p.description = e.target.value))} placeholder="Para quem é e como progride" /></Field>
      {student && (
        <div className="sub small row-wrap mt-sm">
          <Building2 size={15} />
          {gym ? (
            <>
              <span>Treina em <span className="strong">{gym.name}</span>.</span>
              {notAvailable > 0
                ? <span style={{ color: 'var(--red)' }}><AlertTriangle size={14} /> {notAvailable} {notAvailable === 1 ? 'exercício precisa' : 'exercícios precisam'} de equipamento que não existe lá.</span>
                : <span className="faint">Todos os exercícios dão para fazer lá.</span>}
            </>
          ) : (
            <span className="faint">{student.name.split(' ')[0]} ainda não disse onde treina. Define o ginásio na ficha do aluno.</span>
          )}
        </div>
      )}
      <div className="tabs mt" style={{ alignItems: 'center' }}>
        {plan.days.map((x, i) => (
          <button key={x.id} className={i === day ? 'on' : ''} onClick={() => setDay(i)}>{x.name}</button>
        ))}
        <button onClick={() => { upd((p) => void p.days.push({ id: uid('wd_'), name: `Treino ${String.fromCharCode(65 + p.days.length)}`, items: [] })); setDay(plan.days.length); }}><Plus size={14} /> Dia</button>
      </div>
      {d && (
        <section className="panel">
          <div className="panel-head" style={{ flexWrap: 'wrap' }}>
            <input className="input sm" style={{ width: 200 }} value={d.name} onChange={(e) => upd((p) => void (p.days[day].name = e.target.value))} aria-label="Nome do dia" />
            <span className="row small muted"><Clock size={15} /> Tempo estimado {fmtDuration(dayDuration(d))}</span>
            <span className="faint">Descanso por preencher conta como 0 s. Toca no quadrado à esquerda para juntar exercícios num superset ou circuito.</span>
            <div className="actions">
              <button className="btn btn-sm btn-primary" onClick={() => setPick(true)}><Plus size={15} /> Exercício</button>
              {plan.days.length > 1 && <ConfirmButton label="Confirmar: apagar dia" onConfirm={() => { upd((p) => void p.days.splice(day, 1)); setDay(0); }}><Trash2 size={14} /> Dia</ConfirmButton>}
            </div>
          </div>
          {d.items.length === 0 ? (
            <Empty icon={<Dumbbell size={26} />} title="Este dia ainda não tem exercícios" action={<button className="btn btn-sm" onClick={() => setPick(true)}><Plus size={15} /> Adicionar exercício</button>} />
          ) : (
            <div>
              <div className="ex-row head"><span /><span>Exercício</span><span>Séries</span><span>Repetições</span><span>Descanso (s)</span><span>Notas</span><span /></div>
              {d.items.map((it, i) => {
                const ex = db.exercises.find((e) => e.id === it.exerciseId);
                const miss = missingEquipment(db, ex, gym);
                return (
                  <div key={it.id} className={`ex-row ${it.group ? 'grouped' : ''}`}>
                    <button className={`grp ${it.group ? 'on' : ''}`} onClick={() => updItem(it.id, { group: nextGroup(it.group) })} title="Clica para agrupar em superset ou circuito" aria-label="Grupo">{it.group || '·'}</button>
                    <div style={{ minWidth: 0 }}>
                      <div className="strong ellipsis">{ex?.name ?? 'Exercício apagado'}</div>
                      {miss.length > 0 && <div className="small ellipsis" style={{ color: 'var(--red)' }} title={'Falta: ' + miss.map((m) => m.name).join(', ')}><AlertTriangle size={12} /> Não há {miss.map((m) => m.name.toLowerCase()).join(', ')} em {gym!.name}</div>}
                      {it.alternatives.length > 0 && <div className="faint ellipsis">Alternativas: {it.alternatives.map((a) => db.exercises.find((e) => e.id === a)?.name).join(', ')}</div>}
                    </div>
                    <input className="input sm" type="number" min={1} value={it.sets} onChange={(e) => updItem(it.id, { sets: Math.max(1, +e.target.value || 1) })} aria-label="Séries" />
                    <input className="input sm" value={it.reps} onChange={(e) => updItem(it.id, { reps: e.target.value })} aria-label="Repetições" />
                    <input className="input sm" type="number" min={0} placeholder="por preencher" value={it.rest ?? ''} onChange={(e) => updItem(it.id, { rest: e.target.value === '' ? null : Math.max(0, +e.target.value) })} aria-label="Descanso em segundos" />
                    <input className="input sm" value={it.notes} onChange={(e) => updItem(it.id, { notes: e.target.value })} placeholder="RPE, tempo, cues" aria-label="Notas" />
                    <div className="row" style={{ gap: 2 }}>
                      <button className="icon-btn sm" onClick={() => setAlt(it)} title="Alternativas" aria-label="Alternativas"><Shuffle size={15} /></button>
                      <button className="icon-btn sm" onClick={() => move(i, -1)} aria-label="Subir"><ArrowUp size={15} /></button>
                      <button className="icon-btn sm" onClick={() => move(i, 1)} aria-label="Descer"><ArrowDown size={15} /></button>
                      <button className="icon-btn sm" onClick={() => upd((p) => void p.days[day].items.splice(i, 1))} aria-label="Remover"><Trash2 size={15} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
      {pick && (
        <ExercisePicker
          gym={gym}
          onClose={() => setPick(false)}
          onPick={([exId]) => {
            upd((p) => void p.days[day].items.push({ id: uid('wi_'), exerciseId: exId, sets: 3, reps: '10', rest: null, notes: '', group: '', alternatives: [] }));
            setPick(false);
          }}
        />
      )}
      {alt && <ExercisePicker multi gym={gym} initial={alt.alternatives} onClose={() => setAlt(null)} onPick={(ids) => { updItem(alt.id, { alternatives: ids.filter((x) => x !== alt.exerciseId) }); setAlt(null); }} />}
      {hist && <PlanHistoryDrawer kind="treino" planId={plan.id} onClose={() => setHist(false)} onRestored={() => setSync(true)} />}
    </div>
  );
}
