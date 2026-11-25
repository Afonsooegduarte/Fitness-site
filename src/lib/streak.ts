import type { GymCheckin, Student } from '../store/types';
import { addDays, diffDays, today } from './utils';

// Streak = dias seguidos em que o aluno marcou que foi ao ginásio.
// Conta dias, não idas: ir 1 ou 3 vezes no mesmo dia vale 1.

const pad = (n: number) => String(n).padStart(2, '0');

// Data e hora locais (sem fuso), para a ida contar no dia certo.
export function nowLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Dias distintos com ida ao ginásio, do mais antigo para o mais recente.
export const visitDays = (s: Pick<Student, 'gymCheckins'>) => Array.from(new Set((s.gymCheckins ?? []).map((c) => c.at.slice(0, 10)))).sort();

export const wentToday = (s: Pick<Student, 'gymCheckins'>) => (s.gymCheckins ?? []).some((c) => c.at.slice(0, 10) === today());

export interface StreakInfo {
  current: number; // dias seguidos até hoje (ou até ontem, se hoje ainda não foi)
  best: number; // maior sequência de sempre
  last30: number; // dias com ida nos últimos 30
  lastDay: string | null;
  today: boolean;
  atRisk: boolean; // tem streak mas ainda não foi hoje
}

export function streakOf(s: Pick<Student, 'gymCheckins'>): StreakInfo {
  const days = visitDays(s);
  const set = new Set(days);
  const t = today();
  const isToday = set.has(t);
  // O streak continua vivo durante o dia de hoje enquanto o aluno não vai: conta até ontem.
  let cursor = isToday ? t : addDays(t, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && diffDays(d, prev) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const from = addDays(t, -29);
  return {
    current,
    best,
    last30: days.filter((d) => d >= from && d <= t).length,
    lastDay: days.length ? days[days.length - 1] : null,
    today: isToday,
    atRisk: current > 0 && !isToday,
  };
}

// Idas de exemplo, deterministas por aluno, para a demo ter dados.
// Alguns dias têm duas idas para mostrar que contam como uma.
export function seedGymCheckins(studentId: string, gymId: string | null): GymCheckin[] {
  if (!gymId) return [];
  let h = [...studentId].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296);
  const t = today();
  const n = +(/\d+/.exec(studentId)?.[0] ?? 0);
  const streak = [9, 0, 21, 0, 0, 14, 5, 1, 30, 0, 7, 2, 12, 0, 0, 18, 6, 0][n % 18]; // sequência atual
  const skipToday = n % 3 === 1; // alguns ainda não foram hoje
  const out: GymCheckin[] = [];
  const push = (day: string) => {
    const hour = 7 + Math.floor(rnd() * 13);
    out.push({ at: `${day}T${pad(hour)}:${pad(Math.floor(rnd() * 60))}:00`, gymId });
    if (rnd() < 0.12) out.push({ at: `${day}T${pad(Math.min(22, hour + 3 + Math.floor(rnd() * 4)))}:${pad(Math.floor(rnd() * 60))}:00`, gymId });
  };
  for (let i = 0; i < streak; i++) {
    const offset = (skipToday ? 1 : 0) + i;
    push(addDays(t, -offset));
  }
  // Antes da sequência atual: um dia de falha e depois idas soltas.
  // Com sequência 0, hoje e ontem ficam vazios (senão ontem já contaria como streak).
  const start = Math.max((skipToday ? 1 : 0) + streak + 1, streak === 0 ? 2 : 0);
  for (let i = start; i < 60; i++) if (rnd() < 0.6) push(addDays(t, -i));
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
