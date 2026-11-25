import { useState } from 'react';
import { MessageSquare, Smartphone, History, Pencil, Plus, Dumbbell, Apple, Pill, GraduationCap, BadgeEuro, Trash2 } from 'lucide-react';
import { useStore } from '../store/store';
import type { Measurement, Student } from '../store/types';
import type { Route } from '../lib/router';
import { navigate } from '../lib/router';
import {
  adherence, dayDuration, isLeader, lastM, firstM, macros, metricValue, METRICS, pendingAssessments, retentionRisk, staffById,
  GOAL_LABEL, PERIOD_LABEL, eventsOn, type MetricKey,
} from '../lib/domain';
import { applyWelcomePack, assignNutrition, assignWorkout } from '../lib/actions';
import { addDays, age, fmtDate, fmtDuration, num, relative, signed, today } from '../lib/utils';
import { Avatar, ConfirmButton, Empty, Field, Modal, PageHead, Tabs, useToast } from '../components/ui';
import { AdherenceStrip, LineChart } from '../components/charts';
import { SendMessageModal } from './Today';
import { exercisesAt, gymOf, missingEquipment } from '../lib/gyms';
import { streakOf, visitDays } from '../lib/streak';
import { Building2 } from 'lucide-react';
import { PlanHistoryDrawer } from './PlanHistory';

type Tab = 'resumo' | 'medicoes' | 'planos' | 'avaliacoes' | 'dados';

export function StudentDetailPage({ id, route }: { id: string; route: Route }) {
  const { db, mutate } = useStore();
  const [tab, setTab] = useState<Tab>((route.query.get('tab') as Tab) || 'resumo');
  const [msg, setMsg] = useState(false);
  const s = db.students.find((x) => x.id === id);
  if (!s) return <div className="page"><Empty title="Aluno não encontrado" action={<button className="btn" onClick={() => navigate('/alunos')}>Voltar aos alunos</button>} /></div>;
  const coach = staffById(db, s.coachId);
  return (
    <div className="page">
      <PageHead
        back={{ label: 'Alunos', to: '/alunos' }}
        title={
          <span className="row" style={{ gap: 14 }}>
            <Avatar name={s.name} size={48} />
            <span>{s.name}</span>
          </span>
        }
        lead={
          <span className="row-wrap">
            <span>{GOAL_LABEL[s.goal]}</span>
            <span className="faint">{age(s.birthday)} anos</span>
            <span className="faint">Treinador: {coach?.name}</span>
            {gymOf(db, s) && <span className="faint">Ginásio: {gymOf(db, s)!.name}</span>}
            {s.tags.map((t) => <span key={t} className="tag">{t}</span>)}
            {s.status !== 'ativo' && <span className="badge yellow">{s.status}</span>}
            {s.paymentStatus === 'em_atraso' && <span className="badge red">Pagamento em atraso</span>}
          </span>
        }
        actions={
          <>
            <button className="btn" onClick={() => navigate('/aluno?id=' + s.id)}><Smartphone size={16} /> Ver na app</button>
            <button className="btn btn-primary" onClick={() => setMsg(true)}><MessageSquare size={16} /> Enviar mensagem</button>
          </>
        }
      />
      <Tabs
        tabs={[
          { id: 'resumo', label: 'Resumo' },
          { id: 'medicoes', label: 'Medições' },
          { id: 'planos', label: 'Planos e subscrição' },
          { id: 'avaliacoes', label: `Avaliações (${db.assessments.filter((a) => a.studentId === s.id).length})` },
          { id: 'dados', label: 'Dados e notas' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'resumo' && <Overview s={s} />}
      {tab === 'medicoes' && <Measurements s={s} />}
      {tab === 'planos' && <Plans s={s} />}
      {tab === 'avaliacoes' && <StudentAssessments s={s} />}
      {tab === 'dados' && <StudentData s={s} />}
      {msg && <SendMessageModal studentId={s.id} initial="" onClose={() => setMsg(false)} />}
    </div>
  );
}

function Overview({ s }: { s: Student }) {
  const { db } = useStore();
  const f = firstM(s);
  const l = lastM(s);
  const risk = retentionRisk(db, s);
  const upcoming = Array.from({ length: 14 }, (_, i) => addDays(today(), i)).flatMap((d) => eventsOn(db, d).filter((e) => e.enrolled.includes(s.id) || e.studentId === s.id).map((e) => ({ e, d })));
  return (
    <div className="stack">
      <div className="grid g4">
        <div className="panel panel-pad">
          <div className="faint">Peso atual</div>
          <div className="big-num mt-sm">{l ? num(l.weight) + ' kg' : '—'}</div>
          {f && l && <div className="faint mt-sm">{signed(l.weight - f.weight, 1, ' kg')} desde {fmtDate(f.date, true)}</div>}
        </div>
        <div className="panel panel-pad">
          <div className="faint">Massa gorda</div>
          <div className="big-num mt-sm">{l ? num(l.bodyFat) + '%' : '—'}</div>
          {f && l && <div className="faint mt-sm">{signed(l.bodyFat - f.bodyFat, 1, ' pp')}</div>}
        </div>
        <div className="panel panel-pad">
          <div className="faint">Adesão nos últimos 14 dias</div>
          <div className="big-num mt-sm">{Math.round(adherence(s) * 100)}%</div>
          <div className="faint mt-sm">Última atividade {relative(s.lastActivity)}</div>
        </div>
        <div className="panel panel-pad">
          <div className="faint">Subscrição</div>
          <div className="big-num mt-sm">{fmtDate(s.subscriptionEnd)}</div>
          <div className="faint mt-sm">Termina {relative(s.subscriptionEnd)}</div>
        </div>
      </div>
      <div className="split">
        <div className="stack">
          <section className="panel panel-pad">
            {(() => {
              const st = streakOf(s);
              return (
                <>
                  <div className="row">
                    <h3>Idas ao ginásio</h3>
                    <span className="spacer" />
                    <span className="strong num" style={{ color: st.current ? '#E8590C' : undefined }}>{st.current ? `🔥 ${st.current} ${st.current === 1 ? 'dia seguido' : 'dias seguidos'}` : 'Sem streak'}</span>
                  </div>
                  <p className="faint mt-sm mb">Melhor: {st.best} dias. Últimos 30 dias: {st.last30}. {st.today ? 'Hoje já foi.' : st.lastDay ? `Última ida ${relative(st.lastDay)}.` : 'Ainda não registou idas.'}</p>
                  <AdherenceStrip dates={visitDays(s)} color="#E8590C" label="Idas ao ginásio" />
                </>
              );
            })()}
          </section>
          <section className="panel panel-pad">
            <h3>Registos diários</h3>
            <p className="faint mt-sm mb">Últimos 28 dias. Cada quadrado é um dia com registo.</p>
            <AdherenceStrip dates={s.checkinDates} />
          </section>
          <section className="panel panel-pad">
            <h3>Peso</h3>
            <div className="mt">
              <LineChart points={s.measurements.map((m) => ({ date: m.date, v: m.weight }))} unit="kg" />
            </div>
          </section>
        </div>
        <aside className="stack">
          <section className="panel panel-pad">
            <div className="plate" style={{ ['--plate' as any]: risk.level === 'alto' ? 'var(--red)' : risk.level === 'medio' ? 'var(--yellow)' : 'var(--green)' }}>
              <h3>Risco de saída: {risk.level === 'medio' ? 'médio' : risk.level}</h3>
              <div className="stack-sm mt-sm small muted">{risk.reasons.length ? risk.reasons.map((r) => <span key={r}>{r}</span>) : 'Sem sinais de risco.'}</div>
            </div>
          </section>
          <section className="panel panel-pad">
            <h3>Próximos 14 dias</h3>
            <div className="stack-sm mt-sm">
              {upcoming.length === 0 && <p className="faint">Sem eventos.</p>}
              {upcoming.map(({ e, d }) => (
                <div key={e.id + d} className="row small">
                  <span className="num strong" style={{ width: 54 }}>{fmtDate(d)}</span>
                  <span>{e.title}</span>
                  <span className="spacer" />
                  <span className="faint">{e.start}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Measurements({ s }: { s: Student }) {
  const { mutate } = useStore();
  const toast = useToast();
  const [metric, setMetric] = useState<MetricKey>('weight');
  const [adding, setAdding] = useState(false);
  const meta = METRICS.find((m) => m.key === metric)!;
  const last = lastM(s);
  const [f, setF] = useState<Measurement>(() => ({
    date: today(), weight: last?.weight ?? 70, bodyFat: last?.bodyFat ?? 20, leanMass: last?.leanMass ?? 55, visceral: last?.visceral ?? 6,
    waist: last?.waist ?? 80, abdomen: last?.abdomen ?? 85, hip: last?.hip ?? 95, chest: last?.chest ?? 95, arm: last?.arm ?? 30, thigh: last?.thigh ?? 55, photos: false,
  }));
  return (
    <div className="stack">
      <section className="panel panel-pad">
        <div className="row-wrap">
          <h3>Evolução</h3>
          <span className="spacer" />
          <select className="select sm" style={{ width: 170 }} value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)} aria-label="Medida">
            {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}><Plus size={15} /> Nova medição</button>
        </div>
        <div className="mt">
          <LineChart points={s.measurements.map((m) => ({ date: m.date, v: metricValue(s, m, metric) }))} unit={meta.unit} color={meta.goodWhen === 'up' ? '#2E9E5B' : '#1F5FBF'} />
        </div>
      </section>
      <section className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                {METRICS.map((m) => <th key={m.key}>{m.label}</th>)}
                <th>Fotos</th>
              </tr>
            </thead>
            <tbody>
              {[...s.measurements].reverse().map((m) => (
                <tr key={m.date}>
                  <td>{fmtDate(m.date, true)}</td>
                  {METRICS.map((x) => <td key={x.key} className="num">{num(metricValue(s, m, x.key))}</td>)}
                  <td>{m.photos ? <span className="badge green">Sim</span> : <span className="faint">Não</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {s.measurements.length === 0 && <Empty title="Sem medições" text="Adiciona a primeira medição para começar a acompanhar a evolução." />}
        </div>
      </section>
      {adding && (
        <Modal
          title="Nova medição"
          onClose={() => setAdding(false)}
          footer={
            <>
              <button className="btn" onClick={() => setAdding(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  mutate((d) => {
                    const st = d.students.find((x) => x.id === s.id)!;
                    st.measurements = [...st.measurements.filter((m) => m.date !== f.date), f].sort((a, b) => a.date.localeCompare(b.date));
                  });
                  toast('Medição guardada');
                  setAdding(false);
                }}
              >
                Guardar medição
              </button>
            </>
          }
        >
          <Field label="Data"><input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <div className="grid g3">
            {METRICS.filter((m) => m.key !== 'bmi').map((m) => (
              <Field key={m.key} label={`${m.label}${m.unit ? ' (' + m.unit + ')' : ''}`}>
                <input className="input" type="number" step="0.1" value={(f as any)[m.key]} onChange={(e) => setF({ ...f, [m.key]: parseFloat(e.target.value) || 0 })} />
              </Field>
            ))}
          </div>
          <label className="check"><input type="checkbox" checked={f.photos} onChange={(e) => setF({ ...f, photos: e.target.checked })} /> Tem fotos de progresso</label>
        </Modal>
      )}
    </div>
  );
}

function Plans({ s }: { s: Student }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [hist, setHist] = useState<null | 'treino' | 'nutricao'>(null);
  const wp = db.workoutPlans.find((p) => p.id === s.workoutPlanId);
  const np = db.nutritionPlans.find((p) => p.id === s.nutritionPlanId);
  const proto = db.protocols.find((p) => p.id === s.protocolId);
  const pkg = db.packages.find((p) => p.id === s.packageId);
  const kcal = np ? macros(db, np.days[0]?.meals.flatMap((m) => m.items) ?? []).kcal : 0;
  const upd = (fn: (st: Student) => void) => mutate((d) => fn(d.students.find((x) => x.id === s.id)!));
  const pendingReq = db.recipeRequests.filter((r) => r.studentId === s.id && r.status === 'pendente').length;
  return (
    <div className="grid g2">
      <section className="panel panel-pad stack">
        <div className="row"><Dumbbell size={18} /><h3>Plano de treino</h3></div>
        {wp ? (
          <div className="sub">
            <div className="strong">{wp.name}</div>
            <div className="faint">{wp.days.length} dias, cerca de {fmtDuration(dayDuration(wp.days[0]))} por sessão. Atualizado {relative(wp.updatedAt)}.</div>
          </div>
        ) : <p className="faint">Sem plano atribuído.</p>}
        <div className="row-wrap">
          {wp && <button className="btn btn-sm btn-primary" onClick={() => navigate('/treinos/plano/' + wp.id)}><Pencil size={14} /> Editar plano</button>}
          {wp && <button className="btn btn-sm" onClick={() => setHist('treino')}><History size={14} /> Alterações do plano</button>}
          <select className="select sm" style={{ width: 220 }} value="" onChange={(e) => { if (!e.target.value) return; mutate((d) => assignWorkout(d, s.id, e.target.value)); toast('Plano de treino atribuído'); }} aria-label="Atribuir modelo de treino">
            <option value="">Atribuir a partir de um modelo</option>
            {db.workoutPlans.filter((p) => !p.studentId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </section>

      <section className="panel panel-pad stack">
        <div className="row"><Apple size={18} /><h3>Plano alimentar</h3>{pendingReq > 0 && <span className="badge blue">{pendingReq} pedidos de receita</span>}</div>
        {np ? (
          <div className="sub">
            <div className="strong">{np.name}</div>
            <div className="faint">{np.days.length} tipos de dia, cerca de {num(kcal, 0)} kcal no primeiro. Atualizado {relative(np.updatedAt)}.</div>
          </div>
        ) : <p className="faint">Sem plano atribuído.</p>}
        <div className="row-wrap">
          {np && <button className="btn btn-sm btn-primary" onClick={() => navigate('/nutricao/plano/' + np.id)}><Pencil size={14} /> Editar plano</button>}
          {np && <button className="btn btn-sm" onClick={() => setHist('nutricao')}><History size={14} /> Alterações do plano</button>}
          <select className="select sm" style={{ width: 220 }} value="" onChange={(e) => { if (!e.target.value) return; mutate((d) => assignNutrition(d, s.id, e.target.value)); toast('Plano alimentar atribuído'); }} aria-label="Atribuir modelo alimentar">
            <option value="">Atribuir a partir de um modelo</option>
            {db.nutritionPlans.filter((p) => !p.studentId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </section>

      <section className="panel panel-pad stack">
        <div className="row"><Pill size={18} /><h3>Suplementação</h3></div>
        <select className="select" value={s.protocolId ?? ''} onChange={(e) => upd((st) => void (st.protocolId = e.target.value || null))} aria-label="Protocolo">
          <option value="">Sem protocolo</option>
          {db.protocols.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {proto && (
          <div className="stack-sm">
            {proto.items.map((it) => (
              <div key={it.supplementId} className="row small">
                <span>{db.supplements.find((x) => x.id === it.supplementId)?.name}</span>
                <span className="spacer" />
                <span className="muted">{it.dose}, {it.timing.toLowerCase()}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel panel-pad stack">
        <div className="row"><GraduationCap size={18} /><h3>Cursos</h3></div>
        {db.courses.map((c) => (
          <label key={c.id} className="check">
            <input type="checkbox" checked={s.courseIds.includes(c.id)} onChange={(e) => upd((st) => void (st.courseIds = e.target.checked ? [...st.courseIds, c.id] : st.courseIds.filter((x) => x !== c.id)))} />
            {c.title} {!c.published && <span className="badge">Rascunho</span>}
          </label>
        ))}
      </section>

      <GymSection s={s} />

      <section className="panel panel-pad stack" style={{ gridColumn: '1 / -1' }}>
        <div className="row"><BadgeEuro size={18} /><h3>Subscrição</h3></div>
        <div className="grid g4">
          <Field label="Plano de coaching">
            <select className="select" value={s.packageId ?? ''} onChange={(e) => upd((st) => void (st.packageId = e.target.value || null))}>
              <option value="">Sem plano</option>
              {db.packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Termina a"><input className="input" type="date" value={s.subscriptionEnd} onChange={(e) => upd((st) => void (st.subscriptionEnd = e.target.value))} /></Field>
          <Field label="Pagamento">
            <select className="select" value={s.paymentStatus} onChange={(e) => upd((st) => void (st.paymentStatus = e.target.value as any))}>
              <option value="pago">Pago</option>
              <option value="em_atraso">Em atraso</option>
            </select>
          </Field>
          <Field label="Valor">
            <input className="input" readOnly value={pkg ? `${pkg.price} € ${PERIOD_LABEL[pkg.period]}` : '—'} />
          </Field>
        </div>
      </section>
      {hist && <PlanHistoryDrawer kind={hist} planId={(hist === 'treino' ? wp!.id : np!.id)} onClose={() => setHist(null)} />}
    </div>
  );
}

function GymSection({ s }: { s: Student }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const gym = gymOf(db, s);
  const wp = db.workoutPlans.find((p) => p.id === s.workoutPlanId);
  const bad = gym && wp ? wp.days.flatMap((d) => d.items).filter((it) => missingEquipment(db, db.exercises.find((e) => e.id === it.exerciseId), gym).length > 0) : [];
  const request = db.gymRequests.find((r) => r.studentId === s.id && r.status === 'pendente');
  return (
    <section className="panel panel-pad stack" style={{ gridColumn: '1 / -1' }}>
      <div className="row"><Building2 size={18} /><h3>Ginásio</h3><span className="spacer" /><button className="btn btn-sm btn-ghost" onClick={() => navigate('/ginasios')}>Gerir ginásios</button></div>
      <div className="row-wrap">
        <select
          className="select"
          style={{ width: 280 }}
          value={s.gymId ?? ''}
          onChange={(e) => {
            mutate((d) => void (d.students.find((x) => x.id === s.id)!.gymId = e.target.value || null));
            toast('Ginásio atualizado');
          }}
          aria-label="Ginásio onde treina"
        >
          <option value="">Não definido</option>
          {db.gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        {gym && <span className="faint small">{gym.equipmentIds.length} equipamentos, {exercisesAt(db, gym).length} de {db.exercises.length} exercícios possíveis</span>}
      </div>
      {request && <div className="sub small">Pediu para acrescentar “{request.name}”. <button className="btn btn-sm btn-ghost" onClick={() => navigate('/ginasios?tab=pedidos')}>Ver pedido</button></div>}
      {gym && wp && (bad.length ? (
        <div className="small" style={{ color: 'var(--red)' }}>
          O plano tem {bad.length} {bad.length === 1 ? 'exercício' : 'exercícios'} sem equipamento em {gym.name}: {Array.from(new Set(bad.map((it) => db.exercises.find((e) => e.id === it.exerciseId)?.name))).join(', ')}.{' '}
          <button className="btn btn-sm" onClick={() => navigate('/treinos/plano/' + wp.id)}>Ajustar plano</button>
        </div>
      ) : <div className="faint small">Todos os exercícios do plano dão para fazer em {gym.name}.</div>)}
    </section>
  );
}

function StudentAssessments({ s }: { s: Student }) {
  const { db } = useStore();
  const list = db.assessments.filter((a) => a.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date));
  const label = { diario: 'Registo diário', inicial: 'Inicial', periodico: 'Periódica' };
  return (
    <div className="panel">
      {list.length === 0 ? <Empty title="Sem avaliações" /> : (
        <div className="list">
          {list.map((a) => (
            <div key={a.id} className="list-row click" onClick={() => navigate('/avaliacoes?ver=' + a.id)}>
              <span className="plate" style={{ ['--plate' as any]: a.status === 'pendente' ? 'var(--yellow)' : 'var(--green)' }}>
                <span className="strong">{label[a.type]}</span>
                <span className="faint" style={{ display: 'block' }}>{fmtDate(a.date, true)}</span>
              </span>
              <span className="spacer" />
              {!!a.photos?.length && (
                <span style={{ display: 'flex', gap: 4 }}>
                  {a.photos.slice(0, 3).map((src, i) => <img key={i} src={src} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6 }} />)}
                  {a.photos.length > 3 && <span className="faint small" style={{ alignSelf: 'center' }}>+{a.photos.length - 3}</span>}
                </span>
              )}
              {a.status === 'pendente' ? <span className="badge yellow">Por rever</span> : <span className="badge green">Revista</span>}
            </div>
          ))}
        </div>
      )}
      {pendingAssessments(db, s.id).length > 0 && (
        <div className="panel-body"><button className="btn btn-sm" onClick={() => navigate('/avaliacoes?aluno=' + s.id)}>Rever pendentes</button></div>
      )}
    </div>
  );
}

function StudentData({ s }: { s: Student }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [f, setF] = useState({ ...s, tagsText: s.tags.join(', ') });
  const [pack, setPack] = useState('');
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="split">
      <section className="panel panel-pad stack">
        <h3>Dados do aluno</h3>
        <div className="grid g2">
          <Field label="Nome"><input className="input" value={f.name} onChange={set('name')} /></Field>
          <Field label="Email"><input className="input" value={f.email} onChange={set('email')} /></Field>
          <Field label="Telemóvel"><input className="input" value={f.phone} onChange={set('phone')} /></Field>
          <Field label="Data de nascimento"><input className="input" type="date" value={f.birthday} onChange={set('birthday')} /></Field>
          <Field label="Sexo">
            <select className="select" value={f.gender} onChange={set('gender')}>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </select>
          </Field>
          <Field label="Objetivo">
            <select className="select" value={f.goal} onChange={set('goal')}>
              {Object.entries(GOAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Treinador responsável">
            <select className="select" value={f.coachId} onChange={set('coachId')} disabled={!isLeader(db)}>
              {db.staff.filter((x) => x.role !== 'nutritionist').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select className="select" value={f.status} onChange={set('status')}>
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
              <option value="arquivado">Arquivado</option>
            </select>
          </Field>
        </div>
        <Field label="Etiquetas" hint="Separadas por vírgulas"><input className="input" value={f.tagsText} onChange={set('tagsText')} /></Field>
        <Field label="Notas privadas"><textarea className="textarea" rows={4} value={f.notes} onChange={set('notes')} placeholder="Só a equipa vê estas notas." /></Field>
        <div className="row">
          <button
            className="btn btn-primary"
            onClick={() => {
              mutate((d) => {
                const i = d.students.findIndex((x) => x.id === s.id);
                const { tagsText, ...rest } = f;
                d.students[i] = { ...d.students[i], ...rest, tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean) };
              });
              toast('Alterações guardadas');
            }}
          >
            Guardar alterações
          </button>
        </div>
      </section>
      <aside className="stack">
        <section className="panel panel-pad stack">
          <h3>Aplicar pacote de boas-vindas</h3>
          <p className="faint">Atribui os planos, cursos e mensagens do pacote a este aluno.</p>
          <select className="select" value={pack} onChange={(e) => setPack(e.target.value)} aria-label="Pacote">
            <option value="">Escolher pacote</option>
            {db.welcomePacks.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn" disabled={!pack} onClick={() => { mutate((d) => applyWelcomePack(d, pack, s.id)); toast('Pacote aplicado'); setPack(''); }}>Aplicar pacote</button>
        </section>
        <section className="panel panel-pad stack">
          <h3>Apagar aluno</h3>
          <p className="faint">Remove o aluno, as avaliações e as conversas. Não dá para desfazer. Para manter o histórico, arquiva-o.</p>
          <ConfirmButton
            label="Confirmar: apagar de vez"
            onConfirm={() => {
              mutate((d) => {
                d.students = d.students.filter((x) => x.id !== s.id);
                d.assessments = d.assessments.filter((x) => x.studentId !== s.id);
                d.chats = d.chats.filter((x) => x.studentId !== s.id);
                d.recipeRequests = d.recipeRequests.filter((x) => x.studentId !== s.id);
              });
              toast('Aluno apagado');
              navigate('/alunos');
            }}
          >
            <Trash2 size={15} /> Apagar aluno
          </ConfirmButton>
        </section>
      </aside>
    </div>
  );
}
