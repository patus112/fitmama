import { describe, expect, it } from 'vitest';
import type { Note } from './chart';
import { breathPose, holdPose, idleHalfSeconds, poseAmount, repPose } from './frames';

const notes: Note[] = [
  { index: 0, time: 0, direction: 'up' },
  { index: 1, time: 2, direction: 'down' },
  { index: 2, time: 4, direction: 'up' },
];

describe('rep pose', () => {
  it('eases A to B across the up half and back across the down half', () => {
    expect(repPose(notes, -0.1)).toBe(0);
    expect(repPose(notes, 0)).toBe(0);
    expect(repPose(notes, 1)).toBeCloseTo(0.5, 5);
    expect(repPose(notes, 2)).toBeCloseTo(1, 5);
    expect(repPose(notes, 3)).toBeCloseTo(0.5, 5);
    expect(repPose(notes, 4)).toBeCloseTo(0, 5);
  });
});

describe('hold and breath poses', () => {
  it('settles on B during a hold and returns to A on the rest', () => {
    expect(holdPose(0, 8, 2)).toBe(0);
    expect(holdPose(1.6, 8, 2)).toBeCloseTo(1, 5);
    expect(holdPose(5, 8, 2)).toBeCloseTo(1, 5);
    expect(holdPose(8, 8, 2)).toBeCloseTo(1, 5);
    expect(holdPose(9.6, 8, 2)).toBeCloseTo(0, 5);
    expect(holdPose(4, 30, 0)).toBeCloseTo(1, 5);
  });

  it('uses B for the inhale and A for the exhale', () => {
    expect(breathPose('inhale', 0)).toBe(0);
    expect(breathPose('inhale', 1)).toBe(1);
    expect(breathPose('exhale', 0)).toBe(1);
    expect(breathPose('exhale', 1)).toBe(0);
    expect(breathPose('inhale', 0.5)).toBeCloseTo(0.5, 5);
  });
});

describe('idle timing', () => {
  it('stays inside a calm 3–4s direction and slows subtle moves and thumbs', () => {
    expect(idleHalfSeconds('heel-slides', 2)).toBeGreaterThanOrEqual(3.2);
    expect(idleHalfSeconds('heel-slides', 2)).toBeLessThanOrEqual(4);
    expect(idleHalfSeconds('heel-slides', 4)).toBe(4);
    expect(idleHalfSeconds('chin-tuck', 3)).toBeGreaterThan(idleHalfSeconds('heel-slides', 3));
    expect(idleHalfSeconds('heel-slides', 3, true)).toBeGreaterThanOrEqual(5);
    expect(poseAmount('heel-slides', 1)).toBe(1);
    expect(poseAmount('chin-tuck', 1)).toBeLessThan(0.7);
    expect(poseAmount('breath-46', 1)).toBeLessThan(0.7);
  });
});
