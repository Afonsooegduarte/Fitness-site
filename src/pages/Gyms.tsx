import { useState } from 'react';
import { Plus, Pencil, Trash2, Building2, MapPin, Users, Dumbbell, Check, X } from 'lucide-react';
import { useStore } from '../store/store';
import type { Equipment, Gym, GymRequest } from '../store/types';
import type { Route } from '../lib/router';
import { navigate } from '../lib/router';
import { EQUIPMENT_CATEGORIES, exercisesAt, studentsAt } from '../lib/gyms';
import { fmtDateTime, matches, today, uid } from '../lib/utils';
import { ConfirmButton, Drawer, Empty, Field, Modal, PageHead, Tabs, useToast } from '../components/ui';

type Tab = 'ginasios' | 'equipamentos' | 'pedidos';

const emptyGym = (name = ''): Gym => ({ id: '', name, chain: '', address: '', equipmentIds: [], notes: '', updatedAt: today() });

export function GymsPage({ route }: { route: Route }) {
  const { db } = useStore();
  const [tab, setTab] = useState<Tab>((route.query.get('tab') as Tab) || 'ginasios');
  const [gym, setGym] = useState<{ gym: Gym; request?: GymRequest } | null>(null);
  const [eq, setEq] = useState<Equipment | null>(null);
  const pending = db.gymRequests.filter((r) => r.status === 'pendente');
  return (
    <div className="page">
      <PageHead
        title="Ginásios"
        lead="O equipamento que existe em cada ginásio. Quando o aluno diz onde treina, o plano mostra logo os exercícios que dá para fazer lá."
        actions={
          tab === 'equipamentos'
            ? <button className="btn btn-primary" onClick={() => setEq({ id: '', name: '', category: 'Máquinas', brand: '' })}><Plus size={16} /> Novo equipamento</button>
            : <button className="btn btn-primary" onClick={() => setGym({ gym: emptyGym() })}><Plus size={16} /> Novo ginásio</button>
        }
      />
      <Tabs
        tabs={[
          { id: 'ginasios', label: `Ginásios (${db.gyms.length})` },
          { id: 'equipamentos', label: `Equipamentos (${db.equipment.length})` },
          { id: 'pedidos', label: `Pedidos dos alunos${pending.length ? ` (${pending.length})` : ''}` },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'ginasios' && <GymList onEdit={(g) => setGym({ gym: structuredClone(g) })} onNew={() => setGym({ gym: emptyGym() })} />}
      {tab === 'equipamentos' && <EquipmentList onEdit={(e) => setEq(structuredClone(e))} />}
      {tab === 'pedidos' && <RequestList onCreate={(r) => setGym({ gym: emptyGym(r.name), request: r })} />}
      {gym && <GymEditor initial={gym.gym} request={gym.request} onClose={() => setGym(null)} />}
      {eq && <EquipmentEditor initial={eq} onClose={() => setEq(null)} />}
    </div>
  );
}

/* ---------- Lista de ginásios ---------- */

function GymList({ onEdit, onNew }: { onEdit: (g: Gym) => void; onNew: () => void }) {
  const { db } = useStore();
  const [q, setQ] = useState('');
  const list = db.gyms.filter((g) => !q || matches(g.name + ' ' + g.chain + ' ' + g.address, q)).sort((a, b) => a.name.localeCompare(b.name));
  if (db.gyms.length === 0)
    return <Empty icon={<Building2 size={26} />} title="Ainda não há ginásios" text="Cria o primeiro e marca o equipamento que tem." action={<button className="btn btn-sm" onClick={onNew}><Plus size={15} /> Novo ginásio</button>} />;
  return (
    <>
      <div className="row mb">
        <input className="input sm" style={{ width: 280 }} placeholder="Procurar por nome, cadeia ou localidade" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Procurar ginásio" />
      </div>
      <div className="grid g3">
        {list.map((g) => {
          const students = studentsAt(db, g.id);
          const doable = exercisesAt(db, g).length;
          return (
            <div key={g.id} className="panel panel-pad stack">
              <div>
                <div className="row">
                  <h3>{g.name}</h3>
                  <span className="spacer" />
                  {g.chain && <span className="badge">{g.chain}</span>}
                </div>
                {g.address && <div className="faint small row mt-sm" style={{ gap: 4 }}><MapPin size={13} /> {g.address}</div>}
                {g.notes && <p className="faint small mt-sm">{g.notes}</p>}
              </div>
              <div className="row-wrap small muted">
                <span><Dumbbell size={13} /> {g.equipmentIds.length} equipamentos</span>
                <span>{doable} de {db.exercises.length} exercícios possíveis</span>
                <span><Users size={13} /> {students.length} alunos</span>
              </div>
              <div><button className="btn btn-sm" onClick={() => onEdit(g)}><Pencil size={14} /> Editar equipamento</button></div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- Editor de ginásio ---------- */

function GymEditor({ initial, request, onClose }: { initial: Gym; request?: GymRequest; onClose: () => void }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [g, setG] = useState<Gym>(initial);
  const has = new Set(g.equipmentIds);
  const toggle = (id: string, on: boolean) => setG({ ...g, equipmentIds: on ? [...g.equipmentIds, id] : g.equipmentIds.filter((x) => x !== id) });
  const setCategory = (cat: string, on: boolean) => {
    const ids = db.equipment.filter((e) => e.category === cat).map((e) => e.id);
    setG({ ...g, equipmentIds: on ? Array.from(new Set([...g.equipmentIds, ...ids])) : g.equipmentIds.filter((x) => !ids.includes(x)) });
  };
  const doable = exercisesAt(db, g);
  const students = g.id ? studentsAt(db, g.id) : [];
  const others = db.gyms.filter((x) => x.id !== g.id);
  const save = () => {
    const id = g.id || uid('gy_');
    mutate((d) => {
      const next = { ...g, id, name: g.name.trim(), updatedAt: today() };
      const i = d.gyms.findIndex((x) => x.id === id);
      if (i >= 0) d.gyms[i] = next;
      else d.gyms.push(next);
      if (request) {
        const r = d.gymRequests.find((x) => x.id === request.id);
        if (r) r.status = 'adicionado';
        const st = d.students.find((x) => x.id === request.studentId);
        if (st) st.gymId = id;
      }
    });
    toast(request ? 'Ginásio criado e associado ao aluno' : 'Ginásio guardado');
    onClose();
  };
  return (
    <Drawer
      title={g.id ? g.name || 'Ginásio' : 'Novo ginásio'}
      onClose={onClose}
      footer={
        <>
          {g.id && (
            <span style={{ marginRight: 'auto' }}>
              <ConfirmButton
                label="Confirmar: apagar"
                onConfirm={() => {
                  mutate((d) => {
                    d.gyms = d.gyms.filter((x) => x.id !== g.id);
                    d.students.forEach((s) => s.gymId === g.id && (s.gymId = null));
                  });
                  toast('Ginásio apagado');
                  onClose();
                }}
              >
                <Trash2 size={15} /> Apagar
              </ConfirmButton>
            </span>
          )}
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!g.name.trim()} onClick={save}>Guardar ginásio</button>
        </>
      }
    >
      {request && (
        <div className="sub small">
          Pedido de {db.students.find((s) => s.id === request.studentId)?.name ?? 'aluno'}: “{request.name}”. Ao guardar, o ginásio fica associado a este aluno.
        </div>
      )}
      <Field label="Nome"><input className="input" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} placeholder="Ex.: Viva Gym Alvalade" autoFocus /></Field>
      <div className="grid g2">
        <Field label="Cadeia" hint="Vazio se for independente"><input className="input" list="gym-chains" value={g.chain} onChange={(e) => setG({ ...g, chain: e.target.value })} placeholder="Ex.: Viva Gym" /></Field>
        <Field label="Localidade ou morada"><input className="input" value={g.address} onChange={(e) => setG({ ...g, address: e.target.value })} /></Field>
      </div>
      <datalist id="gym-chains">{Array.from(new Set(db.gyms.map((x) => x.chain).filter(Boolean))).map((c) => <option key={c} value={c} />)}</datalist>
      <Field label="Notas"><input className="input" value={g.notes} onChange={(e) => setG({ ...g, notes: e.target.value })} placeholder="Ex.: a prensa está muitas vezes ocupada ao fim do dia" /></Field>

      <div className="row-wrap">
        <h4>Equipamento ({g.equipmentIds.length})</h4>
        <span className="spacer" />
        {others.length > 0 && (
          <select
            className="select sm"
            style={{ width: 230 }}
            value=""
            onChange={(e) => {
              const src = db.gyms.find((x) => x.id === e.target.value);
              if (src) setG({ ...g, equipmentIds: [...src.equipmentIds], chain: g.chain || src.chain });
            }}
            aria-label="Copiar equipamento de outro ginásio"
          >
            <option value="">Copiar de outro ginásio</option>
            {others.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        )}
      </div>
      {db.equipment.length === 0 && <p className="faint small">O catálogo de equipamentos está vazio. Acrescenta equipamentos no separador Equipamentos.</p>}
      {EQUIPMENT_CATEGORIES.map((cat) => {
        const items = db.equipment.filter((e) => e.category === cat);
        if (!items.length) return null;
        const all = items.every((e) => has.has(e.id));
        return (
          <div key={cat} className="stack-sm">
            <div className="row">
              <span className="strong small">{cat}</span>
              <span className="spacer" />
              <button className="btn btn-ghost btn-sm" onClick={() => setCategory(cat, !all)}>{all ? 'Tirar todos' : 'Marcar todos'}</button>
            </div>
            <div className="grid g2" style={{ gap: 4 }}>
              {items.map((e) => (
                <label key={e.id} className="check">
                  <input type="checkbox" checked={has.has(e.id)} onChange={(ev) => toggle(e.id, ev.target.checked)} />
                  {e.name}{e.brand && <span className="faint"> {e.brand}</span>}
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <div className="sub small">
        <div className="strong">Com este equipamento dá para fazer {doable.length} de {db.exercises.length} exercícios da biblioteca.</div>
        {doable.length < db.exercises.length && (
          <div className="faint mt-sm">
            Ficam de fora: {db.exercises.filter((e) => !doable.includes(e)).map((e) => e.name).join(', ')}.
          </div>
        )}
      </div>
      {students.length > 0 && (
        <div className="small">
          <span className="strong">Alunos que treinam aqui: </span>
          {students.map((s, i) => (
            <span key={s.id}>
              {i > 0 && ', '}
              <button className="btn-link" style={{ background: 'none', border: 0, padding: 0, color: 'var(--blue)', cursor: 'pointer' }} onClick={() => navigate('/alunos/' + s.id + '?tab=planos')}>{s.name}</button>
            </span>
          ))}
        </div>
      )}
    </Drawer>
  );
}

/* ---------- Catálogo de equipamentos ---------- */

function EquipmentList({ onEdit }: { onEdit: (e: Equipment) => void }) {
  const { db } = useStore();
  const [cat, setCat] = useState('');
  const list = db.equipment.filter((e) => !cat || e.category === cat);
  return (
    <div className="panel">
      <div className="panel-head">
        <select className="select sm" style={{ width: 180 }} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {EQUIPMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <span className="faint">Os exercícios dizem que equipamento precisam na biblioteca de Treinos.</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Equipamento</th><th>Categoria</th><th>Marca</th><th>Ginásios</th><th>Exercícios</th></tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className="click" onClick={() => onEdit(e)}>
                <td className="strong">{e.name}</td>
                <td>{e.category}</td>
                <td>{e.brand || <span className="faint">—</span>}</td>
                <td>{db.gyms.filter((g) => g.equipmentIds.includes(e.id)).length} de {db.gyms.length}</td>
                <td>{db.exercises.filter((x) => x.needs.includes(e.id)).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <Empty title="Sem equipamentos" />}
      </div>
    </div>
  );
}

function EquipmentEditor({ initial, onClose }: { initial: Equipment; onClose: () => void }) {
  const { mutate } = useStore();
  const toast = useToast();
  const [e, setE] = useState(initial);
  return (
    <Modal
      title={e.id ? 'Editar equipamento' : 'Novo equipamento'}
      onClose={onClose}
      footer={
        <>
          {e.id && (
            <span style={{ marginRight: 'auto' }}>
              <ConfirmButton
                label="Confirmar: apagar"
                onConfirm={() => {
                  mutate((d) => {
                    d.equipment = d.equipment.filter((x) => x.id !== e.id);
                    d.gyms.forEach((g) => (g.equipmentIds = g.equipmentIds.filter((x) => x !== e.id)));
                    d.exercises.forEach((x) => (x.needs = x.needs.filter((n) => n !== e.id)));
                  });
                  toast('Equipamento apagado');
                  onClose();
                }}
              >
                <Trash2 size={15} /> Apagar
              </ConfirmButton>
            </span>
          )}
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={!e.name.trim()}
            onClick={() => {
              mutate((d) => {
                if (e.id) d.equipment[d.equipment.findIndex((x) => x.id === e.id)] = e;
                else d.equipment.push({ ...e, id: uid('eq_') });
              });
              toast('Equipamento guardado');
              onClose();
            }}
          >
            Guardar equipamento
          </button>
        </>
      }
    >
      <Field label="Nome"><input className="input" value={e.name} onChange={(ev) => setE({ ...e, name: ev.target.value })} placeholder="Ex.: Prensa de pernas 45°" autoFocus /></Field>
      <div className="grid g2">
        <Field label="Categoria">
          <select className="select" value={e.category} onChange={(ev) => setE({ ...e, category: ev.target.value as Equipment['category'] })}>
            {EQUIPMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Marca" hint="Opcional"><input className="input" value={e.brand} onChange={(ev) => setE({ ...e, brand: ev.target.value })} /></Field>
      </div>
    </Modal>
  );
}

/* ---------- Pedidos dos alunos ---------- */

function RequestList({ onCreate }: { onCreate: (r: GymRequest) => void }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const [link, setLink] = useState<Record<string, string>>({});
  const list = [...db.gymRequests].sort((a, b) => (a.status === 'pendente' ? -1 : 0) - (b.status === 'pendente' ? -1 : 0) || b.createdAt.localeCompare(a.createdAt));
  if (list.length === 0) return <Empty icon={<Building2 size={26} />} title="Sem pedidos" text="Quando um aluno treina num ginásio que não está na lista, o pedido aparece aqui." />;
  return (
    <div className="panel">
      <div className="list">
        {list.map((r) => {
          const s = db.students.find((x) => x.id === r.studentId);
          return (
            <div key={r.id} className="list-row" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div style={{ minWidth: 220 }}>
                <div className="strong">“{r.name}”</div>
                <div className="faint small">{s?.name ?? 'Aluno apagado'}, {fmtDateTime(r.createdAt)}</div>
              </div>
              <span className="spacer" />
              {r.status === 'pendente' ? (
                <>
                  <button className="btn btn-sm btn-primary" onClick={() => onCreate(r)}><Plus size={14} /> Criar ginásio</button>
                  {db.gyms.length > 0 && (
                    <>
                      <select className="select sm" style={{ width: 200 }} value={link[r.id] ?? ''} onChange={(e) => setLink({ ...link, [r.id]: e.target.value })} aria-label="Ginásio existente">
                        <option value="">É um destes…</option>
                        {db.gyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      <button
                        className="btn btn-sm"
                        disabled={!link[r.id]}
                        onClick={() => {
                          mutate((d) => {
                            d.gymRequests.find((x) => x.id === r.id)!.status = 'adicionado';
                            const st = d.students.find((x) => x.id === r.studentId);
                            if (st) st.gymId = link[r.id];
                          });
                          toast('Aluno associado ao ginásio');
                        }}
                      >
                        <Check size={14} /> Associar
                      </button>
                    </>
                  )}
                  <button className="btn btn-sm btn-ghost" onClick={() => mutate((d) => void (d.gymRequests.find((x) => x.id === r.id)!.status = 'dispensado'))}><X size={14} /> Dispensar</button>
                </>
              ) : (
                <span className={`badge ${r.status === 'adicionado' ? 'green' : ''}`}>{r.status === 'adicionado' ? 'Tratado' : 'Dispensado'}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
