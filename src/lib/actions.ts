import type { AppNotification, Automation, DB, NutritionPlan, Student, WorkoutPlan } from '../store/types';
import { addDays, diffDays, isBirthdayToday, today, uid } from './utils';
import { currentUser, fillTemplate } from './domain';

// Operações de negócio aplicadas sobre um rascunho da base de dados (dentro de mutate).

export function ensureChat(d: DB, studentId: string) {
  let chat = d.chats.find((c) => c.studentId === studentId);
  if (!chat) {
    chat = { id: 'ch_' + studentId, studentId, messages: [], unread: false, color: null };
    d.chats.push(chat);
  }
  return chat;
}

export function sendCoachMessage(d: DB, studentId: string, text: string) {
  const chat = ensureChat(d, studentId);
  chat.messages.push({ id: uid('m_'), from: 'coach', text, at: new Date().toISOString() });
  chat.unread = false;
  chat.color = null;
}

export function sendStudentMessage(d: DB, studentId: string, text: string) {
  const chat = ensureChat(d, studentId);
  chat.messages.push({ id: uid('m_'), from: 'student', text, at: new Date().toISOString() });
  chat.unread = true;
}

export function notify(d: DB, kind: AppNotification['kind'], text: string, link: string) {
  d.notifications.unshift({ id: uid('no_'), kind, text, link, read: false, at: new Date().toISOString() });
}

export function addTask(d: DB, text: string, studentId: string | null = null, due: string | null = null) {
  d.tasks.unshift({ id: uid('tk_'), text, done: false, due, studentId });
}

export function clonePlanFor<T extends WorkoutPlan | NutritionPlan>(plan: T, studentId: string, prefix: string): T {
  const copy = structuredClone(plan);
  copy.id = prefix + uid();
  copy.studentId = studentId;
  copy.updatedAt = today();
  return copy;
}

// Garante que a versão anterior fica registada antes de guardar uma nova (planos sem histórico).
export function ensureBaseline(d: DB, kind: 'treino' | 'nutricao', previous: WorkoutPlan | NutritionPlan) {
  if (d.planVersions.some((v) => v.planId === previous.id)) return;
  d.planVersions.push({
    id: uid('pv_'),
    kind,
    planId: previous.id,
    studentId: previous.studentId,
    savedAt: previous.updatedAt + 'T00:00:00',
    author: currentUser(d).name,
    snapshot: structuredClone(previous),
  });
}

export function savePlanVersion(d: DB, kind: 'treino' | 'nutricao', plan: WorkoutPlan | NutritionPlan) {
  d.planVersions.push({
    id: uid('pv_'),
    kind,
    planId: plan.id,
    studentId: plan.studentId,
    savedAt: new Date().toISOString(),
    author: currentUser(d).name,
    snapshot: structuredClone(plan),
  });
}

// Atribui um modelo da biblioteca a um aluno, criando uma cópia própria do aluno.
export function assignWorkout(d: DB, studentId: string, templateId: string | null) {
  const s = d.students.find((x) => x.id === studentId)!;
  if (!templateId) return void (s.workoutPlanId = null);
  const tpl = d.workoutPlans.find((p) => p.id === templateId)!;
  const copy = tpl.studentId === studentId ? tpl : clonePlanFor(tpl, studentId, 'wp_');
  if (copy !== tpl) d.workoutPlans.push(copy);
  s.workoutPlanId = copy.id;
  savePlanVersion(d, 'treino', copy);
}

export function assignNutrition(d: DB, studentId: string, templateId: string | null) {
  const s = d.students.find((x) => x.id === studentId)!;
  if (!templateId) return void (s.nutritionPlanId = null);
  const tpl = d.nutritionPlans.find((p) => p.id === templateId)!;
  const copy = tpl.studentId === studentId ? tpl : clonePlanFor(tpl, studentId, 'np_');
  if (copy !== tpl) d.nutritionPlans.push(copy);
  s.nutritionPlanId = copy.id;
  savePlanVersion(d, 'nutricao', copy);
}

export function applyWelcomePack(d: DB, packId: string, studentId: string) {
  const pack = d.welcomePacks.find((p) => p.id === packId);
  const s = d.students.find((x) => x.id === studentId);
  if (!pack || !s) return;
  if (pack.workoutPlanId) assignWorkout(d, studentId, pack.workoutPlanId);
  if (pack.nutritionPlanId) assignNutrition(d, studentId, pack.nutritionPlanId);
  if (pack.protocolId) s.protocolId = pack.protocolId;
  s.courseIds = Array.from(new Set([...s.courseIds, ...pack.courseIds]));
  if (pack.message) sendCoachMessage(d, studentId, fillTemplate(pack.message, s));
  if (pack.questionnaireId) {
    const q = d.questionnaires.find((x) => x.id === pack.questionnaireId);
    if (q) sendCoachMessage(d, studentId, `Preenche o questionário “${q.name}” na app quando puderes.`);
  }
}

export function newStudent(partial: Partial<Student> & { name: string; coachId: string }): Student {
  return {
    id: uid('al_'),
    email: '',
    phone: '',
    birthday: '1995-01-01',
    gender: 'F',
    tags: [],
    status: 'ativo',
    joinedAt: today(),
    packageId: null,
    subscriptionEnd: addDays(today(), 30),
    paymentStatus: 'pago',
    goal: 'saude',
    workoutPlanId: null,
    nutritionPlanId: null,
    protocolId: null,
    courseIds: [],
    measurements: [],
    checkinDates: [],
    lastActivity: today(),
    notes: '',
    gymId: null,
    gymCheckins: [],
    ...partial,
  };
}

// Executa uma automação sobre os alunos que cumprem o gatilho. Devolve quantos foram abrangidos.
export function runAutomation(d: DB, a: Automation, onlyStudentId?: string) {
  const t = today();
  const targets = d.students.filter((s) => {
    if (s.status !== 'ativo') return false;
    if (onlyStudentId && s.id !== onlyStudentId) return false;
    switch (a.trigger) {
      case 'novo_aluno':
        return onlyStudentId ? true : diffDays(t, s.joinedAt) <= 1;
      case 'sem_atividade':
        return diffDays(t, s.lastActivity) >= a.days;
      case 'subscricao_expira': {
        const left = diffDays(s.subscriptionEnd, t);
        return left >= 0 && left <= a.days;
      }
      case 'aniversario':
        return isBirthdayToday(s.birthday);
      case 'pagamento_atraso':
        return s.paymentStatus === 'em_atraso';
    }
  });
  for (const s of targets) {
    const text = fillTemplate(a.text, s);
    if (a.action === 'mensagem') sendCoachMessage(d, s.id, text);
    if (a.action === 'tarefa') addTask(d, text, s.id, t);
    if (a.action === 'notificacao') notify(d, 'automacao', text, '/alunos/' + s.id);
  }
  const live = d.automations.find((x) => x.id === a.id);
  if (live) {
    live.runs += targets.length;
    live.lastRun = t;
  }
  return targets.length;
}
