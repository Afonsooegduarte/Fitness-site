import type { CalendarEvent, DB, FoodPortion, Measurement, Student, WorkoutDay, Role } from '../store/types';
import { addDays, addMonths, diffDays, parseISO, today, isBirthdayToday, toISO } from './utils';

export const PLAN_LIMITS = { base: 25, pro: 75, plus: 200 } as const;
export const PLAN_PRICES = { base: 19, pro: 39, plus: 69 } as const;

export const ROLE_LABEL: Record<Role, string> = { leader: 'Responsável de equipa', coach: 'Treinador', nutritionist: 'Nutricionista' };

export const GOAL_LABEL: Record<Student['goal'], string> = {
  perder_peso: 'Perder gordura',
  ganhar_massa: 'Ganhar massa',
  performance: 'Performance',
  saude: 'Saúde geral',
};

export const currentUser = (db: DB) => db.staff.find((s) => s.id === db.currentUserId) ?? db.staff[0];
export const isLeader = (db: DB) => currentUser(db).role === 'leader';

// Cada membro vê o que gere; o responsável de equipa vê tudo.
export const visibleStudents = (db: DB, includeArchived = false) => {
  const me = currentUser(db);
  return db.students.filter(
    (s) => (includeArchived || s.status !== 'arquivado') && (me.role === 'leader' || s.coachId === me.id || me.role === 'nutritionist'),
  );
};

export const visibleChats = (db: DB) => {
  const me = currentUser(db);
  if (me.role === 'leader') return db.chats;
  const ids = new Set(visibleStudents(db).map((s) => s.id));
  return db.chats.filter((c) => me.chatIds.includes(c.id) || ids.has(c.studentId));
};

export const studentById = (db: DB, id: string | null | undefined) => db.students.find((s) => s.id === id);
export const staffById = (db: DB, id: string | null | undefined) => db.staff.find((s) => s.id === id);
export const personName = (db: DB, id: string) => studentById(db, id)?.name ?? staffById(db, id)?.name ?? 'Alguém';

export function macros(db: DB, items: FoodPortion[]) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const it of items) {
    const food = db.foods.find((f) => f.id === it.foodId);
    if (!food) continue;
    const k = food.unit === 'un' ? it.qty : it.qty / 100;
    t.kcal += food.kcal * k;
    t.p += food.p * k;
    t.c += food.c * k;
    t.f += food.f * k;
  }
  return t;
}

// Tempo estimado: 40 s de trabalho por série + descanso. Descanso por preencher conta como 0 s.
export const WORK_SECONDS = 40;
export function dayDuration(day: WorkoutDay) {
  return day.items.reduce((acc, it) => acc + it.sets * WORK_SECONDS + Math.max(0, it.sets - 1) * (it.rest ?? 0), 0);
}

export const firstM = (s: Student): Measurement | undefined => s.measurements[0];
export const lastM = (s: Student): Measurement | undefined => s.measurements[s.measurements.length - 1];

export const pendingAssessments = (db: DB, studentId?: string) =>
  db.assessments.filter((a) => a.status === 'pendente' && (!studentId || a.studentId === studentId));

export function adherence(s: Student, days = 14) {
  const from = addDays(today(), -days + 1);
  const n = s.checkinDates.filter((d) => d >= from).length;
  return n / days;
}

export interface RiskInfo {
  score: number; // 0 a 100
  level: 'baixo' | 'medio' | 'alto';
  reasons: string[];
}

export function retentionRisk(db: DB, s: Student): RiskInfo {
  const reasons: string[] = [];
  let score = 0;
  const idle = diffDays(today(), s.lastActivity);
  if (idle >= 7) {
    score += 40;
    reasons.push(`Sem atividade há ${idle} dias`);
  } else if (idle >= 4) {
    score += 20;
    reasons.push(`Sem atividade há ${idle} dias`);
  }
  const adh = adherence(s);
  if (adh < 0.4) {
    score += 25;
    reasons.push(`Adesão de ${Math.round(adh * 100)}% nos últimos 14 dias`);
  } else if (adh < 0.6) {
    score += 12;
    reasons.push(`Adesão de ${Math.round(adh * 100)}% nos últimos 14 dias`);
  }
  const left = diffDays(s.subscriptionEnd, today());
  if (left <= 7) {
    score += 20;
    reasons.push(left < 0 ? 'Subscrição expirada' : `Subscrição termina em ${left} dias`);
  }
  if (s.paymentStatus === 'em_atraso') {
    score += 15;
    reasons.push('Pagamento em atraso');
  }
  const pend = pendingAssessments(db, s.id).length;
  if (pend >= 2) {
    score += 8;
    reasons.push(`${pend} avaliações sem resposta`);
  }
  score = Math.min(100, score);
  return { score, level: score >= 50 ? 'alto' : score >= 25 ? 'medio' : 'baixo', reasons };
}

export function daySummary(db: DB) {
  const t = today();
  const students = visibleStudents(db);
  return {
    events: eventsOn(db, t),
    birthdays: students.filter((s) => isBirthdayToday(s.birthday)),
    expiring: students.filter((s) => {
      const d = diffDays(s.subscriptionEnd, t);
      return d >= 0 && d <= 7;
    }),
    overdue: students.filter((s) => s.paymentStatus === 'em_atraso'),
  };
}

// Expande eventos recorrentes para uma data concreta.
export function occursOn(ev: CalendarEvent, iso: string) {
  if (ev.date === iso) return true;
  if (ev.recurrence === 'nenhuma' || iso < ev.date) return false;
  const d = diffDays(iso, ev.date);
  if (ev.recurrence === 'semanal') return d % 7 === 0;
  if (ev.recurrence === 'quinzenal') return d % 14 === 0;
  if (ev.recurrence === 'mensal') return parseISO(iso).getDate() === parseISO(ev.date).getDate();
  return false;
}

export const eventsOn = (db: DB, iso: string, includePersonal = true) =>
  db.events
    .filter((e) => occursOn(e, iso) && (includePersonal || e.kind !== 'pessoal'))
    .sort((a, b) => a.start.localeCompare(b.start));

export const EVENT_KIND: Record<CalendarEvent['kind'], { label: string; color: string }> = {
  sessao: { label: 'Sessão', color: '#1F5FBF' },
  aula: { label: 'Aula de grupo', color: '#2E9E5B' },
  avaliacao: { label: 'Avaliação', color: '#F2B705' },
  pessoal: { label: 'Evento do aluno', color: '#8A94A3' },
};

export type MetricKey = 'weight' | 'bmi' | 'bodyFat' | 'leanMass' | 'visceral' | 'waist' | 'abdomen' | 'hip' | 'chest' | 'arm' | 'thigh';

export const METRICS: { key: MetricKey; label: string; unit: string; goodWhen: 'down' | 'up' }[] = [
  { key: 'weight', label: 'Peso', unit: 'kg', goodWhen: 'down' },
  { key: 'bmi', label: 'IMC', unit: '', goodWhen: 'down' },
  { key: 'bodyFat', label: 'Massa gorda', unit: '%', goodWhen: 'down' },
  { key: 'leanMass', label: 'Massa magra', unit: 'kg', goodWhen: 'up' },
  { key: 'visceral', label: 'Gordura visceral', unit: '', goodWhen: 'down' },
  { key: 'waist', label: 'Cintura', unit: 'cm', goodWhen: 'down' },
  { key: 'abdomen', label: 'Abdómen', unit: 'cm', goodWhen: 'down' },
  { key: 'hip', label: 'Anca', unit: 'cm', goodWhen: 'down' },
  { key: 'chest', label: 'Peito', unit: 'cm', goodWhen: 'up' },
  { key: 'arm', label: 'Braço', unit: 'cm', goodWhen: 'up' },
  { key: 'thigh', label: 'Meio da coxa', unit: 'cm', goodWhen: 'down' },
];

export const metricValue = (s: Student, m: Measurement, key: MetricKey) => {
  if (key === 'bmi') {
    const h = s.gender === 'F' ? 1.65 : 1.78;
    return Math.round((m.weight / (h * h)) * 10) / 10;
  }
  return m[key];
};

export function periodStart(period: string, custom?: string) {
  const t = today();
  if (period === '3') return addMonths(t, -3);
  if (period === '6') return addMonths(t, -6);
  if (period === '12') return addMonths(t, -12);
  if (period === 'custom' && custom) return custom;
  return '0000-01-01';
}

export const daysUntilBirthday = (birthday: string) => {
  const t = parseISO(today());
  const b = parseISO(birthday);
  const next = new Date(t.getFullYear(), b.getMonth(), b.getDate());
  if (next < t) next.setFullYear(t.getFullYear() + 1);
  return diffDays(toISO(next), toISO(t));
};

export const studentLimit = (db: DB) => PLAN_LIMITS[db.settings.platformPlan];

export const activeCount = (db: DB) => db.students.filter((s) => s.status !== 'arquivado').length;

export const PERIOD_LABEL = { mensal: 'por mês', trimestral: 'por trimestre', semestral: 'por semestre', anual: 'por ano', unico: 'pagamento único' } as const;

export const monthlyValue = (price: number, period: keyof typeof PERIOD_LABEL) =>
  period === 'mensal' ? price : period === 'trimestral' ? price / 3 : period === 'semestral' ? price / 6 : period === 'anual' ? price / 12 : 0;

export const fillTemplate = (text: string, s: Student, extra: Record<string, string> = {}) =>
  text
    .replace(/\{nome\}/g, s.name.split(' ')[0])
    .replace(/\{data\}/g, s.subscriptionEnd)
    .replace(/\{dias\}/g, String(diffDays(today(), s.lastActivity)))
    .replace(/\{(\w+)\}/g, (m, k) => extra[k] ?? m);
