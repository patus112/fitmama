import type { Note } from './chart';

/** Face, breath, and other tiny moves. Their crossfade stays softer and slower. */
export const SUBTLE_FRAME_IDS = new Set([
  'breath-46',
  'humming-breath',
  'pelvic-floor-release-breath',
  'pelvic-floor',
  'tongue-press',
  'jaw-jut',
  'chin-tuck',
  'neck-tilt',
  'vowel-faces',
  'shoulder-rolls',
]);

export function isSubtleFrame(id: string): boolean {
  return SUBTLE_FRAME_IDS.has(id);
}

function smoothstep(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

/** How strongly frame B shows. Subtle moves never reach a full swap. */
export function poseAmount(id: string, pose: number): number {
  const clamped = Math.min(1, Math.max(0, pose));
  return isSubtleFrame(id) ? clamped * 0.55 : clamped;
}

/**
 * Seconds for one idle direction (A→B or B→A).
 * About 3–4s, never quicker than the exercise's calm tempo, slower for a thumb or a subtle move.
 */
export function idleHalfSeconds(id: string, tempoSeconds: number, thumb = false): number {
  const tempo = Number.isFinite(tempoSeconds) ? tempoSeconds : 3.2;
  const calm = Math.min(4, Math.max(3.2, tempo));
  const half = isSubtleFrame(id) ? Math.max(6.5, calm + 2.5) : calm;
  return thumb ? Math.max(half, 5) : half;
}

/**
 * Rep crossfade locked to the chart. Up eases A→B across that half, down eases B→A.
 * The note spacing is already the calm rep, including song speed.
 */
export function repPose(notes: readonly Note[], now: number): number {
  const first = notes[0];
  if (!first || now < first.time) return 0;
  let index = 0;
  for (let i = 0; i < notes.length; i += 1) {
    const note = notes[i];
    if (!note || now + 1e-9 < note.time) break;
    index = i;
  }
  const current = notes[index];
  if (!current) return 0;
  const next = notes[index + 1];
  const previous = notes[index - 1];
  const span = next ? next.time - current.time : current.time - (previous?.time ?? current.time);
  const safeSpan = span > 1e-6 ? span : 1;
  const t = smoothstep((now - current.time) / safeSpan);
  const from = current.direction === 'up' ? 0 : 1;
  const to = current.direction === 'up' ? 1 : 0;
  if (!next && now - current.time >= safeSpan) return to;
  return from + (to - from) * t;
}

/** Fade to B as a hold starts, stay there, and return to A across the rest. */
export function holdPose(into: number, holdSeconds: number, restSeconds: number): number {
  if (!(holdSeconds > 0) || !Number.isFinite(into)) return 0;
  const fade = 1.6;
  const cycle = holdSeconds + Math.max(0, restSeconds);
  const at = cycle > 0 ? ((into % cycle) + cycle) % cycle : 0;
  if (restSeconds <= 0 || at < holdSeconds) {
    return smoothstep(at / Math.min(fade, holdSeconds));
  }
  const restInto = at - holdSeconds;
  return 1 - smoothstep(restInto / Math.min(fade, restSeconds));
}

/** B on the inhale, A on the exhale, eased across that phase. */
export function breathPose(phase: 'inhale' | 'exhale', local: number): number {
  const t = smoothstep(local);
  return phase === 'inhale' ? t : 1 - t;
}
