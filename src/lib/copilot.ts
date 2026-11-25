import type { DB } from '../store/types';
import { visibleStudents, lastM, pendingAssessments } from './domain';
import { diffDays, today, num, fmtDate } from './utils';

export type InsightKind = 'queixa' | 'inatividade' | 'estagnado' | 'renovacao' | 'pagamento' | 'progressao' | 'conquista';

export interface Insight {
  id: string;
  kind: InsightKind;
  studentId: string;
  title: string;
  why: string[];
  priority: number;
  action: { label: string; message?: string; link?: string };
}

export const INSIGHT_META: Record<InsightKind, { label: string; color: string }> = {
  queixa: { label: 'Queixa', color: '#D63A2F' },
  inatividade: { label: 'Inatividade', color: '#D63A2F' },
  pagamento: { label: 'Pagamento', color: '#D63A2F' },
  renovacao: { label: 'Renovação', color: '#F2B705' },
  estagnado: { label: 'Peso estagnado', color: '#F2B705' },
  progressao: { label: 'Progressão', color: '#2E9E5B' },
  conquista: { label: 'Conquista', color: '#2E9E5B' },
};

const COMPLAINT = /(dor|dói|lesão|lesao|cansa|ombro|joelho|lombar|tontura|mal)/i;

// Regras simples e explicáveis: cada proposta traz sempre o porquê.
export function computeInsights(db: DB): Insight[] {
  const out: Insight[] = [];
  const t = today();
  for (const s of visibleStudents(db)) {
    if (s.status !== 'ativo') continue;
    const first = s.name.split(' ')[0];

    for (const a of pendingAssessments(db, s.id)) {
      const c = a.answers.find((x) => /queixa|dor/i.test(x.question) && x.answer && x.answer !== 'Nenhuma' && COMPLAINT.test(x.answer));
      if (c)
        out.push({
          id: `queixa:${a.id}`,
          kind: 'queixa',
          studentId: s.id,
          title: `${first} reportou: “${c.answer}”`,
          why: [`Resposta na avaliação de ${fmtDate(a.date)}`, 'ainda não revista'],
          priority: 95,
          action: { label: 'Abrir avaliação', link: `/avaliacoes?ver=${a.id}` },
        });
    }

    const idle = diffDays(t, s.lastActivity);
    if (idle >= 7)
      out.push({
        id: `inatividade:${s.id}:${s.lastActivity}`,
        kind: 'inatividade',
        studentId: s.id,
        title: `${first} está sem atividade há ${idle} dias`,
        why: [`Último registo a ${fmtDate(s.lastActivity)}`, `${s.checkinDates.length} check-ins nos últimos 28 dias`],
        priority: 80 + Math.min(idle, 15),
        action: { label: 'Enviar mensagem', message: `Olá ${first}! Senti a tua falta esta semana. Está tudo bem? Se precisares, ajustamos o plano à tua rotina.` },
      });

    if (s.paymentStatus === 'em_atraso')
      out.push({
        id: `pagamento:${s.id}`,
        kind: 'pagamento',
        studentId: s.id,
        title: `Pagamento de ${first} em atraso`,
        why: ['Estado do pagamento: em atraso'],
        priority: 70,
        action: { label: 'Lembrar pagamento', message: `Olá ${first}, o pagamento deste mês ainda está pendente. Precisas de ajuda com alguma coisa?` },
      });

    const left = diffDays(s.subscriptionEnd, t);
    if (left >= 0 && left <= 7)
      out.push({
        id: `renovacao:${s.id}:${s.subscriptionEnd}`,
        kind: 'renovacao',
        studentId: s.id,
        title: `Subscrição de ${first} termina em ${left} dias`,
        why: [`Data de fim: ${fmtDate(s.subscriptionEnd, true)}`],
        priority: 60,
        action: { label: 'Propor renovação', message: `Olá ${first}! A tua subscrição termina a ${fmtDate(s.subscriptionEnd)}. Queres continuar? Tenho já o próximo bloco pensado para ti.` },
      });

    const ms = s.measurements;
    if (ms.length >= 3 && s.goal === 'perder_peso') {
      const [a, , c] = ms.slice(-3);
      if (Math.abs(c.weight - a.weight) < 0.6)
        out.push({
          id: `estagnado:${s.id}:${c.date}`,
          kind: 'estagnado',
          studentId: s.id,
          title: `Peso de ${first} parado nas últimas 3 medições`,
          why: [`${num(a.weight)} kg a ${fmtDate(a.date)}, ${num(c.weight)} kg a ${fmtDate(c.date)}`, 'objetivo: perder gordura'],
          priority: 55,
          action: { label: 'Rever plano alimentar', link: `/nutricao/plano/${s.nutritionPlanId}` },
        });
    }

    if (ms.length >= 2) {
      const a = ms[ms.length - 2];
      const b = lastM(s)!;
      if (b.leanMass - a.leanMass >= 0.6)
        out.push({
          id: `progressao:${s.id}:${b.date}`,
          kind: 'progressao',
          studentId: s.id,
          title: `${first} ganhou ${num(b.leanMass - a.leanMass)} kg de massa magra`,
          why: [`Entre ${fmtDate(a.date)} e ${fmtDate(b.date)}`],
          priority: 40,
          action: { label: 'Celebrar', message: `${first}, a última medição mostra +${num(b.leanMass - a.leanMass)} kg de massa magra. Trabalho de respeito! 💪` },
        });
      const lost = ms[0].weight - b.weight;
      if (s.goal === 'perder_peso' && lost >= 5)
        out.push({
          id: `conquista:${s.id}:${Math.floor(lost)}`,
          kind: 'conquista',
          studentId: s.id,
          title: `${first} já perdeu ${num(lost)} kg desde o início`,
          why: [`De ${num(ms[0].weight)} kg para ${num(b.weight)} kg`],
          priority: 35,
          action: { label: 'Celebrar', message: `${first}, já são ${num(lost)} kg desde que começámos. Isto é consistência pura! 🎉` },
        });
    }
  }
  const dismissed = new Set(db.dismissedInsights);
  return out.filter((i) => !dismissed.has(i.id)).sort((a, b) => b.priority - a.priority);
}
