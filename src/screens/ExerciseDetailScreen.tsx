import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, CircleAlert, Heart, Play, Timer, Wind } from 'lucide-react';
import { music, unlockAudio } from '../audio/engine';
import { ExerciseFigure } from '../components/ExerciseFigure';
import { equipmentLabel, exerciseById } from '../domain/catalog';
import { completedDayKeys, frontierDay } from '../domain/plan';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useAppState } from '../state/AppState';

export function ExerciseDetailScreen({ id }: { id: string }) {
  const exercise = exerciseById(id);
  const { favorites, toggleFavorite, sessions, settings, customUrl } = useAppState();
  const reduce = useReducedMotion();
  function beginAudio() {
    unlockAudio();
    if (settings.trackId === 'custom' && customUrl) music.armFile(customUrl, false);
  }
  const [pose, setPose] = useState(0);

  useEffect(() => {
    if (!exercise?.hasCharacter || reduce) return;
    let up = false;
    const timer = window.setInterval(() => {
      up = !up;
      setPose(up ? 1 : 0);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [exercise?.hasCharacter, reduce]);

  if (!exercise) {
    return (
      <div className="screen">
        <a className="back-link" href="#/exercises">
          <ChevronLeft size={18} aria-hidden="true" /> Exercises
        </a>
        <h1>That move is not in the library</h1>
      </div>
    );
  }

  const favorite = favorites.has(exercise.id);
  const frontier = frontierDay(completedDayKeys(sessions));

  return (
    <div className="screen detail">
      <header className="detail-bar">
        <a className="icon-btn" href="#/exercises" aria-label="Back to exercises">
          <ChevronLeft size={22} aria-hidden="true" />
        </a>
        <h1 className="detail-title">Exercise</h1>
        <button
          type="button"
          className={favorite ? 'icon-btn heart on' : 'icon-btn heart'}
          aria-pressed={favorite}
          aria-label={favorite ? 'Remove from favorites' : 'Save to favorites'}
          onClick={() => toggleFavorite(exercise.id)}
        >
          <Heart size={20} fill={favorite ? '#B4441E' : 'none'} aria-hidden="true" />
        </button>
      </header>

      <div className="hero-wrap">
        <ExerciseFigure exercise={exercise} pose={pose} />
        <span className="time-badge">
          <Timer size={14} aria-hidden="true" /> {exercise.defaultSeconds} s
        </span>
        <div className="hero-tags">
          <span>{exercise.position}</span>
          <span>{equipmentLabel(exercise.equipment)}</span>
          {exercise.onCouch ? null : <span>Not on the couch</span>}
        </div>
      </div>

      <h2 className="exercise-name">{exercise.name}</h2>
      <p className="lede">{exercise.summary}</p>

      <section className="card">
        <h3>
          <span className="card-icon coral">
            <ActivityMark />
          </span>
          Steps
        </h3>
        <ol className="steps">
          {exercise.steps.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h3>
          <span className="card-icon sage">
            <Wind size={16} aria-hidden="true" />
          </span>
          Breathing
        </h3>
        <div className="breath-grid">
          <div>
            <ArrowUp size={16} aria-hidden="true" />
            <strong>Exhale</strong>
            <span>{exercise.breathing.exhale}</span>
          </div>
          <div className="inhale">
            <ArrowDown size={16} aria-hidden="true" />
            <strong>Inhale</strong>
            <span>{exercise.breathing.inhale}</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>
          <span className="card-icon coral">
            <CircleAlert size={16} aria-hidden="true" />
          </span>
          Common mistakes
        </h3>
        <ul className="mistakes">
          {exercise.commonMistakes.map((mistake) => (
            <li key={mistake}>
              <span aria-hidden="true">×</span>
              {mistake}
            </li>
          ))}
        </ul>
      </section>

      {exercise.hasCharacter ? (
        <a
          className="btn btn-coral detail-cta"
          href={`#/game/${frontier.phaseIndex}/${frontier.day}`}
          onClick={beginAudio}
        >
          <Play size={18} fill="#3B2A24" aria-hidden="true" />
          Play it as a game
        </a>
      ) : (
        <p className="quiet-note">The rhythm game for this one is on the way. Glute bridge is ready now.</p>
      )}
    </div>
  );
}

function ActivityMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M1 8h3l1.5-3 2 6 1.5-3H15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
