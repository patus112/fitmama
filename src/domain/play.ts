import type { ScoreState } from './scoring';
import { effectiveBpm } from './tempo';

export interface BlockResult {
  state: ScoreState;
  seconds: number;
  completed: boolean;
}

export interface BreathPattern {
  inhaleBeats: number;
  exhaleBeats: number;
  beatSeconds: number;
  cycleSeconds: number;
}

/** Inhale 4 / exhale 6 beats. If that would rush, the counts double so the breath stays calm. */
export function breathPattern(songBpm: number, speed: number): BreathPattern {
  const bpm = effectiveBpm(songBpm, speed);
  const beatSeconds = 60 / bpm;
  const doubled = beatSeconds * 4 < 2.4;
  const inhaleBeats = doubled ? 8 : 4;
  const exhaleBeats = doubled ? 12 : 6;
  return {
    inhaleBeats,
    exhaleBeats,
    beatSeconds,
    cycleSeconds: (inhaleBeats + exhaleBeats) * beatSeconds,
  };
}

export interface BreathFrame {
  phase: 'inhale' | 'exhale';
  count: number;
  scale: number;
  cyclesDone: number;
}

export function breathFrame(songSeconds: number, pattern: BreathPattern): BreathFrame {
  const safeSong = Math.max(0, songSeconds);
  const cycleBeats = pattern.inhaleBeats + pattern.exhaleBeats;
  const beatIndex = Math.floor(safeSong / pattern.beatSeconds + 1e-9);
  const into = ((beatIndex % cycleBeats) + cycleBeats) % cycleBeats;
  const inhaling = into < pattern.inhaleBeats;
  const count = inhaling ? into + 1 : into - pattern.inhaleBeats + 1;
  const span = inhaling ? pattern.inhaleBeats : pattern.exhaleBeats;
  const local = inhaling ? into / pattern.inhaleBeats : (into - pattern.inhaleBeats) / pattern.exhaleBeats;
  const scale = inhaling ? 0.62 + 0.38 * local : 1 - 0.38 * local;
  return {
    phase: inhaling ? 'inhale' : 'exhale',
    count: Math.min(span, Math.max(1, count)),
    scale,
    cyclesDone: Math.floor(beatIndex / cycleBeats),
  };
}

export function holdsCompleted(elapsed: number, holdSeconds: number, restSeconds: number): number {
  const cycle = holdSeconds + Math.max(0, restSeconds);
  if (!(holdSeconds > 0) || !(cycle > 0) || elapsed <= 0) return 0;
  return Math.floor((elapsed + 1e-9) / cycle);
}

export function holdProgress(elapsed: number, holdSeconds: number, restSeconds: number): {
  progress: number;
  holding: boolean;
  beatsLeft: number;
  beatSeconds: number;
} {
  const cycle = holdSeconds + Math.max(0, restSeconds);
  const into = cycle > 0 ? elapsed % cycle : 0;
  const holding = into < holdSeconds || restSeconds <= 0;
  const progress = holding ? Math.min(1, into / holdSeconds) : 1;
  return { progress, holding, beatsLeft: 0, beatSeconds: 0 };
}

export function holdBeatsLeft(remainingSeconds: number, beatSeconds: number): number {
  if (!(beatSeconds > 0) || remainingSeconds <= 0) return 0;
  return Math.max(1, Math.ceil(remainingSeconds / beatSeconds - 1e-9));
}
