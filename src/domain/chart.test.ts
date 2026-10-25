import { describe, expect, it } from 'vitest';
import { buildChart, noteIntervalSeconds, noteTravel, remainingUpMoves, repSeconds, upBeatCount } from './chart';
import { scoreUpBeats } from './scoring';

describe('calm chart spacing', () => {
  it('keeps a full rep between 2 and 4 seconds for every allowed BPM', () => {
    for (let bpm = 40; bpm <= 120; bpm += 1) {
      const rep = repSeconds(bpm);
      expect(rep).toBeGreaterThanOrEqual(2);
      expect(rep).toBeLessThanOrEqual(4);
    }
  });

  it('refuses a BPM that cannot stay calm', () => {
    expect(() => repSeconds(20)).toThrow(/calm tempo/);
  });

  it('places the built-in tracks on a calm grid', () => {
    expect(noteIntervalSeconds(96)).toBeCloseTo(1.25, 5);
    expect(repSeconds(96)).toBeCloseTo(2.5, 5);
    expect(repSeconds(72)).toBeGreaterThanOrEqual(2);
    expect(repSeconds(84)).toBeLessThanOrEqual(4);
  });
});

describe('buildChart', () => {
  it('alternates up and down across a three-minute song', () => {
    const notes = buildChart(96, 180);
    expect(notes.length).toBeGreaterThan(40);
    expect(notes[0]?.direction).toBe('up');
    expect(notes.every((note, index) => note.direction === (index % 2 === 0 ? 'up' : 'down'))).toBe(true);
    expect(notes.every((note) => note.time > 0 && note.time < 180)).toBe(true);
    const ups = upBeatCount(notes);
    expect(ups).toBeGreaterThan(20);
    expect(scoreUpBeats(ups).maxCombo).toBe(5);
  });

  it('starts the first note at the right edge of the highway', () => {
    const notes = buildChart(96, 180);
    const first = notes[0];
    expect(first).toBeDefined();
    expect(noteTravel(first?.time ?? 0, 0)).toBeCloseTo(1, 5);
  });

  it('counts the up moves still ahead', () => {
    const notes = buildChart(96, 30);
    const ups = upBeatCount(notes);
    expect(remainingUpMoves(notes, 0)).toBe(ups);
    const mid = notes[Math.floor(notes.length / 2)];
    expect(mid).toBeDefined();
    expect(remainingUpMoves(notes, mid?.time ?? 0)).toBeLessThan(ups);
  });
});
