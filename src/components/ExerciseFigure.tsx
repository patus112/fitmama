import type { Exercise } from '../domain/catalog';
import { exercisePhotos } from '../media';
import { Character } from './Character';
import { PlaceholderArt } from './PlaceholderArt';

export function ExerciseFigure({ exercise, pose = 0 }: { exercise: Exercise; pose?: number }) {
  if (exercise.hasCharacter) {
    return (
      <div className="hero hero-character" data-image={exercise.image}>
        <Character pose={pose} />
      </div>
    );
  }
  const photo = exercise.image.startsWith('placeholders/') ? undefined : exercisePhotos[exercise.id];
  if (photo) {
    return (
      <div className="hero hero-photo" data-image={exercise.image}>
        <img src={photo} alt="" />
      </div>
    );
  }
  return (
    <div className="hero hero-placeholder" data-image={exercise.image}>
      <PlaceholderArt />
    </div>
  );
}

export function ExerciseThumb({ exercise }: { exercise: Exercise }) {
  const photo = exercise.image.startsWith('placeholders/') ? undefined : exercisePhotos[exercise.id];
  if (exercise.hasCharacter) {
    return (
      <span className="thumb thumb-character" aria-hidden="true">
        <Character pose={1} />
      </span>
    );
  }
  if (photo) return <img className="thumb" src={photo} alt="" />;
  return (
    <span className="thumb thumb-placeholder" aria-hidden="true" data-image={exercise.image}>
      <PlaceholderArt compact />
    </span>
  );
}
