import { useEffect, useState } from 'react';
import { Confetti } from '../components/Confetti';
import { SoundControl } from '../components/SoundControl';
import { loadSessions } from '../data/db';
import { formatClock, formatPoints } from '../domain/format';
import { dayTitle, parseDayKey } from '../domain/plan';
import type { SavedSession } from '../domain/session';
import { useAppState } from '../state/AppState';

export function ResultsScreen({ sessionId }: { sessionId: number }) {
  const { sessions } = useAppState();
  const [loaded, setLoaded] = useState<SavedSession | null>(null);
  const session = sessions.find((item) => item.id === sessionId) ?? loaded;

  useEffect(() => {
    if (sessions.some((item) => item.id === sessionId)) return;
    let cancelled = false;
    void loadSessions().then((rows) => {
      if (!cancelled) setLoaded(rows.find((item) => item.id === sessionId) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, sessions]);
  if (!session) {
    return (
      <div className="results">
        <h1>That session is not on this phone</h1>
        <a className="btn btn-coral" href="#/plan">
          Back to my plan
        </a>
      </div>
    );
  }
  const day = parseDayKey(session.dayKey);
  return (
    <div className="results" data-testid="results">
      {session.completed ? <Confetti /> : null}
      <SoundControl variant="inline" />
      <p className="eyebrow">{day ? dayTitle(day) : 'Glute bridge'}</p>
      <h1>{session.completed ? "That's your rhythm" : 'You showed up'}</h1>
      <p className="lede">
        {session.completed
          ? 'Saved on this phone. The next day is ready when you are.'
          : "That's enough. Saved on this phone."}
      </p>
      <ul className="stat-row">
        <li>
          <span>Score</span>
          <strong data-testid="results-score">{formatPoints(session.score)}</strong>
        </li>
        <li>
          <span>Max combo</span>
          <strong>{session.maxCombo > 0 ? `x${session.maxCombo}` : '—'}</strong>
        </li>
        <li>
          <span>Time</span>
          <strong>{formatClock(session.totalSeconds, 'round')}</strong>
        </li>
      </ul>
      <a className="btn btn-coral" href="#/plan">
        Back to my plan
      </a>
    </div>
  );
}
