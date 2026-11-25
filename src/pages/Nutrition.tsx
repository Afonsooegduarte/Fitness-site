import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2, History, Copy, Save, Users, Pencil, Eye, EyeOff, ChefHat, X, Apple } from 'lucide-react';
import { useStore } from '../store/store';
import type { DB, Food, FoodPortion, Meal, NutritionPlan, PlanMeal, RecipeRequest } from '../store/types';
import type { Route } from '../lib/router';
import { navigate } from '../lib/router';
import { macros, studentById, visibleStudents } from '../lib/domain';
import { assignNutrition, savePlanVersion, sendCoachMessage, ensureBaseline } from '../lib/actions';
import { fmtDateTime, matches, num, relative, today, uid } from '../lib/utils';
import { Avatar, ConfirmButton, Empty, Field, ImagePicker, Modal, PageHead, Seg, Tabs, useToast } from '../components/ui';
import { PlanHistoryDrawer } from './PlanHistory';
import { AssignModal } from './Workouts';

export function MacroLine({ items, big }: { items: FoodPortion[]; big?: boolean }) {
  const { db } = useStore();
  const m = macros(db, items);
  const tot = m.p * 4 + m.c * 4 + m.f * 9 || 1;
  return (
    <div className="stack-sm" style={{ minWidth: big ? 260 : 180 }}>
      <div className="row small num" style={{ gap: 12 }}>
        <span className="strong">{num(m.kcal, 0)} kcal</span>
        <span><span className="color-dot" style={{ background: 'var(--red)', width: 8, height: 8 }} /> P {num(m.p, 0)} g</span>
        <span><span className="color-dot" style={{ background: 'var(--yellow)', width: 8, height: 8 }} /> H {num(m.c, 0)} g</span>
        <span><span className="color-dot" style={{ background: 'var(--blue)', width: 8, height: 8 }} /> G {num(m.f, 0)} g</span>
      </div>
      {big && (
        <div className="macro-bar">
          <span style={{ width: `${(m.p * 4 * 100) / tot}%` }} />
          <span style={{ width: `${(m.c * 4 * 100) / tot}%` }} />
          <span style={{ width: `${(m.f * 9 * 100) / tot}%` }} />
        </div>
      )}
    </div>
  );
}

export const FoodImg = ({ food, size = 40 }: { food?: Food; size?: number }) => (
  <span className="food-img" style={{ width: size, height: size, fontSize: size * 0.55 }}>
    {food?.image?.startsWith('data:') ? <img src={food.image} alt="" /> : food?.image || '🍽️'}
  </span>
);

export const MealPhoto = ({ meal, db, h = 120 }: { meal: Meal; db: DB; h?: number }) =>
  meal.photo ? (
    <img src={meal.photo} alt="" style={{ width: '100%', height: h, objectFit: 'cover', borderRadius: 8 }} />
  ) : (
    <div style={{ height: h, borderRadius: 8, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: h / 4 }}>
      {meal.items.slice(0, 3).map((i) => <span key={i.foodId}>{db.foods.find((f) => f.id === i.foodId)?.image?.startsWith('data:') ? '🍽️' : db.foods.find((f) => f.id === i.foodId)?.image}</span>)}
    </div>
  );

type NTab = 'modelos' | 'alunos' | 'refeicoes' | 'alimentos' | 'pedidos';

export function NutritionPage({ route }: { route: Route }) {
  const { db } = useStore();
  const [tab, setTab] = useState<NTab>((route.query.get('tab') as NTab) || 'modelos');
  const pend = db.recipeRequests.filter((r) => r.status === 'pendente').length;
  return (
    <div className="page">
      <PageHead title="Nutrição" lead="Planos alimentares, refeições partilháveis com os alunos e a base de alimentos." />
      <Tabs
        tabs={[
          { id: 'modelos', label: 'Modelos' },
          { id: 'alunos', label: 'Planos dos alunos' },
          { id: 'refeicoes', label: 'Refeições e receitas' },
          { id: 'alimentos', label: 'Alimentos' },
          { id: 'pedidos', label: `Pedidos de receita${pend ? ` (${pend})` : ''}` },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'modelos' && <Templates />}
      {tab === 'alunos' && <StudentNutritionPlans />}
      {tab === 'refeicoes' && <Meals />}
      {tab === 'alimentos' && <Foods initialQ={route.query.get('q') ?? ''} />}
      {tab === 'pedidos' && <Requests />}
    </div>
  );
}

function Templates() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [assign, setAssign] = useState<NutritionPlan | null>(null);
  const tpls = db.nutritionPlans.filter((p) => !p.studentId);
  const create = () => {
    const p: NutritionPlan = { id: uid('np_'), name: 'Novo plano alimentar', studentId: null, updatedAt: today(), days: [{ id: uid('nd_'), name: 'Dia tipo', meals: [] }] };
    mutate((d) => void d.nutritionPlans.push(p));
    navigate('/nutricao/plano/' + p.id);
  };
  return (
    <>
      <div className="row mb"><span className="faint">{tpls.length} modelos</span><span className="spacer" /><button className="btn btn-primary" onClick={create}><Plus size={16} /> Novo modelo</button></div>
      <div className="grid g3">
        {tpls.map((p) => (
          <div key={p.id} className="panel panel-pad stack">
            <h3>{p.name}</h3>
            <div className="small muted">{p.days.length} tipos de dia, {p.days.reduce((a, d) => a + d.meals.length, 0)} refeições</div>
            <MacroLine items={p.days[0]?.meals.flatMap((m) => m.items) ?? []} big />
            <div className="row-wrap">
              <button className="btn btn-sm" onClick={() => navigate('/nutricao/plano/' + p.id)}><Pencil size={14} /> Editar</button>
              <button className="btn btn-sm" onClick={() => setAssign(p)}><Users size={14} /> Atribuir</button>
              <button className="btn btn-sm btn-ghost" onClick={() => { mutate((d) => void d.nutritionPlans.push({ ...structuredClone(p), id: uid('np_'), name: p.name + ' (cópia)' })); toast('Modelo duplicado'); }}><Copy size={14} /> Duplicar</button>
            </div>
          </div>
        ))}
      </div>
      {assign && <AssignModal kind="nutricao" planName={assign.name} onClose={() => setAssign(null)} onAssign={(ids) => { mutate((d) => ids.forEach((id) => assignNutrition(d, id, assign.id))); toast(`Plano atribuído a ${ids.length} alunos`); setAssign(null); }} />}
    </>
  );
}

function StudentNutritionPlans() {
  const { db } = useStore();
  const ids = new Set(visibleStudents(db).map((s) => s.id));
  const plans = db.nutritionPlans.filter((p) => p.studentId && ids.has(p.studentId) && studentById(db, p.studentId)?.nutritionPlanId === p.id);
  return (
    <div className="panel">
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Aluno</th><th>Plano</th><th>Energia (1.º dia)</th><th>Atualizado</th><th>Pedidos</th></tr></thead>
          <tbody>
            {plans.map((p) => {
              const n = db.recipeRequests.filter((r) => r.studentId === p.studentId && r.status === 'pendente').length;
              return (
                <tr key={p.id} className="click" onClick={() => navigate('/nutricao/plano/' + p.id)}>
                  <td className="strong">{studentById(db, p.studentId)?.name}</td>
                  <td>{p.name}</td>
                  <td className="num">{num(macros(db, p.days[0]?.meals.flatMap((m) => m.items) ?? []).kcal, 0)} kcal</td>
                  <td>{relative(p.updatedAt)}</td>
                  <td>{n ? <span className="badge blue">{n}</span> : <span className="faint">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Requests() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [status, setStatus] = useState<RecipeRequest['status']>('pendente');
  const list = db.recipeRequests.filter((r) => r.status === status).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <div className="mb"><Seg options={[{ id: 'pendente', label: 'Por tratar' }, { id: 'adicionado', label: 'Adicionados' }, { id: 'dispensado', label: 'Dispensados' }]} value={status} onChange={setStatus} /></div>
      <div className="panel">
        {list.length === 0 ? <Empty icon={<ChefHat size={28} />} title="Sem pedidos" text="Quando um aluno pedir uma receita pública na app, aparece aqui." /> : (
          <div className="list">
            {list.map((r) => {
              const s = studentById(db, r.studentId);
              const m = db.meals.find((x) => x.id === r.mealId);
              if (!s) return null;
              return (
                <div key={r.id} className="list-row">
                  <Avatar name={s.name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div><span className="strong">{s.name}</span> pediu <span className="strong">“{m?.name ?? 'receita apagada'}”</span></div>
                    <div className="faint">{fmtDateTime(r.createdAt)}{r.note ? `, nota: “${r.note}”` : ''}</div>
                  </div>
                  {status === 'pendente' && (
                    <>
                      <button className="btn btn-sm btn-ghost" onClick={() => { mutate((d) => void (d.recipeRequests.find((x) => x.id === r.id)!.status = 'dispensado')); toast('Pedido dispensado'); }}>Dispensar</button>
                      <button className="btn btn-sm btn-primary" onClick={() => navigate(`/nutricao/plano/${s.nutritionPlanId}?pedido=${r.id}`)}>Abrir no plano</button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function Meals() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [edit, setEdit] = useState<Meal | null>(null);
  const [vis, setVis] = useState<'todas' | 'publicas' | 'privadas'>('todas');
  const list = db.meals.filter((m) => vis === 'todas' || (vis === 'publicas' ? m.isPublic : !m.isPublic));
  return (
    <>
      <div className="row-wrap mb">
        <Seg options={[{ id: 'todas', label: 'Todas' }, { id: 'publicas', label: 'Públicas' }, { id: 'privadas', label: 'Privadas' }]} value={vis} onChange={setVis} />
        <span className="faint">As públicas aparecem na área Receitas da app dos alunos, que as podem pedir para o plano.</span>
        <span className="spacer" />
        <button className="btn btn-primary" onClick={() => setEdit({ id: '', name: '', items: [], isPublic: false, photo: '', notes: '' })}><Plus size={16} /> Nova refeição</button>
      </div>
      <div className="panel">
        <div className="list">
          {list.map((m) => (
            <div key={m.id} className="list-row">
              <button
                className="icon-btn"
                onClick={() => { mutate((d) => void (d.meals.find((x) => x.id === m.id)!.isPublic = !m.isPublic)); toast(m.isPublic ? 'Refeição agora é privada' : 'Refeição agora é pública'); }}
                title={m.isPublic ? 'Pública: clica para tornar privada' : 'Privada: clica para tornar pública'}
                aria-label={m.isPublic ? 'Tornar privada' : 'Tornar pública'}
                style={{ color: m.isPublic ? 'var(--green)' : 'var(--ink-3)' }}
              >
                {m.isPublic ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
              <div style={{ width: 64, flex: 'none' }}><MealPhoto meal={m} db={db} h={44} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="strong">{m.name}</div>
                <div className="faint ellipsis">{m.items.map((i) => db.foods.find((f) => f.id === i.foodId)?.name).join(', ')}</div>
              </div>
              <MacroLine items={m.items} />
              <button className="btn btn-sm" onClick={() => setEdit(structuredClone(m))}><Pencil size={14} /> Editar</button>
            </div>
          ))}
        </div>
      </div>
      {edit && <MealEditor meal={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function MealEditor({ meal, onClose }: { meal: Meal; onClose: () => void }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [m, setM] = useState(meal);
  const [pick, setPick] = useState(false);
  return (
    <Modal
      title={meal.id ? 'Editar refeição' : 'Nova refeição'}
      onClose={onClose}
      size="wide"
      footer={
        <>
          {meal.id && <span style={{ marginRight: 'auto' }}><ConfirmButton label="Confirmar: apagar" onConfirm={() => { mutate((d) => void (d.meals = d.meals.filter((x) => x.id !== meal.id))); toast('Refeição apagada'); onClose(); }}><Trash2 size={15} /> Apagar</ConfirmButton></span>}
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!m.name.trim()} onClick={() => { mutate((d) => { if (m.id) d.meals[d.meals.findIndex((x) => x.id === m.id)] = m; else d.meals.push({ ...m, id: uid('ml_') }); }); toast('Refeição guardada'); onClose(); }}>Guardar refeição</button>
        </>
      }
    >
      <div className="grid g2">
        <Field label="Nome"><input className="input" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} autoFocus /></Field>
        <Field label="Visibilidade">
          <Seg options={[{ id: 'priv', label: <><EyeOff size={14} /> Privada</> }, { id: 'pub', label: <><Eye size={14} /> Pública</> }]} value={m.isPublic ? 'pub' : 'priv'} onChange={(v) => setM({ ...m, isPublic: v === 'pub' })} />
        </Field>
      </div>
      <Field label="Foto" hint="É o que o aluno vê primeiro na lista de receitas.">
        <ImagePicker value={m.photo} onChange={(photo) => setM({ ...m, photo })} size={88} />
      </Field>
      <PortionEditor items={m.items} onChange={(items) => setM({ ...m, items })} onAdd={() => setPick(true)} />
      <Field label="Modo de preparação e notas"><textarea className="textarea" value={m.notes} onChange={(e) => setM({ ...m, notes: e.target.value })} /></Field>
      {pick && <FoodPicker onClose={() => setPick(false)} onPick={(p) => { setM({ ...m, items: [...m.items, p] }); setPick(false); }} />}
    </Modal>
  );
}

function PortionEditor({ items, onChange, onAdd }: { items: FoodPortion[]; onChange: (i: FoodPortion[]) => void; onAdd: () => void }) {
  const { db } = useStore();
  return (
    <div className="stack-sm">
      {items.map((it, i) => {
        const f = db.foods.find((x) => x.id === it.foodId);
        const k = f ? (f.unit === 'un' ? it.qty : it.qty / 100) : 0;
        return (
          <div key={i} className="row">
            <FoodImg food={f} size={32} />
            <span style={{ flex: 1 }} className="ellipsis">{f?.name}</span>
            <input className="input sm num" type="number" min={0} style={{ width: 80 }} value={it.qty} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, qty: Math.max(0, +e.target.value) } : x)))} aria-label="Quantidade" />
            <span className="faint" style={{ width: 22 }}>{f?.unit === 'un' ? 'un' : 'g'}</span>
            <span className="faint num" style={{ width: 70, textAlign: 'right' }}>{f ? num(f.kcal * k, 0) : 0} kcal</span>
            <button className="icon-btn sm" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remover alimento"><X size={15} /></button>
          </div>
        );
      })}
      <div className="row">
        <button className="btn btn-sm" onClick={onAdd}><Plus size={14} /> Alimento</button>
        <span className="spacer" />
        <MacroLine items={items} />
      </div>
    </div>
  );
}

function FoodPicker({ onPick, onClose }: { onPick: (p: FoodPortion) => void; onClose: () => void }) {
  const { db } = useStore();
  const [q, setQ] = useState('');
  return (
    <Modal title="Adicionar alimento" onClose={onClose}>
      <div className="search"><Search size={16} /><input className="input" placeholder="Procurar alimento" value={q} onChange={(e) => setQ(e.target.value)} autoFocus /></div>
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {db.foods.filter((f) => !q || matches(f.name, q)).map((f) => (
          <button key={f.id} className="nav-item" style={{ color: 'var(--ink)' }} onClick={() => onPick({ foodId: f.id, qty: f.unit === 'un' ? 1 : 100 })}>
            <FoodImg food={f} size={28} /> {f.name}<span className="spacer" /><span className="faint num">{f.kcal} kcal / {f.unit === 'un' ? 'un' : '100 g'}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function Foods({ initialQ }: { initialQ: string }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [q, setQ] = useState(initialQ);
  const [edit, setEdit] = useState<Food | null>(null);
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="search" style={{ width: 260 }}><Search size={16} /><input className="input sm" placeholder="Procurar alimento" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="actions"><button className="btn btn-sm btn-primary" onClick={() => setEdit({ id: '', name: '', kcal: 0, p: 0, c: 0, f: 0, unit: 'g', image: '' })}><Plus size={15} /> Novo alimento</button></div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Alimento</th><th>Referência</th><th>kcal</th><th>Proteína</th><th>Hidratos</th><th>Gordura</th></tr></thead>
          <tbody>
            {db.foods.filter((f) => !q || matches(f.name, q)).map((f) => (
              <tr key={f.id} className="click" onClick={() => setEdit(structuredClone(f))}>
                <td><div className="row"><FoodImg food={f} size={34} /><span className="strong">{f.name}</span></div></td>
                <td className="faint">{f.unit === 'un' ? '1 unidade' : '100 g'}</td>
                <td className="num">{f.kcal}</td><td className="num">{f.p} g</td><td className="num">{f.c} g</td><td className="num">{f.f} g</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal
          title={edit.id ? 'Editar alimento' : 'Novo alimento'}
          onClose={() => setEdit(null)}
          footer={
            <>
              {edit.id && <span style={{ marginRight: 'auto' }}><ConfirmButton label="Confirmar: apagar" onConfirm={() => { mutate((d) => void (d.foods = d.foods.filter((x) => x.id !== edit.id))); setEdit(null); toast('Alimento apagado'); }}><Trash2 size={15} /> Apagar</ConfirmButton></span>}
              <button className="btn" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={!edit.name.trim()} onClick={() => { mutate((d) => { if (edit.id) d.foods[d.foods.findIndex((x) => x.id === edit.id)] = edit; else d.foods.push({ ...edit, id: uid('fd_') }); }); setEdit(null); toast('Alimento guardado'); }}>Guardar alimento</button>
            </>
          }
        >
          <Field label="Imagem" hint="Escolhe uma foto ou escreve um emoji no campo abaixo.">
            <ImagePicker value={edit.image} onChange={(image) => setEdit({ ...edit, image })} />
          </Field>
          {!edit.image.startsWith('data:') && <Field label="Emoji"><input className="input" value={edit.image} onChange={(e) => setEdit({ ...edit, image: e.target.value })} style={{ width: 90 }} /></Field>}
          <Field label="Nome"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
          <Field label="Valores por">
            <Seg options={[{ id: 'g', label: '100 g' }, { id: 'un', label: '1 unidade' }]} value={edit.unit} onChange={(unit) => setEdit({ ...edit, unit })} />
          </Field>
          <div className="grid g4">
            {(['kcal', 'p', 'c', 'f'] as const).map((k) => (
              <Field key={k} label={{ kcal: 'kcal', p: 'Proteína (g)', c: 'Hidratos (g)', f: 'Gordura (g)' }[k]}>
                <input className="input" type="number" step="0.1" value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: +e.target.value })} />
              </Field>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

export function NutritionEditorPage({ id, route }: { id: string; route: Route }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const saved = db.nutritionPlans.find((p) => p.id === id);
  const [plan, setPlan] = useState<NutritionPlan | null>(saved ? structuredClone(saved) : null);
  const [day, setDay] = useState(0);
  const [pick, setPick] = useState<{ meal: string; alt?: string } | null>(null);
  const [hist, setHist] = useState(false);
  const [sync, setSync] = useState(false);
  const [resolved, setResolved] = useState<string[]>([]);
  const [hl, setHl] = useState<string | null>(null);
  const [reqOpen, setReqOpen] = useState<string | null>(route.query.get('pedido'));
  const [reqList, setReqList] = useState(false);
  const dirty = useMemo(() => JSON.stringify(plan) !== JSON.stringify(saved), [plan, saved]);
  useEffect(() => {
    if (sync && saved) {
      setPlan(structuredClone(saved));
      setSync(false);
    }
  }, [sync, saved]);
  useEffect(() => {
    if (!hl) return;
    const t = setTimeout(() => document.getElementById('el-' + hl)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    return () => clearTimeout(t);
  }, [hl]);
  if (!plan || !saved) return <div className="page"><Empty title="Plano não encontrado" /></div>;
  const student = studentById(db, plan.studentId);
  const requests = db.recipeRequests.filter((r) => r.studentId === plan.studentId && r.status === 'pendente' && !resolved.includes(r.id));
  const d = plan.days[day] ?? plan.days[0];
  const upd = (fn: (p: NutritionPlan) => void) => setPlan((p) => { const n = structuredClone(p!); fn(n); return n; });
  const updMeal = (mealId: string, fn: (m: PlanMeal) => void) => upd((p) => fn(p.days[day].meals.find((m) => m.id === mealId)!));

  const save = () => {
    const next = { ...plan, updatedAt: today() };
    mutate((x) => {
      const idx = x.nutritionPlans.findIndex((p) => p.id === id);
      ensureBaseline(x, 'nutricao', x.nutritionPlans[idx]);
      x.nutritionPlans[idx] = next;
      savePlanVersion(x, 'nutricao', next);
      for (const rid of resolved) {
        const r = x.recipeRequests.find((y) => y.id === rid);
        if (r) {
          r.status = 'adicionado';
          const meal = x.meals.find((m) => m.id === r.mealId);
          sendCoachMessage(x, r.studentId, `Adicionei “${meal?.name}” ao teu plano. Bom apetite!`);
        }
      }
    });
    setResolved([]);
    setPlan(next);
    toast(resolved.length ? 'Plano guardado e pedido marcado como tratado' : 'Plano guardado');
  };

  return (
    <div className="page">
      <PageHead
        back={student ? { label: student.name, to: '/alunos/' + student.id + '?tab=planos' } : { label: 'Nutrição', to: '/nutricao' }}
        title={<input className="input" value={plan.name} onChange={(e) => upd((p) => void (p.name = e.target.value))} style={{ font: '600 30px var(--display)', height: 46, border: '1px dashed transparent', padding: '0 6px', marginLeft: -6, background: 'transparent' }} aria-label="Nome do plano" />}
        lead={student ? `Plano alimentar de ${student.name}` : 'Modelo da biblioteca'}
        actions={
          <>
            {student && (
              <button className="btn" onClick={() => setReqList(true)}>
                <ChefHat size={16} /> Pedidos de receita {requests.length > 0 && <span className="badge blue">{requests.length}</span>}
              </button>
            )}
            <button className="btn" onClick={() => setHist(true)}><History size={16} /> Alterações do plano</button>
            <button className="btn btn-primary" disabled={!dirty} onClick={save}><Save size={16} /> {dirty ? 'Guardar plano' : 'Guardado'}</button>
          </>
        }
      />
      <div className="tabs">
        {plan.days.map((x, i) => <button key={x.id} className={i === day ? 'on' : ''} onClick={() => setDay(i)}>{x.name}</button>)}
        <button onClick={() => { upd((p) => void p.days.push({ id: uid('nd_'), name: 'Novo dia', meals: [] })); setDay(plan.days.length); }}><Plus size={14} /> Dia</button>
      </div>
      {d && (
        <div className="stack">
          <div className="panel panel-pad row-wrap">
            <input className="input sm" style={{ width: 200 }} value={d.name} onChange={(e) => upd((p) => void (p.days[day].name = e.target.value))} aria-label="Nome do dia" />
            <span className="faint">Total do dia</span>
            <MacroLine items={d.meals.flatMap((m) => m.items)} big />
            <span className="spacer" />
            <button className="btn btn-sm btn-primary" onClick={() => upd((p) => void p.days[day].meals.push({ id: uid('pm_'), name: 'Nova refeição', time: '12:00', items: [], alternatives: [] }))}><Plus size={15} /> Refeição</button>
            {plan.days.length > 1 && <ConfirmButton label="Confirmar: apagar dia" onConfirm={() => { upd((p) => void p.days.splice(day, 1)); setDay(0); }}><Trash2 size={14} /> Dia</ConfirmButton>}
          </div>
          {d.meals.length === 0 && <div className="panel"><Empty icon={<Apple size={26} />} title="Sem refeições neste dia" /></div>}
          {d.meals.map((m) => (
            <section key={m.id} id={'el-' + m.id} className={`panel ${hl === m.id ? 'highlight' : ''}`}>
              <div className="panel-head" style={{ flexWrap: 'wrap' }}>
                <input className="input sm" type="time" style={{ width: 110 }} value={m.time} onChange={(e) => updMeal(m.id, (x) => void (x.time = e.target.value))} aria-label="Hora" />
                <input className="input sm" style={{ width: 220 }} value={m.name} onChange={(e) => updMeal(m.id, (x) => void (x.name = e.target.value))} aria-label="Nome da refeição" />
                <div className="actions">
                  <button className="btn btn-sm btn-ghost" onClick={() => updMeal(m.id, (x) => void x.alternatives.push({ id: uid('po_'), name: 'Alternativa ' + (x.alternatives.length + 1), items: [] }))}><Plus size={14} /> Alternativa</button>
                  <ConfirmButton label="Confirmar" onConfirm={() => upd((p) => void (p.days[day].meals = p.days[day].meals.filter((x) => x.id !== m.id)))}><Trash2 size={14} /></ConfirmButton>
                </div>
              </div>
              <div className="panel-body">
                <PortionEditor items={m.items} onChange={(items) => updMeal(m.id, (x) => void (x.items = items))} onAdd={() => setPick({ meal: m.id })} />
                {m.alternatives.map((a) => (
                  <div key={a.id} id={'el-' + a.id} className={`sub mt ${hl === a.id ? 'highlight' : ''}`}>
                    <div className="row mb" style={{ marginBottom: 8 }}>
                      <span className="badge">Opção</span>
                      <input className="input sm" style={{ width: 220 }} value={a.name} onChange={(e) => updMeal(m.id, (x) => void (x.alternatives.find((y) => y.id === a.id)!.name = e.target.value))} aria-label="Nome da alternativa" />
                      <span className="spacer" />
                      <button className="icon-btn sm" onClick={() => updMeal(m.id, (x) => void (x.alternatives = x.alternatives.filter((y) => y.id !== a.id)))} aria-label="Remover alternativa"><X size={15} /></button>
                    </div>
                    <PortionEditor items={a.items} onChange={(items) => updMeal(m.id, (x) => void (x.alternatives.find((y) => y.id === a.id)!.items = items))} onAdd={() => setPick({ meal: m.id, alt: a.id })} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {pick && (
        <FoodPicker
          onClose={() => setPick(null)}
          onPick={(p) => {
            updMeal(pick.meal, (x) => { if (pick.alt) x.alternatives.find((y) => y.id === pick.alt)!.items.push(p); else x.items.push(p); });
            setPick(null);
          }}
        />
      )}
      {hist && <PlanHistoryDrawer kind="nutricao" planId={plan.id} onClose={() => setHist(false)} onRestored={() => setSync(true)} />}
      {reqList && (
        <Modal title="Pedidos de receita por tratar" onClose={() => setReqList(false)}>
          {requests.length === 0 ? <p className="faint">Sem pedidos deste aluno.</p> : requests.map((r) => (
            <button key={r.id} className="nav-item" style={{ color: 'var(--ink)' }} onClick={() => { setReqList(false); setReqOpen(r.id); }}>
              <ChefHat size={16} /> {db.meals.find((m) => m.id === r.mealId)?.name}<span className="spacer" /><span className="faint">{fmtDateTime(r.createdAt)}</span>
            </button>
          ))}
        </Modal>
      )}
      {reqOpen && requests.some((r) => r.id === reqOpen) && (
        <RequestModal
          req={requests.find((r) => r.id === reqOpen)!}
          plan={plan}
          onClose={() => setReqOpen(null)}
          onDismiss={() => { mutate((x) => void (x.recipeRequests.find((y) => y.id === reqOpen)!.status = 'dispensado')); toast('Pedido dispensado'); setReqOpen(null); }}
          onInsert={(dayIdx, mode, targetMealId) => {
            const r = requests.find((y) => y.id === reqOpen)!;
            const meal = db.meals.find((m) => m.id === r.mealId)!;
            const newId = uid(mode === 'refeicao' ? 'pm_' : 'po_');
            upd((p) => {
              const dd = p.days[dayIdx];
              if (mode === 'refeicao') dd.meals.push({ id: newId, name: meal.name, time: '13:00', items: structuredClone(meal.items), alternatives: [] });
              else dd.meals.find((x) => x.id === targetMealId)!.alternatives.push({ id: newId, name: meal.name, items: structuredClone(meal.items) });
            });
            setResolved((x) => [...x, r.id]);
            setDay(dayIdx);
            setHl(newId);
            setReqOpen(null);
            toast('Receita colocada no plano. Guarda o plano para concluir o pedido.');
          }}
        />
      )}
    </div>
  );
}

function RequestModal({ req, plan, onClose, onDismiss, onInsert }: { req: RecipeRequest; plan: NutritionPlan; onClose: () => void; onDismiss: () => void; onInsert: (day: number, mode: 'refeicao' | 'alternativa', mealId?: string) => void }) {
  const { db } = useStore();
  const meal = db.meals.find((m) => m.id === req.mealId);
  const s = studentById(db, req.studentId)!;
  const [mode, setMode] = useState<'refeicao' | 'alternativa'>('refeicao');
  const [day, setDay] = useState(0);
  const [target, setTarget] = useState(plan.days[0]?.meals[0]?.id ?? '');
  if (!meal) return null;
  const meals = plan.days[day]?.meals ?? [];
  return (
    <Modal
      title={`${s.name.split(' ')[0]} pediu esta receita`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={onDismiss}>Dispensar pedido</button>
          <button className="btn" onClick={onClose}>Fechar</button>
          <button className="btn btn-primary" disabled={mode === 'alternativa' && !meals.some((m) => m.id === target)} onClick={() => onInsert(day, mode, target)}>Abrir no editor</button>
        </>
      }
    >
      <MealPhoto meal={meal} db={db} h={150} />
      <div>
        <h3>{meal.name}</h3>
        {req.note && <p className="muted mt-sm">Nota do aluno: “{req.note}”</p>}
      </div>
      <div className="stack-sm">
        {meal.items.map((i) => {
          const f = db.foods.find((x) => x.id === i.foodId);
          return <div key={i.foodId} className="row small"><FoodImg food={f} size={26} /> {f?.name}<span className="spacer" /><span className="num muted">{i.qty} {f?.unit === 'un' ? 'un' : 'g'}</span></div>;
        })}
        <MacroLine items={meal.items} big />
      </div>
      <div className="divider" />
      <Field label="Onde entra">
        <Seg options={[{ id: 'refeicao', label: 'Como refeição nova' }, { id: 'alternativa', label: 'Como alternativa' }]} value={mode} onChange={setMode} />
      </Field>
      <div className="grid g2">
        <Field label="Dia do plano">
          <select className="select" value={day} onChange={(e) => { setDay(+e.target.value); setTarget(plan.days[+e.target.value]?.meals[0]?.id ?? ''); }}>
            {plan.days.map((d, i) => <option key={d.id} value={i}>{d.name}</option>)}
          </select>
        </Field>
        {mode === 'alternativa' && (
          <Field label="Alternativa a">
            <select className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
              {meals.map((m) => <option key={m.id} value={m.id}>{m.time} {m.name}</option>)}
            </select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
