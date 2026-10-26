import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { QuietLinks } from '../components/QuietLinks';
import { ExerciseThumb } from '../components/ExerciseFigure';
import { exercises } from '../domain/catalog';
import { DISCLAIMER, ZONES, zoneById, type ZoneId } from '../domain/zones';

const MODE_LABEL = { rep: 'Rhythm', hold: 'Hold', breath: 'Breath' } as const;

export function ExercisesScreen() {
  const [zone, setZone] = useState<ZoneId | 'all'>('all');
  const shown = zone === 'all' ? exercises : exercises.filter((exercise) => exercise.zones.includes(zone));

  return (
    <div className="screen">
      <header className="top block-top">
        <div className="top-links">
          <p className="hello">{exercises.length} calm moves</p>
          <QuietLinks />
        </div>
        <h1>Library</h1>
      </header>
      <p className="lede">Filter by the place you want to look after. Every move stays slow.</p>
      <ul className="safety-list">
        <li>No crunches or sit-ups.</li>
        <li>No fast head movement.</li>
        <li>No deep forward bends.</li>
        <li>Everything stays slow, and never into pain.</li>
      </ul>
      <p className="disclaimer">{DISCLAIMER}</p>
      <div className="zone-filters" role="group" aria-label="Filter by zone">
        <button type="button" className={zone === 'all' ? 'phase-chip active' : 'phase-chip'} aria-pressed={zone === 'all'} onClick={() => setZone('all')}>
          All
        </button>
        {ZONES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={zone === item.id ? 'phase-chip active' : 'phase-chip'}
            aria-pressed={zone === item.id}
            onClick={() => setZone(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      {shown.length === 0 ? <p className="lede">Nothing in that zone yet.</p> : null}
      <ul className="exercise-list">
        {shown.map((exercise) => (
          <li key={exercise.id}>
            <a className="exercise-card" href={`#/exercises/${exercise.id}`}>
              <ExerciseThumb exercise={exercise} />
              <span>
                <strong>{exercise.name}</strong>
                <small>{exercise.zones.map((id) => zoneById(id)?.name).filter(Boolean).join(' · ')}</small>
              </span>
              <em className="game-pill">{MODE_LABEL[exercise.mode]}</em>
              <ChevronRight size={18} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
