import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '../domain/catalog';
import { frameOpacities, isSubtleFrame } from '../domain/frames';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { exerciseFrames } from '../media';

let watchingHidden = false;

function watchPageHidden() {
  if (watchingHidden || typeof document === 'undefined') return;
  watchingHidden = true;
  const sync = () => document.documentElement.toggleAttribute('data-page-hidden', document.hidden);
  document.addEventListener('visibilitychange', sync);
  sync();
}

function useOnScreen(skip: boolean) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(skip);

  useEffect(() => {
    watchPageHidden();
    if (skip) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setShown(Boolean(entry?.isIntersecting)),
      { rootMargin: '80px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [skip]);

  return { ref, shown: skip || shown };
}

export function ExerciseFrames({
  exercise,
  pose = 0,
  driven = false,
  reduce,
  className = '',
  testId,
}: {
  exercise: Exercise;
  /** 0 is frame A, 1 is frame B. Used when the game drives the crossfade. */
  pose?: number;
  driven?: boolean;
  reduce?: boolean;
  className?: string;
  testId?: string;
}) {
  const systemReduce = useReducedMotion();
  const still = reduce ?? systemReduce;
  const { ref, shown } = useOnScreen(driven || still);
  const pair = exerciseFrames[exercise.id];
  if (!pair) return null;

  const thumb = className.split(/\s+/).includes('thumb');
  const swap = driven && !still ? frameOpacities(pose) : null;
  const classes = [
    'frame-stack',
    driven ? 'frame-driven' : 'frame-idle',
    isSubtleFrame(exercise.id) ? 'frame-subtle' : '',
    shown && !still ? 'is-shown' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span ref={ref} className={classes} data-testid={testId}>
      <img
        className={thumb ? 'frame-a thumb' : 'frame-a'}
        src={pair.a}
        alt=""
        style={swap ? { opacity: swap.a } : undefined}
      />
      {still ? null : (
        <img className="frame-b" src={pair.b} alt="" style={swap ? { opacity: swap.b } : undefined} />
      )}
    </span>
  );
}
