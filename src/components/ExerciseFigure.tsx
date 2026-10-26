import type { Exercise } from '../domain/catalog';
import { ExerciseFrames } from './ExerciseFrames';

export function ExerciseFigure({ exercise }: { exercise: Exercise }) {
  return (
    <div className="hero hero-photo" data-image={exercise.image}>
      <ExerciseFrames exercise={exercise} className="fit-contain" />
    </div>
  );
}

export function ExerciseThumb({ exercise }: { exercise: Exercise }) {
  return <ExerciseFrames exercise={exercise} className="thumb" />;
}
