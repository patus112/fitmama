import { ChevronRight } from 'lucide-react';
import { equipmentLabel, exercises } from '../domain/catalog';
import { ExerciseThumb } from '../components/ExerciseFigure';

export function ExercisesScreen() {
  return (
    <div className="screen">
      <header className="top block-top">
        <p className="hello">Fourteen calm moves</p>
        <h1>Exercises</h1>
      </header>
      <p className="lede">The rhythm game is the glute bridge. The others are here when you want a quiet reminder.</p>
      <ul className="exercise-list">
        {exercises.map((exercise) => (
          <li key={exercise.id}>
            <a className="exercise-card" href={`#/exercises/${exercise.id}`}>
              <ExerciseThumb exercise={exercise} />
              <span>
                <strong>{exercise.name}</strong>
                <small>
                  {exercise.targetArea} · {exercise.position}
                  {exercise.equipment !== 'None' ? ` · ${equipmentLabel(exercise.equipment)}` : ''}
                </small>
              </span>
              {exercise.hasCharacter ? <em className="game-pill">Game</em> : null}
              <ChevronRight size={18} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
