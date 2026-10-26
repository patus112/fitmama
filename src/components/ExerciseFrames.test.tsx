import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Exercise } from '../domain/catalog';
import { exerciseById } from '../domain/catalog';
import { ExerciseFrames } from './ExerciseFrames';

const heel = exerciseById('heel-slides');

function render(exercise: Exercise, reduce: boolean) {
  return renderToStaticMarkup(<ExerciseFrames exercise={exercise} reduce={reduce} />);
}

describe('ExerciseFrames', () => {
  it('stacks frame A and frame B', () => {
    expect(heel).toBeTruthy();
    if (!heel) return;
    const html = render(heel, false);
    expect(html.match(/<img /g)?.length).toBe(2);
    expect(html).toContain('heel-slides-a');
    expect(html).toContain('heel-slides-b');
  });

  it('shows only frame A when motion is reduced', () => {
    expect(heel).toBeTruthy();
    if (!heel) return;
    const html = render(heel, true);
    expect(html.match(/<img /g)?.length).toBe(1);
    expect(html).toContain('heel-slides-a');
    expect(html).not.toContain('heel-slides-b');
  });
});
