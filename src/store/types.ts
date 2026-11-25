// Modelo de dados da plataforma. Tudo o que é persistido vive em `DB`.
// Para ligar a uma API real, substitui o ficheiro store/persist.ts por chamadas HTTP.

export type ID = string;

export type Role = 'leader' | 'coach' | 'nutritionist';

export interface StaffMember {
  id: ID;
  name: string;
  email: string;
  role: Role;
  status: 'ativo' | 'convidado';
  chatIds: ID[];
  color: string;
}

export interface Measurement {
  date: string; // ISO yyyy-mm-dd
  weight: number;
  bodyFat: number;
  leanMass: number;
  visceral: number;
  waist: number;
  abdomen: number;
  hip: number;
  chest: number;
  arm: number;
  thigh: number;
  photos: boolean;
}

export type StudentStatus = 'ativo' | 'pausado' | 'arquivado';

export interface Student {
  id: ID;
  name: string;
  email: string;
  phone: string;
  birthday: string;
  gender: 'F' | 'M';
  tags: string[];
  coachId: ID;
  status: StudentStatus;
  joinedAt: string;
  packageId: ID | null;
  subscriptionEnd: string;
  paymentStatus: 'pago' | 'em_atraso';
  goal: 'perder_peso' | 'ganhar_massa' | 'performance' | 'saude';
  workoutPlanId: ID | null;
  nutritionPlanId: ID | null;
  protocolId: ID | null;
  courseIds: ID[];
  measurements: Measurement[];
  checkinDates: string[];
  lastActivity: string;
  notes: string;
  gymId: ID | null; // ginásio onde o aluno treina
  gymCheckins: GymCheckin[]; // cada vez que o aluno marca "estou no ginásio"
  reminder?: { on: boolean; time: string }; // lembrete diário do registo, hora local hh:mm
  setLogs?: SetLog[]; // séries feitas no treino guiado
}

// Uma série feita no treino guiado.
export interface SetLog {
  date: string; // yyyy-mm-dd
  exerciseId: ID;
  set: number; // 1, 2, 3...
  weight: number | null; // kg
  reps: string;
}

// Uma ida ao ginásio. Várias no mesmo dia contam como um dia só para o streak.
export interface GymCheckin {
  at: string; // data e hora locais, yyyy-mm-ddThh:mm:ss
  gymId: ID | null;
}

/* ---------- Ginásios e equipamentos ---------- */

export type EquipmentCategory = 'Pesos livres' | 'Máquinas' | 'Polias' | 'Cardio' | 'Acessórios';

// Tipo de equipamento do catálogo (ex.: "Prensa de pernas"). O catálogo é nosso, não vem de nenhuma API externa.
export interface Equipment {
  id: ID;
  name: string;
  category: EquipmentCategory;
  brand: string; // opcional; vazio = não indicado
}

export interface Gym {
  id: ID;
  name: string; // ex.: "Viva Gym Alvalade"
  chain: string; // ex.: "Viva Gym"; vazio = independente
  address: string;
  equipmentIds: ID[];
  notes: string;
  updatedAt: string;
}

// Pedido do aluno para acrescentar um ginásio que ainda não está no catálogo.
export interface GymRequest {
  id: ID;
  studentId: ID;
  name: string;
  status: 'pendente' | 'adicionado' | 'dispensado';
  createdAt: string;
}

export type AssessmentType = 'diario' | 'inicial' | 'periodico';

export interface Assessment {
  id: ID;
  studentId: ID;
  type: AssessmentType;
  date: string;
  status: 'pendente' | 'revisto';
  answers: { question: string; answer: string }[];
  feedback: string;
  hasPhotos: boolean;
  photos?: string[]; // fotos reais enviadas pelo aluno (data URL JPEG comprimido)
}

export interface Exercise {
  id: ID;
  name: string;
  muscle: string;
  equipment: string; // descrição livre do material
  needs: ID[]; // equipamentos do catálogo necessários; vazio = dá para fazer em qualquer sítio
  videoUrl: string;
  instructions: string;
}

export interface WorkoutItem {
  id: ID;
  exerciseId: ID;
  sets: number;
  reps: string;
  rest: number | null; // segundos; null = por preencher (conta como 0)
  notes: string;
  group: string; // ex.: "A" para superset/circuito; vazio = isolado
  alternatives: ID[];
}

export interface WorkoutDay {
  id: ID;
  name: string;
  items: WorkoutItem[];
}

export interface WorkoutPlan {
  id: ID;
  name: string;
  description: string;
  studentId: ID | null; // null = modelo da biblioteca
  days: WorkoutDay[];
  updatedAt: string;
}

export interface Food {
  id: ID;
  name: string;
  kcal: number; // por 100 g ou por unidade
  p: number;
  c: number;
  f: number;
  unit: 'g' | 'un';
  image: string; // emoji ou data URL
}

export interface FoodPortion {
  foodId: ID;
  qty: number;
}

export interface Meal {
  id: ID;
  name: string;
  items: FoodPortion[];
  isPublic: boolean;
  photo: string; // data URL ou ''
  notes: string;
}

export interface PlanMealOption {
  id: ID;
  name: string;
  items: FoodPortion[];
}

export interface PlanMeal {
  id: ID;
  name: string;
  time: string;
  items: FoodPortion[];
  alternatives: PlanMealOption[];
}

export interface NutritionDay {
  id: ID;
  name: string;
  meals: PlanMeal[];
}

export interface NutritionPlan {
  id: ID;
  name: string;
  studentId: ID | null;
  days: NutritionDay[];
  updatedAt: string;
}

export interface RecipeRequest {
  id: ID;
  studentId: ID;
  mealId: ID;
  note: string;
  status: 'pendente' | 'adicionado' | 'dispensado';
  createdAt: string;
}

export interface PlanVersion {
  id: ID;
  kind: 'treino' | 'nutricao';
  planId: ID;
  studentId: ID | null;
  savedAt: string;
  author: string;
  snapshot: WorkoutPlan | NutritionPlan;
}

export interface Supplement {
  id: ID;
  name: string;
  brand: string;
  defaultDose: string;
  notes: string;
}

export interface Protocol {
  id: ID;
  name: string;
  items: { supplementId: ID; dose: string; timing: string }[];
}

export interface ChatMessage {
  id: ID;
  from: 'coach' | 'student';
  text: string;
  at: string;
}

export interface Chat {
  id: ID;
  studentId: ID;
  messages: ChatMessage[];
  unread: boolean;
  color: string | null; // cor do "marcar como não lido"
}

export type Recurrence = 'nenhuma' | 'semanal' | 'quinzenal' | 'mensal';

export interface CalendarEvent {
  id: ID;
  title: string;
  date: string;
  start: string;
  end: string;
  kind: 'sessao' | 'aula' | 'avaliacao' | 'pessoal';
  studentId: ID | null; // eventos pessoais registados pelo aluno
  recurrence: Recurrence;
  limit: number | null;
  enrolled: ID[];
  location: string;
}

export type QuestionType = 'texto' | 'numero' | 'escolha' | 'escala' | 'sim_nao' | 'foto';

export interface Question {
  id: ID;
  label: string;
  type: QuestionType;
  options: string[];
  required: boolean;
}

export interface Questionnaire {
  id: ID;
  name: string;
  kind: AssessmentType;
  questions: Question[];
}

export interface WelcomePack {
  id: ID;
  name: string;
  message: string;
  questionnaireId: ID | null;
  workoutPlanId: ID | null;
  nutritionPlanId: ID | null;
  protocolId: ID | null;
  courseIds: ID[];
  active: boolean;
}

export type AutomationTrigger = 'novo_aluno' | 'sem_atividade' | 'subscricao_expira' | 'aniversario' | 'pagamento_atraso';
export type AutomationAction = 'mensagem' | 'tarefa' | 'notificacao';

export interface Automation {
  id: ID;
  name: string;
  trigger: AutomationTrigger;
  days: number;
  action: AutomationAction;
  text: string;
  active: boolean;
  runs: number;
  lastRun: string | null;
}

export interface VaultFile {
  id: ID;
  name: string;
  folder: string;
  size: number;
  mime: string;
  dataUrl: string;
  sharedWith: 'todos' | ID[];
  createdAt: string;
}

export interface CoachingPackage {
  id: ID;
  name: string;
  price: number;
  period: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'unico';
  features: string[];
  active: boolean;
}

export interface Lesson {
  id: ID;
  title: string;
  kind: 'video' | 'texto';
  content: string;
  minutes: number;
}

export interface Course {
  id: ID;
  title: string;
  description: string;
  published: boolean;
  modules: { id: ID; title: string; lessons: Lesson[] }[];
}

export interface Post {
  id: ID;
  author: ID; // id do staff ou do aluno
  text: string;
  at: string;
  likes: ID[];
  pinned: boolean;
  comments: { id: ID; author: ID; text: string; at: string }[];
}

export interface Community {
  id: ID;
  name: string;
  description: string;
  memberIds: 'todos' | ID[];
  posts: Post[];
}

export interface Integration {
  id: ID;
  name: string;
  category: string;
  description: string;
  connected: boolean;
}

export interface Task {
  id: ID;
  text: string;
  done: boolean;
  due: string | null;
  studentId: ID | null;
}

export interface Ticket {
  id: ID;
  subject: string;
  message: string;
  status: 'aberto' | 'resolvido';
  createdAt: string;
  replies: { from: 'eu' | 'suporte'; text: string; at: string }[];
}

export interface AppNotification {
  id: ID;
  kind: 'receita' | 'avaliacao' | 'mensagem' | 'sistema' | 'automacao' | 'ginasio';
  text: string;
  link: string;
  read: boolean;
  at: string;
}

export interface Branding {
  appName: string;
  primary: string;
  accent: string;
  logoText: string;
  welcome: string;
  modules: { treino: boolean; nutricao: boolean; receitas: boolean; checkin: boolean; agenda: boolean; chat: boolean };
}

export interface Settings {
  businessName: string;
  coachName: string;
  email: string;
  phone: string;
  bio: string;
  copilotEnabled: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  platformPlan: 'base' | 'pro' | 'plus';
  publicSlug: string;
}

export interface Referral {
  code: string;
  entries: { name: string; date: string; status: 'pendente' | 'ativo'; earnings: number }[];
}

export interface Announcement {
  id: ID;
  title: string;
  body: string;
  date: string;
}

export interface DB {
  version: number;
  quickReplies?: string[]; // respostas rápidas do treinador (feedback e mensagens)
  currentUserId: ID; // quem está a "ver como"
  staff: StaffMember[];
  students: Student[];
  assessments: Assessment[];
  exercises: Exercise[];
  equipment: Equipment[];
  gyms: Gym[];
  gymRequests: GymRequest[];
  workoutPlans: WorkoutPlan[];
  foods: Food[];
  meals: Meal[];
  nutritionPlans: NutritionPlan[];
  recipeRequests: RecipeRequest[];
  planVersions: PlanVersion[];
  supplements: Supplement[];
  protocols: Protocol[];
  chats: Chat[];
  events: CalendarEvent[];
  questionnaires: Questionnaire[];
  welcomePacks: WelcomePack[];
  automations: Automation[];
  vault: VaultFile[];
  packages: CoachingPackage[];
  courses: Course[];
  communities: Community[];
  integrations: Integration[];
  tasks: Task[];
  tickets: Ticket[];
  notifications: AppNotification[];
  branding: Branding;
  settings: Settings;
  referral: Referral;
  announcements: Announcement[];
  dismissedInsights: string[];
}
