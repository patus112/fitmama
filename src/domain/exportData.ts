import type { SessionInput } from './session';

function csvField(value: string | number | boolean): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function sessionsToJson(sessions: readonly SessionInput[]): string {
  return JSON.stringify(sessions, null, 2);
}

export function sessionsToCsv(sessions: readonly SessionInput[]): string {
  const header = ['date', 'startedAt', 'exercises', 'totalSeconds', 'score', 'maxCombo', 'completed', 'dayKey'];
  const lines = sessions.map((session) => {
    const exercises = session.exercises.map((part) => `${part.exerciseId}:${part.seconds}`).join('|');
    return [
      session.date,
      session.startedAt,
      exercises,
      session.totalSeconds,
      session.score,
      session.maxCombo,
      session.completed,
      session.dayKey,
    ]
      .map(csvField)
      .join(',');
  });
  return [header.join(','), ...lines].join('\n');
}
