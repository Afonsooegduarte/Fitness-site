import { useState } from 'react';
import { Plus, Pencil, Trash2, Play, Gift, Workflow } from 'lucide-react';
import { useStore } from '../store/store';
import type { Automation, AutomationAction, AutomationTrigger, WelcomePack } from '../store/types';
import { runAutomation } from '../lib/actions';
import { fmtDate, uid } from '../lib/utils';
import { ConfirmButton, Empty, Field, Modal, PageHead, Toggle, useToast } from '../components/ui';

export function WelcomePacksPage() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [edit, setEdit] = useState<WelcomePack | null>(null);
  const name = (list: { id: string; name?: string; title?: string }[], id: string | null) => {
    const x = list.find((y) => y.id === id);
    return x ? x.name ?? x.title : null;
  };
  return (
    <div className="page">
      <PageHead
        title="Pacotes de boas-vindas"
        lead="O que cada aluno novo recebe logo à entrada: mensagem, questionário, planos, suplementação e cursos. Escolhe o pacote ao adicionar o aluno."
        actions={<button className="btn btn-primary" onClick={() => setEdit({ id: '', name: '', message: '', questionnaireId: null, workoutPlanId: null, nutritionPlanId: null, protocolId: null, courseIds: [], active: true })}><Plus size={16} /> Novo pacote</button>}
      />
      {db.welcomePacks.length === 0 ? <div className="panel"><Empty icon={<Gift size={28} />} title="Ainda não tens pacotes" text="Cria um para poupares tempo em cada entrada." /></div> : (
        <div className="grid g2">
          {db.welcomePacks.map((p) => (
            <div key={p.id} className="panel panel-pad stack">
              <div className="row"><h3>{p.name}</h3><span className="spacer" />{p.active ? <span className="badge green">Ativo</span> : <span className="badge">Inativo</span>}</div>
              <p className="muted small">“{p.message}”</p>
              <div className="stack-sm small">
                <div className="row"><span className="faint" style={{ width: 120 }}>Questionário</span>{name(db.questionnaires, p.questionnaireId) ?? '—'}</div>
                <div className="row"><span className="faint" style={{ width: 120 }}>Treino</span>{name(db.workoutPlans, p.workoutPlanId) ?? '—'}</div>
                <div className="row"><span className="faint" style={{ width: 120 }}>Alimentação</span>{name(db.nutritionPlans, p.nutritionPlanId) ?? '—'}</div>
                <div className="row"><span className="faint" style={{ width: 120 }}>Suplementação</span>{name(db.protocols, p.protocolId) ?? '—'}</div>
                <div className="row"><span className="faint" style={{ width: 120 }}>Cursos</span>{p.courseIds.map((c) => name(db.courses, c)).join(', ') || '—'}</div>
              </div>
              <div><button className="btn btn-sm" onClick={() => setEdit(structuredClone(p))}><Pencil size={14} /> Editar</button></div>
            </div>
          ))}
        </div>
      )}
      {edit && (
        <Modal
          title={edit.id ? 'Editar pacote' : 'Novo pacote'}
          onClose={() => setEdit(null)}
          footer={<>
            {edit.id && <span style={{ marginRight: 'auto' }}><ConfirmButton label="Confirmar: apagar" onConfirm={() => { mutate((d) => void (d.welcomePacks = d.welcomePacks.filter((x) => x.id !== edit.id))); setEdit(null); toast('Pacote apagado'); }}><Trash2 size={15} /> Apagar</ConfirmButton></span>}
            <button className="btn" onClick={() => setEdit(null)}>Cancelar</button>
            <button className="btn btn-primary" disabled={!edit.name.trim()} onClick={() => { mutate((d) => { if (edit.id) d.welcomePacks[d.welcomePacks.findIndex((x) => x.id === edit.id)] = edit; else d.welcomePacks.push({ ...edit, id: uid('wp_') }); }); setEdit(null); toast('Pacote guardado'); }}>Guardar pacote</button>
          </>}
        >
          <div className="row"><Field label="Nome"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></Field><label className="row small" style={{ marginTop: 20 }}><Toggle on={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Ativo" /> Ativo</label></div>
          <Field label="Mensagem de boas-vindas" hint="Usa {nome} para o primeiro nome do aluno."><textarea className="textarea" value={edit.message} onChange={(e) => setEdit({ ...edit, message: e.target.value })} /></Field>
          <div className="grid g2">
            <Field label="Questionário inicial">
              <select className="select" value={edit.questionnaireId ?? ''} onChange={(e) => setEdit({ ...edit, questionnaireId: e.target.value || null })}>
                <option value="">Nenhum</option>
                {db.questionnaires.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            </Field>
            <Field label="Suplementação">
              <select className="select" value={edit.protocolId ?? ''} onChange={(e) => setEdit({ ...edit, protocolId: e.target.value || null })}>
                <option value="">Nenhuma</option>
                {db.protocols.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            </Field>
            <Field label="Modelo de treino">
              <select className="select" value={edit.workoutPlanId ?? ''} onChange={(e) => setEdit({ ...edit, workoutPlanId: e.target.value || null })}>
                <option value="">Nenhum</option>
                {db.workoutPlans.filter((p) => !p.studentId).map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            </Field>
            <Field label="Modelo alimentar">
              <select className="select" value={edit.nutritionPlanId ?? ''} onChange={(e) => setEdit({ ...edit, nutritionPlanId: e.target.value || null })}>
                <option value="">Nenhum</option>
                {db.nutritionPlans.filter((p) => !p.studentId).map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Cursos">
            <div className="stack-sm">
              {db.courses.map((c) => <label key={c.id} className="check"><input type="checkbox" checked={edit.courseIds.includes(c.id)} onChange={(e) => setEdit({ ...edit, courseIds: e.target.checked ? [...edit.courseIds, c.id] : edit.courseIds.filter((x) => x !== c.id) })} />{c.title}</label>)}
            </div>
          </Field>
        </Modal>
      )}
    </div>
  );
}

const TRIGGERS: Record<AutomationTrigger, { label: string; usesDays: boolean; daysLabel?: string }> = {
  novo_aluno: { label: 'Quando entra um aluno novo', usesDays: false },
  sem_atividade: { label: 'Quando um aluno fica sem atividade', usesDays: true, daysLabel: 'Dias sem atividade' },
  subscricao_expira: { label: 'Quando a subscrição está a terminar', usesDays: true, daysLabel: 'Dias antes do fim' },
  aniversario: { label: 'No dia de anos do aluno', usesDays: false },
  pagamento_atraso: { label: 'Quando há um pagamento em atraso', usesDays: false },
};
const ACTIONS: Record<AutomationAction, string> = { mensagem: 'Enviar mensagem ao aluno', tarefa: 'Criar tarefa para mim', notificacao: 'Notificar-me' };

export function AutomationsPage() {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [edit, setEdit] = useState<Automation | null>(null);
  return (
    <div className="page">
      <PageHead
        title="Automações"
        lead="Regras que trabalham por ti: um gatilho e uma ação. Variáveis disponíveis: {nome}, {dias}, {data}."
        actions={<button className="btn btn-primary" onClick={() => setEdit({ id: '', name: '', trigger: 'sem_atividade', days: 7, action: 'mensagem', text: '', active: true, runs: 0, lastRun: null })}><Plus size={16} /> Nova automação</button>}
      />
      <div className="panel">
        {db.automations.length === 0 ? <Empty icon={<Workflow size={28} />} title="Sem automações" /> : (
          <div className="list">
            {db.automations.map((a) => (
              <div key={a.id} className="list-row">
                <Toggle on={a.active} onChange={(v) => mutate((d) => void (d.automations.find((x) => x.id === a.id)!.active = v))} label="Ativa" />
                <div className="plate" style={{ ['--plate' as any]: a.active ? 'var(--green)' : 'var(--line)', flex: 1, minWidth: 0 }}>
                  <div className="strong">{a.name}</div>
                  <div className="faint">
                    {TRIGGERS[a.trigger].label}{TRIGGERS[a.trigger].usesDays ? ` (${a.days} dias)` : ''}, depois {ACTIONS[a.action].toLowerCase()}
                  </div>
                  <div className="faint ellipsis">“{a.text}”</div>
                </div>
                <div className="faint small hide-sm" style={{ textAlign: 'right' }}>
                  <div>{a.runs} execuções</div>
                  <div>{a.lastRun ? 'Última a ' + fmtDate(a.lastRun) : 'Nunca executada'}</div>
                </div>
                <button className="btn btn-sm" disabled={!a.active} onClick={() => { const n = runAutomation(structuredClone(db), a); mutate((d) => void runAutomation(d, a)); toast(n ? `Executada para ${n} alunos` : 'Nenhum aluno cumpre a condição agora'); }}>
                  <Play size={14} /> Executar agora
                </button>
                <button className="icon-btn sm" onClick={() => setEdit(structuredClone(a))} aria-label="Editar"><Pencil size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      {edit && (
        <Modal
          title={edit.id ? 'Editar automação' : 'Nova automação'}
          onClose={() => setEdit(null)}
          footer={<>
            {edit.id && <span style={{ marginRight: 'auto' }}><ConfirmButton label="Confirmar: apagar" onConfirm={() => { mutate((d) => void (d.automations = d.automations.filter((x) => x.id !== edit.id))); setEdit(null); toast('Automação apagada'); }}><Trash2 size={15} /> Apagar</ConfirmButton></span>}
            <button className="btn" onClick={() => setEdit(null)}>Cancelar</button>
            <button className="btn btn-primary" disabled={!edit.name.trim() || !edit.text.trim()} onClick={() => { mutate((d) => { if (edit.id) d.automations[d.automations.findIndex((x) => x.id === edit.id)] = edit; else d.automations.push({ ...edit, id: uid('au_') }); }); setEdit(null); toast('Automação guardada'); }}>Guardar automação</button>
          </>}
        >
          <Field label="Nome"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></Field>
          <Field label="Quando">
            <select className="select" value={edit.trigger} onChange={(e) => setEdit({ ...edit, trigger: e.target.value as AutomationTrigger })}>
              {Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          {TRIGGERS[edit.trigger].usesDays && <Field label={TRIGGERS[edit.trigger].daysLabel!}><input className="input" type="number" min={1} value={edit.days} onChange={(e) => setEdit({ ...edit, days: Math.max(1, +e.target.value) })} /></Field>}
          <Field label="Fazer">
            <select className="select" value={edit.action} onChange={(e) => setEdit({ ...edit, action: e.target.value as AutomationAction })}>
              {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label={edit.action === 'mensagem' ? 'Mensagem' : 'Texto'} hint="Variáveis: {nome}, {dias}, {data}"><textarea className="textarea" value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} /></Field>
        </Modal>
      )}
    </div>
  );
}
