import { describe, expect, it } from 'vitest';
import { sessionsToCsv, sessionsToJson } from './exportData';
import { sessionSchema, type SessionInput } from './session';

const session: SessionInput = {
  date: '2026-10-25',
  startedAt: '2026-10-25T09:00:00.000Z',
  exercises: [{ exerciseId: 'glute-bridge', seconds: 180 }],
  totalSeconds: 180,
  score: 1240,
  maxCombo: 5,
  completed: true,
  dayKey: 'p1d3',
};

describe('export', () => {
  it('writes the future session shape', () => {
    const parsed: unknown = JSON.parse(sessionsToJson([session]));
    expect(parsed).toEqual([
      {
        date: '2026-10-25',
        time: '2026-10-25T09:00:00.000Z',
        phase: 1,
        day: 3,
        exercises: [{ id: 'glute-bridge', seconds: 180 }],
        total_seconds: 180,
        score: 1240,
        max_combo: 5,
        completed: true,
      },
    ]);
    expect(sessionSchema.parse(session).dayKey).toBe('p1d3');
  });

  it('writes a CSV header and quotes tricky fields', () => {
    const csv = sessionsToCsv([
      session,
      {
        ...session,
        startedAt: '2026-10-25T10:00:00.000Z,note',
        completed: false,
        score: 0,
      },
    ]);
    const [header, first, second] = csv.split('\n');
    expect(header).toBe('date,time,phase,day,exercises,total_seconds,score,max_combo,completed');
    expect(first).toContain('glute-bridge:180');
    expect(first).toContain('true');
    expect(second).toContain('"2026-10-25T10:00:00.000Z,note"');
    expect(second).toContain('false');
  });
});
