import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GLUTE_BRIDGE_ID, exercises, exercisesNeedingArt } from './catalog';
import { ILLUSTRATION_FILE_BY_ID } from './illustrations';
import { exercisePhotos } from '../media';

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
      'legs-up-the-wall',
      'ankle-pumps',
      'walk-in-place',
      'neck-lymph-stroke',
      'shoulder-rolls',
      'knee-rocks',
      'roller-thighs',
      'roller-glutes',
      'roller-calves',
      'roller-upper-back',
      'breath-46',
      'humming-breath',
      'pelvic-floor-release-breath',
      'chin-tuck',
      'tongue-press',
      'jaw-jut',
      'vowel-faces',
      'neck-tilt',
    ]);
    expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(32);
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
    expect(exercises.find((exercise) => exercise.id === GLUTE_BRIDGE_ID)?.zones).toEqual([
      'hips',
      'pelvic-floor',
      'lower-back',
    ]);
    const chin = exercises.find((exercise) => exercise.id === 'chin-tuck');
    expect(chin?.honestNote?.toLowerCase()).toContain('weight loss');
    expect(chin?.image).toBe('illustrations/chin-tuck-a.webp');
    expect(exercisesNeedingArt()).toEqual([]);
    expect(exercises.every((exercise) => exercise.stopIf.length > 0)).toBe(true);
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

  it('uses a real illustration for every exercise', () => {
    expect(Object.keys(ILLUSTRATION_FILE_BY_ID)).toHaveLength(exercises.length);
    for (const [id, file] of Object.entries(ILLUSTRATION_FILE_BY_ID)) {
      const exercise = exercises.find((item) => item.id === id);
      expect(exercise?.image).toBe(`illustrations/${file}`);
      expect(existsSync(fileURLToPath(new URL(`../assets/illustrations/${file}`, import.meta.url)))).toBe(true);
      expect(existsSync(fileURLToPath(new URL(`../assets/illustrations/${file.replace(/-a\.webp$/, '-b.webp')}`, import.meta.url)))).toBe(true);
      expect(exercisePhotos[id]).toEqual(expect.any(String));
    }
  });
});
