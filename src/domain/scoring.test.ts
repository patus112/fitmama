import { describe, expect, it } from 'vitest';
import { advanceScore, comboMessage, initialScore, scoreUpBeats } from './scoring';

describe('scoreUpBeats', () => {
  it('starts at zero and climbs x1 to x5', () => {
    expect(scoreUpBeats(0)).toEqual({ score: 0, maxCombo: 0 });
    expect(scoreUpBeats(1)).toEqual({ score: 10, maxCombo: 1 });
    expect(scoreUpBeats(3)).toEqual({ score: 60, maxCombo: 3 });
    expect(scoreUpBeats(5)).toEqual({ score: 150, maxCombo: 5 });
    expect(scoreUpBeats(7)).toEqual({ score: 250, maxCombo: 5 });
  });
});

describe('advanceScore', () => {
  const notes = [
    { time: 1, direction: 'up' as const },
    { time: 2, direction: 'down' as const },
    { time: 3, direction: 'up' as const },
    { time: 4, direction: 'up' as const },
  ];

  it('scores only up beats and ignores down beats', () => {
    const result = advanceScore(initialScore(), notes, 0, 4);
    expect(result.gained).toEqual([10, 20, 30]);
    expect(result.state.score).toBe(60);
    expect(result.state.maxCombo).toBe(3);
    expect(result.state.combo).toBe(4);
  });

  it('does not score the same window twice', () => {
    const first = advanceScore(initialScore(), notes, 0, 2);
    const second = advanceScore(first.state, notes, 2, 2);
    expect(second.gained).toEqual([]);
    expect(second.state.score).toBe(first.state.score);
  });

  it('catches several up beats in one long frame, in order', () => {
    const ups = [1, 2, 3, 4, 5, 6].map((time) => ({ time, direction: 'up' as const }));
    const result = advanceScore(initialScore(), ups, 0, 6);
    expect(result.state).toEqual({ score: scoreUpBeats(6).score, combo: 5, maxCombo: 5 });
    expect(result.gained).toEqual([10, 20, 30, 40, 50, 50]);
  });
});

describe('comboMessage', () => {
  it('uses the warm line from the game mockup at x3', () => {
    expect(comboMessage(3)).toBe('Nice rhythm!');
    expect(comboMessage(1)).toBe('Find the groove');
    expect(comboMessage(9)).toBe('In the flow');
  });
});
