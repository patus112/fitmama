import type { Exercise } from '../domain/catalog';
import { exercisePhotos } from '../media';
import { Character } from './Character';

function picture(exercise: Exercise): string | undefined {
  return exercisePhotos[exercise.id];
}

function pictured(exercise: Exercise, base: string): string {
  return exercise.image.startsWith('illustrations/') ? `${base} fit-contain` : base;
}

export function ExerciseFigure({ exercise, pose = 0 }: { exercise: Exercise; pose?: number }) {
  if (exercise.hasCharacter) {
    return (
      <div className="hero hero-character" data-image={exercise.image}>
        <Character pose={pose} />
      </div>
    );
  }
  const photo = picture(exercise);
  if (photo) {
    return (
      <div className="hero hero-photo" data-image={exercise.image}>
        <img className={pictured(exercise, '')} src={photo} alt="" />
      </div>
    );
  }
  return <div className="hero hero-photo" data-image={exercise.image} />;
}

export function ExerciseThumb({ exercise }: { exercise: Exercise }) {
  if (exercise.hasCharacter) {
    return (
      <span className="thumb thumb-character" aria-hidden="true">
        <Character pose={1} />
      </span>
    );
  }
  const photo = picture(exercise);
  if (!photo) return <span className="thumb" aria-hidden="true" />;
  return <img className={pictured(exercise, 'thumb')} src={photo} alt="" />;
}
