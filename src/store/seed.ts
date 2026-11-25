import type {
  DB, Student, Measurement, Exercise, Food, Meal, WorkoutPlan, NutritionPlan, Assessment, Chat, CalendarEvent,
  StaffMember, PlanVersion, WorkoutItem,
} from './types';
import { addDays, addMonths, today, seeded, uid } from '../lib/utils';
import { DAILY_EXTRA_QUESTIONS, DEFAULT_QUICK_REPLIES, EXERCISE_NEEDS, seedEquipment, seedGymFor, seedGyms } from '../lib/gyms';
import { seedGymCheckins } from '../lib/streak';

// Todos os nomes e dados abaixo são fictícios.

const rnd = seeded(20261123);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const r = (a: number, b: number) => a + rnd() * (b - a);
const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

const T = today();

const staff: StaffMember[] = [
  { id: 'st_marco', name: 'Marco Vieira', email: 'marco@estudioforca.pt', role: 'leader', status: 'ativo', chatIds: [], color: '#1F5FBF' },
  { id: 'st_sara', name: 'Sara Lopes', email: 'sara@estudioforca.pt', role: 'coach', status: 'ativo', chatIds: [], color: '#2E9E5B' },
  { id: 'st_nuno', name: 'Nuno Faria', email: 'nuno@estudioforca.pt', role: 'nutritionist', status: 'ativo', chatIds: [], color: '#D63A2F' },
];

const exercises: Exercise[] = [
  ['Agachamento com barra', 'Pernas', 'Barra'],
  ['Agachamento goblet', 'Pernas', 'Kettlebell'],
  ['Peso morto', 'Posterior', 'Barra'],
  ['Peso morto romeno', 'Posterior', 'Halteres'],
  ['Hip thrust', 'Glúteos', 'Barra'],
  ['Lunge búlgaro', 'Pernas', 'Halteres'],
  ['Prensa de pernas', 'Pernas', 'Máquina'],
  ['Extensão de pernas', 'Quadríceps', 'Máquina'],
  ['Curl femoral deitado', 'Posterior', 'Máquina'],
  ['Elevação de gémeos', 'Gémeos', 'Máquina'],
  ['Supino plano', 'Peito', 'Barra'],
  ['Supino inclinado com halteres', 'Peito', 'Halteres'],
  ['Flexões', 'Peito', 'Peso corporal'],
  ['Crossover na polia', 'Peito', 'Polia'],
  ['Remada com barra', 'Costas', 'Barra'],
  ['Puxada à frente', 'Costas', 'Polia'],
  ['Elevações', 'Costas', 'Peso corporal'],
  ['Remada unilateral', 'Costas', 'Halteres'],
  ['Face pull', 'Ombros', 'Polia'],
  ['Press militar', 'Ombros', 'Barra'],
  ['Elevação lateral', 'Ombros', 'Halteres'],
  ['Curl de bíceps', 'Bíceps', 'Halteres'],
  ['Curl martelo', 'Bíceps', 'Halteres'],
  ['Extensão de tríceps na polia', 'Tríceps', 'Polia'],
  ['Mergulhos', 'Tríceps', 'Peso corporal'],
  ['Prancha', 'Core', 'Peso corporal'],
  ['Pallof press', 'Core', 'Polia'],
  ['Abdominal roda', 'Core', 'Roda'],
  ['Kettlebell swing', 'Corpo inteiro', 'Kettlebell'],
  ['Remo ergómetro', 'Cardio', 'Máquina'],
].map(([name, muscle, equipment], i) => ({
  id: 'ex_' + i,
  name,
  muscle,
  equipment,
  needs: EXERCISE_NEEDS[name] ?? [],
  videoUrl: '',
  instructions: 'Controla a fase excêntrica, mantém o core ativo e respira de forma contínua.',
}));

const exId = (name: string) => exercises.find((e) => e.name === name)!.id;

const foods: Food[] = [
  ['Peito de frango', 165, 31, 0, 3.6, '🍗'],
  ['Arroz basmati cozido', 130, 2.7, 28, 0.3, '🍚'],
  ['Batata-doce cozida', 86, 1.6, 20, 0.1, '🍠'],
  ['Ovo inteiro', 72, 6.3, 0.4, 4.8, '🥚', 'un'],
  ['Claras de ovo', 52, 11, 0.7, 0.2, '🥚'],
  ['Aveia em flocos', 389, 17, 66, 7, '🌾'],
  ['Iogurte grego natural', 97, 9, 4, 5, '🥣'],
  ['Banana', 105, 1.3, 27, 0.4, '🍌', 'un'],
  ['Maçã', 95, 0.5, 25, 0.3, '🍎', 'un'],
  ['Frutos vermelhos', 50, 0.8, 12, 0.3, '🫐'],
  ['Azeite', 884, 0, 0, 100, '🫒'],
  ['Amêndoas', 579, 21, 22, 50, '🌰'],
  ['Manteiga de amendoim', 588, 25, 20, 50, '🥜'],
  ['Salmão', 208, 20, 0, 13, '🐟'],
  ['Pescada', 90, 18, 0, 1.3, '🐟'],
  ['Atum ao natural', 116, 26, 0, 1, '🐟'],
  ['Carne de vaca magra', 158, 26, 0, 6, '🥩'],
  ['Peru fatiado', 104, 18, 2, 2, '🦃'],
  ['Pão de mistura', 250, 9, 48, 3, '🍞'],
  ['Massa integral cozida', 124, 5.3, 25, 1.1, '🍝'],
  ['Brócolos', 34, 2.8, 7, 0.4, '🥦'],
  ['Salada mista', 20, 1.2, 3.5, 0.2, '🥗'],
  ['Feijão-preto cozido', 132, 8.9, 24, 0.5, '🫘'],
  ['Grão-de-bico cozido', 164, 8.9, 27, 2.6, '🫘'],
  ['Queijo fresco magro', 98, 12, 3, 4, '🧀'],
  ['Leite meio-gordo', 47, 3.4, 4.8, 1.6, '🥛'],
  ['Whey protein', 380, 78, 8, 5, '🥤'],
  ['Abacate', 160, 2, 9, 15, '🥑'],
  ['Tofu', 76, 8, 1.9, 4.8, '⬜'],
  ['Chocolate negro 85%', 600, 11, 20, 52, '🍫'],
].map(([name, kcal, p, c, f, image, unit], i) => ({
  id: 'fd_' + i,
  name: name as string,
  kcal: kcal as number,
  p: p as number,
  c: c as number,
  f: f as number,
  image: image as string,
  unit: (unit as 'un') || 'g',
}));
const fd = (name: string) => foods.find((f) => f.name === name)!.id;

const meals: Meal[] = [
  { id: 'ml_papas', name: 'Papas de aveia com frutos vermelhos', items: [{ foodId: fd('Aveia em flocos'), qty: 50 }, { foodId: fd('Leite meio-gordo'), qty: 200 }, { foodId: fd('Frutos vermelhos'), qty: 80 }, { foodId: fd('Whey protein'), qty: 20 }], isPublic: true, photo: '', notes: 'Cozinha a aveia no leite 4 minutos e junta a whey no fim.' },
  { id: 'ml_bowl', name: 'Bowl de frango e batata-doce', items: [{ foodId: fd('Peito de frango'), qty: 150 }, { foodId: fd('Batata-doce cozida'), qty: 200 }, { foodId: fd('Brócolos'), qty: 120 }, { foodId: fd('Azeite'), qty: 8 }], isPublic: true, photo: '', notes: 'Prepara 3 doses ao domingo.' },
  { id: 'ml_salmao', name: 'Salmão no forno com arroz', items: [{ foodId: fd('Salmão'), qty: 140 }, { foodId: fd('Arroz basmati cozido'), qty: 150 }, { foodId: fd('Salada mista'), qty: 150 }], isPublic: true, photo: '', notes: '' },
  { id: 'ml_iogurte', name: 'Iogurte grego com amêndoas', items: [{ foodId: fd('Iogurte grego natural'), qty: 170 }, { foodId: fd('Amêndoas'), qty: 20 }, { foodId: fd('Frutos vermelhos'), qty: 50 }], isPublic: true, photo: '', notes: '' },
  { id: 'ml_omelete', name: 'Omelete de claras com peru', items: [{ foodId: fd('Claras de ovo'), qty: 200 }, { foodId: fd('Ovo inteiro'), qty: 1 }, { foodId: fd('Peru fatiado'), qty: 60 }, { foodId: fd('Pão de mistura'), qty: 50 }], isPublic: false, photo: '', notes: '' },
  { id: 'ml_chili', name: 'Chili de vaca e feijão', items: [{ foodId: fd('Carne de vaca magra'), qty: 150 }, { foodId: fd('Feijão-preto cozido'), qty: 120 }, { foodId: fd('Arroz basmati cozido'), qty: 120 }], isPublic: true, photo: '', notes: 'Congela bem em doses individuais.' },
  { id: 'ml_tofu', name: 'Salteado de tofu e grão', items: [{ foodId: fd('Tofu'), qty: 180 }, { foodId: fd('Grão-de-bico cozido'), qty: 100 }, { foodId: fd('Brócolos'), qty: 150 }, { foodId: fd('Azeite'), qty: 10 }], isPublic: false, photo: '', notes: '' },
  { id: 'ml_snack', name: 'Tosta de manteiga de amendoim e banana', items: [{ foodId: fd('Pão de mistura'), qty: 60 }, { foodId: fd('Manteiga de amendoim'), qty: 15 }, { foodId: fd('Banana'), qty: 1 }], isPublic: true, photo: '', notes: 'Boa opção pré-treino.' },
];

const STUDENT_NAMES: [string, 'F' | 'M'][] = [
  ['Inês Carvalho', 'F'], ['Duarte Lopes', 'M'], ['Marta Ribeiro', 'F'], ['Pedro Nunes', 'M'], ['Sofia Mendes', 'F'],
  ['Tiago Ferreira', 'M'], ['Beatriz Costa', 'F'], ['Rui Almeida', 'M'], ['Carolina Sousa', 'F'], ['João Matos', 'M'],
  ['Leonor Pires', 'F'], ['Hugo Martins', 'M'], ['Catarina Lima', 'F'], ['Francisco Reis', 'M'], ['Mariana Teixeira', 'F'],
  ['Bruno Correia', 'M'], ['Diana Freitas', 'F'], ['André Moreira', 'M'],
];

const TAGS = ['Online', 'Presencial', 'Híbrido', 'Competição', 'Pós-parto', 'Iniciante'];

function makeMeasurements(gender: 'F' | 'M', goal: Student['goal'], months: number): Measurement[] {
  const out: Measurement[] = [];
  let weight = gender === 'F' ? r(58, 84) : r(72, 102);
  let bf = gender === 'F' ? r(24, 36) : r(15, 28);
  const height = gender === 'F' ? 1.65 : 1.78;
  const trend = goal === 'perder_peso' ? -r(0.6, 1.6) : goal === 'ganhar_massa' ? r(0.2, 0.7) : r(-0.4, 0.2);
  const bfTrend = goal === 'ganhar_massa' ? -r(0, 0.3) : -r(0.3, 1.1);
  for (let i = months; i >= 0; i--) {
    const stagnant = goal === 'perder_peso' && i < 2 && rnd() < 0.3;
    if (i !== months) {
      weight += stagnant ? r(-0.15, 0.15) : trend + r(-0.4, 0.4);
      bf += bfTrend + r(-0.3, 0.3);
    }
    const lean = weight * (1 - bf / 100);
    out.push({
      date: addDays(T, -i * 30 - Math.floor(r(2, 9))),
      weight: round(weight),
      bodyFat: round(bf),
      leanMass: round(lean),
      visceral: Math.max(2, Math.round(bf / 3.2)),
      waist: round((gender === 'F' ? 70 : 82) + (weight / height / height - 22) * 2.4),
      abdomen: round((gender === 'F' ? 78 : 88) + (weight / height / height - 22) * 2.6),
      hip: round((gender === 'F' ? 96 : 98) + (weight / height / height - 22) * 1.8),
      chest: round((gender === 'F' ? 88 : 100) + (weight / height / height - 22) * 1.2),
      arm: round((gender === 'F' ? 28 : 33) + (lean - 55) * 0.08),
      thigh: round((gender === 'F' ? 55 : 57) + (weight / height / height - 22) * 1.1),
      photos: i === months || i === 0 ? rnd() > 0.2 : rnd() > 0.6,
    });
  }
  return out;
}

function workoutTemplateFull(id: string, studentId: string | null): WorkoutPlan {
  const it = (name: string, sets: number, reps: string, rest: number | null, group = '', notes = ''): WorkoutItem => ({
    id: uid('wi_'), exerciseId: exId(name), sets, reps, rest, notes, group, alternatives: [],
  });
  return {
    id,
    name: 'Full body 3x semana',
    description: 'Base de força para iniciantes e intermédios. Progressão linear de carga.',
    studentId,
    updatedAt: addDays(T, -20),
    days: [
      { id: uid('wd_'), name: 'Treino A', items: [it('Agachamento com barra', 4, '6-8', 120, '', 'RPE 7'), it('Supino plano', 4, '6-8', 120), it('Remada com barra', 3, '8-10', 90), it('Prancha', 3, '40 s', 45)] },
      { id: uid('wd_'), name: 'Treino B', items: [it('Peso morto romeno', 4, '8', 120), it('Press militar', 3, '8', 90), it('Puxada à frente', 3, '10-12', 75, 'A'), it('Face pull', 3, '15', 60, 'A')] },
      { id: uid('wd_'), name: 'Treino C', items: [it('Lunge búlgaro', 3, '10 cada', 90), it('Supino inclinado com halteres', 3, '10', 90), it('Remada unilateral', 3, '10', 75), it('Kettlebell swing', 4, '15', null, '', 'Finalizador')] },
    ],
  };
}

function workoutTemplateUL(id: string, studentId: string | null): WorkoutPlan {
  const it = (name: string, sets: number, reps: string, rest: number | null, group = ''): WorkoutItem => ({
    id: uid('wi_'), exerciseId: exId(name), sets, reps, rest, notes: '', group, alternatives: [],
  });
  return {
    id,
    name: 'Upper / Lower 4x semana',
    description: 'Hipertrofia com foco em volume progressivo.',
    studentId,
    updatedAt: addDays(T, -12),
    days: [
      { id: uid('wd_'), name: 'Superior 1', items: [it('Supino plano', 4, '6-8', 150), it('Remada com barra', 4, '8', 120), it('Elevação lateral', 3, '12-15', 60, 'A'), it('Curl de bíceps', 3, '12', 60, 'A')] },
      { id: uid('wd_'), name: 'Inferior 1', items: [it('Agachamento com barra', 4, '6', 180), it('Curl femoral deitado', 3, '10-12', 90), it('Elevação de gémeos', 4, '12', 60)] },
      { id: uid('wd_'), name: 'Superior 2', items: [it('Supino inclinado com halteres', 4, '10', 90), it('Elevações', 4, 'máx.', 120), it('Extensão de tríceps na polia', 3, '12', 60)] },
      { id: uid('wd_'), name: 'Inferior 2', items: [it('Peso morto', 3, '5', 180), it('Prensa de pernas', 3, '12', 120), it('Hip thrust', 3, '10', 90)] },
    ],
  };
}

function nutritionTemplate(id: string, studentId: string | null, kind: 'defice' | 'volume'): NutritionPlan {
  const f = kind === 'defice' ? 1 : 1.45;
  const q = (n: number) => Math.round(n * f);
  return {
    id,
    name: kind === 'defice' ? 'Défice moderado ~1800 kcal' : 'Volume limpo ~2800 kcal',
    studentId,
    updatedAt: addDays(T, -15),
    days: [
      {
        id: uid('nd_'),
        name: 'Dia de treino',
        meals: [
          { id: uid('pm_'), name: 'Pequeno-almoço', time: '08:00', items: [{ foodId: fd('Aveia em flocos'), qty: q(50) }, { foodId: fd('Iogurte grego natural'), qty: 170 }, { foodId: fd('Banana'), qty: 1 }], alternatives: [{ id: uid('po_'), name: 'Ovos e pão', items: [{ foodId: fd('Ovo inteiro'), qty: 2 }, { foodId: fd('Pão de mistura'), qty: q(60) }] }] },
          { id: uid('pm_'), name: 'Almoço', time: '13:00', items: [{ foodId: fd('Peito de frango'), qty: q(150) }, { foodId: fd('Arroz basmati cozido'), qty: q(150) }, { foodId: fd('Salada mista'), qty: 150 }, { foodId: fd('Azeite'), qty: 10 }], alternatives: [] },
          { id: uid('pm_'), name: 'Lanche', time: '17:00', items: [{ foodId: fd('Whey protein'), qty: 30 }, { foodId: fd('Maçã'), qty: 1 }, { foodId: fd('Amêndoas'), qty: q(15) }], alternatives: [] },
          { id: uid('pm_'), name: 'Jantar', time: '20:30', items: [{ foodId: fd('Pescada'), qty: q(180) }, { foodId: fd('Batata-doce cozida'), qty: q(180) }, { foodId: fd('Brócolos'), qty: 150 }], alternatives: [] },
        ],
      },
      {
        id: uid('nd_'),
        name: 'Dia de descanso',
        meals: [
          { id: uid('pm_'), name: 'Pequeno-almoço', time: '09:00', items: [{ foodId: fd('Ovo inteiro'), qty: 2 }, { foodId: fd('Pão de mistura'), qty: q(50) }, { foodId: fd('Abacate'), qty: 50 }], alternatives: [] },
          { id: uid('pm_'), name: 'Almoço', time: '13:00', items: [{ foodId: fd('Salmão'), qty: q(140) }, { foodId: fd('Salada mista'), qty: 200 }, { foodId: fd('Grão-de-bico cozido'), qty: q(80) }], alternatives: [] },
          { id: uid('pm_'), name: 'Jantar', time: '20:00', items: [{ foodId: fd('Carne de vaca magra'), qty: q(150) }, { foodId: fd('Brócolos'), qty: 200 }, { foodId: fd('Azeite'), qty: 10 }], alternatives: [] },
        ],
      },
    ],
  };
}

export function createSeed(): DB {
  const students: Student[] = [];
  const workoutPlans: WorkoutPlan[] = [workoutTemplateFull('wp_tpl_full', null), workoutTemplateUL('wp_tpl_ul', null)];
  const nutritionPlans: NutritionPlan[] = [nutritionTemplate('np_tpl_def', null, 'defice'), nutritionTemplate('np_tpl_vol', null, 'volume')];
  const assessments: Assessment[] = [];
  const chats: Chat[] = [];
  const planVersions: PlanVersion[] = [];

  const goals: Student['goal'][] = ['perder_peso', 'perder_peso', 'ganhar_massa', 'performance', 'saude'];
  const complaints: Record<number, string> = { 0: 'Dor no joelho esquerdo ao agachar', 6: 'Muito cansaço esta semana, dormi mal', 13: 'Senti o ombro direito no supino' };
  const inactiveIdx = new Set([3, 9, 14]);

  STUDENT_NAMES.forEach(([name, gender], i) => {
    const id = 'al_' + i;
    const goal = goals[i % goals.length];
    const months = 3 + Math.floor(rnd() * 10);
    const measurements = makeMeasurements(gender, goal, months);
    const coachId = i % 3 === 0 ? 'st_marco' : i % 3 === 1 ? 'st_sara' : 'st_marco';
    const inactiveFor = inactiveIdx.has(i) ? 7 + Math.floor(rnd() * 8) : Math.floor(rnd() * 3);
    const adherence = inactiveIdx.has(i) ? 0.3 : r(0.55, 0.95);
    const checkinDates: string[] = [];
    for (let d = 28; d >= inactiveFor; d--) if (rnd() < adherence) checkinDates.push(addDays(T, -d));
    const lastActivity = addDays(T, -inactiveFor);

    const wpId = 'wp_' + id;
    const npId = 'np_' + id;
    const wp = goal === 'ganhar_massa' || goal === 'performance' ? workoutTemplateUL(wpId, id) : workoutTemplateFull(wpId, id);
    const np = nutritionTemplate(npId, id, goal === 'ganhar_massa' ? 'volume' : 'defice');
    workoutPlans.push(wp);
    nutritionPlans.push(np);

    const birthYear = 1975 + Math.floor(rnd() * 30);
    const birthday = i === 4 ? `${birthYear}-${T.slice(5)}` : `${birthYear}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`;
    const joinedAt = measurements[0].date;
    const subscriptionEnd = i === 2 || i === 7 ? addDays(T, 3 + i % 4) : addDays(T, 10 + Math.floor(rnd() * 80));

    students.push({
      id,
      name,
      email: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(' ', '.') + '@exemplo.pt',
      phone: '+351 9' + Math.floor(10000000 + rnd() * 89999999),
      birthday,
      gender,
      tags: [pick(TAGS.slice(0, 3)), ...(rnd() > 0.7 ? [pick(TAGS.slice(3))] : [])],
      coachId,
      status: i === 17 ? 'pausado' : 'ativo',
      joinedAt,
      packageId: i % 4 === 0 ? 'pk_premium' : i % 3 === 0 ? 'pk_trimestral' : 'pk_mensal',
      subscriptionEnd,
      paymentStatus: i === 9 || i === 12 ? 'em_atraso' : 'pago',
      goal,
      workoutPlanId: wpId,
      nutritionPlanId: npId,
      protocolId: i % 2 === 0 ? 'pr_base' : null,
      courseIds: i % 3 === 0 ? ['cs_habitos'] : [],
      measurements,
      checkinDates,
      lastActivity,
      notes: '',
      gymId: seedGymFor(id),
      gymCheckins: seedGymCheckins(id, seedGymFor(id)),
    });

    // Avaliações
    const pendingCount = [2, 0, 1, 3, 1, 0, 2, 1, 0, 0, 1, 0, 0, 2, 0, 1, 0, 0][i];
    for (let k = 0; k < pendingCount; k++) {
      const type = k === 0 && i % 4 === 0 ? 'periodico' : k === 2 ? 'inicial' : 'diario';
      const complaint = k === 0 ? complaints[i] ?? '' : '';
      assessments.push({
        id: uid('av_'),
        studentId: id,
        type,
        date: addDays(T, -k - (i % 3)),
        status: 'pendente',
        hasPhotos: type !== 'diario',
        feedback: '',
        answers: [
          { question: 'Como avalias a tua energia (1 a 5)?', answer: String(2 + Math.floor(rnd() * 4)) },
          { question: 'Cumpriste o plano alimentar?', answer: pick(['Sim, a 100%', 'Quase todo', 'Falhei ao fim de semana']) },
          { question: 'Horas de sono', answer: String(5 + Math.floor(rnd() * 4)) },
          { question: 'Queixas ou dores?', answer: complaint || 'Nenhuma' },
          ...(type !== 'diario' ? [{ question: 'Peso desta manhã (kg)', answer: String(measurements[measurements.length - 1].weight) }] : []),
        ],
      });
    }
    for (let k = 0; k < 2; k++)
      assessments.push({
        id: uid('av_'),
        studentId: id,
        type: k ? 'periodico' : 'diario',
        date: addDays(T, -10 - k * 14),
        status: 'revisto',
        hasPhotos: !!k,
        feedback: 'Bom trabalho, mantém a consistência.',
        answers: [
          { question: 'Como avalias a tua energia (1 a 5)?', answer: '4' },
          { question: 'Queixas ou dores?', answer: 'Nenhuma' },
        ],
      });

    // Conversas
    const unread = i < 7 && i % 2 === 0;
    chats.push({
      id: 'ch_' + id,
      studentId: id,
      unread,
      color: i === 0 ? '#D63A2F' : i === 6 ? '#F2B705' : null,
      messages: [
        { id: uid('m_'), from: 'coach', text: 'Olá! Como correu o treino de ontem?', at: addDays(T, -2 - (i % 5)) + 'T09:12:00' },
        { id: uid('m_'), from: 'student', text: pick(['Correu bem, subi 2,5 kg no agachamento.', 'Um bocado cansado mas fiz tudo.', 'Falhei o último exercício, faltou tempo.', 'Top! Já sinto diferença.']), at: addDays(T, -2 - (i % 5)) + 'T18:40:00' },
        ...(unread ? [{ id: uid('m_'), from: 'student' as const, text: pick(['Posso trocar o jantar de quinta?', 'Amanhã não consigo ir, podemos remarcar?', 'Enviei a avaliação, vê quando puderes.']), at: addDays(T, -(i % 2)) + 'T21:05:00' }] : []),
      ],
    });
  });

  // Versões de plano para mostrar o histórico de alterações
  [0, 2, 5].forEach((i) => {
    const plan = workoutPlans.find((p) => p.id === 'wp_al_' + i)!;
    const v1 = structuredClone(plan);
    v1.days[0].items[0].sets = 3;
    v1.days[0].items[0].reps = '8-10';
    v1.days[0].items[1].rest = 90;
    v1.days[0].items.pop();
    planVersions.push({ id: uid('pv_'), kind: 'treino', planId: plan.id, studentId: plan.studentId, savedAt: addDays(T, -34) + 'T10:00:00', author: 'Marco Vieira', snapshot: v1 });
    const v2 = structuredClone(plan);
    v2.days[0].items[0].reps = '8';
    planVersions.push({ id: uid('pv_'), kind: 'treino', planId: plan.id, studentId: plan.studentId, savedAt: addDays(T, -20) + 'T18:30:00', author: 'Marco Vieira', snapshot: v2 });
    planVersions.push({ id: uid('pv_'), kind: 'treino', planId: plan.id, studentId: plan.studentId, savedAt: addDays(T, -6) + 'T11:15:00', author: 'Sara Lopes', snapshot: structuredClone(plan) });
  });

  // Versão de base para todos os planos de alunos, para o histórico ter sempre um ponto de partida.
  const versioned = new Set(planVersions.map((v) => v.planId));
  for (const plan of [...workoutPlans, ...nutritionPlans]) {
    if (!plan.studentId || versioned.has(plan.id)) continue;
    planVersions.push({
      id: uid('pv_'),
      kind: 'days' in plan && plan.days[0] && 'items' in plan.days[0] ? 'treino' : 'nutricao',
      planId: plan.id,
      studentId: plan.studentId,
      savedAt: plan.updatedAt + 'T09:00:00',
      author: 'Marco Vieira',
      snapshot: structuredClone(plan),
    });
  }

  staff[0].chatIds = chats.filter((c) => students.find((s) => s.id === c.studentId)!.coachId === 'st_marco').map((c) => c.id);
  staff[1].chatIds = chats.filter((c) => students.find((s) => s.id === c.studentId)!.coachId === 'st_sara').map((c) => c.id);

  const events: CalendarEvent[] = [
    { id: 'ev_1', title: 'Sessão PT', date: T, start: '08:00', end: '09:00', kind: 'sessao', studentId: null, recurrence: 'nenhuma', limit: 1, enrolled: ['al_1'], location: 'Estúdio' },
    { id: 'ev_2', title: 'Treino funcional em grupo', date: addDays(T, -7), start: '19:00', end: '20:00', kind: 'aula', studentId: null, recurrence: 'semanal', limit: 8, enrolled: ['al_0', 'al_4', 'al_6', 'al_8', 'al_10'], location: 'Sala 2' },
    { id: 'ev_3', title: 'Reavaliação física', date: addDays(T, 2), start: '10:00', end: '10:45', kind: 'avaliacao', studentId: null, recurrence: 'nenhuma', limit: 1, enrolled: ['al_3'], location: 'Estúdio' },
    { id: 'ev_4', title: 'Mobilidade online', date: addDays(T, -3), start: '12:30', end: '13:00', kind: 'aula', studentId: null, recurrence: 'semanal', limit: 20, enrolled: ['al_2', 'al_5', 'al_11'], location: 'Online' },
    { id: 'ev_5', title: 'Corrida 10 km', date: addDays(T, 5), start: '09:00', end: '10:00', kind: 'pessoal', studentId: 'al_0', recurrence: 'nenhuma', limit: null, enrolled: [], location: 'Marginal' },
    { id: 'ev_6', title: 'Aula de yoga', date: addDays(T, 1), start: '18:00', end: '19:00', kind: 'pessoal', studentId: 'al_6', recurrence: 'semanal', limit: null, enrolled: [], location: '' },
  ];

  return {
    version: 3,
    quickReplies: [...DEFAULT_QUICK_REPLIES],
    currentUserId: 'st_marco',
    staff,
    students,
    assessments,
    exercises,
    equipment: seedEquipment(),
    gyms: seedGyms(),
    gymRequests: [
      { id: 'gr_1', studentId: 'al_4', name: 'Ginásio da Universidade, Aveiro', status: 'pendente', createdAt: addDays(T, -1) + 'T19:20:00' },
    ],
    workoutPlans,
    foods,
    meals,
    nutritionPlans,
    recipeRequests: [
      { id: 'rr_1', studentId: 'al_0', mealId: 'ml_chili', note: 'Para os jantares de semana, se der.', status: 'pendente', createdAt: addDays(T, -1) + 'T20:14:00' },
      { id: 'rr_2', studentId: 'al_2', mealId: 'ml_papas', note: '', status: 'pendente', createdAt: T + 'T07:40:00' },
    ],
    planVersions,
    supplements: [
      { id: 'sp_creatina', name: 'Creatina monohidratada', brand: 'Genérica', defaultDose: '5 g', notes: 'Toma diária, a qualquer hora.' },
      { id: 'sp_whey', name: 'Whey protein', brand: 'Genérica', defaultDose: '30 g', notes: '' },
      { id: 'sp_d3', name: 'Vitamina D3', brand: 'Genérica', defaultDose: '2000 UI', notes: 'Com uma refeição que tenha gordura.' },
      { id: 'sp_omega', name: 'Ómega 3', brand: 'Genérica', defaultDose: '2 cápsulas', notes: '' },
      { id: 'sp_mg', name: 'Magnésio', brand: 'Genérica', defaultDose: '300 mg', notes: 'Ao deitar.' },
    ],
    protocols: [
      { id: 'pr_base', name: 'Base saúde', items: [{ supplementId: 'sp_d3', dose: '2000 UI', timing: 'Almoço' }, { supplementId: 'sp_omega', dose: '2 cápsulas', timing: 'Jantar' }, { supplementId: 'sp_mg', dose: '300 mg', timing: 'Ao deitar' }] },
      { id: 'pr_forca', name: 'Força e hipertrofia', items: [{ supplementId: 'sp_creatina', dose: '5 g', timing: 'Pequeno-almoço' }, { supplementId: 'sp_whey', dose: '30 g', timing: 'Pós-treino' }] },
    ],
    chats,
    events,
    questionnaires: [
      { id: 'qs_inicial', name: 'Anamnese inicial', kind: 'inicial', questions: [
        { id: 'q1', label: 'Qual é o teu objetivo principal?', type: 'escolha', options: ['Perder gordura', 'Ganhar massa muscular', 'Performance', 'Saúde geral'], required: true },
        { id: 'q2', label: 'Tens alguma lesão ou limitação?', type: 'texto', options: [], required: true },
        { id: 'q3', label: 'Quantos dias por semana podes treinar?', type: 'numero', options: [], required: true },
        { id: 'q4', label: 'Fotos de frente, costas e lado', type: 'foto', options: [], required: false },
      ] },
      { id: 'qs_periodico', name: 'Avaliação quinzenal', kind: 'periodico', questions: [
        { id: 'q1', label: 'Peso desta manhã (kg)', type: 'numero', options: [], required: true },
        { id: 'q2', label: 'Como te sentes com o plano?', type: 'escala', options: [], required: true },
        { id: 'q3', label: 'O que foi mais difícil?', type: 'texto', options: [], required: false },
        { id: 'q4', label: 'Fotos de progresso', type: 'foto', options: [], required: true },
      ] },
      { id: 'qs_diario', name: 'Registo diário', kind: 'diario', questions: [
        { id: 'q1', label: 'Treinaste hoje?', type: 'sim_nao', options: [], required: true },
        { id: 'q2', label: 'Energia (1 a 5)', type: 'escala', options: [], required: true },
        { id: 'q3', label: 'Horas de sono', type: 'numero', options: [], required: false },
        { id: 'q4', label: 'Queixas ou dores?', type: 'texto', options: [], required: false },
        ...DAILY_EXTRA_QUESTIONS,
      ] },
    ],
    welcomePacks: [
      { id: 'wp_online', name: 'Entrada online', message: 'Bem-vindo à equipa! Começa pela anamnese para eu preparar o teu plano.', questionnaireId: 'qs_inicial', workoutPlanId: 'wp_tpl_full', nutritionPlanId: 'np_tpl_def', protocolId: 'pr_base', courseIds: ['cs_habitos'], active: true },
    ],
    automations: [
      { id: 'au_1', name: 'Mensagem de boas-vindas', trigger: 'novo_aluno', days: 0, action: 'mensagem', text: 'Olá {nome}! Já tens acesso à app. Qualquer dúvida estou por aqui.', active: true, runs: 14, lastRun: addDays(T, -3) },
      { id: 'au_2', name: 'Alerta de inatividade', trigger: 'sem_atividade', days: 7, action: 'tarefa', text: 'Ligar a {nome}: sem atividade há {dias} dias', active: true, runs: 6, lastRun: addDays(T, -1) },
      { id: 'au_3', name: 'Renovação próxima', trigger: 'subscricao_expira', days: 7, action: 'mensagem', text: 'Olá {nome}, a tua subscrição termina a {data}. Queres renovar?', active: true, runs: 9, lastRun: addDays(T, -2) },
      { id: 'au_4', name: 'Parabéns', trigger: 'aniversario', days: 0, action: 'mensagem', text: 'Parabéns {nome}! Hoje o treino é mais leve 🎉', active: false, runs: 2, lastRun: null },
    ],
    vault: [
      { id: 'vf_1', name: 'Guia de técnica de agachamento.txt', folder: 'Guias', size: 1240, mime: 'text/plain', dataUrl: 'data:text/plain;charset=utf-8,' + encodeURIComponent('Pés à largura dos ombros, joelhos acompanham a ponta dos pés, peito aberto.'), sharedWith: 'todos', createdAt: addDays(T, -40) },
      { id: 'vf_2', name: 'Lista de compras base.txt', folder: 'Nutrição', size: 860, mime: 'text/plain', dataUrl: 'data:text/plain;charset=utf-8,' + encodeURIComponent('Frango, ovos, aveia, iogurte grego, fruta, legumes, arroz, batata-doce, azeite.'), sharedWith: 'todos', createdAt: addDays(T, -22) },
      { id: 'vf_3', name: 'Contrato de acompanhamento.txt', folder: 'Administrativo', size: 2100, mime: 'text/plain', dataUrl: 'data:text/plain;charset=utf-8,' + encodeURIComponent('Modelo de contrato.'), sharedWith: [], createdAt: addDays(T, -60) },
    ],
    packages: [
      { id: 'pk_mensal', name: 'Online mensal', price: 49, period: 'mensal', features: ['Plano de treino', 'Plano alimentar', 'Check-in quinzenal', 'Chat'], active: true },
      { id: 'pk_trimestral', name: 'Online trimestral', price: 129, period: 'trimestral', features: ['Tudo do mensal', 'Videochamada mensal'], active: true },
      { id: 'pk_premium', name: 'Premium híbrido', price: 149, period: 'mensal', features: ['4 sessões presenciais', 'Plano completo', 'Chat prioritário'], active: true },
    ],
    courses: [
      { id: 'cs_habitos', title: 'Hábitos que ficam', description: 'Seis semanas para construir rotinas de sono, alimentação e treino.', published: true, modules: [
        { id: 'mo_1', title: 'Sono', lessons: [{ id: 'le_1', title: 'Porque o sono manda no resto', kind: 'video', content: 'https://exemplo.pt/video/sono', minutes: 8 }, { id: 'le_2', title: 'Rotina de desligar', kind: 'texto', content: 'Uma hora antes de deitar: luz baixa, sem ecrãs, quarto fresco.', minutes: 4 }] },
        { id: 'mo_2', title: 'Alimentação', lessons: [{ id: 'le_3', title: 'O prato equilibrado', kind: 'video', content: 'https://exemplo.pt/video/prato', minutes: 10 }] },
      ] },
      { id: 'cs_tecnica', title: 'Técnica dos básicos', description: 'Agachamento, peso morto e supino explicados passo a passo.', published: false, modules: [{ id: 'mo_3', title: 'Agachamento', lessons: [] }] },
    ],
    communities: [
      { id: 'cm_geral', name: 'Equipa Estúdio Força', description: 'O espaço de todos os alunos.', memberIds: 'todos', posts: [
        { id: 'po_1', author: 'st_marco', text: 'Desafio de dezembro: 8000 passos por dia durante 4 semanas. Quem entra?', at: addDays(T, -2) + 'T10:00:00', likes: ['al_0', 'al_2', 'al_6'], pinned: true, comments: [{ id: 'co_1', author: 'al_2', text: 'Contem comigo!', at: addDays(T, -2) + 'T11:20:00' }] },
        { id: 'po_2', author: 'al_6', text: 'Primeira elevação sem ajuda hoje 💪', at: addDays(T, -1) + 'T19:30:00', likes: ['st_marco', 'st_sara'], pinned: false, comments: [] },
      ] },
      { id: 'cm_comp', name: 'Grupo de competição', description: 'Preparação para provas de força.', memberIds: ['al_3', 'al_5', 'al_13'], posts: [] },
    ],
    integrations: [
      ['stripe', 'Stripe', 'Pagamentos', 'Cobra subscrições e pacotes automaticamente.'],
      ['mbway', 'MB WAY', 'Pagamentos', 'Pagamentos rápidos para alunos em Portugal.'],
      ['gcal', 'Google Calendar', 'Calendário', 'Sincroniza sessões e aulas com a tua agenda.'],
      ['zoom', 'Zoom', 'Videochamadas', 'Cria links de chamada para sessões online.'],
      ['applehealth', 'Apple Health', 'Saúde', 'Importa passos, sono e treinos dos alunos.'],
      ['healthconnect', 'Health Connect', 'Saúde', 'Dados de atividade de telemóveis Android.'],
      ['garmin', 'Garmin', 'Wearables', 'Treinos e frequência cardíaca.'],
      ['balanca', 'Balança inteligente', 'Medições', 'Peso e composição corporal automáticos.'],
      ['moloni', 'Moloni', 'Faturação', 'Emite faturas certificadas em cada pagamento.'],
      ['zapier', 'Zapier', 'Automação', 'Liga a plataforma a mais de 5000 apps.'],
    ].map(([id, name, category, description], i) => ({ id, name, category, description, connected: i === 0 || i === 2 })),
    tasks: [
      { id: 'tk_1', text: 'Preparar plano de dezembro para a Inês', done: false, due: addDays(T, 2), studentId: 'al_0' },
      { id: 'tk_2', text: 'Rever fotos de progresso do Tiago', done: false, due: T, studentId: 'al_5' },
      { id: 'tk_3', text: 'Publicar desafio de dezembro na comunidade', done: true, due: null, studentId: null },
    ],
    tickets: [
      { id: 'ti_1', subject: 'Exportar avaliações em PDF', message: 'Consigo exportar várias de uma vez?', status: 'resolvido', createdAt: addDays(T, -30), replies: [{ from: 'suporte', text: 'Sim, na lista de avaliações usa "Exportar seleção".', at: addDays(T, -29) }] },
    ],
    notifications: [
      { id: 'no_1', kind: 'receita', text: 'Inês Carvalho pediu “Chili de vaca e feijão”', link: '/nutricao/plano/np_al_0?pedido=rr_1', read: false, at: addDays(T, -1) + 'T20:14:00' },
      { id: 'no_2', kind: 'receita', text: 'Marta Ribeiro pediu “Papas de aveia com frutos vermelhos”', link: '/nutricao/plano/np_al_2?pedido=rr_2', read: false, at: T + 'T07:40:00' },
      { id: 'no_3', kind: 'avaliacao', text: 'Pedro Nunes enviou uma avaliação', link: '/avaliacoes', read: false, at: T + 'T08:05:00' },
      { id: 'no_4', kind: 'sistema', text: 'Pagamento de João Matos em atraso', link: '/alunos/al_9', read: true, at: addDays(T, -2) + 'T09:00:00' },
    ],
    branding: {
      appName: 'Estúdio Força',
      primary: '#1F5FBF',
      accent: '#F2B705',
      logoText: 'EF',
      welcome: 'Bem-vindo! O teu treino de hoje está pronto.',
      modules: { treino: true, nutricao: true, receitas: true, checkin: true, agenda: true, chat: true },
    },
    settings: {
      businessName: 'Estúdio Força',
      coachName: 'Marco Vieira',
      email: 'marco@estudioforca.pt',
      phone: '+351 912 000 000',
      bio: 'Treinador de força e composição corporal. Acompanhamento online e presencial em Cascais.',
      copilotEnabled: true,
      notifyEmail: true,
      notifyPush: true,
      platformPlan: 'base',
      publicSlug: 'estudio-forca',
    },
    referral: {
      code: 'FORCA-7K2',
      entries: [
        { name: 'Ricardo S.', date: addMonths(T, -3), status: 'ativo', earnings: 30 },
        { name: 'Patrícia M.', date: addMonths(T, -1), status: 'ativo', earnings: 15 },
        { name: 'Gonçalo T.', date: addDays(T, -5), status: 'pendente', earnings: 0 },
      ],
    },
    announcements: [
      { id: 'an_1', title: 'Pedidos de receita', body: 'Torna uma refeição pública e os alunos podem pedi-la a partir da app. Os pedidos aparecem nas notificações e no plano alimentar de cada aluno.', date: addDays(T, -2) },
      { id: 'an_2', title: 'Histórico do plano', body: 'Cada vez que guardas um plano fica uma versão. Compara versões lado a lado e restaura uma anterior com um clique.', date: addDays(T, -12) },
      { id: 'an_3', title: 'Transformações', body: 'Ordena os alunos pela evolução de qualquer medida e descarrega o antes e depois pronto a publicar.', date: addDays(T, -25) },
    ],
    dismissedInsights: [],
  };
}
