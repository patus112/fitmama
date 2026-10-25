import type { Exercise } from '../domain/catalog';
import { exercisePhotos } from '../media';
import { Character } from './Character';

export function ExerciseFigure({ exercise, pose = 0 }: { exercise: Exercise; pose?: number }) {
  if (exercise.hasCharacter) {
    return (
      <div className="hero hero-character">
        <Character pose={pose} />
      </div>
    );
  }
  const photo = exercisePhotos[exercise.id];
  if (photo) {
    return (
      <div className="hero hero-photo">
        <img src={photo} alt="" />
      </div>
    );
  }
  return (
    <div className="hero hero-placeholder" aria-hidden="true">
      <div className="mat" />
      <p>{exercise.position}</p>
    </div>
  );
}

export function ExerciseThumb({ exercise }: { exercise: Exercise }) {
  const photo = exercisePhotos[exercise.id];
  if (exercise.hasCharacter) {
    return (
      <span className="thumb thumb-character" aria-hidden="true">
        <Character pose={1} />
      </span>
    );
  }
  if (photo) return <img className="thumb" src={photo} alt="" />;
  return (
    <span className="thumb thumb-placeholder" aria-hidden="true">
      {exercise.position === 'Lying down' ? 'Lie' : exercise.position.split(' ')[0]}
    </span>
  );
}
