import type { Direction, Note } from './chart';

export const SPEED_MIN = 0.75;
export const SPEED_MAX = 1.25;
export const SPEED_STEP = 0.05;

/** Half-time steps. Sixteen beats is the last calm option when the song is quick. */
export const BEATS_PER_REP_OPTIONS = [2, 4, 8, 16] as const;
export type BeatsPerRep = (typeof BEATS_PER_REP_OPTIONS)[number];
export type TempoFeel = 'Calm' | 'Steady' | 'Brisk';

export interface RepWindow {
  minSeconds: number;
  maxSeconds: number;
}

export interface RepPlan {
  beatsPerRep: BeatsPerRep;
  repSeconds: number;
  feel: TempoFeel;
}

export function clampSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 1;
  const stepped = Math.round(speed / SPEED_STEP) * SPEED_STEP;
  const clamped = Math.min(SPEED_MAX, Math.max(SPEED_MIN, stepped));
  return Math.round(clamped * 100) / 100;
}

export function effectiveBpm(songBpm: number, speed: number): number {
  if (!Number.isFinite(songBpm) || songBpm <= 0) {
    throw new Error('BPM must be a positive number');
  }
  return songBpm * clampSpeed(speed);
}

/** Slower reps read as Calm. A rep near the quick edge of the safe window is Brisk. */
export function tempoFeel(repSeconds: number): TempoFeel {
  if (repSeconds >= 3.2) return 'Calm';
  if (repSeconds >= 2.4) return 'Steady';
  return 'Brisk';
}

/**
 * One up+down rep takes 2, 4, 8, or 16 musical beats.
 * When a shorter rep would finish faster than the exercise allows, the next
 * longer option (half time) is used. A rep may last longer than the preferred
 * maximum. It is never scheduled faster than the minimum.
 */
export function planRep(songBpm: number, speed: number, window: RepWindow): RepPlan {
  const beat = 60 / effectiveBpm(songBpm, speed);
  const options = BEATS_PER_REP_OPTIONS.map((beatsPerRep) => ({
    beatsPerRep,
    repSeconds: beatsPerRep * beat,
  }));
  const inside = options.filter(
    (option) => option.repSeconds >= window.minSeconds - 1e-6 && option.repSeconds <= window.maxSeconds + 1e-6,
  );
  const target = (window.minSeconds + window.maxSeconds) / 2;
  let chosen: (typeof options)[number] | undefined;
  if (inside.length > 0) {
    chosen = inside.reduce((best, option) =>
      Math.abs(option.repSeconds - target) < Math.abs(best.repSeconds - target) ? option : best,
    );
  } else {
    const safe = options.filter((option) => option.repSeconds >= window.minSeconds - 1e-6);
    if (safe.length > 0) {
      chosen = safe.reduce((best, option) => (option.repSeconds < best.repSeconds ? option : best));
    } else {
      chosen = options.reduce((best, option) => (option.repSeconds > best.repSeconds ? option : best));
    }
  }
  return {
    beatsPerRep: chosen.beatsPerRep,
    repSeconds: chosen.repSeconds,
    feel: tempoFeel(chosen.repSeconds),
  };
}

export interface BeatNote {
  index: number;
  songTime: number;
  direction: Direction;
}

export interface BeatChartInput {
  songBpm: number;
  beatOffset: number;
  beatsPerRep: BeatsPerRep;
  songDuration: number;
  leadSongTime: number;
  fileDuration?: number | null;
}

function wrapOffset(offset: number, beat: number): number {
  if (!Number.isFinite(offset) || beat <= 0) return 0;
  const wrapped = offset % beat;
  return wrapped < 0 ? wrapped + beat : wrapped;
}

/** Notes sit on the song's beats. A looping file restarts that grid each time through. */
export function buildBeatChart(input: BeatChartInput): BeatNote[] {
  if (!Number.isFinite(input.songBpm) || input.songBpm <= 0) {
    throw new Error('BPM must be a positive number');
  }
  if (!Number.isFinite(input.songDuration) || input.songDuration <= 1) {
    throw new Error('Duration must be longer than a second');
  }
  const beat = 60 / input.songBpm;
  const interval = (input.beatsPerRep / 2) * beat;
  const offset = wrapOffset(input.beatOffset, beat);
  const notes: BeatNote[] = [];
  const end = input.songDuration;
  const loop = input.fileDuration && input.fileDuration > interval + 0.05 ? input.fileDuration : null;

  const pushGrid = (origin: number, gridEnd: number) => {
    let songTime = origin + offset;
    const lead = Math.max(input.leadSongTime, origin);
    if (songTime < lead) {
      const steps = Math.ceil((lead - songTime) / interval - 1e-9);
      songTime += Math.max(0, steps) * interval;
    }
    let local = 0;
    while (songTime <= gridEnd + 1e-9 && songTime <= end + 1e-9 && notes.length < 4000) {
      notes.push({
        index: notes.length,
        songTime: Math.round(songTime * 1000) / 1000,
        direction: local % 2 === 0 ? 'up' : 'down',
      });
      local += 1;
      songTime += interval;
    }
  };

  if (!loop) pushGrid(0, end);
  else {
    for (let start = 0; start < end && notes.length < 4000; start += loop) {
      pushGrid(start, Math.min(end, start + loop - 0.02));
    }
  }
  return notes;
}

export interface TempoAnchor {
  realTime: number;
  songTime: number;
  rate: number;
}

export function songTimeAt(anchors: readonly TempoAnchor[], realTime: number): number {
  const anchor = anchorCoveringReal(anchors, realTime);
  return anchor.songTime + (realTime - anchor.realTime) * anchor.rate;
}

export function realTimeAt(anchors: readonly TempoAnchor[], songTime: number): number {
  let chosen = anchors[0];
  if (!chosen) return songTime;
  for (const anchor of anchors) {
    if (anchor.songTime <= songTime + 1e-9) chosen = anchor;
    else break;
  }
  const rate = chosen.rate > 0 ? chosen.rate : 1;
  return chosen.realTime + (songTime - chosen.songTime) / rate;
}

function anchorCoveringReal(anchors: readonly TempoAnchor[], realTime: number): TempoAnchor {
  let chosen = anchors[0];
  if (!chosen) return { realTime: 0, songTime: 0, rate: 1 };
  for (const anchor of anchors) {
    if (anchor.realTime <= realTime + 1e-9) chosen = anchor;
    else break;
  }
  return chosen;
}

/** Change speed without rewinding or skipping the song position. */
export function pushRate(anchors: readonly TempoAnchor[], realTime: number, rate: number): TempoAnchor[] {
  const nextRate = clampSpeed(rate);
  const songTime = songTimeAt(anchors, realTime);
  const last = anchors[anchors.length - 1];
  if (last && Math.abs(last.realTime - realTime) < 1e-4) {
    return [...anchors.slice(0, -1), { realTime: last.realTime, songTime: last.songTime, rate: nextRate }];
  }
  return [...anchors, { realTime, songTime, rate: nextRate }];
}

export function projectNotes(notes: readonly BeatNote[], anchors: readonly TempoAnchor[]): Note[] {
  return notes.map((note) => ({
    index: note.index,
    direction: note.direction,
    time: realTimeAt(anchors, note.songTime),
  }));
}

/** Keep arrows already on the lane. Later arrows follow the new beat grid. */
export function replaceFutureNotes(
  current: readonly BeatNote[],
  upcoming: readonly BeatNote[],
  songNow: number,
  keepWindow: number,
): BeatNote[] {
  const until = songNow + Math.max(0, keepWindow);
  const kept = current.filter((note) => note.songTime <= until + 1e-6);
  const added = upcoming.filter((note) => {
    if (note.songTime <= until + 0.04) return false;
    return !kept.some((held) => Math.abs(held.songTime - note.songTime) < 0.04);
  });
  return [...kept, ...added].map((note, index) => ({ ...note, index }));
}
