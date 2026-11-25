import { useMemo, useState } from 'react';
import { Home, Dumbbell, Apple, ChefHat, ClipboardCheck, MessageCircle, ChevronRight, Check, X, Plus, CalendarDays, Bell, GraduationCap, Pill } from 'lucide-react';
import { useStore } from '../store/store';
import type { DB, Meal, Student } from '../store/types';
import { navigate, useRoute } from '../lib/router';
import { dayDuration, eventsOn, macros, visibleStudents, lastM } from '../lib/domain';
import { diffPlans } from '../lib/diff';
import { notify, sendStudentMessage } from '../lib/actions';
import { addDays, fmtDate, fmtDateTime, fmtDuration, fmtLongDate, num, relative, today, uid, WEEKDAYS } from '../lib/utils';
import { PageHead, useToast } from '../components/ui';
import { DiffTable } from '../pages/PlanHistory';
import { EQUIPMENT_CATEGORIES, gymOf, missingEquipment } from '../lib/gyms';
import { Building2, Flame } from 'lucide-react';
import { nowLocal, streakOf } from '../lib/streak';
import { DictateButton, PhotoPicker } from '../components/capture';
import { PBtn, Sheet } from './parts';
import { ThemeButton } from '../components/Shell';
import { GuidedWorkout, PhotoCompareCard, QuickLogCard, ReminderBanner, ReminderCard, StartWorkoutButton, useDailyReminder } from './extras';

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

type PTab = 'hoje' | 'treino' | 'nutricao' | 'receitas' | 'checkin' | 'chat';

export function StudentAppPage() {
  const { db } = useStore();
  const route = useRoute();
  const students = visibleStudents(db).filter((s) => s.status === 'ativo');
  const id = route.query.get('id') ?? students[0]?.id;
  return (
    <div className="page">
      <PageHead
        title="App do aluno"
        lead="Isto é o que o aluno vê no telemóvel. O que fizeres aqui (pedir uma receita, enviar um check-in, registar um evento, escrever no chat) chega à tua conta como se viesse dele."
        actions={
          <label className="row small">
            <span className="muted">Ver como</span>
            <select className="select sm" style={{ width: 200 }} value={id} onChange={(e) => navigate('/aluno?id=' + e.target.value)}>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        }
      />
      <div style={{ display: 'flex', justifyContent: 'center' }}>{id && <StudentPhone key={id} studentId={id} />}</div>
    </div>
  );
}

export function StudentOnlyPage() {
  const { db, sync } = useStore();
  const route = useRoute();
  const id = route.query.get('id');
  const s = id ? db.students.find((x) => x.id === id) : undefined;
  if (!s) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', background: 'var(--chalk)' }}>
        <div>
          <h2>Link inválido</h2>
          <p className="muted mt-sm">Pede ao teu treinador o link da tua app.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="student-only">
      <StudentPhone studentId={s.id} fullscreen />
      {(sync === 'offline' || sync === 'error') && <div className="sync-float">Sem ligação. O que fizeres é enviado quando a ligação voltar.</div>}
    </div>
  );
}

export function StudentPhone({ studentId, dbOverride, readOnly, fullscreen }: { studentId: string; dbOverride?: DB; readOnly?: boolean; fullscreen?: boolean }) {
  const store = useStore();
  const db = dbOverride ?? store.db;
  const toast = useToast();
  const mutate = readOnly ? () => toast('Pré-visualização: as ações estão desligadas') : store.mutate;
  const s = db.students.find((x) => x.id === studentId);
  const b = db.branding;
  const tabs = ([
    { id: 'hoje', label: 'Hoje', icon: Home, on: true },
    { id: 'treino', label: 'Treino', icon: Dumbbell, on: b.modules.treino },
    { id: 'nutricao', label: 'Nutrição', icon: Apple, on: b.modules.nutricao },
    { id: 'receitas', label: 'Receitas', icon: ChefHat, on: b.modules.receitas },
    { id: 'checkin', label: 'Check-in', icon: ClipboardCheck, on: b.modules.checkin },
    { id: 'chat', label: 'Chat', icon: MessageCircle, on: b.modules.chat },
  ] as const).filter((t) => t.on);
  const [tab, setTab] = useState<PTab>('hoje');
  const [reminder, closeReminder] = useDailyReminder(db, readOnly ? undefined : s);
  if (!s) return <p className="faint">Sem alunos para pré-visualizar.</p>;
  const ctx = { db, s, mutate: mutate as any, toast, readOnly: !!readOnly, go: setTab };
  return (
    <div className={`phone ${fullscreen ? 'fullscreen' : ''}`} style={{ ['--app-primary' as any]: b.primary }}>
      <div className="phone-screen">
        <div className="phone-top" style={{ background: b.primary }}>
          <div className="row">
            <span style={{ width: 34, height: 34, borderRadius: 10, background: b.accent, color: '#1E2A38', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>{b.logoText}</span>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600 }}>{b.appName}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Olá, {s.name.split(' ')[0]}</div>
            </div>
            <span className="spacer" />
            <ThemeButton light />
          </div>
        </div>
        <div className="phone-body">
          {reminder && <ReminderBanner text={reminder} onClose={closeReminder} onGo={() => { closeReminder(); setTab('hoje'); }} />}
          {tab === 'hoje' && <TodayTab {...ctx} />}
          {tab === 'treino' && <WorkoutTab {...ctx} />}
          {tab === 'nutricao' && <NutritionTab {...ctx} />}
          {tab === 'receitas' && <RecipesTab {...ctx} />}
          {tab === 'checkin' && <CheckinTab {...ctx} />}
          {tab === 'chat' && <ChatTab {...ctx} />}
        </div>
        <nav className="phone-nav">
          {tabs.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              <t.icon size={20} />
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

interface Ctx {
  db: DB;
  s: Student;
  mutate: (fn: (d: DB) => void) => void;
  toast: (m: string) => void;
  readOnly: boolean;
  go: (t: PTab) => void;
}


const todayDayIndex = (n: number) => (n ? (new Date().getDay() + 6) % 7 % n : 0);

function latestChange(db: DB, planId: string | null, kind: 'treino' | 'nutricao') {
  if (!planId) return null;
  const vs = db.planVersions.filter((v) => v.planId === planId).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  if (vs.length < 2) return null;
  if (vs[0].savedAt.slice(0, 10) < addDays(today(), -14)) return null;
  return { kind, latest: vs[0], prev: vs[1] };
}

function TodayTab({ db, s, mutate, toast, go }: Ctx) {
  const [diff, setDiff] = useState<ReturnType<typeof latestChange>>(null);
  const [addEv, setAddEv] = useState(false);
  const [ev, setEv] = useState({ title: '', date: today(), start: '18:00', end: '19:00', recurrence: 'nenhuma' as const });
  const wp = db.workoutPlans.find((p) => p.id === s.workoutPlanId);
  const np = db.nutritionPlans.find((p) => p.id === s.nutritionPlanId);
  const day = wp?.days[todayDayIndex(wp.days.length)];
  const proto = db.protocols.find((p) => p.id === s.protocolId);
  const changes = [latestChange(db, s.workoutPlanId, 'treino'), latestChange(db, s.nutritionPlanId, 'nutricao')].filter(Boolean) as NonNullable<ReturnType<typeof latestChange>>[];
  const agenda = Array.from({ length: 7 }, (_, i) => addDays(today(), i)).flatMap((d) => eventsOn(db, d).filter((e) => e.enrolled.includes(s.id) || e.studentId === s.id).map((e) => ({ e, d })));
  const doneToday = s.checkinDates.includes(today());
  return (
    <>
      <div className="p-card" style={{ background: 'var(--app-primary)', color: '#fff', border: 0 }}>
        <div style={{ fontSize: 13, opacity: 0.85 }}>{cap(fmtLongDate(today()))}</div>
        <div style={{ font: '600 22px/1.15 var(--display)', marginTop: 4 }}>{db.branding.welcome}</div>
      </div>
      {db.branding.modules.checkin && <QuickLogCard db={db} s={s} mutate={mutate} toast={toast} />}
      {changes.map((c) => (
        <button key={c.kind} className="p-card row" style={{ textAlign: 'left', cursor: 'pointer', borderColor: 'var(--app-primary)' }} onClick={() => setDiff(c)}>
          <Bell size={18} color={db.branding.primary} />
          <div style={{ flex: 1 }}>
            <div className="strong small">O teu plano {c.kind === 'treino' ? 'de treino' : 'alimentar'} foi atualizado</div>
            <div className="faint" style={{ fontSize: 12 }}>{c.latest.author}, {relative(c.latest.savedAt.slice(0, 10))}. Vê o que mudou.</div>
          </div>
          <ChevronRight size={16} />
        </button>
      ))}
      {db.branding.modules.treino && day && (
        <div className="p-card">
          <div className="row"><Dumbbell size={17} /><span className="strong">Treino de hoje: {day.name}</span></div>
          <div className="faint small mt-sm">{day.items.length} exercícios, cerca de {fmtDuration(dayDuration(day))}</div>
          <div className="row mt-sm">
            <PBtn onClick={() => go('treino')}>Ver treino</PBtn>
          </div>
          {!doneToday ? (
            <button className="btn btn-sm mt-sm" style={{ width: '100%', borderRadius: 10 }} onClick={() => { mutate((d) => { const st = d.students.find((x) => x.id === s.id)!; st.checkinDates.push(today()); st.lastActivity = today(); }); toast('Treino registado'); }}>
              <Check size={15} /> Marcar treino como feito
            </button>
          ) : <div className="badge green mt-sm">Treino de hoje registado</div>}
        </div>
      )}
      {db.branding.modules.nutricao && np && (
        <button className="p-card" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => go('nutricao')}>
          <div className="row"><Apple size={17} /><span className="strong">{np.days[0]?.name}</span><span className="spacer" /><ChevronRight size={16} /></div>
          <div className="faint small mt-sm">{np.days[0]?.meals.length} refeições, {num(macros(db, np.days[0]?.meals.flatMap((m) => m.items) ?? []).kcal, 0)} kcal</div>
        </button>
      )}
      <StreakCard db={db} s={s} mutate={mutate} toast={toast} />
      <PhotoCompareCard db={db} s={s} />
      <GymCard db={db} s={s} mutate={mutate} toast={toast} />
      {db.branding.modules.checkin && <ReminderCard s={s} mutate={mutate} toast={toast} />}
      {proto && (
        <div className="p-card">
          <div className="row"><Pill size={17} /><span className="strong">Suplementação</span></div>
          {proto.items.map((it) => <div key={it.supplementId} className="row small mt-sm"><span>{db.supplements.find((x) => x.id === it.supplementId)?.name}</span><span className="spacer" /><span className="faint">{it.dose}, {it.timing.toLowerCase()}</span></div>)}
        </div>
      )}
      {db.branding.modules.agenda && (
        <div className="p-card">
          <div className="row"><CalendarDays size={17} /><span className="strong">Agenda</span><span className="spacer" /><button className="btn btn-sm" style={{ borderRadius: 10 }} onClick={() => setAddEv(true)}><Plus size={14} /> Evento</button></div>
          {agenda.length === 0 && <div className="faint small mt-sm">Nada marcado para esta semana.</div>}
          {agenda.map(({ e, d }) => (
            <div key={e.id + d} className="row small mt-sm">
              <span className="num strong" style={{ width: 52 }}>{fmtDate(d)}</span>
              <span className="ellipsis" style={{ flex: 1 }}>{e.title}</span>
              <span className="faint">{e.start}</span>
            </div>
          ))}
        </div>
      )}
      {s.courseIds.length > 0 && (
        <div className="p-card">
          <div className="row"><GraduationCap size={17} /><span className="strong">Os teus cursos</span></div>
          {s.courseIds.map((cid) => { const c = db.courses.find((x) => x.id === cid); return c ? <div key={cid} className="small mt-sm">{c.title} <span className="faint">({c.modules.flatMap((m) => m.lessons).length} aulas)</span></div> : null; })}
        </div>
      )}
      {diff && (
        <Sheet title="O que mudou no plano" onClose={() => setDiff(null)}>
          <p className="faint small mb">Alteração feita por {diff.latest.author} a {fmtDateTime(diff.latest.savedAt)}.</p>
          <DiffTable rows={diffPlans(db, diff.kind, diff.prev.snapshot, diff.latest.snapshot)} />
        </Sheet>
      )}
      {addEv && (
        <Sheet title="Registar evento" onClose={() => setAddEv(false)}>
          <p className="faint small mb">Corridas, aulas por fora, jogos. O teu treinador vê no calendário dele.</p>
          <div className="stack-sm">
            <input className="input" placeholder="Ex.: Corrida 10 km" value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} aria-label="Título" />
            <input className="input" type="date" value={ev.date} onChange={(e) => setEv({ ...ev, date: e.target.value })} aria-label="Data" />
            <div className="row"><input className="input" type="time" value={ev.start} onChange={(e) => setEv({ ...ev, start: e.target.value })} aria-label="Início" /><input className="input" type="time" value={ev.end} onChange={(e) => setEv({ ...ev, end: e.target.value })} aria-label="Fim" /></div>
            <select className="select" value={ev.recurrence} onChange={(e) => setEv({ ...ev, recurrence: e.target.value as any })} aria-label="Repetir">
              <option value="nenhuma">Não repetir</option>
              <option value="semanal">Todas as semanas</option>
            </select>
            <PBtn disabled={!ev.title.trim()} onClick={() => { mutate((d) => void d.events.push({ id: uid('ev_'), ...ev, kind: 'pessoal', studentId: s.id, limit: null, enrolled: [], location: '' })); toast('Evento registado'); setAddEv(false); setEv({ ...ev, title: '' }); }}>Guardar evento</PBtn>
          </div>
        </Sheet>
      )}
    </>
  );
}

// Botão "Estou no ginásio": regista a ida. Várias idas no mesmo dia contam como um dia de streak.
function StreakCard({ db, s, mutate, toast }: Pick<Ctx, 'db' | 's' | 'mutate' | 'toast'>) {
  const st = streakOf(s);
  const n = st.current;
  const checkIn = () => {
    const already = st.today;
    mutate((d) => {
      const x = d.students.find((y) => y.id === s.id)!;
      x.gymCheckins.push({ at: nowLocal(), gymId: x.gymId });
      x.lastActivity = today();
    });
    toast(already ? 'Ida registada. Hoje já contava para o streak.' : `Boa! Streak: ${n + 1} ${n + 1 === 1 ? 'dia' : 'dias'} 🔥`);
  };
  return (
    <div className="p-card">
      <div className="row">
        <Flame size={18} color="#E8590C" />
        <span className="strong">{n ? `${n} ${n === 1 ? 'dia seguido' : 'dias seguidos'} no ginásio` : 'Começa o teu streak'}</span>
      </div>
      <div className="faint small mt-sm">
        {st.today ? 'Hoje já conta. Volta amanhã para continuar.' : n ? 'Ainda não marcaste hoje. Marca quando chegares ao ginásio.' : 'Marca cada dia em que vais ao ginásio.'}
        {st.best > n && ` O teu recorde é ${st.best} dias.`}
      </div>
      <div className="row mt-sm">
        {st.today ? (
          <div className="badge green"><Check size={13} /> Hoje já foste ao ginásio</div>
        ) : (
          <PBtn onClick={checkIn}>Estou no ginásio</PBtn>
        )}
      </div>
      {st.today && <button className="btn btn-sm btn-ghost mt-sm" onClick={checkIn}>Voltei ao ginásio</button>}
    </div>
  );
}

// Onde o aluno treina: escolhe da lista ou pede para acrescentar um ginásio novo.
function GymCard({ db, s, mutate, toast }: Pick<Ctx, 'db' | 's' | 'mutate' | 'toast'>) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [asking, setAsking] = useState(false);
  const gym = gymOf(db, s);
  const pending = db.gymRequests.find((r) => r.studentId === s.id && r.status === 'pendente');
  const list = db.gyms.filter((g) => !q || (g.name + ' ' + g.chain + ' ' + g.address).toLowerCase().includes(q.toLowerCase()));
  const choose = (id: string) => {
    mutate((d) => {
      const st = d.students.find((x) => x.id === s.id)!;
      st.gymId = id;
      const g = d.gyms.find((x) => x.id === id);
      notify(d, 'ginasio', `${s.name} passou a treinar em ${g?.name ?? 'outro ginásio'}`, '/alunos/' + s.id + '?tab=planos');
    });
    toast('Ginásio guardado');
    setQ('');
  };
  return (
    <>
      <button className="p-card" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setOpen(true)}>
        <div className="row"><Building2 size={17} /><span className="strong">{gym ? gym.name : 'Onde treinas?'}</span><span className="spacer" /><ChevronRight size={16} /></div>
        <div className="faint small mt-sm">
          {gym ? `${gym.equipmentIds.length} equipamentos. Toca para ver ou mudar.` : pending ? `Pedido enviado: “${pending.name}”.` : 'Diz-nos o teu ginásio para o plano usar só o equipamento que lá existe.'}
        </div>
      </button>
      {open && (
        <Sheet title={gym ? gym.name : 'Onde treinas?'} onClose={() => { setOpen(false); setAsking(false); }}>
          {gym && (
            <div className="stack-sm mb">
              {EQUIPMENT_CATEGORIES.map((cat) => {
                const items = db.equipment.filter((e) => e.category === cat && gym.equipmentIds.includes(e.id));
                return items.length ? (
                  <div key={cat} className="small">
                    <span className="strong">{cat}: </span>
                    <span className="muted">{items.map((e) => e.name).join(', ')}</span>
                  </div>
                ) : null;
              })}
              <div className="faint small mt-sm">Falta alguma coisa ou mudaste de ginásio? Escolhe outro abaixo ou fala com o teu treinador.</div>
            </div>
          )}
          <input className="input" placeholder="Procurar ginásio" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Procurar ginásio" />
          <div className="stack-sm mt-sm">
            {list.map((g) => (
              <button key={g.id} className={`chip ${g.id === s.gymId ? 'on' : ''}`} style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%' }} onClick={() => choose(g.id)}>
                {g.id === s.gymId && <Check size={14} />} {g.name}{g.address ? `, ${g.address}` : ''}
              </button>
            ))}
            {list.length === 0 && <div className="faint small">Nenhum ginásio com esse nome.</div>}
          </div>
          {pending ? (
            <div className="sub small mt">Já pediste “{pending.name}”. O teu treinador vai acrescentá-lo.</div>
          ) : asking ? (
            <div className="stack-sm mt">
              <input className="input" placeholder="Nome e localidade do ginásio" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Nome do ginásio" autoFocus />
              <PBtn
                disabled={!q.trim()}
                onClick={() => {
                  const name = q.trim();
                  mutate((d) => {
                    d.gymRequests.push({ id: uid('gr_'), studentId: s.id, name, status: 'pendente', createdAt: new Date().toISOString() });
                    notify(d, 'ginasio', `${s.name} treina em “${name}”, que ainda não está na lista`, '/ginasios?tab=pedidos');
                  });
                  toast('Pedido enviado ao treinador');
                  setAsking(false);
                  setQ('');
                }}
              >
                Pedir para acrescentar
              </PBtn>
            </div>
          ) : (
            <button className="btn btn-sm mt" style={{ width: '100%', borderRadius: 10 }} onClick={() => setAsking(true)}>
              <Plus size={14} /> O meu ginásio não está na lista
            </button>
          )}
        </Sheet>
      )}
    </>
  );
}

function WorkoutTab({ db, s, mutate, toast }: Ctx) {
  const wp = db.workoutPlans.find((p) => p.id === s.workoutPlanId);
  const gym = gymOf(db, s);
  const [day, setDay] = useState(wp ? todayDayIndex(wp.days.length) : 0);
  const [guided, setGuided] = useState(false);
  if (!wp) return <div className="p-card faint">Ainda não tens plano de treino. O teu treinador está a prepará-lo.</div>;
  const d = wp.days[day];
  if (guided) return <GuidedWorkout db={db} s={s} mutate={mutate} toast={toast} day={d} onExit={() => setGuided(false)} />;
  const started = (s.setLogs ?? []).some((l) => l.date === today() && d.items.some((it) => it.exerciseId === l.exerciseId));
  return (
    <>
      <h3>{wp.name}</h3>
      <div className="row-wrap">
        {wp.days.map((x, i) => <button key={x.id} className={`chip ${i === day ? 'on' : ''}`} onClick={() => setDay(i)}>{x.name}</button>)}
      </div>
      <div className="faint small">Cerca de {fmtDuration(dayDuration(d))}</div>
      <StartWorkoutButton started={started} onClick={() => setGuided(true)} />
      {d.items.map((it) => {
        const ex = db.exercises.find((e) => e.id === it.exerciseId);
        return (
          <div key={it.id} className="p-card">
            <div className="row">
              {it.group && <span className="grp on" style={{ background: 'var(--app-primary)' }}>{it.group}</span>}
              <span className="strong">{ex?.name}</span>
            </div>
            <div className="row small mt-sm num">
              <span><b>{it.sets}</b> séries</span>
              <span><b>{it.reps}</b> reps</span>
              {it.rest != null && <span>{it.rest} s descanso</span>}
            </div>
            {it.notes && <div className="faint small mt-sm">{it.notes}</div>}
            {missingEquipment(db, ex, gym).length > 0 && <div className="small mt-sm" style={{ color: 'var(--red)' }}>Não há {missingEquipment(db, ex, gym).map((m) => m.name.toLowerCase()).join(', ')} no teu ginásio. Usa uma alternativa ou fala com o treinador.</div>}
            {it.alternatives.length > 0 && <div className="faint small mt-sm">Se o aparelho estiver ocupado: {it.alternatives.map((a) => db.exercises.find((e) => e.id === a)?.name).join(', ')}</div>}
          </div>
        );
      })}
    </>
  );
}

function NutritionTab({ db, s }: Ctx) {
  const np = db.nutritionPlans.find((p) => p.id === s.nutritionPlanId);
  const [day, setDay] = useState(0);
  if (!np) return <div className="p-card faint">Ainda não tens plano alimentar.</div>;
  const d = np.days[day];
  const tot = macros(db, d.meals.flatMap((m) => m.items));
  return (
    <>
      <h3>{np.name}</h3>
      <div className="row-wrap">{np.days.map((x, i) => <button key={x.id} className={`chip ${i === day ? 'on' : ''}`} onClick={() => setDay(i)}>{x.name}</button>)}</div>
      <div className="p-card row num small" style={{ justifyContent: 'space-between' }}>
        <span><b>{num(tot.kcal, 0)}</b> kcal</span><span>P {num(tot.p, 0)} g</span><span>H {num(tot.c, 0)} g</span><span>G {num(tot.f, 0)} g</span>
      </div>
      {d.meals.map((m) => (
        <div key={m.id} className="p-card">
          <div className="row"><span className="num faint">{m.time}</span><span className="strong">{m.name}</span><span className="spacer" /><span className="faint small num">{num(macros(db, m.items).kcal, 0)} kcal</span></div>
          {m.items.map((i) => { const f = db.foods.find((x) => x.id === i.foodId); return <div key={i.foodId} className="small mt-sm row"><span>{f?.image?.startsWith('data:') ? '🍽️' : f?.image}</span>{f?.name}<span className="spacer" /><span className="faint">{i.qty} {f?.unit === 'un' ? 'un' : 'g'}</span></div>; })}
          {m.alternatives.map((a) => (
            <div key={a.id} className="sub small mt-sm"><span className="strong">Ou: {a.name}</span>, {a.items.map((i) => db.foods.find((x) => x.id === i.foodId)?.name).join(', ')}</div>
          ))}
        </div>
      ))}
    </>
  );
}

function RecipesTab({ db, s, mutate, toast }: Ctx) {
  const [open, setOpen] = useState<Meal | null>(null);
  const [note, setNote] = useState('');
  const list = db.meals.filter((m) => m.isPublic);
  const pending = (mid: string) => db.recipeRequests.some((r) => r.studentId === s.id && r.mealId === mid && r.status === 'pendente');
  return (
    <>
      <h3>Receitas da equipa</h3>
      <p className="faint small">Gostas de alguma? Pede ao teu treinador para a pôr no teu plano.</p>
      {list.length === 0 && <div className="p-card faint">Ainda não há receitas publicadas.</div>}
      {list.map((m) => {
        const k = macros(db, m.items);
        return (
          <button key={m.id} className="p-card" style={{ textAlign: 'left', cursor: 'pointer', padding: 0, overflow: 'hidden' }} onClick={() => { setOpen(m); setNote(''); }}>
            {m.photo ? <img src={m.photo} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} /> : <div style={{ height: 80, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, gap: 4 }}>{m.items.slice(0, 3).map((i) => <span key={i.foodId}>{db.foods.find((f) => f.id === i.foodId)?.image?.startsWith('data:') ? '🍽️' : db.foods.find((f) => f.id === i.foodId)?.image}</span>)}</div>}
            <div style={{ padding: '10px 14px' }}>
              <div className="row"><span className="strong">{m.name}</span><span className="spacer" />{pending(m.id) && <span className="badge blue">Pedido enviado</span>}</div>
              <div className="faint small num">{num(k.kcal, 0)} kcal, P {num(k.p, 0)} g, H {num(k.c, 0)} g, G {num(k.f, 0)} g</div>
            </div>
          </button>
        );
      })}
      {open && (
        <Sheet title={open.name} onClose={() => setOpen(null)}>
          {open.photo && <img src={open.photo} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 12, marginBottom: 10 }} />}
          {open.items.map((i) => { const f = db.foods.find((x) => x.id === i.foodId); return <div key={i.foodId} className="row small" style={{ marginBottom: 4 }}><span>{f?.image?.startsWith('data:') ? '🍽️' : f?.image}</span>{f?.name}<span className="spacer" /><span className="faint">{i.qty} {f?.unit === 'un' ? 'un' : 'g'}</span></div>; })}
          <div className="sub small mt-sm num">{(() => { const k = macros(db, open.items); return `${num(k.kcal, 0)} kcal, proteína ${num(k.p, 0)} g, hidratos ${num(k.c, 0)} g, gordura ${num(k.f, 0)} g`; })()}</div>
          {open.notes && <p className="small muted mt-sm">{open.notes}</p>}
          <div className="stack-sm mt">
            {pending(open.id) ? (
              <button className="btn" disabled style={{ width: '100%', borderRadius: 12, height: 42 }}><Check size={16} /> Pedido enviado</button>
            ) : (
              <>
                <input className="input" placeholder="Nota opcional: quando a queres comer?" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Nota" />
                <PBtn onClick={() => {
                  mutate((d) => {
                    const id = uid('rr_');
                    d.recipeRequests.push({ id, studentId: s.id, mealId: open.id, note: note.trim(), status: 'pendente', createdAt: new Date().toISOString() });
                    notify(d, 'receita', `${s.name} pediu “${open.name}”`, `/nutricao/plano/${s.nutritionPlanId}?pedido=${id}`);
                  });
                  toast('Pedido enviado ao treinador');
                }}>Pedir esta receita</PBtn>
              </>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}

function CheckinTab({ db, s, mutate, toast }: Ctx) {
  const [type, setType] = useState<'diario' | 'periodico'>('diario');
  const q = db.questionnaires.find((x) => x.kind === type);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const last = lastM(s);
  const sentToday = db.assessments.some((a) => a.studentId === s.id && a.date === today() && a.type === type);
  const missing = (x: { id: string; type: string; required: boolean }) => x.required && (x.type === 'foto' ? !(photos[x.id]?.length) : !answers[x.id]?.trim());
  const submit = () => {
    if (!q) return;
    const allPhotos = q.questions.filter((x) => x.type === 'foto').flatMap((x) => photos[x.id] ?? []);
    mutate((d) => {
      const st = d.students.find((x) => x.id === s.id)!;
      d.assessments.push({
        id: uid('av_'),
        studentId: s.id,
        type,
        date: today(),
        status: 'pendente',
        feedback: '',
        hasPhotos: allPhotos.length > 0,
        photos: allPhotos,
        answers: q.questions.filter((x) => x.type !== 'foto').map((x) => ({ question: x.label, answer: answers[x.id]?.trim() || '—' })),
      });
      if (!st.checkinDates.includes(today())) st.checkinDates.push(today());
      st.lastActivity = today();
      const wq = q.questions.find((x) => /peso/i.test(x.label));
      const w = wq ? parseFloat((answers[wq.id] || '').replace(',', '.')) : NaN;
      if (!isNaN(w) && last) st.measurements.push({ ...last, date: today(), weight: w, photos: false });
      notify(d, 'avaliacao', `${s.name} enviou ${type === 'diario' ? 'um registo diário' : 'uma avaliação periódica'}`, '/avaliacoes?aluno=' + s.id);
    });
    setAnswers({});
    setPhotos({});
    toast(allPhotos.length ? `Enviado ao teu treinador com ${allPhotos.length} ${allPhotos.length === 1 ? 'foto' : 'fotos'}` : 'Enviado ao teu treinador');
  };
  return (
    <>
      <h3>Check-in</h3>
      <PhotoCompareCard db={db} s={s} />
      <div className="row-wrap">
        <button className={`chip ${type === 'diario' ? 'on' : ''}`} onClick={() => { setType('diario'); setAnswers({}); setPhotos({}); }}>Registo diário</button>
        <button className={`chip ${type === 'periodico' ? 'on' : ''}`} onClick={() => { setType('periodico'); setAnswers({}); setPhotos({}); }}>Avaliação periódica</button>
      </div>
      {sentToday && <div className="p-card small"><Check size={15} color="var(--green)" /> Já enviaste hoje. Podes enviar outro se precisares.</div>}
      {!q ? <div className="p-card faint">O teu treinador ainda não criou este questionário.</div> : (
        <div className="p-card stack">
          {q.questions.map((x) => {
            const Wrap = x.type === 'foto' || x.type === 'texto' ? 'div' : 'label';
            return (
            <Wrap key={x.id} className="field">
              <span>{x.label}{x.required ? ' *' : ''}</span>
              {x.type === 'texto' && (
                <>
                  <textarea className="textarea" rows={3} aria-label={x.label} placeholder="Escreve ou carrega em Ditar e fala" value={answers[x.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [x.id]: e.target.value }))} />
                  <DictateButton value={answers[x.id] ?? ''} onChange={(v) => setAnswers((a) => ({ ...a, [x.id]: v }))} />
                </>
              )}
              {x.type === 'numero' && <input className="input" inputMode="decimal" value={answers[x.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [x.id]: e.target.value })} />}
              {x.type === 'escolha' && <select className="select" value={answers[x.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [x.id]: e.target.value })}><option value="">Escolher</option>{x.options.map((o) => <option key={o}>{o}</option>)}</select>}
              {x.type === 'escala' && <div className="row">{['1', '2', '3', '4', '5'].map((n) => <button type="button" key={n} className={`chip ${answers[x.id] === n ? 'on' : ''}`} onClick={() => setAnswers({ ...answers, [x.id]: n })}>{n}</button>)}</div>}
              {x.type === 'sim_nao' && <div className="row">{['Sim', 'Não'].map((n) => <button type="button" key={n} className={`chip ${answers[x.id] === n ? 'on' : ''}`} onClick={() => setAnswers({ ...answers, [x.id]: n })}>{n}</button>)}</div>}
              {x.type === 'foto' && <PhotoPicker value={photos[x.id] ?? []} onChange={(v) => setPhotos((p) => ({ ...p, [x.id]: v }))} />}
            </Wrap>
            );
          })}
          <PBtn disabled={q.questions.some(missing)} onClick={submit}>Enviar ao treinador</PBtn>
        </div>
      )}
    </>
  );
}

function ChatTab({ db, s, mutate }: Ctx) {
  const [text, setText] = useState('');
  const chat = db.chats.find((c) => c.studentId === s.id);
  const msgs = useMemo(() => chat?.messages ?? [], [chat]);
  return (
    <>
      <div className="stack-sm" style={{ flex: 1 }}>
        {msgs.length === 0 && <div className="p-card faint">Escreve ao teu treinador.</div>}
        {msgs.map((m) => (
          <div key={m.id} className={`bubble ${m.from === 'student' ? 'me' : ''}`} style={m.from === 'student' ? { background: 'var(--app-primary)', borderColor: 'var(--app-primary)', maxWidth: '82%' } : { maxWidth: '82%' }}>
            {m.text}
            <time>{fmtDateTime(m.at)}</time>
          </div>
        ))}
      </div>
      <form
        className="row"
        style={{ position: 'sticky', bottom: 0, background: 'var(--phone-bg)', paddingTop: 6 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          mutate((d) => {
            sendStudentMessage(d, s.id, text.trim());
            notify(d, 'mensagem', `Nova mensagem de ${s.name}`, '/mensagens?c=' + (d.chats.find((c) => c.studentId === s.id)?.id ?? ''));
          });
          setText('');
        }}
      >
        <input className="input" placeholder="Mensagem" value={text} onChange={(e) => setText(e.target.value)} style={{ borderRadius: 20 }} aria-label="Mensagem" />
        <button className="btn" style={{ background: 'var(--app-primary)', color: '#fff', borderColor: 'var(--app-primary)', borderRadius: 20 }}>Enviar</button>
      </form>
    </>
  );
}

export const weekdayName = (i: number) => WEEKDAYS[i];
