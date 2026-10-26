import type { Exercise } from '../domain/catalog';
import { exercisePhotos } from '../media';

function picture(exercise: Exercise): string | undefined {
  return exercisePhotos[exercise.id];
}

function pictured(exercise: Exercise, base: string): string {
  return exercise.image.startsWith('illustrations/') ? `${base} fit-contain`.trim() : base;
}

export function ExerciseFigure({ exercise }: { exercise: Exercise }) {
  const photo = picture(exercise);
  if (photo) {
    return (
      <div className="hero hero-photo" data-image={exercise.image}>
        <img className={pictured(exercise, '') || undefined} src={photo} alt="" />
      </div>
    );
  }
  return <div className="hero hero-photo" data-image={exercise.image} />;
}

export function ExerciseThumb({ exercise }: { exercise: Exercise }) {
  const photo = picture(exercise);
  if (!photo) return <span className="thumb" aria-hidden="true" />;
  return <img className={pictured(exercise, 'thumb')} src={photo} alt="" />;
}
