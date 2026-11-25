import { useRoute } from './lib/router';
import { Shell } from './components/Shell';
import { TodayPage, CopilotPage } from './pages/Today';
import { StudentsPage } from './pages/Students';
import { StudentDetailPage } from './pages/StudentDetail';
import { MessagesPage } from './pages/Messages';
import { AssessmentsPage } from './pages/Assessments';
import { CalendarPage } from './pages/Calendar';
import { WorkoutsPage, WorkoutEditorPage } from './pages/Workouts';
import { NutritionPage, NutritionEditorPage } from './pages/Nutrition';
import { SupplementsPage, QuestionnairesPage, CoursesPage, VaultPage } from './pages/Library';
import { WelcomePacksPage, AutomationsPage } from './pages/Automation';
import { StaffPage, CommunitiesPage } from './pages/Team';
import { PackagesPage, MyAppPage, IntegrationsPage, ReferralPage, SubscriptionPage, SettingsPage, SupportPage } from './pages/Business';
import { StudentAppPage, StudentOnlyPage } from './student/StudentApp';
import { GymsPage } from './pages/Gyms';
import { StreakPage } from './pages/Streak';
import { Empty } from './components/ui';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const route = useRoute();
  const [a, b, c] = route.parts;
  // Link para enviar ao aluno: só a app dele, em ecrã inteiro, sem o menu do treinador.
  if (a === 'app') {
    return <ErrorBoundary key={route.path}><StudentOnlyPage /></ErrorBoundary>;
  }
  let page;
  switch (a) {
    case undefined: page = <TodayPage />; break;
    case 'copilot': page = <CopilotPage />; break;
    case 'alunos': page = b ? <StudentDetailPage id={b} route={route} /> : <StudentsPage route={route} />; break;
    case 'mensagens': page = <MessagesPage route={route} />; break;
    case 'avaliacoes': page = <AssessmentsPage route={route} />; break;
    case 'calendario': page = <CalendarPage />; break;
    case 'streak': page = <StreakPage />; break;
    case 'treinos': page = b === 'plano' && c ? <WorkoutEditorPage id={c} /> : <WorkoutsPage route={route} />; break;
    case 'nutricao': page = b === 'plano' && c ? <NutritionEditorPage id={c} route={route} /> : <NutritionPage route={route} />; break;
    case 'ginasios': page = <GymsPage route={route} />; break;
    case 'suplementacao': page = <SupplementsPage />; break;
    case 'questionarios': page = <QuestionnairesPage />; break;
    case 'cursos': page = <CoursesPage />; break;
    case 'cofre': page = <VaultPage />; break;
    case 'boas-vindas': page = <WelcomePacksPage />; break;
    case 'automacoes': page = <AutomationsPage />; break;
    case 'equipa': page = <StaffPage />; break;
    case 'comunidades': page = <CommunitiesPage />; break;
    case 'planos': page = <PackagesPage />; break;
    case 'app': page = <MyAppPage />; break;
    case 'integracoes': page = <IntegrationsPage />; break;
    case 'indicacoes': page = <ReferralPage />; break;
    case 'subscricao': page = <SubscriptionPage />; break;
    case 'definicoes': page = <SettingsPage />; break;
    case 'suporte': page = <SupportPage />; break;
    case 'aluno': page = <StudentAppPage />; break;
    default: page = <div className="page"><Empty title="Página não encontrada" text="Usa o menu para voltar a uma secção." /></div>;
  }
  return (
    <Shell route={route}>
      <ErrorBoundary key={route.path}>{page}</ErrorBoundary>
    </Shell>
  );
}
