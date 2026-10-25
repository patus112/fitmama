import { describe, expect, it } from 'vitest';
import type { Note } from './chart';
import { activeDirection, poseAt } from './pose';

const notes: Note[] = [
  { index: 0, time: 3, direction: 'up' },
  { index: 1, time: 4.5, direction: 'down' },
];

describe('poseAt', () => {
  it('rests down before the first note', () => {
    expect(poseAt(notes, 0)).toBe(0);
  });

  it('crossfades toward hips up, then back down', () => {
    expect(poseAt(notes, 3)).toBe(0);
    expect(poseAt(notes, 3.2)).toBeGreaterThan(0);
    expect(poseAt(notes, 3.2)).toBeLessThan(1);
    expect(poseAt(notes, 3.5)).toBe(1);
    expect(poseAt(notes, 4.7)).toBeLessThan(1);
    expect(poseAt(notes, 5)).toBe(0);
  });

  it('snaps when reduced motion asks for no fade', () => {
    expect(poseAt(notes, 3.1, 0)).toBe(1);
  });
});

describe('activeDirection', () => {
  it('leads the cue slightly before the note', () => {
    expect(activeDirection(notes, 2)).toBe('down');
    expect(activeDirection(notes, 2.8)).toBe('up');
    expect(activeDirection(notes, 4.3)).toBe('down');
  });
});
