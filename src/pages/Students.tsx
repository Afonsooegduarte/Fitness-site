import { useMemo, useState } from 'react';
import { Plus, Search, Download, Users, MessageSquare, ArrowDownUp } from 'lucide-react';
import { useStore } from '../store/store';
import type { Student } from '../store/types';
import type { Route } from '../lib/router';
import { navigate } from '../lib/router';
import {
  adherence, activeCount, currentUser, isLeader, metricValue, METRICS, pendingAssessments, periodStart, retentionRisk, staffById,
  studentLimit, visibleStudents, GOAL_LABEL, type MetricKey,
} from '../lib/domain';
import { applyWelcomePack, newStudent, runAutomation } from '../lib/actions';
import { age, diffDays, downloadText, fmtDate, matches, num, relative, signed, today } from '../lib/utils';
import { Avatar, Empty, Field, Modal, PageHead, Seg, Toggle, useToast } from '../components/ui';
import { ProgressPhoto, Sparkline } from '../components/charts';
import { SendMessageModal } from './Today';

type View = 'lista' | 'retencao' | 'transformacoes';

export function StudentsPage({ route }: { route: Route }) {
  const { db } = useStore();
  const view = (route.query.get('vista') as View) || 'lista';
  const [adding, setAdding] = useState(false);
  const used = activeCount(db);
  const limit = studentLimit(db);
  return (
    <div className="page">
      <PageHead
        title="Alunos"
        lead={`${used} de ${limit} alunos ativos no teu plano.`}
        actions={
          <>
            <Seg
              options={[
                { id: 'lista', label: 'Lista' },
                { id: 'retencao', label: 'Modo retenção' },
                { id: 'transformacoes', label: 'Transformações' },
              ]}
              value={view}
              onChange={(v) => navigate(v === 'lista' ? '/alunos' : '/alunos?vista=' + v)}
            />
            <button className="btn btn-primary" onClick={() => setAdding(true)}>
              <Plus size={16} /> Adicionar aluno
            </button>
          </>
        }
      />
      {view === 'lista' && <StudentList />}
      {view === 'retencao' && <RetentionView />}
      {view === 'transformacoes' && <TransformationsView />}
      {adding && <AddStudentModal onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddStudentModal({ onClose }: { onClose: () => void }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const me = currentUser(db);
  const full = activeCount(db) >= studentLimit(db);
  const [f, setF] = useState({
    name: '', email: '', phone: '', gender: 'F' as 'F' | 'M', birthday: '1995-01-01', goal: 'perder_peso' as Student['goal'],
    coachId: me.role === 'nutritionist' ? db.staff[0].id : me.id, packageId: db.packages[0]?.id ?? '', tags: '', pack: db.welcomePacks.find((p) => p.active)?.id ?? '',
  });
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal
      title="Adicionar aluno"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={!f.name.trim() || full}
            onClick={() => {
              const s = newStudent({
                name: f.name.trim(), email: f.email, phone: f.phone, gender: f.gender, birthday: f.birthday, goal: f.goal, coachId: f.coachId,
                packageId: f.packageId || null, tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
              });
              mutate((d) => {
                d.students.push(s);
                if (f.pack) applyWelcomePack(d, f.pack, s.id);
                d.automations.filter((a) => a.active && a.trigger === 'novo_aluno').forEach((a) => runAutomation(d, a, s.id));
              });
              toast('Aluno adicionado');
              onClose();
              navigate('/alunos/' + s.id);
            }}
          >
            Adicionar aluno
          </button>
        </>
      }
    >
      {full && <div className="sub small">Chegaste ao limite de {studentLimit(db)} alunos do teu plano. <a href="#/subscricao">Mudar de plano</a> para adicionar mais.</div>}
      <Field label="Nome completo">
        <input className="input" value={f.name} onChange={set('name')} autoFocus />
      </Field>
      <div className="grid g2">
        <Field label="Email"><input className="input" type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Telemóvel"><input className="input" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Sexo">
          <select className="select" value={f.gender} onChange={set('gender')}>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
          </select>
        </Field>
        <Field label="Data de nascimento"><input className="input" type="date" value={f.birthday} onChange={set('birthday')} /></Field>
        <Field label="Objetivo">
          <select className="select" value={f.goal} onChange={set('goal')}>
            {Object.entries(GOAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Treinador responsável">
          <select className="select" value={f.coachId} onChange={set('coachId')} disabled={!isLeader(db)}>
            {db.staff.filter((s) => s.role !== 'nutritionist').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Plano de coaching">
          <select className="select" value={f.packageId} onChange={set('packageId')}>
            <option value="">Sem plano</option>
            {db.packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Pacote de boas-vindas">
          <select className="select" value={f.pack} onChange={set('pack')}>
            <option value="">Nenhum</option>
            {db.welcomePacks.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Etiquetas" hint="Separadas por vírgulas, por exemplo: Online, Iniciante">
        <input className="input" value={f.tags} onChange={set('tags')} />
      </Field>
    </Modal>
  );
}

type SortKey = 'name' | 'adh' | 'last' | 'sub' | 'pend';

function StudentList() {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'ativo' | 'pausado' | 'arquivado' | 'todos'>('ativo');
  const [tag, setTag] = useState('');
  const [coach, setCoach] = useState('');
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'name', dir: 1 });
  const all = visibleStudents(db, true);
  const tags = Array.from(new Set(all.flatMap((s) => s.tags))).sort();
  const rows = all
    .filter((s) => (status === 'todos' || s.status === status) && (!tag || s.tags.includes(tag)) && (!coach || s.coachId === coach) && (!q || matches(s.name + ' ' + s.email, q)))
    .map((s) => ({ s, adh: adherence(s), pend: pendingAssessments(db, s.id).length }))
    .sort((a, b) => {
      const k = sort.k;
      const v =
        k === 'name' ? a.s.name.localeCompare(b.s.name)
        : k === 'adh' ? a.adh - b.adh
        : k === 'last' ? a.s.lastActivity.localeCompare(b.s.lastActivity)
        : k === 'sub' ? a.s.subscriptionEnd.localeCompare(b.s.subscriptionEnd)
        : a.pend - b.pend;
      return v * sort.dir;
    });
  const th = (k: SortKey, label: string) => (
    <th className="th-sort" onClick={() => setSort({ k, dir: sort.k === k ? (-sort.dir as 1 | -1) : 1 })} aria-sort={sort.k === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      {label} {sort.k === k && <ArrowDownUp size={12} />}
    </th>
  );
  const exportCsv = () => {
    const head = ['Nome', 'Email', 'Telemóvel', 'Estado', 'Objetivo', 'Treinador', 'Subscrição até', 'Pagamento', 'Adesão 14d'];
    const lines = rows.map(({ s, adh }) => [s.name, s.email, s.phone, s.status, GOAL_LABEL[s.goal], staffById(db, s.coachId)?.name ?? '', s.subscriptionEnd, s.paymentStatus, Math.round(adh * 100) + '%'].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'));
    downloadText('alunos.csv', '﻿' + [head.join(';'), ...lines].join('\n'), 'text/csv');
  };
  return (
    <div className="panel">
      <div className="panel-head" style={{ flexWrap: 'wrap' }}>
        <div className="search" style={{ width: 260 }}>
          <Search size={16} />
          <input className="input sm" placeholder="Procurar aluno" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Procurar aluno" />
        </div>
        <select className="select sm" style={{ width: 130 }} value={status} onChange={(e) => setStatus(e.target.value as any)} aria-label="Estado">
          <option value="ativo">Ativos</option>
          <option value="pausado">Pausados</option>
          <option value="arquivado">Arquivados</option>
          <option value="todos">Todos</option>
        </select>
        <select className="select sm" style={{ width: 150 }} value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Etiqueta">
          <option value="">Todas as etiquetas</option>
          {tags.map((t) => <option key={t}>{t}</option>)}
        </select>
        {isLeader(db) && (
          <select className="select sm" style={{ width: 160 }} value={coach} onChange={(e) => setCoach(e.target.value)} aria-label="Treinador">
            <option value="">Todos os treinadores</option>
            {db.staff.filter((s) => s.role !== 'nutritionist').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <div className="actions">
          <span className="faint">{rows.length} alunos</span>
          <button className="btn btn-sm" onClick={exportCsv}><Download size={15} /> Exportar CSV</button>
        </div>
      </div>
      {rows.length === 0 ? (
        <Empty icon={<Users size={28} />} title="Nenhum aluno encontrado" text="Muda os filtros ou adiciona um aluno novo." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {th('name', 'Aluno')}
                <th>Objetivo</th>
                <th className="hide-sm">Treinador</th>
                {th('adh', 'Adesão 14 dias')}
                {th('last', 'Última atividade')}
                {th('sub', 'Subscrição')}
                {th('pend', 'Por rever')}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, adh, pend }) => (
                <tr key={s.id} className="click" onClick={() => navigate('/alunos/' + s.id)}>
                  <td>
                    <div className="row">
                      <Avatar name={s.name} size={30} />
                      <div>
                        <div className="strong">{s.name}</div>
                        <div className="row-wrap" style={{ gap: 4 }}>
                          {s.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                          {s.status !== 'ativo' && <span className="badge">{s.status}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{GOAL_LABEL[s.goal]}</td>
                  <td className="hide-sm">{staffById(db, s.coachId)?.name}</td>
                  <td>
                    <div className="row">
                      <span className="num" style={{ width: 38 }}>{Math.round(adh * 100)}%</span>
                      <Sparkline values={s.measurements.map((m) => m.weight)} color={adh < 0.4 ? '#D63A2F' : '#2E9E5B'} w={70} h={22} />
                    </div>
                  </td>
                  <td>
                    <span style={{ color: diffDays(today(), s.lastActivity) >= 7 ? 'var(--red)' : undefined }}>{relative(s.lastActivity)}</span>
                  </td>
                  <td>
                    <div>{fmtDate(s.subscriptionEnd, true)}</div>
                    {s.paymentStatus === 'em_atraso' && <span className="badge red">Pagamento em atraso</span>}
                  </td>
                  <td>{pend ? <span className="badge yellow">{pend}</span> : <span className="faint">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RetentionView() {
  const { db } = useStore();
  const [msgFor, setMsgFor] = useState<Student | null>(null);
  const [level, setLevel] = useState<'todos' | 'alto' | 'medio' | 'baixo'>('todos');
  const rows = visibleStudents(db)
    .filter((s) => s.status === 'ativo')
    .map((s) => ({ s, r: retentionRisk(db, s) }))
    .sort((a, b) => b.r.score - a.r.score);
  const n = (l: string) => rows.filter((x) => x.r.level === l).length;
  const color = { alto: 'var(--red)', medio: 'var(--yellow)', baixo: 'var(--green)' };
  return (
    <>
      <div className="grid g3 mb">
        {(['alto', 'medio', 'baixo'] as const).map((l) => (
          <button key={l} className="panel panel-pad" style={{ textAlign: 'left', cursor: 'pointer', outline: level === l ? '2px solid var(--iron)' : undefined }} onClick={() => setLevel(level === l ? 'todos' : l)}>
            <div className="plate" style={{ ['--plate' as any]: color[l] }}>
              <div className="faint">Risco {l === 'medio' ? 'médio' : l}</div>
              <div className="big-num mt-sm">{n(l)}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="panel">
        <div className="panel-head">
          <h3>Quem está em risco de sair</h3>
          <span className="faint">Pontuação feita com atividade, adesão, subscrição, pagamentos e avaliações por responder.</span>
        </div>
        <div className="list">
          {rows.filter((x) => level === 'todos' || x.r.level === level).map(({ s, r }) => (
            <div key={s.id} className="list-row">
              <span className="big-num" style={{ width: 48, color: color[r.level] }}>{r.score}</span>
              <Avatar name={s.name} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <a href={'#/alunos/' + s.id} className="strong" style={{ color: 'var(--ink)' }}>{s.name}</a>
                <div className="why">{r.reasons.length ? r.reasons.map((x) => <span key={x}>{x}</span>) : <span>Sem sinais de risco</span>}</div>
              </div>
              {r.level !== 'baixo' && (
                <button className="btn btn-sm" onClick={() => setMsgFor(s)}>
                  <MessageSquare size={15} /> Contactar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {msgFor && <SendMessageModal studentId={msgFor.id} initial={`Olá ${msgFor.name.split(' ')[0]}! Queria saber como estás e se o plano está a encaixar na tua rotina. Podemos ajustar o que for preciso.`} onClose={() => setMsgFor(null)} />}
    </>
  );
}

interface TRow {
  s: Student;
  before: any;
  after: any;
  vb: number;
  va: number;
  change: number;
  pct: number;
  days: number;
}

function TransformationsView() {
  const { db } = useStore();
  const [metric, setMetric] = useState<MetricKey>('weight');
  const meta = METRICS.find((m) => m.key === metric)!;
  const [dir, setDir] = useState<'down' | 'up'>(meta.goodWhen);
  const [by, setBy] = useState<'pct' | 'abs'>('pct');
  const [period, setPeriod] = useState('6');
  const [custom, setCustom] = useState('');
  const [gender, setGender] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [tag, setTag] = useState('');
  const [coach, setCoach] = useState('');
  const [onlyPub, setOnlyPub] = useState(false);
  const [open, setOpen] = useState<TRow | null>(null);
  const students = visibleStudents(db);
  const tags = Array.from(new Set(students.flatMap((s) => s.tags))).sort();

  const rows: TRow[] = useMemo(() => {
    const from = periodStart(period, custom);
    return students
      .filter((s) => (!gender || s.gender === gender) && (!tag || s.tags.includes(tag)) && (!coach || s.coachId === coach))
      .filter((s) => (!ageMin || age(s.birthday) >= +ageMin) && (!ageMax || age(s.birthday) <= +ageMax))
      .map((s) => {
        const ms = s.measurements.filter((m) => m.date >= from);
        if (ms.length < 2) return null;
        const before = ms[0];
        const after = ms[ms.length - 1];
        if (onlyPub && !(before.photos && after.photos)) return null;
        const vb = metricValue(s, before, metric);
        const va = metricValue(s, after, metric);
        const change = va - vb;
        return { s, before, after, vb, va, change, pct: (change / vb) * 100, days: Math.max(1, diffDays(after.date, before.date)) };
      })
      .filter((x): x is TRow => !!x && (dir === 'down' ? x.change < 0 : x.change > 0))
      .sort((a, b) => (by === 'pct' ? Math.abs(b.pct) - Math.abs(a.pct) : Math.abs(b.change) - Math.abs(a.change)));
  }, [db, metric, dir, by, period, custom, gender, ageMin, ageMax, tag, coach, onlyPub]);

  return (
    <div className="split-l">
      <aside className="panel panel-pad stack">
        <Field label="Medida">
          <select className="select" value={metric} onChange={(e) => { const k = e.target.value as MetricKey; setMetric(k); setDir(METRICS.find((m) => m.key === k)!.goodWhen); }}>
            {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Variação">
          <Seg options={[{ id: 'down', label: 'Diminuiu' }, { id: 'up', label: 'Aumentou' }]} value={dir} onChange={setDir} />
        </Field>
        <Field label="Ordenar por">
          <Seg options={[{ id: 'pct', label: '% do inicial' }, { id: 'abs', label: 'Variação absoluta' }]} value={by} onChange={setBy} />
        </Field>
        <Field label="Período">
          <div className="row-wrap">
            {[['3', '3 meses'], ['6', '6 meses'], ['12', '12 meses'], ['sempre', 'Desde sempre'], ['custom', 'Personalizado']].map(([k, l]) => (
              <button key={k} className={`chip ${period === k ? 'on' : ''}`} onClick={() => setPeriod(k)}>{l}</button>
            ))}
          </div>
          {period === 'custom' && <input className="input mt-sm" type="date" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Desde" />}
        </Field>
        <div className="grid g2">
          <Field label="Sexo">
            <select className="select" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">Todos</option>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </select>
          </Field>
          <Field label="Etiqueta">
            <select className="select" value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="">Todas</option>
              {tags.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Idade mín."><input className="input" type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} /></Field>
          <Field label="Idade máx."><input className="input" type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} /></Field>
        </div>
        {isLeader(db) && (
          <Field label="Treinador">
            <select className="select" value={coach} onChange={(e) => setCoach(e.target.value)}>
              <option value="">Toda a equipa</option>
              {db.staff.filter((s) => s.role !== 'nutritionist').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}
        <label className="row">
          <Toggle on={onlyPub} onChange={setOnlyPub} label="Apenas publicáveis" />
          <span>Apenas publicáveis</span>
        </label>
        <p className="faint">Publicáveis são alunos com fotos de progresso no início e no fim do período.</p>
      </aside>
      <div className="panel">
        <div className="panel-head">
          <h3>{rows.length} transformações</h3>
          <span className="faint">{meta.label}, {dir === 'down' ? 'a descer' : 'a subir'}</span>
        </div>
        {rows.length === 0 ? (
          <Empty title="Sem resultados com estes filtros" text="Alarga o período ou retira filtros." />
        ) : (
          <div className="list">
            {rows.map((r, i) => (
              <div key={r.s.id} className="list-row click" onClick={() => setOpen(r)} style={{ alignItems: 'center' }}>
                <span className="rank">{i + 1}</span>
                <div className="ba" style={{ width: 120, flex: 'none' }}>
                  <ProgressPhoto seed={r.s.id + 'a'} label="Antes" />
                  <ProgressPhoto seed={r.s.id + 'a'} slim={-r.pct / 60} label="Depois" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="strong">{r.s.name}</div>
                  <div className="faint">{fmtDate(r.before.date, true)} a {fmtDate(r.after.date, true)}, {Math.round(r.days / 7)} semanas</div>
                  {!(r.before.photos && r.after.photos) && <span className="badge mt-sm">Faltam fotos</span>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="big-num" style={{ color: dir === meta.goodWhen ? 'var(--green)' : 'var(--red)' }}>{signed(r.change, 1, meta.unit ? ' ' + meta.unit : '')}</div>
                  <div className="faint num">
                    {signed(r.pct, 1, '%')}, {signed((r.change / r.days) * 7, 2, meta.unit ? ' ' + meta.unit : '')} por semana
                  </div>
                  <div className="faint num">{num(r.vb)} → {num(r.va)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {open && <TransformationModal row={open} metricLabel={meta.label} onClose={() => setOpen(null)} />}
    </div>
  );
}

function TransformationModal({ row, onClose, metricLabel }: { row: TRow; onClose: () => void; metricLabel: string }) {
  const toast = useToast();
  const poses = ['frente', 'costas', 'lado'] as const;
  const download = () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560"><rect width="800" height="560" fill="#EEF0F2"/><text x="40" y="60" font-family="Arial" font-size="30" font-weight="bold" fill="#1E2A38">${row.s.name}</text><text x="40" y="92" font-family="Arial" font-size="18" fill="#4A5565">${metricLabel}: ${num(row.vb)} para ${num(row.va)} (${signed(row.pct, 1, '%')})</text><rect x="40" y="120" width="340" height="400" rx="12" fill="#C9D1DB"/><rect x="420" y="120" width="340" height="400" rx="12" fill="#C9D1DB"/><text x="60" y="500" font-family="Arial" font-size="20" fill="#1E2A38">Antes, ${fmtDate(row.before.date, true)}</text><text x="440" y="500" font-family="Arial" font-size="20" fill="#1E2A38">Depois, ${fmtDate(row.after.date, true)}</text></svg>`;
    downloadText(`transformacao-${row.s.name.replace(/\s+/g, '-').toLowerCase()}.svg`, svg, 'image/svg+xml');
    toast('Antes e depois descarregado');
  };
  return (
    <Modal title={`Transformação de ${row.s.name}`} onClose={onClose} size="wide" footer={<><button className="btn" onClick={onClose}>Fechar</button><button className="btn btn-primary" onClick={download}><Download size={15} /> Descarregar antes e depois</button></>}>
      <div className="grid g3">
        {poses.map((p) => (
          <div key={p}>
            <div className="faint mb" style={{ marginBottom: 6, textTransform: 'capitalize' }}>{p}</div>
            <div className="ba">
              <ProgressPhoto seed={row.s.id + p} pose={p} label={fmtDate(row.before.date)} />
              <ProgressPhoto seed={row.s.id + p} pose={p} slim={-row.pct / 60} label={fmtDate(row.after.date)} />
            </div>
          </div>
        ))}
      </div>
      <table className="table">
        <thead><tr><th>Medida</th><th>Antes</th><th>Depois</th><th>Variação</th></tr></thead>
        <tbody>
          {METRICS.map((m) => {
            const a = metricValue(row.s, row.before, m.key);
            const b = metricValue(row.s, row.after, m.key);
            return (
              <tr key={m.key}>
                <td>{m.label}</td>
                <td className="num">{num(a)} {m.unit}</td>
                <td className="num">{num(b)} {m.unit}</td>
                <td className="num" style={{ color: (b - a < 0) === (m.goodWhen === 'down') ? 'var(--green)' : 'var(--red)' }}>{signed(b - a, 1)} {m.unit}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Modal>
  );
}
