import { describe, expect, it } from 'vitest';
import {
  buildBeatChart,
  clampSpeed,
  effectiveBpm,
  planRep,
  projectNotes,
  pushRate,
  realTimeAt,
  replaceFutureNotes,
  songTimeAt,
  tempoFeel,
  type TempoAnchor,
} from './tempo';

const CALM = { minSeconds: 2, maxSeconds: 4 };
const SLOW = { minSeconds: 3, maxSeconds: 4 };

describe('song speed', () => {
  it('stays on the 0.75 to 1.25 steps', () => {
    expect(clampSpeed(2)).toBe(1.25);
    expect(clampSpeed(0.1)).toBe(0.75);
    expect(clampSpeed(1.02)).toBe(1);
    expect(clampSpeed(1.13)).toBe(1.15);
    expect(clampSpeed(Number.NaN)).toBe(1);
  });

  it('scales the song tempo by the speed', () => {
    expect(effectiveBpm(96, 1)).toBe(96);
    expect(effectiveBpm(96, 1.25)).toBeCloseTo(120, 5);
    expect(effectiveBpm(80, 0.75)).toBeCloseTo(60, 5);
    expect(effectiveBpm(96, 4)).toBeCloseTo(120, 5);
  });
});

describe('calm rep mapping', () => {
  it('keeps every safe speed inside the exercise window when a fit exists', () => {
    for (const bpm of [72, 84, 96, 120, 140]) {
      for (const speed of [0.75, 1, 1.05, 1.25]) {
        const plan = planRep(bpm, speed, CALM);
        expect(plan.repSeconds).toBeGreaterThanOrEqual(2 - 1e-6);
        expect(plan.repSeconds).toBeLessThanOrEqual(4 + 1e-6);
        expect([2, 4, 8, 16]).toContain(plan.beatsPerRep);
      }
    }
  });

  it('uses half time when the beat is too fast for one rep', () => {
    const quick = planRep(140, 1, CALM);
    expect(quick.beatsPerRep).toBe(8);
    expect(quick.repSeconds).toBeGreaterThanOrEqual(2);
    expect(quick.repSeconds).toBeLessThanOrEqual(4);

    const sunday = planRep(96, 1, CALM);
    expect(sunday.beatsPerRep).toBe(4);
    expect(sunday.repSeconds).toBeCloseTo(2.5, 5);
  });

  it('never schedules a rep faster than the exercise minimum', () => {
    for (const bpm of [40, 72, 96, 140, 160]) {
      for (const speed of [0.75, 1, 1.25]) {
        const plan = planRep(bpm, speed, SLOW);
        expect(plan.repSeconds).toBeGreaterThanOrEqual(SLOW.minSeconds - 1e-6);
      }
    }
  });

  it('names the feel without using a raw tempo', () => {
    expect(tempoFeel(3.5)).toBe('Calm');
    expect(tempoFeel(2.8)).toBe('Steady');
    expect(tempoFeel(2.1)).toBe('Brisk');
    expect(planRep(96, 0.75, CALM).feel).toBe('Calm');
    expect(planRep(96, 1, CALM).feel).toBe('Steady');
    expect(planRep(96, 1.25, CALM).feel).toBe('Brisk');
  });
});

describe('beat chart and speed changes', () => {
  it('lands arrows on the beat, after the travel lead', () => {
    const notes = buildBeatChart({
      songBpm: 120,
      beatOffset: 0.25,
      beatsPerRep: 4,
      songDuration: 20,
      leadSongTime: 3,
    });
    expect(notes[0]?.direction).toBe('up');
    expect(notes[0]?.songTime).toBeGreaterThanOrEqual(3);
    const beat = 0.5;
    for (const note of notes) {
      const steps = (note.songTime - 0.25) / beat;
      expect(steps).toBeCloseTo(Math.round(steps), 3);
    }
    expect(notes[1]?.songTime).toBeCloseTo((notes[0]?.songTime ?? 0) + 1, 3);
  });

  it('restarts the beat grid when a file loops', () => {
    const notes = buildBeatChart({
      songBpm: 120,
      beatOffset: 0.2,
      beatsPerRep: 4,
      songDuration: 10,
      leadSongTime: 0,
      fileDuration: 4,
    });
    expect(notes.some((note) => Math.abs(note.songTime - 0.2) < 0.001)).toBe(true);
    expect(notes.some((note) => Math.abs(note.songTime - 4.2) < 0.001)).toBe(true);
  });

  it('keeps song time continuous and future hits on the new speed', () => {
    let anchors: TempoAnchor[] = [{ realTime: 0, songTime: 0, rate: 1 }];
    expect(songTimeAt(anchors, 4)).toBeCloseTo(4, 5);
    anchors = pushRate(anchors, 4, 1.25);
    expect(songTimeAt(anchors, 4)).toBeCloseTo(4, 5);
    expect(songTimeAt(anchors, 8)).toBeCloseTo(9, 5);
    expect(realTimeAt(anchors, 2)).toBeCloseTo(2, 5);
    expect(realTimeAt(anchors, 10)).toBeCloseTo(4 + (10 - 4) / 1.25, 5);

    const notes = buildBeatChart({
      songBpm: 96,
      beatOffset: 0,
      beatsPerRep: 4,
      songDuration: 30,
      leadSongTime: 0,
    });
    const before = projectNotes(notes, [{ realTime: 0, songTime: 0, rate: 1 }]);
    const after = projectNotes(notes, anchors);
    const future = notes.find((note) => note.songTime > 4);
    const past = notes.find((note) => note.songTime > 0 && note.songTime < 4);
    expect(future).toBeDefined();
    expect(past).toBeDefined();
    const futureBefore = before.find((note) => note.index === future?.index);
    const futureAfter = after.find((note) => note.index === future?.index);
    const pastBefore = before.find((note) => note.index === past?.index);
    const pastAfter = after.find((note) => note.index === past?.index);
    expect(pastAfter?.time).toBeCloseTo(pastBefore?.time ?? 0, 5);
    expect(futureAfter?.time).toBeLessThan(futureBefore?.time ?? 0);
    expect((futureAfter?.time ?? 0) > 4).toBe(true);
  });

  it('leaves arrows that are already on screen when the grid changes', () => {
    const current = buildBeatChart({
      songBpm: 96,
      beatOffset: 0,
      beatsPerRep: 4,
      songDuration: 40,
      leadSongTime: 0,
    });
    const upcoming = buildBeatChart({
      songBpm: 140,
      beatOffset: 0,
      beatsPerRep: 8,
      songDuration: 40,
      leadSongTime: 0,
    });
    const songNow = 5;
    const merged = replaceFutureNotes(current, upcoming, songNow, 3);
    const held = current.filter((note) => note.songTime <= songNow + 3);
    for (const note of held) {
      expect(merged.some((item) => Math.abs(item.songTime - note.songTime) < 0.001)).toBe(true);
    }
    expect(merged.some((note) => note.songTime > songNow + 3.2)).toBe(true);
  });
});
