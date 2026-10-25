export type Direction = 'up' | 'down';

export interface Note {
  index: number;
  time: number;
  direction: Direction;
}

/** Seconds a note takes to travel from the right edge to the hit ring. */
export const TRAVEL_SECONDS = 3.2;

const MIN_REP_SECONDS = 2;
const MAX_REP_SECONDS = 4;
const TARGET_NOTE_SECONDS = 1.5;

export function beatSeconds(bpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new Error('BPM must be a positive number');
  }
  return 60 / bpm;
}

/**
 * Space notes so one up+down rep lasts about 3 seconds, and always 2–4 seconds.
 * The track BPM still drives the chart; we just skip musical beats when the
 * song is quicker than a calm rep.
 */
export function beatsPerNote(bpm: number): number {
  const beat = beatSeconds(bpm);
  let notes = Math.max(1, Math.round(TARGET_NOTE_SECONDS / beat));
  while (notes < 32 && 2 * notes * beat < MIN_REP_SECONDS) notes += 1;
  while (notes > 1 && 2 * notes * beat > MAX_REP_SECONDS) notes -= 1;
  const rep = 2 * notes * beat;
  if (rep < MIN_REP_SECONDS - 1e-6 || rep > MAX_REP_SECONDS + 1e-6) {
    throw new Error(`No calm tempo for ${bpm} BPM`);
  }
  return notes;
}

export function noteIntervalSeconds(bpm: number): number {
  return beatsPerNote(bpm) * beatSeconds(bpm);
}

export function repSeconds(bpm: number): number {
  return noteIntervalSeconds(bpm) * 2;
}

export function buildChart(bpm: number, durationSec: number): Note[] {
  if (!Number.isFinite(durationSec) || durationSec <= 1) {
    throw new Error('Duration must be longer than a second');
  }
  const interval = noteIntervalSeconds(bpm);
  const lead = Math.min(TRAVEL_SECONDS, durationSec * 0.2);
  const end = durationSec - 0.35;
  const notes: Note[] = [];
  let time = lead;
  let index = 0;
  while (time <= end + 1e-9) {
    notes.push({
      index,
      time: Math.round(time * 1000) / 1000,
      direction: index % 2 === 0 ? 'up' : 'down',
    });
    index += 1;
    time += interval;
  }
  return notes;
}

/** 1 = just appearing on the right, 0 = inside the hit ring, negative = past it. */
export function noteTravel(noteTime: number, now: number, travelSeconds = TRAVEL_SECONDS): number {
  if (travelSeconds <= 0) return 0;
  return (noteTime - now) / travelSeconds;
}

export function remainingUpMoves(notes: readonly Note[], now: number): number {
  let count = 0;
  for (const note of notes) {
    if (note.direction === 'up' && note.time > now) count += 1;
  }
  return count;
}

export function upBeatCount(notes: readonly Note[]): number {
  return notes.reduce((count, note) => count + (note.direction === 'up' ? 1 : 0), 0);
}
