import { describe, expect, it } from 'vitest';
import { breathFrame, breathPattern, holdBeatsLeft, holdsCompleted, holdProgress } from './play';
import { scoreUpBeats } from './scoring';

describe('breath timing', () => {
  it('uses four and six counts while the breath stays calm', () => {
    const calm = breathPattern(96, 1);
    expect(calm.inhaleBeats).toBe(4);
    expect(calm.exhaleBeats).toBe(6);
    expect(calm.cycleSeconds).toBeGreaterThanOrEqual(4);
    const frame = breathFrame(calm.beatSeconds * 4, calm);
    expect(frame.phase).toBe('exhale');
    expect(frame.count).toBe(1);
    expect(breathFrame(calm.cycleSeconds, calm).cyclesDone).toBe(1);
  });

  it('doubles the counts when the beat would rush the breath', () => {
    const quick = breathPattern(140, 1.25);
    expect(quick.inhaleBeats).toBe(8);
    expect(quick.exhaleBeats).toBe(12);
    expect(quick.inhaleBeats * quick.beatSeconds).toBeGreaterThanOrEqual(2.4);
  });
});

describe('hold timing', () => {
  it('counts a hold only after the full calm span', () => {
    expect(holdsCompleted(2.9, 3, 2)).toBe(0);
    expect(holdsCompleted(5, 3, 2)).toBe(1);
    expect(holdsCompleted(10, 3, 2)).toBe(2);
    expect(holdProgress(1.5, 3, 2).progress).toBeCloseTo(0.5, 5);
    expect(holdProgress(4, 3, 2).holding).toBe(false);
    expect(holdBeatsLeft(3, 0.625)).toBe(5);
    expect(scoreUpBeats(holdsCompleted(10, 3, 2)).score).toBe(scoreUpBeats(2).score);
  });
});
