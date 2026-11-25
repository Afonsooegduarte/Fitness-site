import type { DB, Equipment, EquipmentCategory, Exercise, Gym, Question, Student } from '../store/types';
import { today } from './utils';
import { seedGymCheckins } from './streak';

// Catálogo próprio de ginásios e equipamentos (opção A): não existe uma base de dados pública
// com o equipamento de cada ginásio, por isso a equipa mantém esta lista à mão.
// Os ginásios de exemplo são fictícios.

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = ['Pesos livres', 'Máquinas', 'Polias', 'Cardio', 'Acessórios'];

export function seedEquipment(): Equipment[] {
  const rows: [string, string, EquipmentCategory][] = [
    ['eq_barra', 'Barra olímpica e discos', 'Pesos livres'],
    ['eq_rack', 'Rack de agachamento', 'Pesos livres'],
    ['eq_banco', 'Banco ajustável', 'Pesos livres'],
    ['eq_halteres', 'Halteres', 'Pesos livres'],
    ['eq_kb', 'Kettlebells', 'Pesos livres'],
    ['eq_barra_fixa', 'Barra fixa', 'Pesos livres'],
    ['eq_paralelas', 'Paralelas', 'Pesos livres'],
    ['eq_prensa', 'Prensa de pernas', 'Máquinas'],
    ['eq_extensao', 'Cadeira extensora', 'Máquinas'],
    ['eq_femoral', 'Máquina de curl femoral', 'Máquinas'],
    ['eq_gemeos', 'Máquina de gémeos', 'Máquinas'],
    ['eq_hack', 'Hack squat', 'Máquinas'],
    ['eq_smith', 'Máquina Smith', 'Máquinas'],
    ['eq_peito', 'Máquina de peito', 'Máquinas'],
    ['eq_remada_maq', 'Máquina de remada', 'Máquinas'],
    ['eq_abdutora', 'Abdutora e adutora', 'Máquinas'],
    ['eq_polia_dupla', 'Polia dupla (crossover)', 'Polias'],
    ['eq_puxada', 'Máquina de puxada', 'Polias'],
    ['eq_remada_baixa', 'Remada baixa na polia', 'Polias'],
    ['eq_remo', 'Remo ergómetro', 'Cardio'],
    ['eq_passadeira', 'Passadeira', 'Cardio'],
    ['eq_bike', 'Bicicleta', 'Cardio'],
    ['eq_eliptica', 'Elíptica', 'Cardio'],
    ['eq_roda', 'Roda abdominal', 'Acessórios'],
    ['eq_elasticos', 'Elásticos', 'Acessórios'],
    ['eq_tapete', 'Tapetes', 'Acessórios'],
  ];
  return rows.map(([id, name, category]) => ({ id, name, category, brand: '' }));
}

// Equipamento necessário para cada exercício de exemplo (pelo nome).
export const EXERCISE_NEEDS: Record<string, string[]> = {
  'Agachamento com barra': ['eq_barra', 'eq_rack'],
  'Agachamento goblet': ['eq_kb'],
  'Peso morto': ['eq_barra'],
  'Peso morto romeno': ['eq_halteres'],
  'Hip thrust': ['eq_barra', 'eq_banco'],
  'Lunge búlgaro': ['eq_halteres', 'eq_banco'],
  'Prensa de pernas': ['eq_prensa'],
  'Extensão de pernas': ['eq_extensao'],
  'Curl femoral deitado': ['eq_femoral'],
  'Elevação de gémeos': ['eq_gemeos'],
  'Supino plano': ['eq_barra', 'eq_banco'],
  'Supino inclinado com halteres': ['eq_halteres', 'eq_banco'],
  'Flexões': [],
  'Crossover na polia': ['eq_polia_dupla'],
  'Remada com barra': ['eq_barra'],
  'Puxada à frente': ['eq_puxada'],
  'Elevações': ['eq_barra_fixa'],
  'Remada unilateral': ['eq_halteres', 'eq_banco'],
  'Face pull': ['eq_polia_dupla'],
  'Press militar': ['eq_barra'],
  'Elevação lateral': ['eq_halteres'],
  'Curl de bíceps': ['eq_halteres'],
  'Curl martelo': ['eq_halteres'],
  'Extensão de tríceps na polia': ['eq_polia_dupla'],
  'Mergulhos': ['eq_paralelas'],
  'Prancha': [],
  'Pallof press': ['eq_polia_dupla'],
  'Abdominal roda': ['eq_roda'],
  'Kettlebell swing': ['eq_kb'],
  'Remo ergómetro': ['eq_remo'],
};

export function seedGyms(): Gym[] {
  const all = seedEquipment().map((e) => e.id);
  const without = (ids: string[]) => all.filter((x) => !ids.includes(x));
  const t = today();
  return [
    {
      id: 'gy_estudio', name: 'Estúdio Força', chain: '', address: 'Lisboa', notes: 'O nosso estúdio. Sem máquinas guiadas.', updatedAt: t,
      equipmentIds: ['eq_barra', 'eq_rack', 'eq_banco', 'eq_halteres', 'eq_kb', 'eq_barra_fixa', 'eq_paralelas', 'eq_polia_dupla', 'eq_remo', 'eq_bike', 'eq_roda', 'eq_elasticos', 'eq_tapete'],
    },
    { id: 'gy_atlas_alv', name: 'Atlas Fitness Alvalade', chain: 'Atlas Fitness', address: 'Lisboa', notes: '', updatedAt: t, equipmentIds: all },
    { id: 'gy_atlas_mat', name: 'Atlas Fitness Matosinhos', chain: 'Atlas Fitness', address: 'Matosinhos', notes: 'Sem hack squat nem Smith.', updatedAt: t, equipmentIds: without(['eq_hack', 'eq_smith']) },
    {
      id: 'gy_bairro', name: 'Ginásio do Bairro', chain: '', address: 'Coimbra', notes: 'Espaço pequeno, muito cardio.', updatedAt: t,
      equipmentIds: ['eq_halteres', 'eq_banco', 'eq_kb', 'eq_barra_fixa', 'eq_passadeira', 'eq_bike', 'eq_eliptica', 'eq_elasticos', 'eq_tapete'],
    },
  ];
}

// Ginásio de exemplo para os alunos de exemplo (al_0, al_1, ...). Alguns ficam sem ginásio.
export function seedGymFor(studentId: string): string | null {
  const m = /^al_(\d+)$/.exec(studentId);
  if (!m) return null;
  return ['gy_estudio', 'gy_atlas_alv', 'gy_bairro', 'gy_atlas_mat', null][+m[1] % 5];
}

// Perguntas acrescentadas ao registo diário: fotos do dia e notas que o aluno pode ditar.
export const DAILY_EXTRA_QUESTIONS: Question[] = [
  { id: 'q5', label: 'Fotos do dia (refeições, treino, corpo)', type: 'foto', options: [], required: false },
  { id: 'q6', label: 'Como correu o dia?', type: 'texto', options: [], required: false },
];

export const DEFAULT_QUICK_REPLIES = [
  'Bom trabalho, mantém a consistência.',
  'Atenção ao sono: tenta chegar às 7 horas esta semana.',
  'Boa evolução nas fotos, nota-se a diferença.',
  'Bebe mais água ao longo do dia, pelo menos 2 litros.',
  'Se a dor continuar, para esse exercício e fala comigo.',
  'Esta semana vamos subir um pouco a carga.',
];

// Acrescenta o que falta a dados guardados por versões anteriores (localStorage ou ficheiro importado).
export function migrate(raw: DB): DB {
  const db = raw as DB & Partial<Pick<DB, 'equipment' | 'gyms' | 'gymRequests'>>;
  if (!db.equipment) db.equipment = seedEquipment();
  if (!db.gyms) db.gyms = seedGyms();
  if (!db.gymRequests) db.gymRequests = [];
  const known = new Set(db.equipment.map((e) => e.id));
  for (const ex of db.exercises) {
    if (!Array.isArray((ex as Partial<Exercise>).needs)) ex.needs = (EXERCISE_NEEDS[ex.name] ?? []).filter((id) => known.has(id));
  }
  const gymIds = new Set(db.gyms.map((g) => g.id));
  for (const s of db.students) {
    if ((s as Partial<Student>).gymId === undefined) {
      const g = seedGymFor(s.id);
      s.gymId = g && gymIds.has(g) ? g : null;
    }
    if (!Array.isArray((s as Partial<Student>).gymCheckins)) s.gymCheckins = /^al_\d+$/.test(s.id) ? seedGymCheckins(s.id, s.gymId) : [];
  }
  if (db.version < 3) {
    // Só no questionário diário de exemplo e só uma vez, para não mexer em questionários do treinador.
    const daily = db.questionnaires.find((q) => q.id === 'qs_diario');
    if (daily && !daily.questions.some((x) => x.type === 'foto')) {
      for (const extra of DAILY_EXTRA_QUESTIONS) {
        if (!daily.questions.some((x) => x.id === extra.id)) daily.questions.push({ ...extra });
      }
    }
  }
  if (!Array.isArray(db.quickReplies)) db.quickReplies = [...DEFAULT_QUICK_REPLIES];
  if (db.version < 3) db.version = 3;
  return db;
}

/* ---------- Consultas ---------- */

export const gymById = (db: DB, id: string | null | undefined) => (id ? db.gyms.find((g) => g.id === id) : undefined);

export const gymOf = (db: DB, s: Student | undefined | null) => (s ? gymById(db, s.gymId) : undefined);

// Equipamento que falta no ginásio para fazer o exercício. Sem ginásio definido, não falta nada.
export function missingEquipment(db: DB, ex: Exercise | undefined, gym: Gym | undefined): Equipment[] {
  if (!ex || !gym) return [];
  const has = new Set(gym.equipmentIds);
  return ex.needs.filter((id) => !has.has(id)).map((id) => db.equipment.find((e) => e.id === id)).filter((e): e is Equipment => !!e);
}

export const canDoAt = (db: DB, ex: Exercise | undefined, gym: Gym | undefined) => missingEquipment(db, ex, gym).length === 0;

export const studentsAt = (db: DB, gymId: string) => db.students.filter((s) => s.gymId === gymId && s.status !== 'arquivado');

// Exercícios da biblioteca que dá para fazer no ginásio.
export const exercisesAt = (db: DB, gym: Gym) => db.exercises.filter((e) => canDoAt(db, e, gym));
