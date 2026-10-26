import { describe, expect, it } from 'vitest';
import { GLUTE_BRIDGE_ID, exercises } from './catalog';

describe('exercise catalog', () => {
  it('includes the owner set plus the three lying-down extras', () => {
    expect(exercises.map((exercise) => exercise.id)).toEqual([
      'heel-slides',
      'dead-bug',
      'belly-draw-in',
      'short-plank',
      'glute-bridge',
      'side-leg-raise',
      'clamshells',
      'squat-dumbbell',
      'bird-dog',
      'knees-to-chest',
      'pelvic-floor',
      'alternating-leg-raises',
      'knees-apart',
      'leg-circles',
    ]);
    expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(14);
  });

  it('keeps every move calm and marks the couch exception', () => {
    for (const exercise of exercises) {
      expect(exercise.tempoSeconds).toBeGreaterThanOrEqual(2);
      expect(exercise.tempoSeconds).toBeLessThanOrEqual(4);
      expect(exercise.minRepSeconds).toBeGreaterThanOrEqual(2);
      expect(exercise.maxRepSeconds).toBeLessThanOrEqual(4);
      expect(exercise.minRepSeconds).toBeLessThanOrEqual(exercise.tempoSeconds);
      expect(exercise.tempoSeconds).toBeLessThanOrEqual(exercise.maxRepSeconds);
    }
    const plank = exercises.find((exercise) => exercise.id === 'short-plank');
    expect(plank?.defaultSeconds).toBeLessThanOrEqual(30);
    expect(exercises.find((exercise) => exercise.id === 'squat-dumbbell')?.onCouch).toBe(false);
    expect(exercises.filter((exercise) => exercise.hasCharacter).map((exercise) => exercise.id)).toEqual([
      GLUTE_BRIDGE_ID,
    ]);
  });

  it('does not ask for crunches, sit-ups, fast head moves, or deep forward bends', () => {
    const text = JSON.stringify(exercises).toLowerCase();
    expect(text).not.toContain('crunch');
    expect(text).not.toContain('sit-up');
    expect(text).not.toContain('sit up');
    expect(text).not.toContain('fast head');
    expect(text).toContain('slow');
    const squat = exercises.find((exercise) => exercise.id === 'squat-dumbbell');
    expect(squat?.steps.join(' ').toLowerCase()).toContain('deep bend');
    expect(squat?.summary.toLowerCase()).toContain('not a deep bend');
  });
});
