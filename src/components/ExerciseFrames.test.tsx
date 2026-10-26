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
  it('swaps opacities when the game drives the pose', () => {
    expect(heel).toBeTruthy();
    if (!heel) return;
    const early = renderToStaticMarkup(<ExerciseFrames exercise={heel} driven pose={0.25} reduce={false} />);
    expect(early).toContain('frame-a');
    expect(early).toContain('opacity:1');
    expect(early).toContain('opacity:0.5');
    const swapped = renderToStaticMarkup(<ExerciseFrames exercise={heel} driven pose={1} reduce={false} />);
    expect(swapped).toContain('opacity:0');
    expect(swapped).toContain('opacity:1');
  });

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
