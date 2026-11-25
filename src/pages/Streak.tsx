import { useState } from 'react';
import { Flame, Search, Bell } from 'lucide-react';
import { useStore } from '../store/store';
import { navigate } from '../lib/router';
import { visibleStudents } from '../lib/domain';
import { sendCoachMessage } from '../lib/actions';
import { gymOf } from '../lib/gyms';
import { streakOf, visitDays } from '../lib/streak';
import { matches, relative, today } from '../lib/utils';
import { Avatar, Empty, PageHead, Seg, Stat, useToast } from '../components/ui';
import { AdherenceStrip } from '../components/charts';

type Filter = 'todos' | 'hoje' | 'risco' | 'sem';

const FLAME = '#E8590C';

export const dias = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

export function StreakPage() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const rows = visibleStudents(db)
    .filter((s) => s.status === 'ativo')
    .map((s) => ({ s, st: streakOf(s), todayCount: s.gymCheckins.filter((c) => c.at.slice(0, 10) === today()).length }));
  const counts = {
    todos: rows.length,
    hoje: rows.filter((r) => r.st.today).length,
    risco: rows.filter((r) => r.st.atRisk).length,
    sem: rows.filter((r) => r.st.current === 0).length,
  };
  const list = rows
    .filter((r) => (filter === 'todos' ? true : filter === 'hoje' ? r.st.today : filter === 'risco' ? r.st.atRisk : r.st.current === 0))
    .filter((r) => !q || matches(r.s.name, q))
    .sort((a, b) => b.st.current - a.st.current || b.st.last30 - a.st.last30 || a.s.name.localeCompare(b.s.name));
  const top = [...rows].sort((a, b) => b.st.current - a.st.current)[0];
  const remind = (id: string, first: string, n: number) => {
    mutate((d) => sendCoachMessage(d, id, `${first}, estás com ${dias(n)} seguidos no ginásio 🔥 Não deixes cair hoje!`));
    toast(`Lembrete enviado a ${first}`);
  };
  return (
    <div className="page">
      <PageHead
        title="Streak"
        lead="Dias seguidos em que cada aluno marcou na app que foi ao ginásio. Ir duas ou três vezes no mesmo dia conta como um dia."
      />
      <div className="grid g4">
        <Stat label="Foram hoje" value={`${counts.hoje} de ${counts.todos}`} plate="var(--green)" />
        <Stat label="Ainda não foram hoje" value={counts.risco} hint="Têm streak e podem perdê-lo hoje" plate="var(--yellow)" />
        <Stat label="Sem streak" value={counts.sem} plate="var(--red)" />
        <Stat label="Maior streak atual" value={top && top.st.current ? <span style={{ color: FLAME }}>🔥 {dias(top.st.current)}</span> : '—'} hint={top && top.st.current ? top.s.name : undefined} plate={FLAME} />
      </div>
      <section className="panel mt">
        <div className="panel-head" style={{ flexWrap: 'wrap' }}>
          <div className="search" style={{ width: 240 }}><Search size={16} /><input className="input sm" placeholder="Procurar aluno" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Seg
            options={[
              { id: 'todos', label: `Todos (${counts.todos})` },
              { id: 'hoje', label: `Foram hoje (${counts.hoje})` },
              { id: 'risco', label: `Ainda não foram (${counts.risco})` },
              { id: 'sem', label: `Sem streak (${counts.sem})` },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>
        {list.length === 0 ? (
          <Empty icon={<Flame size={26} />} title="Ninguém nesta lista" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Aluno</th><th>Streak</th><th>Melhor</th><th>Últimos 30 dias</th><th>Última ida</th><th style={{ minWidth: 200 }}>Últimos 28 dias</th><th /></tr>
              </thead>
              <tbody>
                {list.map(({ s, st, todayCount }) => {
                  const gym = gymOf(db, s);
                  return (
                    <tr key={s.id} className="click" onClick={() => navigate('/alunos/' + s.id)}>
                      <td>
                        <span className="row">
                          <Avatar name={s.name} size={28} />
                          <span>
                            <span className="strong">{s.name}</span>
                            <span className="faint" style={{ display: 'block', fontSize: 12 }}>{gym?.name ?? 'Ginásio não definido'}</span>
                          </span>
                        </span>
                      </td>
                      <td className="num strong" style={{ color: st.current ? FLAME : undefined, whiteSpace: 'nowrap' }}>{st.current ? `🔥 ${dias(st.current)}` : <span className="faint">0</span>}</td>
                      <td className="num">{dias(st.best)}</td>
                      <td className="num">{st.last30} de 30</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {st.today ? (
                          <span className="badge green">Hoje{todayCount > 1 ? `, ${todayCount} idas (conta 1)` : ''}</span>
                        ) : st.lastDay ? relative(st.lastDay) : <span className="faint">Nunca</span>}
                      </td>
                      <td><AdherenceStrip dates={visitDays(s)} color={FLAME} label="Idas ao ginásio" /></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {st.atRisk && (
                          <button className="btn btn-sm" title="Envia uma mensagem a lembrar" onClick={() => remind(s.id, s.name.split(' ')[0], st.current)}>
                            <Bell size={14} /> Lembrar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
