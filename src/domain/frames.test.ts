import { describe, expect, it } from 'vitest';
import type { Note } from './chart';
import {
  breathPose,
  frameOpacities,
  holdPose,
  orientPose,
  poseAmount,
  repPose,
  shownPose,
} from './frames';

const notes: Note[] = [
  { index: 0, time: 0, direction: 'up' },
  { index: 1, time: 2, direction: 'down' },
  { index: 2, time: 4, direction: 'up' },
];

describe('rep pose', () => {
  it('holds each pose and eases only across the first half-second of the cue', () => {
    expect(repPose(notes, -0.1)).toBe(0);
    expect(repPose(notes, 0)).toBe(0);
    expect(repPose(notes, 0.25)).toBeCloseTo(0.5, 5);
    expect(repPose(notes, 0.5)).toBeCloseTo(1, 5);
    expect(repPose(notes, 1.5)).toBeCloseTo(1, 5);
    expect(repPose(notes, 2)).toBeCloseTo(1, 5);
    expect(repPose(notes, 2.5)).toBeCloseTo(0, 5);
    expect(repPose(notes, 3.5)).toBeCloseTo(0, 5);
    expect(repPose(notes, 4)).toBeCloseTo(0, 5);
    expect(repPose(notes, 4.5)).toBeCloseTo(1, 5);
  });
});

describe('frame direction', () => {
  it('shows the hips-up drawing when the glute bridge cue is up', () => {
    const up = repPose(notes, 1);
    expect(up).toBeCloseTo(1, 5);
    expect(orientPose('glute-bridge', up)).toBeCloseTo(0, 5);
    expect(shownPose('glute-bridge', up)).toBeCloseTo(0, 5);
    expect(orientPose('glute-bridge', 0)).toBeCloseTo(1, 5);
    expect(orientPose('heel-slides', 1)).toBe(0);
    expect(orientPose('ankle-pumps', 1)).toBe(0);
    expect(orientPose('squat-dumbbell', 1)).toBe(1);
    expect(orientPose('neck-tilt', 1)).toBe(1);
  });
});

describe('swap opacities', () => {
  it('lets one body leave as the other arrives', () => {
    expect(frameOpacities(0)).toEqual({ a: 1, b: 0 });
    expect(frameOpacities(0.25)).toEqual({ a: 1, b: 0.5 });
    expect(frameOpacities(0.5)).toEqual({ a: 1, b: 1 });
    expect(frameOpacities(0.75)).toEqual({ a: 0.5, b: 1 });
    expect(frameOpacities(1)).toEqual({ a: 0, b: 1 });
  });
});

describe('hold and breath poses', () => {
  it('settles on B during a hold and returns to A on the rest', () => {
    expect(holdPose(0, 8, 2)).toBe(0);
    expect(holdPose(0.5, 8, 2)).toBeCloseTo(1, 5);
    expect(holdPose(5, 8, 2)).toBeCloseTo(1, 5);
    expect(holdPose(8, 8, 2)).toBeCloseTo(1, 5);
    expect(holdPose(8.5, 8, 2)).toBeCloseTo(0, 5);
  });

  it('keeps a single hold breathing instead of freezing on B', () => {
    expect(holdPose(0, 30, 0)).toBe(0);
    expect(holdPose(4, 30, 0)).toBeCloseTo(1, 5);
    expect(holdPose(6, 30, 0)).toBeCloseTo(0.5, 5);
    expect(holdPose(8, 30, 0)).toBeCloseTo(0, 5);
    expect(holdPose(4, 30, 0)).not.toBeCloseTo(holdPose(8, 30, 0), 5);
  });

  it('uses B for the inhale and A for the exhale, after a short fade', () => {
    expect(breathPose('inhale', 0)).toBe(0);
    expect(breathPose('inhale', 0.0625)).toBeCloseTo(0.5, 5);
    expect(breathPose('inhale', 0.5)).toBe(1);
    expect(breathPose('inhale', 1)).toBe(1);
    expect(breathPose('exhale', 0)).toBe(1);
    expect(breathPose('exhale', 1)).toBe(0);
  });
});

describe('subtle cap', () => {
  it('lets a full pose through and stops subtle moves near 0.85', () => {
    expect(poseAmount('heel-slides', 1)).toBe(1);
    expect(poseAmount('chin-tuck', 1)).toBeCloseTo(0.85, 5);
    expect(poseAmount('breath-46', 1)).toBeCloseTo(0.85, 5);
    expect(poseAmount('chin-tuck', 1)).toBeGreaterThan(0.7);
  });
});
