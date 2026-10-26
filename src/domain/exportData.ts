import { parseDayKey } from './plan';
import type { SessionInput } from './session';

export interface VitySession {
  date: string;
  time: string;
  phase: number;
  day: number;
  exercises: { id: string; seconds: number }[];
  total_seconds: number;
  score: number;
  max_combo: number;
  completed: boolean;
}

export function toVitySession(session: SessionInput): VitySession {
  const day = parseDayKey(session.dayKey);
  return {
    date: session.date,
    time: session.startedAt,
    phase: (day?.phaseIndex ?? 0) + 1,
    day: day?.day ?? 1,
    exercises: session.exercises.map((item) => ({ id: item.exerciseId, seconds: item.seconds })),
    total_seconds: session.totalSeconds,
    score: session.score,
    max_combo: session.maxCombo,
    completed: session.completed,
  };
}

function csvField(value: string | number | boolean): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function sessionsToJson(sessions: readonly SessionInput[]): string {
  return JSON.stringify(sessions.map(toVitySession), null, 2);
}

export function sessionsToCsv(sessions: readonly SessionInput[]): string {
  const header = ['date', 'time', 'phase', 'day', 'exercises', 'total_seconds', 'score', 'max_combo', 'completed'];
  const lines = sessions.map((session) => {
    const row = toVitySession(session);
    const exercises = row.exercises.map((part) => `${part.id}:${part.seconds}`).join('|');
    return [row.date, row.time, row.phase, row.day, exercises, row.total_seconds, row.score, row.max_combo, row.completed]
      .map(csvField)
      .join(',');
  });
  return [header.join(','), ...lines].join('\n');
}
