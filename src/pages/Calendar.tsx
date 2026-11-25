import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store/store';
import type { CalendarEvent } from '../store/types';
import { eventsOn, studentById, visibleStudents, EVENT_KIND } from '../lib/domain';
import { monthName, pad, toISO, today, uid, WEEKDAYS_SHORT, fmtLongDate } from '../lib/utils';
import { ConfirmButton, Field, Modal, PageHead, Seg, Toggle, useToast } from '../components/ui';

export function CalendarPage() {
  const { db } = useStore();
  const t = new Date();
  const [ym, setYm] = useState({ y: t.getFullYear(), m: t.getMonth() });
  const [personal, setPersonal] = useState(true);
  const [view, setView] = useState<'mes' | 'agenda'>('mes');
  const [edit, setEdit] = useState<CalendarEvent | null>(null);
  const first = new Date(ym.y, ym.m, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(ym.y, ym.m, 1 - offset);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const shift = (n: number) => setYm(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));
  const newEvent = (date: string): CalendarEvent => ({ id: '', title: '', date, start: '10:00', end: '11:00', kind: 'sessao', studentId: null, recurrence: 'nenhuma', limit: null, enrolled: [], location: '' });
  const agendaDays = days.filter((d) => d.getMonth() === ym.m).map(toISO).filter((d) => d >= today()).slice(0, 21);

  return (
    <div className="page" style={{ maxWidth: 'none' }}>
      <PageHead
        title="Calendário"
        lead="Sessões, aulas de grupo e avaliações. Os eventos que os alunos registam na app (corridas, yoga, aulas por fora) também aparecem aqui."
        actions={
          <>
            <label className="row small"><Toggle on={personal} onChange={setPersonal} label="Eventos dos alunos" /> Eventos dos alunos</label>
            <Seg options={[{ id: 'mes', label: 'Mês' }, { id: 'agenda', label: 'Agenda' }]} value={view} onChange={setView} />
            <button className="btn btn-primary" onClick={() => setEdit(newEvent(today()))}><Plus size={16} /> Novo evento</button>
          </>
        }
      />
      <div className="panel">
        <div className="panel-head">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mês anterior"><ChevronLeft size={18} /></button>
          <h3 style={{ textTransform: 'capitalize', minWidth: 160, textAlign: 'center' }}>{monthName(ym.m)} {ym.y}</h3>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Mês seguinte"><ChevronRight size={18} /></button>
          <button className="btn btn-sm" onClick={() => setYm({ y: t.getFullYear(), m: t.getMonth() })}>Hoje</button>
          <div className="actions row-wrap">
            {Object.entries(EVENT_KIND).map(([k, v]) => (
              <span key={k} className="row small" style={{ gap: 5 }}><span className="color-dot" style={{ background: v.color }} />{v.label}</span>
            ))}
          </div>
        </div>
        {view === 'mes' ? (
          <div className="cal">
            {WEEKDAYS_SHORT.map((w) => <div key={w} className="cal-h">{w}</div>)}
            {days.map((d) => {
              const iso = toISO(d);
              const evs = eventsOn(db, iso, personal);
              return (
                <div key={iso} className={`cal-d ${d.getMonth() !== ym.m ? 'out' : ''} ${iso === today() ? 'today' : ''}`} onClick={() => setEdit(newEvent(iso))}>
                  <span className="dn">{d.getDate()}</span>
                  {evs.slice(0, 4).map((e) => (
                    <div
                      key={e.id}
                      className={`cal-ev ${e.kind === 'pessoal' ? 'personal' : ''}`}
                      style={{ ['--c' as any]: EVENT_KIND[e.kind].color }}
                      onClick={(ev) => (ev.stopPropagation(), setEdit(e))}
                      title={`${e.start} ${e.title}`}
                    >
                      {e.start} {e.kind === 'pessoal' ? `${studentById(db, e.studentId)?.name.split(' ')[0]}: ` : ''}{e.title}
                    </div>
                  ))}
                  {evs.length > 4 && <span className="faint" style={{ fontSize: 12 }}>mais {evs.length - 4}</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="list">
            {agendaDays.map((iso) => {
              const evs = eventsOn(db, iso, personal);
              if (!evs.length) return null;
              return (
                <div key={iso} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ width: 170 }} className="strong">{fmtLongDate(iso)}</div>
                  <div className="stack-sm" style={{ flex: 1 }}>
                    {evs.map((e) => (
                      <button key={e.id} className="plate" style={{ ['--plate' as any]: EVENT_KIND[e.kind].color, textAlign: 'left', background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setEdit(e)}>
                        <span className="num strong">{e.start} a {e.end}</span> {e.title}
                        <span className="faint" style={{ display: 'block' }}>
                          {e.kind === 'pessoal' ? `Registado por ${studentById(db, e.studentId)?.name}` : `${e.enrolled.length}${e.limit ? ' de ' + e.limit : ''} inscritos${e.location ? ', ' + e.location : ''}`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {edit && <EventModal ev={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function EventModal({ ev, onClose }: { ev: CalendarEvent; onClose: () => void }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [f, setF] = useState<CalendarEvent>(structuredClone(ev));
  const isNew = !ev.id;
  const readonly = ev.kind === 'pessoal';
  const students = visibleStudents(db).filter((s) => s.status === 'ativo');
  const full = f.limit != null && f.enrolled.length >= f.limit;
  const set = (patch: Partial<CalendarEvent>) => setF({ ...f, ...patch });
  const save = () => {
    mutate((d) => {
      if (isNew) d.events.push({ ...f, id: uid('ev_') });
      else {
        const i = d.events.findIndex((x) => x.id === ev.id);
        // Mudar a recorrência mantém o limite de inscrições.
        d.events[i] = { ...f, limit: f.limit };
      }
    });
    toast(isNew ? 'Evento criado' : 'Evento guardado');
    onClose();
  };
  return (
    <Modal
      title={readonly ? 'Evento do aluno' : isNew ? 'Novo evento' : 'Editar evento'}
      onClose={onClose}
      footer={
        readonly ? <button className="btn" onClick={onClose}>Fechar</button> : (
          <>
            {!isNew && (
              <span style={{ marginRight: 'auto' }}>
                <ConfirmButton onConfirm={() => { mutate((d) => void (d.events = d.events.filter((x) => x.id !== ev.id))); toast('Evento apagado'); onClose(); }} label="Confirmar: apagar">
                  <Trash2 size={15} /> Apagar
                </ConfirmButton>
              </span>
            )}
            <button className="btn" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={!f.title.trim()} onClick={save}>{isNew ? 'Criar evento' : 'Guardar evento'}</button>
          </>
        )
      }
    >
      {readonly ? (
        <div className="stack-sm">
          <div className="strong">{f.title}</div>
          <div className="muted">{fmtLongDate(f.date)}, {f.start} a {f.end}{f.recurrence !== 'nenhuma' ? `, repete ${f.recurrence === 'semanal' ? 'todas as semanas' : f.recurrence}` : ''}</div>
          <div className="faint">Registado na app por {studentById(db, f.studentId)?.name}. Só o aluno pode alterar este evento.</div>
        </div>
      ) : (
        <>
          <Field label="Título"><input className="input" value={f.title} onChange={(e) => set({ title: e.target.value })} autoFocus /></Field>
          <div className="grid g2">
            <Field label="Tipo">
              <select className="select" value={f.kind} onChange={(e) => set({ kind: e.target.value as any, limit: e.target.value === 'sessao' || e.target.value === 'avaliacao' ? 1 : f.limit })}>
                <option value="sessao">Sessão individual</option>
                <option value="aula">Aula de grupo</option>
                <option value="avaliacao">Avaliação</option>
              </select>
            </Field>
            <Field label="Local"><input className="input" value={f.location} onChange={(e) => set({ location: e.target.value })} placeholder="Estúdio, online, sala 2" /></Field>
            <Field label="Data"><input className="input" type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} /></Field>
            <div className="grid g2">
              <Field label="Início"><input className="input" type="time" value={f.start} onChange={(e) => set({ start: e.target.value })} /></Field>
              <Field label="Fim"><input className="input" type="time" value={f.end} onChange={(e) => set({ end: e.target.value })} /></Field>
            </div>
            <Field label="Repetir">
              <select className="select" value={f.recurrence} onChange={(e) => set({ recurrence: e.target.value as any })}>
                <option value="nenhuma">Não repetir</option>
                <option value="semanal">Todas as semanas</option>
                <option value="quinzenal">De 15 em 15 dias</option>
                <option value="mensal">Todos os meses</option>
              </select>
            </Field>
            <Field label="Limite de inscrições" hint="Vazio para sem limite">
              <input className="input" type="number" min={1} value={f.limit ?? ''} onChange={(e) => set({ limit: e.target.value ? Math.max(1, +e.target.value) : null })} />
            </Field>
          </div>
          <Field label={`Inscritos (${f.enrolled.length}${f.limit ? ' de ' + f.limit : ''})`}>
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8, padding: 10 }} className="stack-sm">
              {students.map((s) => {
                const on = f.enrolled.includes(s.id);
                return (
                  <label key={s.id} className="check" style={{ opacity: !on && full ? 0.5 : 1 }}>
                    <input type="checkbox" checked={on} disabled={!on && full} onChange={(e) => set({ enrolled: e.target.checked ? [...f.enrolled, s.id] : f.enrolled.filter((x) => x !== s.id) })} />
                    {s.name}
                  </label>
                );
              })}
            </div>
            {full && <small className="faint">Limite atingido.</small>}
          </Field>
        </>
      )}
    </Modal>
  );
}

export const timeOptions = Array.from({ length: 32 }, (_, i) => `${pad(6 + Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);
