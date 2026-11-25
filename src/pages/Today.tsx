import { useMemo, useState } from 'react';
import { CalendarDays, Cake, Hourglass, AlertTriangle, ChefHat, Check, Copy, Plus, Sparkles, Trash2, X, ClipboardCheck, MessageSquare } from 'lucide-react';
import { useStore } from '../store/store';
import { daySummary, pendingAssessments, studentById, visibleChats, visibleStudents, EVENT_KIND } from '../lib/domain';
import { computeInsights, INSIGHT_META, type Insight, type InsightKind } from '../lib/copilot';
import { sendCoachMessage, addTask } from '../lib/actions';
import { navigate } from '../lib/router';
import { copyText, fmtDate, fmtDateTime, fmtLongDate, relative, today } from '../lib/utils';
import { Avatar, Empty, Field, Modal, PageHead, Toggle, useToast } from '../components/ui';

export function SendMessageModal({ studentId, initial, onClose, onSent }: { studentId: string; initial: string; onClose: () => void; onSent?: () => void }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [text, setText] = useState(initial);
  const s = studentById(db, studentId);
  return (
    <Modal
      title={`Mensagem para ${s?.name ?? ''}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={!text.trim()}
            onClick={() => {
              mutate((d) => sendCoachMessage(d, studentId, text.trim()));
              toast('Mensagem enviada');
              onSent?.();
              onClose();
            }}
          >
            Enviar mensagem
          </button>
        </>
      }
    >
      <Field label="Mensagem">
        <textarea className="textarea" rows={5} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </Field>
    </Modal>
  );
}

export function InsightRow({ ins, compact }: { ins: Insight; compact?: boolean }) {
  const { db, mutate } = useStore();
  const [msg, setMsg] = useState(false);
  const s = studentById(db, ins.studentId)!;
  const meta = INSIGHT_META[ins.kind];
  const dismiss = () => mutate((d) => void d.dismissedInsights.push(ins.id));
  return (
    <div className="queue-item">
      <Avatar name={s.name} size={36} />
      <div className="plate" style={{ ['--plate' as any]: meta.color }}>
        <div className="row-wrap">
          <span className="strong">{ins.title}</span>
        </div>
        <div className="why">
          <span className="kind" style={{ color: meta.color === '#F2B705' ? '#8a6a00' : meta.color }}>{meta.label}</span>
          {ins.why.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
      </div>
      <div className="row" style={{ flex: 'none' }}>
        {ins.action.message ? (
          <button className="btn btn-sm" onClick={() => setMsg(true)}>
            <MessageSquare size={15} /> {ins.action.label}
          </button>
        ) : (
          <button className="btn btn-sm" onClick={() => navigate(ins.action.link!)}>
            {ins.action.label}
          </button>
        )}
        {!compact && (
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/alunos/' + s.id)}>
            Ver aluno
          </button>
        )}
        <button className="icon-btn sm" onClick={dismiss} aria-label="Dispensar proposta" title="Dispensar">
          <X size={16} />
        </button>
      </div>
      {msg && <SendMessageModal studentId={s.id} initial={ins.action.message!} onClose={() => setMsg(false)} onSent={dismiss} />}
    </div>
  );
}

type DiscKey = 'events' | 'birthdays' | 'expiring' | 'overdue';

export function TodayPage() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const sum = daySummary(db);
  const [disc, setDisc] = useState<DiscKey | null>(null);
  const [taskText, setTaskText] = useState('');
  const insights = useMemo(() => (db.settings.copilotEnabled ? computeInsights(db) : []), [db]);
  const students = visibleStudents(db);
  const ids = new Set(students.map((s) => s.id));
  const pend = pendingAssessments(db).filter((a) => ids.has(a.studentId));
  const reviewQueue = students
    .map((s) => ({ s, n: pend.filter((a) => a.studentId === s.id).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const requests = db.recipeRequests.filter((r) => r.status === 'pendente' && ids.has(r.studentId));
  const chats = visibleChats(db)
    .filter((c) => c.messages.length)
    .sort((a, b) => b.messages[b.messages.length - 1].at.localeCompare(a.messages[a.messages.length - 1].at))
    .slice(0, 4);

  const discs: { key: DiscKey; label: string; n: number; color: string; cls?: string; icon: any }[] = [
    { key: 'events', label: 'eventos', n: sum.events.length, color: 'var(--blue)', icon: CalendarDays },
    { key: 'birthdays', label: 'aniversários', n: sum.birthdays.length, color: 'var(--green)', icon: Cake },
    { key: 'expiring', label: 'a expirar', n: sum.expiring.length, color: 'var(--yellow)', cls: 'yellow', icon: Hourglass },
    { key: 'overdue', label: 'em atraso', n: sum.overdue.length, color: 'var(--red)', icon: AlertTriangle },
  ];

  return (
    <div className="page">
      <div className="today-head">
        <div className="today-date">
          <small>Bom trabalho, {db.staff.find((s) => s.id === db.currentUserId)?.name.split(' ')[0]}</small>
          {fmtLongDate(today())}
        </div>
        <div className="barbell" aria-label="Resumo do dia">
          {discs.map((d) => (
            <button
              key={d.key}
              className={`disc ${d.cls ?? ''} ${disc === d.key ? 'on' : ''}`}
              onClick={() => setDisc(disc === d.key ? null : d.key)}
              aria-pressed={disc === d.key}
              aria-label={`${d.n} ${d.label}`}
            >
              <span className="rack">
                <span className="plate-face" style={{ background: d.color, height: 74 + Math.min(d.n, 6) * 7 }}>{d.n}</span>
              </span>
              <span className="lbl">{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      {disc && (
        <div className="panel mb">
          <div className="panel-head">
            <h3>{{ events: 'Eventos de hoje', birthdays: 'Aniversários de hoje', expiring: 'Subscrições a terminar nos próximos 7 dias', overdue: 'Pagamentos em atraso' }[disc]}</h3>
            <div className="actions">
              <button className="icon-btn sm" onClick={() => setDisc(null)} aria-label="Fechar">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="list">
            {disc === 'events' &&
              (sum.events.length ? sum.events.map((e) => (
                <div key={e.id} className="list-row click" onClick={() => navigate('/calendario')}>
                  <span className="num strong">{e.start}</span>
                  <span className="plate" style={{ ['--plate' as any]: EVENT_KIND[e.kind].color }}>{e.title}</span>
                  <span className="spacer" />
                  <span className="faint">{e.kind === 'pessoal' ? studentById(db, e.studentId)?.name : `${e.enrolled.length}${e.limit ? ' de ' + e.limit : ''} inscritos`}</span>
                </div>
              )) : <p className="faint panel-body">Sem eventos hoje.</p>)}
            {disc !== 'events' &&
              (sum[disc].length ? sum[disc].map((s) => (
                <div key={s.id} className="list-row click" onClick={() => navigate('/alunos/' + s.id)}>
                  <Avatar name={s.name} size={28} />
                  <span>{s.name}</span>
                  <span className="spacer" />
                  <span className="faint">{disc === 'expiring' ? `Termina ${relative(s.subscriptionEnd)}` : disc === 'overdue' ? 'Pagamento pendente' : 'Faz anos hoje'}</span>
                </div>
              )) : <p className="faint panel-body">Nada por aqui.</p>)}
          </div>
        </div>
      )}

      <div className="split">
        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <Sparkles size={18} color="var(--blue)" />
              <h3>Precisa de ti</h3>
              <span className="faint hide-sm">propostas do Copilot</span>
              <div className="actions">
                <button className="btn btn-sm btn-ghost" onClick={() => navigate('/copilot')}>Ver todas ({insights.length})</button>
              </div>
            </div>
            {!db.settings.copilotEnabled ? (
              <Empty title="O Copilot está desligado" text="Liga-o nas definições para receberes propostas sobre os teus alunos." action={<button className="btn btn-sm" onClick={() => navigate('/definicoes?tab=preferencias')}>Abrir definições</button>} />
            ) : insights.length === 0 && requests.length === 0 ? (
              <Empty icon={<Check size={26} />} title="Está tudo em dia" text="Quando um aluno precisar de atenção, aparece aqui com o motivo." />
            ) : (
              <div>
                {requests.map((r) => {
                  const s = studentById(db, r.studentId)!;
                  const meal = db.meals.find((m) => m.id === r.mealId);
                  return (
                    <div key={r.id} className="queue-item">
                      <Avatar name={s.name} size={36} />
                      <div className="plate" style={{ ['--plate' as any]: 'var(--blue)' }}>
                        <span className="strong">{s.name.split(' ')[0]} pediu a receita “{meal?.name}”</span>
                        <div className="why">
                          <span className="kind" style={{ color: 'var(--blue)' }}>Pedido de receita</span>
                          <span>{fmtDateTime(r.createdAt)}</span>
                          {r.note && <span>“{r.note}”</span>}
                        </div>
                      </div>
                      <button className="btn btn-sm" onClick={() => navigate(`/nutricao/plano/${s.nutritionPlanId}?pedido=${r.id}`)}>
                        <ChefHat size={15} /> Abrir pedido
                      </button>
                    </div>
                  );
                })}
                {insights.slice(0, 6).map((i) => (
                  <InsightRow key={i.id} ins={i} compact />
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <ClipboardCheck size={18} color="var(--yellow)" />
              <h3>Avaliações por rever</h3>
              <span className="badge yellow">{pend.length}</span>
              <div className="actions">
                <button className="btn btn-sm btn-ghost" onClick={() => navigate('/avaliacoes')}>Abrir lista completa</button>
              </div>
            </div>
            {reviewQueue.length === 0 ? (
              <Empty title="Sem avaliações pendentes" />
            ) : (
              <div className="list">
                {reviewQueue.slice(0, 6).map(({ s, n }) => (
                  <div key={s.id} className="list-row">
                    <Avatar name={s.name} size={30} />
                    <div>
                      <div className="strong">{s.name}</div>
                      <div className="faint">{n === 1 ? '1 avaliação por rever' : `${n} avaliações por rever`}</div>
                    </div>
                    <span className="spacer" />
                    <button className="btn btn-sm" onClick={() => navigate('/avaliacoes?aluno=' + s.id)}>Rever</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <MessageSquare size={18} />
              <h3>Mensagens recentes</h3>
              <div className="actions">
                <button className="btn btn-sm btn-ghost" onClick={() => navigate('/mensagens')}>Abrir mensagens</button>
              </div>
            </div>
            <div className="list">
              {chats.map((c) => {
                const s = studentById(db, c.studentId)!;
                const last = c.messages[c.messages.length - 1];
                return (
                  <div key={c.id} className="list-row click" onClick={() => navigate('/mensagens?c=' + c.id)}>
                    <Avatar name={s.name} size={30} />
                    <div style={{ minWidth: 0 }}>
                      <div className="row">
                        <span className={c.unread ? 'strong' : ''}>{s.name}</span>
                        {c.color && <span className="color-dot" style={{ background: c.color }} />}
                      </div>
                      <div className="faint ellipsis">
                        {last.from === 'coach' ? 'Eu: ' : ''}
                        {last.text}
                      </div>
                    </div>
                    <span className="spacer" />
                    <span className="faint">{fmtDate(last.at.slice(0, 10))}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="stack">
          <section className="panel">
            <div className="panel-head">
              <h3>Agenda de hoje</h3>
              <div className="actions">
                <button className="btn btn-sm btn-ghost" onClick={() => navigate('/calendario')}>Calendário</button>
              </div>
            </div>
            <div className="panel-body stack-sm">
              {sum.events.length === 0 && <p className="faint">Sem eventos marcados.</p>}
              {sum.events.map((e) => (
                <div key={e.id} className="plate" style={{ ['--plate' as any]: EVENT_KIND[e.kind].color }}>
                  <div className="row">
                    <span className="num strong">{e.start}</span>
                    <span>{e.title}</span>
                  </div>
                  <div className="faint">
                    {e.kind === 'pessoal' ? `Evento de ${studentById(db, e.studentId)?.name}` : e.location}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Tarefas</h3>
              <span className="faint">{db.tasks.filter((t) => !t.done).length} por fazer</span>
            </div>
            <div className="panel-body stack-sm">
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!taskText.trim()) return;
                  mutate((d) => addTask(d, taskText.trim()));
                  setTaskText('');
                }}
              >
                <input className="input sm" placeholder="Nova tarefa" value={taskText} onChange={(e) => setTaskText(e.target.value)} aria-label="Nova tarefa" />
                <button className="icon-btn" aria-label="Adicionar tarefa">
                  <Plus size={18} />
                </button>
              </form>
              {db.tasks.length === 0 && <p className="faint">Sem tarefas pendentes.</p>}
              {[...db.tasks].sort((a, b) => Number(a.done) - Number(b.done)).map((t) => (
                <div key={t.id} className="row" style={{ alignItems: 'flex-start' }}>
                  <label className="check" style={{ flex: 1, alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={t.done} onChange={() => mutate((d) => void (d.tasks.find((x) => x.id === t.id)!.done = !t.done))} style={{ marginTop: 3 }} />
                    <span style={{ textDecoration: t.done ? 'line-through' : undefined, color: t.done ? 'var(--ink-3)' : undefined }}>
                      {t.text}
                      {t.due && !t.done && <span className="faint" style={{ display: 'block' }}>Até {relative(t.due)}</span>}
                    </span>
                  </label>
                  <button className="icon-btn sm" onClick={() => mutate((d) => void (d.tasks = d.tasks.filter((x) => x.id !== t.id)))} aria-label="Apagar tarefa">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel panel-pad">
            <h3>Link público</h3>
            <p className="faint mt-sm">Partilha para novos alunos se inscreverem nos teus planos.</p>
            <div className="row mt-sm">
              <input className="input sm" readOnly value={`https://pulso.app/${db.settings.publicSlug}`} aria-label="Link público" />
              <button className="btn btn-sm" onClick={async () => toast((await copyText(`https://pulso.app/${db.settings.publicSlug}`)) ? 'Link copiado' : 'Não foi possível copiar')}>
                <Copy size={15} /> Copiar
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Novidades</h3>
            </div>
            <div className="panel-body stack">
              {db.announcements.map((a) => (
                <div key={a.id}>
                  <div className="row">
                    <span className="strong">{a.title}</span>
                    <span className="spacer" />
                    <span className="faint">{fmtDate(a.date)}</span>
                  </div>
                  <p className="small muted mt-sm">{a.body}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function CopilotPage() {
  const { db, mutate } = useStore();
  const [kind, setKind] = useState<InsightKind | 'todas'>('todas');
  const insights = useMemo(() => computeInsights(db), [db]);
  const counts = insights.reduce<Record<string, number>>((a, i) => ((a[i.kind] = (a[i.kind] ?? 0) + 1), a), {});
  const list = insights.filter((i) => kind === 'todas' || i.kind === kind);
  return (
    <div className="page">
      <PageHead
        title="Copilot"
        lead="Olha pelos teus alunos e propõe ações, sempre com o motivo à vista: progressões, queixas, inatividade, peso estagnado, renovações e conquistas."
        actions={
          <>
            <label className="row small">
              <span className="muted">Copilot ligado</span>
              <Toggle on={db.settings.copilotEnabled} onChange={(v) => mutate((d) => void (d.settings.copilotEnabled = v))} label="Copilot ligado" />
            </label>
            {db.dismissedInsights.length > 0 && (
              <button className="btn btn-sm" onClick={() => mutate((d) => void (d.dismissedInsights = []))}>
                Repor {db.dismissedInsights.length} dispensadas
              </button>
            )}
          </>
        }
      />
      {!db.settings.copilotEnabled ? (
        <div className="panel">
          <Empty icon={<Sparkles size={28} />} title="O Copilot está desligado" text="Liga-o para voltares a receber propostas." />
        </div>
      ) : (
        <>
          <div className="row-wrap mb">
            <button className={`chip ${kind === 'todas' ? 'on' : ''}`} onClick={() => setKind('todas')}>
              Todas <span className="n">{insights.length}</span>
            </button>
            {(Object.keys(INSIGHT_META) as InsightKind[]).map((k) => (
              <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
                <span className="color-dot" style={{ background: INSIGHT_META[k].color }} />
                {INSIGHT_META[k].label} <span className="n">{counts[k] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="panel">
            {list.length === 0 ? <Empty icon={<Check size={26} />} title="Sem propostas nesta categoria" /> : list.map((i) => <InsightRow key={i.id} ins={i} />)}
          </div>
        </>
      )}
    </div>
  );
}
