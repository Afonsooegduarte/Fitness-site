import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, Camera, Check, ChevronRight, Images, Minus, Play, Plus, SkipForward, Timer } from 'lucide-react';
import type { Assessment, DB, SetLog, Student, WorkoutDay } from '../store/types';
import { notify } from '../lib/actions';
import { fmtDate, today, uid } from '../lib/utils';
import { streakOf } from '../lib/streak';
import { DictateButton, PhotoPicker } from '../components/capture';
import { ProgressPhoto } from '../components/charts';
import { PBtn, Sheet } from './parts';

type Mut = (fn: (d: DB) => void) => void;
interface P { db: DB; s: Student; mutate: Mut; toast: (m: string) => void }

export const dailySentToday = (db: DB, s: Student) => db.assessments.some((a) => a.studentId === s.id && a.type === 'diario' && a.date === today());

/* ---------- 2. Registo rápido no ecrã Hoje ---------- */

export function QuickLogCard({ db, s, mutate, toast }: P) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [energy, setEnergy] = useState('');
  const done = dailySentToday(db, s);
  const send = () => {
    mutate((d) => {
      const st = d.students.find((x) => x.id === s.id)!;
      const answers = [
        ...(energy ? [{ question: 'Energia (1 a 5)', answer: energy }] : []),
        { question: 'Como correu o dia?', answer: text.trim() || '—' },
      ];
      d.assessments.push({ id: uid('av_'), studentId: s.id, type: 'diario', date: today(), status: 'pendente', feedback: '', hasPhotos: photos.length > 0, photos, answers });
      if (!st.checkinDates.includes(today())) st.checkinDates.push(today());
      st.lastActivity = today();
      notify(d, 'avaliacao', `${s.name} enviou um registo diário${photos.length ? ` com ${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'}` : ''}`, '/avaliacoes?aluno=' + s.id);
    });
    toast('Registo enviado ao teu treinador');
    setOpen(false);
    setPhotos([]);
    setText('');
    setEnergy('');
  };
  return (
    <>
      <div className="p-card" style={{ borderColor: done ? undefined : 'var(--app-primary)', borderWidth: done ? 1 : 2 }}>
        <div className="row">
          {done ? <Check size={18} color="var(--green)" /> : <Camera size={18} color="var(--app-primary)" />}
          <span className="strong">{done ? 'Registo de hoje enviado' : 'Registo de hoje'}</span>
        </div>
        <div className="faint small mt-sm">{done ? 'O teu treinador já o recebeu. Podes enviar outro se quiseres.' : 'Uma foto e duas frases ditadas. Demora menos de um minuto.'}</div>
        <div className="mt-sm">
          {done ? <button className="btn btn-sm" style={{ width: '100%', borderRadius: 10, minHeight: 40 }} onClick={() => setOpen(true)}><Plus size={14} /> Enviar outro registo</button> : <PBtn onClick={() => setOpen(true)}><Camera size={16} /> Fazer o registo de hoje</PBtn>}
        </div>
      </div>
      {open && (
        <Sheet title="Registo de hoje" onClose={() => setOpen(false)}>
          <div className="stack">
            <div className="field">
              <span>Fotos (refeições, treino, corpo)</span>
              <PhotoPicker value={photos} onChange={setPhotos} />
            </div>
            <div className="field">
              <span>Como correu o dia?</span>
              <textarea className="textarea" rows={3} aria-label="Como correu o dia?" placeholder="Carrega em Ditar e fala, ou escreve" value={text} onChange={(e) => setText(e.target.value)} />
              <DictateButton value={text} onChange={setText} />
            </div>
            <div className="field">
              <span>Energia (opcional)</span>
              <div className="row">{['1', '2', '3', '4', '5'].map((n) => <button type="button" key={n} className={`chip ${energy === n ? 'on' : ''}`} style={{ minWidth: 44, minHeight: 40, justifyContent: 'center' }} onClick={() => setEnergy(energy === n ? '' : n)}>{n}</button>)}</div>
            </div>
            <PBtn disabled={!photos.length && !text.trim()} onClick={send}>Enviar ao treinador</PBtn>
          </div>
        </Sheet>
      )}
    </>
  );
}

/* ---------- 1. Lembrete diário ---------- */

const remKey = (sid: string) => `pulso-rem-${sid}-${today()}`;
const nowHM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Verifica de 30 em 30 segundos. Funciona enquanto a app está aberta; numa app publicada seria uma notificação push.
export function useDailyReminder(db: DB, s: Student | undefined) {
  const [banner, setBanner] = useState<string | null>(null);
  const sRef = useRef(s);
  const dbRef = useRef(db);
  sRef.current = s;
  dbRef.current = db;
  useEffect(() => {
    const tick = () => {
      const st = sRef.current;
      if (!st?.reminder?.on || nowHM() < st.reminder.time) return;
      if (dailySentToday(dbRef.current, st)) return;
      try {
        if (localStorage.getItem(remKey(st.id))) return;
        localStorage.setItem(remKey(st.id), '1');
      } catch { /* sem armazenamento: avisa na mesma */ }
      const sk = streakOf(st);
      const msg = sk.atRisk ? `Ainda não fizeste o registo de hoje, e vais perder o streak de ${sk.current} dias se não fores ao ginásio.` : 'Ainda não fizeste o registo de hoje. Demora menos de um minuto.';
      setBanner(msg);
      try {
        if ('Notification' in window && Notification.permission === 'granted') new Notification(dbRef.current.branding.appName, { body: msg });
      } catch { /* alguns browsers não deixam criar notificações aqui */ }
    };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, [s?.id]);
  return [banner, () => setBanner(null)] as const;
}

export function ReminderCard({ s, mutate, toast }: Omit<P, 'db'>) {
  const r = s.reminder ?? { on: false, time: '20:00' };
  const save = (next: { on: boolean; time: string }) => {
    mutate((d) => void (d.students.find((x) => x.id === s.id)!.reminder = next));
    try { localStorage.removeItem(remKey(s.id)); } catch { /* ignorar */ }
  };
  const toggle = async () => {
    if (!r.on && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { /* ignorar */ }
    }
    save({ ...r, on: !r.on });
    toast(!r.on ? `Lembrete ligado para as ${r.time}` : 'Lembrete desligado');
  };
  return (
    <div className="p-card">
      <div className="row">
        {r.on ? <Bell size={17} color="var(--app-primary)" /> : <BellOff size={17} />}
        <span className="strong">Lembrete diário</span>
        <span className="spacer" />
        <button type="button" className={`toggle ${r.on ? 'on' : ''}`} role="switch" aria-checked={r.on} aria-label="Lembrete diário" onClick={toggle} />
      </div>
      <div className="row small mt-sm">
        <span className="faint">Avisar às</span>
        <input className="input sm" type="time" value={r.time} aria-label="Hora do lembrete" style={{ width: 110 }} onChange={(e) => e.target.value && save({ ...r, time: e.target.value })} />
        <span className="faint">se ainda não fiz o registo.</span>
      </div>
    </div>
  );
}

export function ReminderBanner({ text, onClose, onGo }: { text: string; onClose: () => void; onGo: () => void }) {
  return (
    <div role="alert" className="p-card row" style={{ borderColor: 'var(--app-primary)', borderWidth: 2 }}>
      <Bell size={18} color="var(--app-primary)" />
      <div className="small" style={{ flex: 1 }}>{text}</div>
      <div className="stack-sm">
        <button className="btn btn-sm" style={{ borderRadius: 10 }} onClick={onGo}>Fazer agora</button>
        <button className="btn btn-sm btn-ghost" onClick={onClose}>Depois</button>
      </div>
    </div>
  );
}

/* ---------- 3. Fotos lado a lado ---------- */

interface Shot { a: Assessment; srcs: string[] | null }

export function PhotoCompareCard({ db, s }: Pick<P, 'db' | 's'>) {
  const [open, setOpen] = useState(false);
  const shots: Shot[] = useMemo(
    () => db.assessments
      .filter((a) => a.studentId === s.id && (a.photos?.length || a.hasPhotos))
      .sort((x, y) => x.date.localeCompare(y.date))
      .map((a) => ({ a, srcs: a.photos?.length ? a.photos : null })),
    [db.assessments, s.id],
  );
  const [ia, setIa] = useState(0);
  const [ib, setIb] = useState(Math.max(0, shots.length - 1));
  const [pa, setPa] = useState(0);
  const [pb, setPb] = useState(0);
  if (!shots.length) return null;
  const A = shots[Math.min(ia, shots.length - 1)];
  const B = shots[Math.min(ib, shots.length - 1)];
  const days = Math.round((new Date(B.a.date).getTime() - new Date(A.a.date).getTime()) / 86400000);
  const gap = days >= 14 ? `${Math.round(days / 7)} semanas` : `${days} ${days === 1 ? 'dia' : 'dias'}`;
  const weightAt = (date: string) => [...s.measurements].filter((m) => m.date <= date).sort((x, y) => y.date.localeCompare(x.date))[0]?.weight;
  const wA = weightAt(A.a.date);
  const wB = weightAt(B.a.date);
  const side = (sh: Shot, idx: number, setIdx: (n: number) => void, p: number, setP: (n: number) => void, label: string) => (
    <div className="stack-sm" style={{ flex: 1, minWidth: 0 }}>
      <select className="select sm" aria-label={label} value={idx} onChange={(e) => { setIdx(+e.target.value); setP(0); }}>
        {shots.map((x, i) => <option key={x.a.id} value={i}>{fmtDate(x.a.date, true)}</option>)}
      </select>
      <div style={{ aspectRatio: '3 / 4', borderRadius: 10, overflow: 'hidden' }}>
        {sh.srcs ? <img src={sh.srcs[Math.min(p, sh.srcs.length - 1)]} alt={`${label}, ${fmtDate(sh.a.date, true)}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <ProgressPhoto seed={s.id} slim={(shots.indexOf(sh) / Math.max(1, shots.length - 1)) * 0.14} label="exemplo" />}
      </div>
      {sh.srcs && sh.srcs.length > 1 && (
        <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
          {sh.srcs.map((src, i) => (
            <button key={i} type="button" aria-label={`Foto ${i + 1}`} onClick={() => setP(i)} style={{ padding: 0, border: i === p ? '2px solid var(--app-primary)' : '2px solid transparent', borderRadius: 6, background: 'none', cursor: 'pointer' }}>
              <img src={src} alt="" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
  return (
    <>
      <button className="p-card" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => { setIa(0); setIb(shots.length - 1); setOpen(true); }}>
        <div className="row"><Images size={17} /><span className="strong">As tuas fotos</span><span className="spacer" /><ChevronRight size={16} /></div>
        <div className="faint small mt-sm">{shots.length > 1 ? `Compara a primeira (${fmtDate(shots[0].a.date)}) com a mais recente (${fmtDate(shots.at(-1)!.a.date)}).` : 'Envia mais fotos para veres a evolução lado a lado.'}</div>
      </button>
      {open && (
        <Sheet title="Antes e agora" onClose={() => setOpen(false)}>
          <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
            {side(A, ia, setIa, pa, setPa, 'Antes')}
            {side(B, ib, setIb, pb, setPb, 'Agora')}
          </div>
          <div className="sub small mt">
            {days > 0 ? `${gap} entre as duas fotos.` : 'Escolhe duas datas diferentes.'}
            {wA != null && wB != null && days > 0 && ` Peso: ${wA.toFixed(1)} kg → ${wB.toFixed(1)} kg (${wB - wA > 0 ? '+' : ''}${(wB - wA).toFixed(1)} kg).`}
          </div>
          {shots.some((x) => !x.srcs) && <p className="faint small mt-sm">As figuras cinzentas são fotos de exemplo dos dados fictícios. As que enviares aparecem aqui a sério.</p>}
        </Sheet>
      )}
    </>
  );
}

/* ---------- 4. Treino guiado ---------- */

function lastLog(logs: SetLog[], exerciseId: string, set: number) {
  const prev = logs.filter((l) => l.exerciseId === exerciseId && l.date < today()).sort((a, b) => b.date.localeCompare(a.date));
  if (!prev.length) return null;
  const day = prev[0].date;
  return prev.find((l) => l.date === day && l.set === set) ?? prev.find((l) => l.date === day) ?? null;
}

function beep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  } catch { /* sem som */ }
  try { navigator.vibrate?.([200, 80, 200]); } catch { /* sem vibração */ }
}

export function GuidedWorkout({ db, s, mutate, toast, day, onExit }: P & { day: WorkoutDay; onExit: () => void }) {
  const logs = s.setLogs ?? [];
  const todayLogs = logs.filter((l) => l.date === today());
  const [draft, setDraft] = useState<Record<string, { w: string; r: string }>>({});
  const [rest, setRest] = useState<{ end: number; total: number; label: string } | null>(null);
  const [, force] = useState(0);
  useEffect(() => {
    if (!rest) return;
    const t = setInterval(() => {
      if (Date.now() >= rest.end) {
        beep();
        setRest(null);
      } else force((n) => n + 1);
    }, 250);
    return () => clearInterval(t);
  }, [rest]);

  const total = day.items.reduce((n, it) => n + it.sets, 0);
  const doneN = day.items.reduce((n, it) => n + todayLogs.filter((l) => l.exerciseId === it.exerciseId && l.set <= it.sets).length, 0);
  const key = (exId: string, n: number) => exId + ':' + n;

  const toggleSet = (exId: string, n: number, defReps: string, restS: number | null, exName: string) => {
    const done = todayLogs.find((l) => l.exerciseId === exId && l.set === n);
    const k = key(exId, n);
    const prev = lastLog(logs, exId, n);
    const wStr = draft[k]?.w ?? (prev?.weight != null ? String(prev.weight) : '');
    const w = parseFloat(wStr.replace(',', '.'));
    const reps = (draft[k]?.r ?? prev?.reps ?? defReps).trim() || defReps;
    mutate((d) => {
      const st = d.students.find((x) => x.id === s.id)!;
      st.setLogs = (st.setLogs ?? []).filter((l) => !(l.date === today() && l.exerciseId === exId && l.set === n));
      if (!done) st.setLogs.push({ date: today(), exerciseId: exId, set: n, weight: isNaN(w) ? null : w, reps });
      st.lastActivity = today();
    });
    if (!done) {
      const secs = restS ?? 60;
      if (secs > 0) setRest({ end: Date.now() + secs * 1000, total: secs, label: `Descanso depois de ${exName}, série ${n}` });
    }
  };

  const finish = () => {
    mutate((d) => {
      const st = d.students.find((x) => x.id === s.id)!;
      if (!st.checkinDates.includes(today())) st.checkinDates.push(today());
      st.lastActivity = today();
    });
    toast(`Treino terminado: ${doneN} de ${total} séries`);
    onExit();
  };

  const left = rest ? Math.max(0, Math.ceil((rest.end - Date.now()) / 1000)) : 0;
  return (
    <>
      <div className="row">
        <button className="btn btn-sm btn-ghost" onClick={onExit}>Voltar</button>
        <span className="strong">{day.name}</span>
        <span className="spacer" />
        <span className="small num faint">{doneN}/{total} séries</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--line-2)', overflow: 'hidden' }} aria-hidden>
        <div style={{ width: `${total ? (doneN / total) * 100 : 0}%`, height: '100%', background: 'var(--app-primary)', transition: 'width .2s' }} />
      </div>
      {rest && (
        <div className="p-card" role="timer" aria-live="polite" style={{ position: 'sticky', top: 0, zIndex: 3, background: 'var(--app-primary)', color: '#fff', border: 0 }}>
          <div className="row">
            <Timer size={18} />
            <span className="num" style={{ font: '600 28px/1 var(--display)' }}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
            <span className="spacer" />
            <button className="btn btn-sm" aria-label="Menos 15 segundos" onClick={() => setRest({ ...rest, end: rest.end - 15000 })}><Minus size={14} />15</button>
            <button className="btn btn-sm" aria-label="Mais 15 segundos" onClick={() => setRest({ ...rest, end: rest.end + 15000 })}><Plus size={14} />15</button>
            <button className="btn btn-sm" aria-label="Saltar descanso" onClick={() => setRest(null)}><SkipForward size={14} /></button>
          </div>
          <div className="small" style={{ opacity: 0.85, marginTop: 4 }}>{rest.label}</div>
        </div>
      )}
      {day.items.map((it) => {
        const ex = db.exercises.find((e) => e.id === it.exerciseId);
        const name = ex?.name ?? 'Exercício';
        const prev1 = lastLog(logs, it.exerciseId, 1);
        return (
          <div key={it.id} className="p-card">
            <div className="row">
              {it.group && <span className="grp on" style={{ background: 'var(--app-primary)' }}>{it.group}</span>}
              <span className="strong">{name}</span>
            </div>
            <div className="faint small mt-sm">
              {it.sets} × {it.reps}{it.rest != null ? `, ${it.rest} s de descanso` : ''}.{' '}
              {prev1 ? `Da última vez (${fmtDate(prev1.date)}): ${prev1.weight != null ? prev1.weight + ' kg × ' : ''}${prev1.reps}.` : 'Primeira vez: regista o peso que usares.'}
            </div>
            <div className="stack-sm mt-sm">
              {Array.from({ length: it.sets }, (_, i) => i + 1).map((n) => {
                const k = key(it.exerciseId, n);
                const done = todayLogs.find((l) => l.exerciseId === it.exerciseId && l.set === n);
                const prev = lastLog(logs, it.exerciseId, n);
                const w = done ? (done.weight != null ? String(done.weight) : '') : draft[k]?.w ?? (prev?.weight != null ? String(prev.weight) : '');
                const r = done ? done.reps : draft[k]?.r ?? prev?.reps ?? it.reps;
                return (
                  <div key={n} className="row" style={{ gap: 6, opacity: done ? 0.7 : 1 }}>
                    <span className="small num" style={{ width: 22 }}>{n}</span>
                    <input className="input sm" inputMode="decimal" aria-label={`${name}, série ${n}, peso em kg`} placeholder="kg" value={w} disabled={!!done} style={{ width: 70 }} onChange={(e) => setDraft({ ...draft, [k]: { w: e.target.value, r } })} />
                    <span className="faint small">kg ×</span>
                    <input className="input sm" aria-label={`${name}, série ${n}, repetições`} value={r} disabled={!!done} style={{ width: 64 }} onChange={(e) => setDraft({ ...draft, [k]: { w, r: e.target.value } })} />
                    <span className="spacer" />
                    <button
                      type="button"
                      aria-pressed={!!done}
                      aria-label={done ? `Desmarcar série ${n}` : `Marcar série ${n} como feita`}
                      onClick={() => toggleSet(it.exerciseId, n, it.reps, it.rest, name)}
                      style={{ width: 44, height: 40, borderRadius: 10, border: '1px solid ' + (done ? 'var(--green)' : 'var(--line)'), background: done ? 'var(--green)' : 'transparent', color: done ? '#fff' : 'inherit', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                    >
                      <Check size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
            {it.alternatives.length > 0 && <div className="faint small mt-sm">Se o aparelho estiver ocupado: {it.alternatives.map((a) => db.exercises.find((e) => e.id === a)?.name).join(', ')}</div>}
          </div>
        );
      })}
      <PBtn onClick={finish}>{doneN >= total ? 'Terminar treino' : `Terminar treino (${doneN} de ${total} séries)`}</PBtn>
    </>
  );
}

export const StartWorkoutButton = ({ onClick, started }: { onClick: () => void; started: boolean }) => (
  <PBtn onClick={onClick}><Play size={16} /> {started ? 'Continuar treino' : 'Começar treino guiado'}</PBtn>
);
