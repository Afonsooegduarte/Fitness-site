import { useMemo, useState, type ReactNode } from 'react';
import {
  Sun, Sparkles, Users, MessagesSquare, ClipboardCheck, CalendarDays, Dumbbell, Apple, Pill, ListChecks, GraduationCap,
  Archive, Gift, Workflow, UsersRound, MessageCircleHeart, BadgeEuro, Smartphone, Plug, HandCoins, Settings, LifeBuoy,
  CreditCard, Bell, Search, Menu, ChefHat, ClipboardList, Info, Building2, Flame, Moon, SunMedium,
} from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useStore } from '../store/store';
import { navigate, type Route } from '../lib/router';
import { activeCount, currentUser, pendingAssessments, studentLimit, visibleChats, visibleStudents, ROLE_LABEL } from '../lib/domain';
import { computeInsights } from '../lib/copilot';
import { fmtDateTime, matches } from '../lib/utils';
import { Avatar, Popover, Seg } from './ui';

export const NAV: { title: string; items: { to: string; label: string; icon: any; count?: (db: any) => number }[] }[] = [
  {
    title: 'Trabalho',
    items: [
      { to: '/', label: 'Hoje', icon: Sun },
      { to: '/copilot', label: 'Copilot', icon: Sparkles, count: (db) => (db.settings.copilotEnabled ? computeInsights(db).length : 0) },
      { to: '/alunos', label: 'Alunos', icon: Users },
      { to: '/mensagens', label: 'Mensagens', icon: MessagesSquare, count: (db) => visibleChats(db).filter((c) => c.unread).length },
      { to: '/avaliacoes', label: 'Avaliações', icon: ClipboardCheck, count: (db) => pendingAssessments(db).filter((a) => visibleStudents(db).some((s) => s.id === a.studentId)).length },
      { to: '/calendario', label: 'Calendário', icon: CalendarDays },
      { to: '/streak', label: 'Streak', icon: Flame },
    ],
  },
  {
    title: 'Biblioteca',
    items: [
      { to: '/treinos', label: 'Treinos', icon: Dumbbell },
      { to: '/nutricao', label: 'Nutrição', icon: Apple, count: (db) => db.recipeRequests.filter((r: any) => r.status === 'pendente').length },
      { to: '/ginasios', label: 'Ginásios', icon: Building2, count: (db) => db.gymRequests.filter((r: any) => r.status === 'pendente').length },
      { to: '/suplementacao', label: 'Suplementação', icon: Pill },
      { to: '/questionarios', label: 'Questionários', icon: ListChecks },
      { to: '/cursos', label: 'Cursos', icon: GraduationCap },
      { to: '/cofre', label: 'Cofre', icon: Archive },
    ],
  },
  {
    title: 'Automatizar',
    items: [
      { to: '/boas-vindas', label: 'Pacotes de boas-vindas', icon: Gift },
      { to: '/automacoes', label: 'Automações', icon: Workflow },
    ],
  },
  {
    title: 'Equipa',
    items: [
      { to: '/equipa', label: 'Staff', icon: UsersRound },
      { to: '/comunidades', label: 'Comunidades', icon: MessageCircleHeart },
    ],
  },
  {
    title: 'Negócio',
    items: [
      { to: '/planos', label: 'Os meus planos', icon: BadgeEuro },
      { to: '/app', label: 'A minha app', icon: Smartphone },
      { to: '/integracoes', label: 'Integrações', icon: Plug },
      { to: '/indicacoes', label: 'Indicações', icon: HandCoins },
    ],
  },
];

const EXTRA_PAGES = [
  { to: '/subscricao', label: 'Subscrição', icon: CreditCard },
  { to: '/definicoes', label: 'Definições', icon: Settings },
  { to: '/suporte', label: 'Suporte', icon: LifeBuoy },
  { to: '/aluno', label: 'App do aluno', icon: Smartphone },
];

export function ThemeButton({ size = 18, light }: { size?: number; light?: boolean }) {
  const [theme, toggle] = useTheme();
  const label = theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro';
  return (
    <button className="icon-btn" onClick={toggle} aria-label={label} title={label} style={light ? { color: '#fff' } : undefined}>
      {theme === 'dark' ? <SunMedium size={size} /> : <Moon size={size} />}
    </button>
  );
}

const NOTIF_ICON ={ receita: ChefHat, avaliacao: ClipboardList, mensagem: MessagesSquare, sistema: Info, automacao: Workflow, ginasio: Building2 } as const;

export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const { db, mutate, saved } = useStore();
  const [open, setOpen] = useState(false);
  const base = '/' + (route.parts[0] ?? '');
  const me = currentUser(db);
  const used = activeCount(db);
  const limit = studentLimit(db);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div className="app">
      <nav className={`sidebar ${open ? 'open' : ''}`} aria-label="Navegação principal">
        <div className="brand">
          <span className="brand-mark">
            <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden>
              <path d="M3 17h6l3-8 6 15 3-7h8" stroke="#F2B705" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <div className="brand-name">Pulso</div>
            <div className="brand-sub">{db.settings.businessName}</div>
          </div>
        </div>
        {NAV.map((g) => (
          <div key={g.title} className="nav-group">
            <div className="nav-title">{g.title}</div>
            {g.items.map((it) => {
              const active = it.to === '/' ? route.path === '/' : base === it.to;
              const n = it.count?.(db) ?? 0;
              return (
                <button key={it.to} className={`nav-item ${active ? 'active' : ''}`} onClick={() => go(it.to)} aria-current={active ? 'page' : undefined}>
                  <it.icon size={17} />
                  {it.label}
                  {n > 0 && <span className="nav-count">{n}</span>}
                </button>
              );
            })}
          </div>
        ))}
        <div className="sidebar-foot">
          <div className="row">
            <span>Alunos ativos</span>
            <span className="spacer" />
            <span className="num" style={{ color: '#fff', fontWeight: 600 }}>
              {used} de {limit}
            </span>
          </div>
          <div className="usage-bar">
            <span style={{ width: `${Math.min(100, (used / limit) * 100)}%`, background: used >= limit ? 'var(--red)' : undefined }} />
          </div>
          {EXTRA_PAGES.map((it) => (
            <button key={it.to} className={`nav-item ${base === it.to ? 'active' : ''}`} onClick={() => go(it.to)}>
              <it.icon size={17} />
              {it.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="content" onClick={() => open && setOpen(false)}>
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={(e) => (e.stopPropagation(), setOpen(true))} aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <GlobalSearch />
          <span className="spacer" />
          <label className="row small hide-sm" title="Mostra a plataforma como a vê cada membro da equipa">
            <span className="muted">Ver como</span>
            <select className="select sm" style={{ width: 170 }} value={db.currentUserId} onChange={(e) => mutate((d) => void (d.currentUserId = e.target.value))}>
              {db.staff.filter((s) => s.status === 'ativo').map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <ThemeButton />
          <Notifications />
          <div className="row hide-sm" style={{ gap: 8 }}>
            <Avatar name={me.name} size={32} color={me.color} />
            <div style={{ lineHeight: 1.15 }}>
              <div className="small strong">{me.name}</div>
              <div className="faint" style={{ fontSize: 12 }}>
                {ROLE_LABEL[me.role]}
              </div>
            </div>
          </div>
        </header>
        <main className="main">
          {!saved && (
            <div role="alert" style={{ background: '#FFF4E5', borderBottom: '1px solid #F0C27A', color: '#7A4B00', padding: '8px 16px', fontSize: 13 }}>
              O armazenamento do browser está cheio (normalmente por causa das fotos). As alterações ficam só até fechares esta aba. Em Definições podes exportar os dados ou repor os dados de exemplo.
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

function GlobalSearch() {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const pages = [...NAV.flatMap((g) => g.items), ...EXTRA_PAGES].filter((p) => matches(p.label, q)).map((p) => ({ to: p.to, label: p.label, kind: 'Página' }));
    const students = visibleStudents(db, true).filter((s) => matches(s.name, q) || matches(s.email, q)).map((s) => ({ to: '/alunos/' + s.id, label: s.name, kind: 'Aluno' }));
    const ex = db.exercises.filter((e) => matches(e.name, q)).slice(0, 3).map((e) => ({ to: '/treinos?tab=exercicios&q=' + encodeURIComponent(e.name), label: e.name, kind: 'Exercício' }));
    const fd = db.foods.filter((f) => matches(f.name, q)).slice(0, 3).map((f) => ({ to: '/nutricao?tab=alimentos&q=' + encodeURIComponent(f.name), label: f.name, kind: 'Alimento' }));
    return [...students.slice(0, 6), ...pages.slice(0, 4), ...ex, ...fd];
  }, [q, db]);
  return (
    <Popover
      open={open && results.length > 0}
      setOpen={setOpen}
      align="left"
      trigger={
        <div className="search" style={{ width: 'min(380px, 52vw)' }}>
          <Search size={16} />
          <input
            className="input"
            placeholder="Procurar alunos, páginas, exercícios"
            value={q}
            onChange={(e) => (setQ(e.target.value), setOpen(true))}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) {
                navigate(results[0].to);
                setQ('');
                setOpen(false);
              }
            }}
            aria-label="Procurar"
          />
        </div>
      }
    >
      <div style={{ width: 'min(380px, 80vw)', padding: '4px 0' }}>
        {results.map((r) => (
          <button
            key={r.kind + r.to + r.label}
            className="nav-item"
            style={{ color: 'var(--ink)', borderRadius: 0, padding: '9px 14px' }}
            onClick={() => {
              navigate(r.to);
              setQ('');
              setOpen(false);
            }}
          >
            <span className="ellipsis">{r.label}</span>
            <span className="spacer" />
            <span className="faint">{r.kind}</span>
          </button>
        ))}
      </div>
    </Popover>
  );
}

function Notifications() {
  const { db, mutate } = useStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'todas' | 'receita'>('todas');
  const unread = db.notifications.filter((n) => !n.read).length;
  const list = [...db.notifications].filter((n) => tab === 'todas' || n.kind === 'receita').sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Popover
      open={open}
      setOpen={setOpen}
      trigger={
        <button className="icon-btn" onClick={() => setOpen(!open)} aria-label={`Notificações, ${unread} por ler`}>
          <Bell size={19} />
          {unread > 0 && <span className="dot-count">{unread}</span>}
        </button>
      }
    >
      <div style={{ width: 'min(380px, 90vw)' }}>
        <div className="row" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-2)' }}>
          <h4>Notificações</h4>
          <span className="spacer" />
          <button className="btn btn-ghost btn-sm" onClick={() => mutate((d) => d.notifications.forEach((n) => (n.read = true)))}>
            Marcar todas como lidas
          </button>
        </div>
        <div style={{ padding: '10px 14px 4px' }}>
          <Seg options={[{ id: 'todas', label: 'Todas' }, { id: 'receita', label: `Pedidos de receita (${db.notifications.filter((n) => n.kind === 'receita' && !n.read).length})` }]} value={tab} onChange={setTab} />
        </div>
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 0' }}>
          {list.length === 0 && <p className="faint" style={{ padding: '16px 14px' }}>Sem notificações.</p>}
          {list.map((n) => {
            const Icon = NOTIF_ICON[n.kind];
            return (
              <button
                key={n.id}
                className="nav-item"
                style={{ color: 'var(--ink)', borderRadius: 0, padding: '10px 14px', alignItems: 'flex-start', background: n.read ? undefined : 'var(--blue-soft)' }}
                onClick={() => {
                  mutate((d) => void (d.notifications.find((x) => x.id === n.id)!.read = true));
                  setOpen(false);
                  navigate(n.link);
                }}
              >
                <Icon size={17} style={{ marginTop: 2, flex: 'none' }} />
                <span style={{ whiteSpace: 'normal' }}>
                  <span className="small">{n.text}</span>
                  <span className="faint" style={{ display: 'block', fontSize: 12 }}>
                    {fmtDateTime(n.at)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Popover>
  );
}
