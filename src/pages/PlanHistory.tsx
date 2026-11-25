import { useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { useStore } from '../store/store';
import type { NutritionPlan, WorkoutPlan } from '../store/types';
import { diffPlans, type DiffRow } from '../lib/diff';
import { savePlanVersion } from '../lib/actions';
import { macros } from '../lib/domain';
import { fmtDateTime, num } from '../lib/utils';
import { Drawer, Empty, Seg, useToast, ConfirmButton } from '../components/ui';

export function DiffTable({ rows }: { rows: DiffRow[] }) {
  if (!rows.length) return <p className="faint">Sem diferenças face à versão anterior.</p>;
  const badge = { adicionado: 'green', removido: 'red', alterado: 'yellow' } as const;
  return (
    <div className="stack-sm">
      {rows.map((r, i) => (
        <div key={i} className="sub">
          <div className="row">
            <span className={`badge ${badge[r.status]}`}>{r.status}</span>
            <span className="strong">{r.item}</span>
            <span className="faint">{r.section}</span>
          </div>
          {r.status === 'alterado' && (
            <table className="table" style={{ marginTop: 6 }}>
              <tbody>
                {r.changes.map((c) => (
                  <tr key={c.field}>
                    <td style={{ width: 120 }} className="faint">{c.field}</td>
                    <td className="diff-before">{c.before}</td>
                    <td className="diff-after">{c.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {r.status === 'adicionado' && r.changes.length > 0 && <p className="small muted mt-sm">{r.changes.map((c) => `${c.field}: ${c.after}`).join(', ')}</p>}
        </div>
      ))}
    </div>
  );
}

export function PlanPreview({ kind, plan }: { kind: 'treino' | 'nutricao'; plan: WorkoutPlan | NutritionPlan }) {
  const { db } = useStore();
  if (kind === 'treino') {
    const p = plan as WorkoutPlan;
    return (
      <div className="stack-sm">
        {p.days.map((d) => (
          <div key={d.id} className="sub">
            <div className="strong">{d.name}</div>
            {d.items.map((it) => (
              <div key={it.id} className="row small" style={{ marginTop: 4 }}>
                {it.group && <span className="grp on">{it.group}</span>}
                <span>{db.exercises.find((e) => e.id === it.exerciseId)?.name}</span>
                <span className="spacer" />
                <span className="num muted">{it.sets} × {it.reps}, {it.rest == null ? 'descanso por preencher' : it.rest + ' s'}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  const p = plan as NutritionPlan;
  return (
    <div className="stack-sm">
      {p.days.map((d) => (
        <div key={d.id} className="sub">
          <div className="strong">{d.name}</div>
          {d.meals.map((m) => (
            <div key={m.id} className="small" style={{ marginTop: 4 }}>
              <span className="num muted">{m.time}</span> {m.name}: {m.items.map((i) => db.foods.find((f) => f.id === i.foodId)?.name + ' ' + i.qty).join(', ')} ({num(macros(db, m.items).kcal, 0)} kcal)
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function PlanHistoryDrawer({ kind, planId, onClose, onRestored }: { kind: 'treino' | 'nutricao'; planId: string; onClose: () => void; onRestored?: () => void }) {
  const { db, mutate } = useStore();
  const toast = useToast();
  const versions = db.planVersions.filter((v) => v.planId === planId).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const [sel, setSel] = useState(versions[0]?.id);
  const [mode, setMode] = useState<'resumo' | 'completo'>('resumo');
  const idx = versions.findIndex((v) => v.id === sel);
  const v = versions[idx];
  const prev = versions[idx + 1];
  const restore = () => {
    mutate((d) => {
      const list = kind === 'treino' ? d.workoutPlans : d.nutritionPlans;
      const i = list.findIndex((p) => p.id === planId);
      const snap = structuredClone(v.snapshot) as any;
      snap.updatedAt = new Date().toISOString().slice(0, 10);
      list[i] = snap;
      savePlanVersion(d, kind, snap);
    });
    toast('Versão restaurada');
    onRestored?.();
    onClose();
  };
  return (
    <Drawer title="Alterações do plano" onClose={onClose}>
      {versions.length === 0 ? (
        <Empty icon={<History size={26} />} title="Ainda não há versões" text="Cada vez que guardas o plano fica uma versão aqui." />
      ) : (
        <>
          <div className="stack-sm">
            {versions.map((x, i) => (
              <button key={x.id} className={`chip ${x.id === sel ? 'on' : ''}`} style={{ justifyContent: 'flex-start', height: 'auto', padding: '8px 12px', borderRadius: 8 }} onClick={() => setSel(x.id)}>
                <span className="strong">{fmtDateTime(x.savedAt)}</span>
                <span>{x.author}</span>
                {i === 0 && <span className="badge green">Atual</span>}
              </button>
            ))}
          </div>
          {v && (
            <>
              <div className="row">
                <Seg options={[{ id: 'resumo', label: 'O que mudou' }, { id: 'completo', label: 'Plano completo' }]} value={mode} onChange={setMode} />
                <span className="spacer" />
                {idx > 0 && (
                  <ConfirmButton onConfirm={restore} label="Confirmar restauro" className="btn btn-sm">
                    <RotateCcw size={15} /> Restaurar esta versão
                  </ConfirmButton>
                )}
              </div>
              {mode === 'resumo' ? (
                prev ? <DiffTable rows={diffPlans(db, kind, prev.snapshot, v.snapshot)} /> : <p className="faint">Primeira versão guardada deste plano.</p>
              ) : (
                <PlanPreview kind={kind} plan={v.snapshot} />
              )}
            </>
          )}
        </>
      )}
    </Drawer>
  );
}
