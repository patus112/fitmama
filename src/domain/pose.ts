import type { Direction, Note } from './chart';

/** 0 is hips down, 1 is hips up. `fadeSeconds` of 0 snaps for reduced motion. */
export function poseAt(notes: readonly Note[], now: number, fadeSeconds = 0.4): number {
  const first = notes[0];
  if (!first || now < first.time) return 0;
  let previous = 0;
  let target = 0;
  let since = fadeSeconds;
  for (const note of notes) {
    if (now + 1e-9 < note.time) break;
    previous = target;
    target = note.direction === 'up' ? 1 : 0;
    since = now - note.time;
  }
  if (fadeSeconds <= 0 || since >= fadeSeconds) return target;
  const mix = since / fadeSeconds;
  return previous + (target - previous) * mix;
}

export function activeDirection(notes: readonly Note[], now: number, leadSeconds = 0.25): Direction {
  let direction: Direction = 'down';
  for (const note of notes) {
    if (note.time - leadSeconds <= now) direction = note.direction;
    else break;
  }
  return direction;
}
