import { useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Copy, Check, Download, Upload, RotateCcw, LifeBuoy, Send } from 'lucide-react';
import { useStore } from '../store/store';
import type { CoachingPackage, DB, Ticket } from '../store/types';
import { activeCount, monthlyValue, PERIOD_LABEL, PLAN_LIMITS, PLAN_PRICES, studentLimit } from '../lib/domain';
import { copyText, downloadText, euro, fmtDate, today, uid } from '../lib/utils';
import { ConfirmButton, Empty, Field, Modal, PageHead, Tabs, Toggle, useToast } from '../components/ui';
import { StudentPhone } from '../student/StudentApp';
import type { Route } from '../lib/router';

/* ---------------- Os meus planos ---------------- */
export function PackagesPage() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [edit, setEdit] = useState<(CoachingPackage & { featuresText: string }) | null>(null);
  const count = (id: string) => db.students.filter((s) => s.packageId === id && s.status === 'ativo').length;
  const mrr = db.packages.reduce((a, p) => a + count(p.id) * monthlyValue(p.price, p.period), 0);
  return (
    <div className="page">
      <PageHead
        title="Os meus planos"
        lead="Os pacotes de acompanhamento que vendes aos teus alunos."
        actions={<button className="btn btn-primary" onClick={() => setEdit({ id: '', name: '', price: 49, period: 'mensal', features: [], active: true, featuresText: '' })}><Plus size={16} /> Novo plano</button>}
      />
      <div className="grid g3 mb">
        <div className="panel panel-pad"><div className="faint">Receita mensal recorrente</div><div className="big-num mt-sm">{euro(Math.round(mrr))}</div></div>
        <div className="panel panel-pad"><div className="faint">Alunos com plano ativo</div><div className="big-num mt-sm">{db.students.filter((s) => s.packageId && s.status === 'ativo').length}</div></div>
        <div className="panel panel-pad"><div className="faint">Pagamentos em atraso</div><div className="big-num mt-sm" style={{ color: 'var(--red)' }}>{db.students.filter((s) => s.paymentStatus === 'em_atraso').length}</div></div>
      </div>
      <div className="grid g3">
        {db.packages.map((p) => (
          <div key={p.id} className="panel panel-pad stack" style={{ opacity: p.active ? 1 : 0.6 }}>
            <div className="row"><h3>{p.name}</h3><span className="spacer" />{!p.active && <span className="badge">Inativo</span>}</div>
            <div><span className="big-num">{euro(p.price)}</span> <span className="faint">{PERIOD_LABEL[p.period]}</span></div>
            <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <div className="row"><span className="faint">{count(p.id)} alunos</span><span className="spacer" /><button className="btn btn-sm" onClick={() => setEdit({ ...structuredClone(p), featuresText: p.features.join('\n') })}><Pencil size={14} /> Editar</button></div>
          </div>
        ))}
      </div>
      {edit && (
        <Modal title={edit.id ? 'Editar plano' : 'Novo plano'} onClose={() => setEdit(null)} footer={<>
          {edit.id && <span style={{ marginRight: 'auto' }}><ConfirmButton label="Confirmar: apagar" onConfirm={() => { mutate((d) => { d.packages = d.packages.filter((x) => x.id !== edit.id); d.students.forEach((s) => s.packageId === edit.id && (s.packageId = null)); }); setEdit(null); toast('Plano apagado'); }}><Trash2 size={15} /> Apagar</ConfirmButton></span>}
          <button className="btn" onClick={() => setEdit(null)}>Cancelar</button>
          <button className="btn btn-primary" disabled={!edit.name.trim()} onClick={() => { const { featuresText, ...p } = edit; const rec = { ...p, features: featuresText.split('\n').map((x) => x.trim()).filter(Boolean) }; mutate((d) => { if (rec.id) d.packages[d.packages.findIndex((x) => x.id === rec.id)] = rec; else d.packages.push({ ...rec, id: uid('pk_') }); }); setEdit(null); toast('Plano guardado'); }}>Guardar plano</button>
        </>}>
          <Field label="Nome"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></Field>
          <div className="grid g2">
            <Field label="Preço (€)"><input className="input" type="number" min={0} value={edit.price} onChange={(e) => setEdit({ ...edit, price: +e.target.value })} /></Field>
            <Field label="Cobrança">
              <select className="select" value={edit.period} onChange={(e) => setEdit({ ...edit, period: e.target.value as any })}>
                {Object.entries(PERIOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <Field label="O que inclui (uma linha por item)"><textarea className="textarea" rows={4} value={edit.featuresText} onChange={(e) => setEdit({ ...edit, featuresText: e.target.value })} /></Field>
          <label className="row"><Toggle on={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Disponível para venda" /> Disponível para venda no link público</label>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- A minha app ---------------- */
export function MyAppPage() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [b, setB] = useState(structuredClone(db.branding));
  const preview: DB = { ...db, branding: b };
  const mods = { treino: 'Treino', nutricao: 'Nutrição', receitas: 'Receitas', checkin: 'Check-in', agenda: 'Agenda', chat: 'Chat' } as const;
  return (
    <div className="page">
      <PageHead title="A minha app" lead="A app que os teus alunos usam, com o teu nome e as tuas cores." actions={<button className="btn btn-primary" disabled={JSON.stringify(b) === JSON.stringify(db.branding)} onClick={() => { mutate((d) => void (d.branding = b)); toast('App atualizada'); }}>Guardar alterações</button>} />
      <div className="split" style={{ gridTemplateColumns: 'minmax(0,1fr) 400px' }}>
        <div className="stack">
          <section className="panel panel-pad stack">
            <h3>Identidade</h3>
            <div className="grid g2">
              <Field label="Nome da app"><input className="input" value={b.appName} onChange={(e) => setB({ ...b, appName: e.target.value })} /></Field>
              <Field label="Iniciais do logótipo"><input className="input" maxLength={3} value={b.logoText} onChange={(e) => setB({ ...b, logoText: e.target.value.toUpperCase() })} /></Field>
              <Field label="Cor principal"><div className="row"><input type="color" value={b.primary} onChange={(e) => setB({ ...b, primary: e.target.value })} aria-label="Cor principal" /><input className="input" value={b.primary} onChange={(e) => setB({ ...b, primary: e.target.value })} /></div></Field>
              <Field label="Cor de destaque"><div className="row"><input type="color" value={b.accent} onChange={(e) => setB({ ...b, accent: e.target.value })} aria-label="Cor de destaque" /><input className="input" value={b.accent} onChange={(e) => setB({ ...b, accent: e.target.value })} /></div></Field>
            </div>
            <Field label="Mensagem no ecrã inicial"><input className="input" value={b.welcome} onChange={(e) => setB({ ...b, welcome: e.target.value })} /></Field>
          </section>
          <section className="panel panel-pad stack">
            <h3>Separadores visíveis</h3>
            <div className="grid g3">
              {(Object.keys(mods) as (keyof typeof mods)[]).map((k) => (
                <label key={k} className="row"><Toggle on={b.modules[k]} onChange={(v) => setB({ ...b, modules: { ...b.modules, [k]: v } })} label={mods[k]} /> {mods[k]}</label>
              ))}
            </div>
          </section>
          <section className="panel panel-pad stack-sm">
            <h3>Publicar nas lojas</h3>
            <p className="muted small">Para publicar a app com o teu nome na App Store e no Google Play precisas de contas de programador próprias. Esta é uma etapa fora da plataforma.</p>
          </section>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <StudentPhone dbOverride={preview} studentId={db.students[0]?.id} readOnly />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Integrações ---------------- */
export function IntegrationsPage() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const cats = Array.from(new Set(db.integrations.map((i) => i.category)));
  return (
    <div className="page">
      <PageHead title="Integrações" lead="Liga a plataforma às ferramentas que já usas. Nesta versão a ligação é simulada: o estado fica guardado, mas não há troca real de dados." />
      {cats.map((c) => (
        <section key={c} className="mb">
          <h3 className="mb" style={{ marginBottom: 10 }}>{c}</h3>
          <div className="grid g3">
            {db.integrations.filter((i) => i.category === c).map((i) => (
              <div key={i.id} className="panel panel-pad row" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div className="row"><span className="strong">{i.name}</span>{i.connected && <span className="badge green"><Check size={12} /> Ligada</span>}</div>
                  <p className="faint mt-sm">{i.description}</p>
                </div>
                <button className={`btn btn-sm ${i.connected ? '' : 'btn-primary'}`} onClick={() => { mutate((d) => void (d.integrations.find((x) => x.id === i.id)!.connected = !i.connected)); toast(i.connected ? `${i.name} desligada` : `${i.name} ligada`); }}>
                  {i.connected ? 'Desligar' : 'Ligar'}
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------------- Indicações ---------------- */
export function ReferralPage() {
  const { db } = useStore();
  const toast = useToast();
  const link = `https://pulso.app/convite/${db.referral.code}`;
  const total = db.referral.entries.reduce((a, e) => a + e.earnings, 0);
  const active = db.referral.entries.filter((e) => e.status === 'ativo').length;
  return (
    <div className="page">
      <PageHead title="Indicações" lead="Convida outros treinadores. Por cada um que fique com uma subscrição paga recebes 15 € por mês enquanto se mantiver." />
      <div className="grid g3 mb">
        <div className="panel panel-pad"><div className="faint">Ganhos acumulados</div><div className="big-num mt-sm">{euro(total)}</div></div>
        <div className="panel panel-pad"><div className="faint">Indicações ativas</div><div className="big-num mt-sm">{active}</div></div>
        <div className="panel panel-pad"><div className="faint">Por mês, agora</div><div className="big-num mt-sm">{euro(active * 15)}</div></div>
      </div>
      <section className="panel panel-pad stack mb">
        <h3>O teu link</h3>
        <div className="row">
          <input className="input" readOnly value={link} aria-label="Link de convite" />
          <button className="btn" onClick={async () => toast((await copyText(link)) ? 'Link copiado' : 'Não foi possível copiar')}><Copy size={15} /> Copiar</button>
        </div>
        <p className="faint">Código: <span className="strong">{db.referral.code}</span></p>
      </section>
      <section className="panel">
        <table className="table">
          <thead><tr><th>Treinador</th><th>Data</th><th>Estado</th><th>Ganhos</th></tr></thead>
          <tbody>{db.referral.entries.map((e) => <tr key={e.name}><td className="strong">{e.name}</td><td>{fmtDate(e.date, true)}</td><td>{e.status === 'ativo' ? <span className="badge green">Ativo</span> : <span className="badge yellow">Em período de teste</span>}</td><td className="num">{euro(e.earnings)}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}

/* ---------------- Subscrição da plataforma ---------------- */
export function SubscriptionPage() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const used = activeCount(db);
  const plans = [
    { id: 'base', name: 'Base', features: ['Até 25 alunos', 'Treino, nutrição e avaliações', 'Chat e calendário'] },
    { id: 'pro', name: 'Pro', features: ['Até 75 alunos', 'Tudo do Base', 'A minha app com a tua marca', 'Automações ilimitadas'] },
    { id: 'plus', name: 'Plus', features: ['Até 200 alunos', 'Tudo do Pro', 'Equipas com vários treinadores', 'Suporte prioritário'] },
  ] as const;
  return (
    <div className="page">
      <PageHead title="Subscrição" lead={`Estás no plano ${plans.find((p) => p.id === db.settings.platformPlan)!.name}, com ${used} de ${studentLimit(db)} alunos ativos.`} />
      <div className="panel panel-pad mb">
        <div className="row"><span className="faint">Utilização</span><span className="spacer" /><span className="num strong">{used} de {studentLimit(db)}</span></div>
        <div className="macro-bar mt-sm" style={{ height: 10 }}><span style={{ width: `${Math.min(100, (used / studentLimit(db)) * 100)}%`, background: used >= studentLimit(db) ? 'var(--red)' : 'var(--blue)' }} /></div>
      </div>
      <div className="grid g3">
        {plans.map((p) => {
          const current = db.settings.platformPlan === p.id;
          return (
            <div key={p.id} className="panel panel-pad stack" style={{ outline: current ? '2px solid var(--blue)' : undefined }}>
              <div className="row"><h3>{p.name}</h3><span className="spacer" />{current && <span className="badge blue">Plano atual</span>}</div>
              <div><span className="big-num">{euro(PLAN_PRICES[p.id])}</span> <span className="faint">por mês</span></div>
              <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <button className={`btn ${current ? '' : 'btn-primary'}`} disabled={current || PLAN_LIMITS[p.id] < used} onClick={() => { mutate((d) => void (d.settings.platformPlan = p.id)); toast(`Plano alterado para ${p.name}`); }}>
                {current ? 'Plano atual' : PLAN_LIMITS[p.id] < used ? 'Tens alunos a mais' : `Mudar para ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>
      <p className="faint mt">A mudança de plano nesta versão é simulada e não faz cobranças.</p>
    </div>
  );
}

/* ---------------- Definições ---------------- */
export function SettingsPage() {
  const { db, mutate, replace, reset } = useStore();
  const toast = useToast();
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const [tab, setTab] = useState<'perfil' | 'negocio' | 'preferencias' | 'dados'>((params.get('tab') as any) || 'perfil');
  const [s, setS] = useState(structuredClone(db.settings));
  const file = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof s) => (e: any) => setS({ ...s, [k]: e.target.value });
  const save = () => { mutate((d) => void (d.settings = { ...d.settings, ...s })); toast('Definições guardadas'); };
  return (
    <div className="page">
      <PageHead title="Definições" />
      <Tabs tabs={[{ id: 'perfil', label: 'Perfil' }, { id: 'negocio', label: 'Negócio' }, { id: 'preferencias', label: 'Preferências' }, { id: 'dados', label: 'Dados' }]} value={tab} onChange={setTab} />
      {tab === 'perfil' && (
        <section className="panel panel-pad stack" style={{ maxWidth: 720 }}>
          <div className="grid g2">
            <Field label="Nome"><input className="input" value={s.coachName} onChange={set('coachName')} /></Field>
            <Field label="Email"><input className="input" value={s.email} onChange={set('email')} /></Field>
            <Field label="Telemóvel"><input className="input" value={s.phone} onChange={set('phone')} /></Field>
          </div>
          <Field label="Apresentação" hint="Aparece no teu link público."><textarea className="textarea" value={s.bio} onChange={set('bio')} /></Field>
          <div><button className="btn btn-primary" onClick={save}>Guardar definições</button></div>
        </section>
      )}
      {tab === 'negocio' && (
        <section className="panel panel-pad stack" style={{ maxWidth: 720 }}>
          <div className="grid g2">
            <Field label="Nome do negócio"><input className="input" value={s.businessName} onChange={set('businessName')} /></Field>
            <Field label="Endereço do link público" hint={`pulso.app/${s.publicSlug}`}><input className="input" value={s.publicSlug} onChange={(e) => setS({ ...s, publicSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} /></Field>
          </div>
          <div><button className="btn btn-primary" onClick={save}>Guardar definições</button></div>
        </section>
      )}
      {tab === 'preferencias' && (
        <section className="panel" style={{ maxWidth: 720 }}>
          <div className="list">
            {([
              ['copilotEnabled', 'Copilot', 'Propostas automáticas sobre os teus alunos, com o motivo de cada uma.'],
              ['notifyEmail', 'Notificações por email', 'Resumo diário de avaliações, pedidos e mensagens.'],
              ['notifyPush', 'Notificações push', 'Alertas no telemóvel para pedidos de receita e mensagens.'],
            ] as const).map(([k, l, d]) => (
              <div key={k} className="list-row">
                <div style={{ flex: 1 }}><div className="strong">{l}</div><div className="faint">{d}</div></div>
                <Toggle on={db.settings[k]} onChange={(v) => { mutate((x) => void (x.settings[k] = v)); setS({ ...s, [k]: v }); }} label={l} />
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === 'dados' && (
        <div className="grid g3">
          <section className="panel panel-pad stack">
            <h3>Exportar</h3>
            <p className="faint">Descarrega todos os dados num ficheiro JSON, para cópia de segurança ou para migrar para um servidor.</p>
            <div><button className="btn" onClick={() => downloadText(`pulso-dados-${today()}.json`, JSON.stringify(db, null, 2))}><Download size={15} /> Exportar dados</button></div>
          </section>
          <section className="panel panel-pad stack">
            <h3>Importar</h3>
            <p className="faint">Substitui os dados atuais pelos de um ficheiro exportado antes.</p>
            <div>
              <button className="btn" onClick={() => file.current?.click()}><Upload size={15} /> Importar ficheiro</button>
              <input ref={file} type="file" accept="application/json" hidden onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const data = JSON.parse(await f.text());
                  if (!data.students || !data.staff) throw new Error();
                  replace(data);
                  toast('Dados importados');
                } catch {
                  toast('O ficheiro não é uma exportação válida');
                }
                e.target.value = '';
              }} />
            </div>
          </section>
          <section className="panel panel-pad stack">
            <h3>Repor dados de exemplo</h3>
            <p className="faint">Apaga tudo o que fizeste e volta aos dados fictícios iniciais. Não dá para desfazer.</p>
            <div><ConfirmButton className="btn btn-danger" label="Confirmar: repor" onConfirm={() => { reset(); toast('Dados de exemplo repostos'); }}><RotateCcw size={15} /> Repor dados</ConfirmButton></div>
          </section>
        </div>
      )}
    </div>
  );
}

/* ---------------- Suporte ---------------- */
export function SupportPage() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState<Ticket | null>(null);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ subject: '', message: '' });
  const [reply, setReply] = useState('');
  const openTickets = db.tickets.filter((t) => t.status === 'aberto');
  return (
    <div className="page">
      <PageHead title="Suporte" lead={openTickets.length ? `${openTickets.length} pedidos abertos.` : 'Tudo tratado por aqui. Precisas de algo? Fala connosco.'} actions={<button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Criar pedido de suporte</button>} />
      <div className="panel">
        {db.tickets.length === 0 ? <Empty icon={<LifeBuoy size={28} />} title="Sem pedidos" /> : (
          <div className="list">
            {[...db.tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((t) => (
              <div key={t.id} className="list-row click" onClick={() => setOpen(t)}>
                <div className="plate" style={{ ['--plate' as any]: t.status === 'aberto' ? 'var(--yellow)' : 'var(--green)', flex: 1 }}>
                  <div className="strong">{t.subject}</div>
                  <div className="faint">{fmtDate(t.createdAt, true)}, {t.replies.length} respostas</div>
                </div>
                {t.status === 'aberto' ? <span className="badge yellow">Aberto</span> : <span className="badge green">Resolvido</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {creating && (
        <Modal title="Criar pedido de suporte" onClose={() => setCreating(false)} footer={<><button className="btn" onClick={() => setCreating(false)}>Cancelar</button><button className="btn btn-primary" disabled={!f.subject.trim() || !f.message.trim()} onClick={() => { mutate((d) => void d.tickets.push({ id: uid('ti_'), subject: f.subject, message: f.message, status: 'aberto', createdAt: today(), replies: [{ from: 'suporte', text: 'Recebemos o teu pedido. Respondemos em menos de 24 horas úteis.', at: today() }] })); setF({ subject: '', message: '' }); setCreating(false); toast('Pedido enviado'); }}>Enviar pedido</button></>}>
          <Field label="Assunto"><input className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} autoFocus /></Field>
          <Field label="Descreve o que precisas"><textarea className="textarea" rows={5} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Field>
        </Modal>
      )}
      {open && (() => {
        const t = db.tickets.find((x) => x.id === open.id)!;
        return (
          <Modal title={t.subject} onClose={() => setOpen(null)} footer={<>
            {t.status === 'aberto' && <button className="btn" style={{ marginRight: 'auto' }} onClick={() => { mutate((d) => void (d.tickets.find((x) => x.id === t.id)!.status = 'resolvido')); toast('Pedido resolvido'); }}><Check size={15} /> Marcar como resolvido</button>}
            <button className="btn" onClick={() => setOpen(null)}>Fechar</button>
          </>}>
            <div className="bubble me" style={{ maxWidth: '90%' }}>{t.message}</div>
            {t.replies.map((r, i) => <div key={i} className={`bubble ${r.from === 'eu' ? 'me' : ''}`} style={{ maxWidth: '90%', alignSelf: r.from === 'eu' ? 'flex-end' : 'flex-start' }}>{r.text}<time>{fmtDate(r.at, true)}</time></div>)}
            {t.status === 'aberto' && (
              <form className="row" onSubmit={(e) => { e.preventDefault(); if (!reply.trim()) return; mutate((d) => void d.tickets.find((x) => x.id === t.id)!.replies.push({ from: 'eu', text: reply.trim(), at: today() })); setReply(''); }}>
                <input className="input" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Responder" aria-label="Resposta" />
                <button className="btn btn-primary"><Send size={15} /> Enviar</button>
              </form>
            )}
          </Modal>
        );
      })()}
    </div>
  );
}

export type { Route };
