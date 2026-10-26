import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, CircleAlert, Heart, Play, Timer, Wind } from 'lucide-react';
import { music, unlockAudio } from '../audio/engine';
import { ExerciseFigure } from '../components/ExerciseFigure';
import { equipmentLabel, exerciseById } from '../domain/catalog';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { DISCLAIMER, zoneById } from '../domain/zones';
import { useAppState } from '../state/AppState';

export function ExerciseDetailScreen({ id }: { id: string }) {
  const exercise = exerciseById(id);
  const { favorites, toggleFavorite, settings, customUrl } = useAppState();
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

  return (
    <div className="screen detail">
      <header className="detail-bar">
        <a className="icon-btn" href="#/exercises" aria-label="Back to library">
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
      <div className="zone-chips" role="group" aria-label="Zones">
        {exercise.zones.map((id) => (
          <span key={id}>{zoneById(id)?.name}</span>
        ))}
      </div>
      <p className="lede">{exercise.summary}</p>
      {exercise.honestNote ? <p className="honest-note">{exercise.honestNote}</p> : null}

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

      <section className="card">
        <h3>
          <span className="card-icon coral">
            <CircleAlert size={16} aria-hidden="true" />
          </span>
          Stop if
        </h3>
        <p>{exercise.stopIf}</p>
      </section>
      <p className="disclaimer">{DISCLAIMER}</p>

      <a className="btn btn-coral detail-cta" href={`#/practice/${exercise.id}`} onClick={beginAudio}>
        <Play size={18} fill="#3B2A24" aria-hidden="true" />
        {exercise.id === 'glute-bridge' ? 'Play it as a game' : 'Play this'}
      </a>
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
