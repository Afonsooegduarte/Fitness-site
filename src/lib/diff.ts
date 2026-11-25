import type { DB, NutritionPlan, WorkoutPlan } from '../store/types';

export interface DiffRow {
  section: string;
  item: string;
  status: 'adicionado' | 'removido' | 'alterado';
  changes: { field: string; before: string; after: string }[];
}

type Flat = Map<string, { section: string; item: string; fields: Record<string, string> }>;

function flattenWorkout(db: DB, p: WorkoutPlan): Flat {
  const m: Flat = new Map();
  for (const d of p.days)
    d.items.forEach((it, idx) => {
      const ex = db.exercises.find((e) => e.id === it.exerciseId)?.name ?? 'Exercício';
      const occurrence = d.items.slice(0, idx).filter((x) => x.exerciseId === it.exerciseId).length;
      m.set(`${d.name}|${it.exerciseId}|${occurrence}`, {
        section: d.name,
        item: ex,
        fields: {
          Séries: String(it.sets),
          Repetições: it.reps,
          Descanso: it.rest == null ? 'por preencher' : `${it.rest} s`,
          Notas: it.notes || '—',
          Grupo: it.group || '—',
          Alternativas: it.alternatives.map((a) => db.exercises.find((e) => e.id === a)?.name).join(', ') || '—',
        },
      });
    });
  return m;
}

function flattenNutrition(db: DB, p: NutritionPlan): Flat {
  const m: Flat = new Map();
  const fname = (id: string) => db.foods.find((f) => f.id === id)?.name ?? 'Alimento';
  for (const d of p.days)
    for (const meal of d.meals) {
      m.set(`${d.name}|${meal.name}`, {
        section: d.name,
        item: meal.name,
        fields: {
          Hora: meal.time,
          Alimentos: meal.items.map((i) => `${fname(i.foodId)} ${i.qty}`).join(', ') || '—',
          Alternativas: meal.alternatives.map((a) => a.name).join(', ') || '—',
        },
      });
    }
  return m;
}

export function diffPlans(db: DB, kind: 'treino' | 'nutricao', before: any, after: any): DiffRow[] {
  const f = kind === 'treino' ? flattenWorkout : flattenNutrition;
  const a = before ? f(db, before) : new Map();
  const b = f(db, after);
  const rows: DiffRow[] = [];
  for (const [k, v] of b) {
    const old = a.get(k);
    if (!old) {
      rows.push({ section: v.section, item: v.item, status: 'adicionado', changes: Object.entries(v.fields).filter(([, x]) => x !== '—').map(([field, after]) => ({ field, before: '', after })) });
      continue;
    }
    const changes = Object.keys(v.fields)
      .filter((field) => old.fields[field] !== v.fields[field])
      .map((field) => ({ field, before: old.fields[field], after: v.fields[field] }));
    if (changes.length) rows.push({ section: v.section, item: v.item, status: 'alterado', changes });
  }
  for (const [k, v] of a) if (!b.has(k)) rows.push({ section: v.section, item: v.item, status: 'removido', changes: [] });
  return rows;
}
