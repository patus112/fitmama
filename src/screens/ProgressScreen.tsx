import { useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, getISODay, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { formatPoints } from '../domain/format';
import { badgesFor, bestStreak, currentStreak } from '../domain/streak';
import { useAppState } from '../state/AppState';

export function ProgressScreen() {
  const { sessions } = useAppState();
  const completed = sessions.filter((session) => session.completed);
  const dates = completed.map((session) => session.date);
  const today = new Date();
  const [month, setMonth] = useState(() => startOfMonth(today));
  const streak = currentStreak(dates, today);
  const best = bestStreak(dates);
  const badges = badgesFor(dates);
  const points = sessions.reduce((sum, session) => sum + session.score, 0);
  const marked = new Set(dates);
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const lead = getISODay(startOfMonth(month)) - 1;

  return (
    <div className="screen">
      <header className="top block-top">
        <p className="hello">Finished games, nothing else</p>
        <h1>Progress</h1>
      </header>

      <section className="streak-card">
        <Flame size={28} color="#B4441E" fill="#FFE3D8" aria-hidden="true" />
        <div>
          <strong data-testid="progress-streak">{streak}</strong>
          <span>day streak</span>
        </div>
        <p>
          {streak === 0
            ? 'A streak starts when a game is finished. Today or yesterday keeps it going.'
            : `Best run so far: ${best} ${best === 1 ? 'day' : 'days'}. ${completed.length} ${completed.length === 1 ? 'game' : 'games'} saved. ${formatPoints(points)} points.`}
        </p>
      </section>

      <ul className="badge-grid">
        {badges.map((badge) => (
          <li key={badge.id} className={badge.earned ? 'badge earned' : 'badge'} data-earned={badge.earned ? 'true' : 'false'}>
            <strong>{badge.name}</strong>
            <span>{badge.earned ? 'Yours' : badge.hint}</span>
          </li>
        ))}
      </ul>

      <section className="card calendar" aria-label="Workout calendar">
        <div className="cal-head">
          <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => setMonth((value) => addMonths(value, -1))}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <h2>{format(month, 'MMMM yyyy')}</h2>
          <button type="button" className="icon-btn" aria-label="Next month" onClick={() => setMonth((value) => addMonths(value, 1))}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="cal-week" aria-hidden="true">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="cal-grid">
          {Array.from({ length: lead }, (_, index) => (
            <span key={`pad-${index}`} />
          ))}
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const isMarked = marked.has(key);
            const isToday = key === format(today, 'yyyy-MM-dd');
            return (
              <span key={key} className={isMarked ? 'cal-day marked' : isToday ? 'cal-day today' : 'cal-day'} data-date={key}>
                {format(day, 'd')}
                {isMarked ? <span className="visually-hidden">, game finished</span> : null}
              </span>
            );
          })}
        </div>
      </section>
    </div>
  );
}
