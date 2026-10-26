import type { Note } from './chart';

/** Face, breath, and other tiny moves. Their crossfade stays softer. */
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

/**
 * Drawings where frame A is the up / active pose and frame B is the return.
 * The chart eases toward 1 on the up cue, so these play as 1 − pose.
 */
export const REVERSED_FRAME_IDS = new Set([
  'glute-bridge',
  'heel-slides',
  'dead-bug',
  'bird-dog',
  'side-leg-raise',
  'clamshells',
  'alternating-leg-raises',
  'knees-to-chest',
  'knee-rocks',
  'shoulder-rolls',
  'ankle-pumps',
  'jaw-jut',
  'tongue-press',
  'vowel-faces',
]);

/** How long a pose takes to replace the other one. The rest of the rep holds. */
export const SWAP_SECONDS = 0.5;

/** One way of the slow breath a single hold uses so a long pose is not frozen. */
const BREATH_LEG_SECONDS = 4;

const SUBTLE_CAP = 0.85;

export function isSubtleFrame(id: string): boolean {
  return SUBTLE_FRAME_IDS.has(id);
}

export function isReversedFrame(id: string): boolean {
  return REVERSED_FRAME_IDS.has(id);
}

function smoothstep(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Flip exercises whose active drawing is frame A. */
export function orientPose(id: string, pose: number): number {
  const clamped = clamp01(pose);
  return isReversedFrame(id) ? 1 - clamped : clamped;
}

/** How far the swap travels. Subtle moves stop a little short of a full exchange. */
export function poseAmount(id: string, pose: number): number {
  const clamped = clamp01(pose);
  return isSubtleFrame(id) ? clamped * SUBTLE_CAP : clamped;
}

/** Pose the screen should paint: direction first, then the subtle cap. */
export function shownPose(id: string, raw: number): number {
  return poseAmount(id, orientPose(id, raw));
}

/**
 * True swap on transparent art. The outgoing frame is gone before the incoming one is fully up,
 * so the two bodies overlap only at the middle of the fade.
 */
export function frameOpacities(pose: number): { a: number; b: number } {
  const p = clamp01(pose);
  return { a: Math.min(1, 2 - 2 * p), b: Math.min(1, 2 * p) };
}

/**
 * Rep swap locked to the chart. Each cue eases across about half a second, then the pose holds
 * until the next cue. Before the first note the figure rests on the down pose.
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
  const from = current.direction === 'up' ? 0 : 1;
  const to = current.direction === 'up' ? 1 : 0;
  const fade = Math.min(SWAP_SECONDS, safeSpan);
  const elapsed = now - current.time;
  if (elapsed >= fade) return to;
  return from + (to - from) * smoothstep(elapsed / fade);
}

/**
 * Ease into the hold, stay, and ease back across the rest.
 * A single hold (no rest) keeps breathing between the two frames instead of freezing.
 */
export function holdPose(into: number, holdSeconds: number, restSeconds: number): number {
  if (!(holdSeconds > 0) || !Number.isFinite(into)) return 0;
  if (restSeconds <= 0) {
    const period = BREATH_LEG_SECONDS * 2;
    const at = ((into % period) + period) % period;
    if (at <= BREATH_LEG_SECONDS) return smoothstep(at / BREATH_LEG_SECONDS);
    return 1 - smoothstep((at - BREATH_LEG_SECONDS) / BREATH_LEG_SECONDS);
  }
  const fade = SWAP_SECONDS;
  const cycle = holdSeconds + Math.max(0, restSeconds);
  const at = cycle > 0 ? ((into % cycle) + cycle) % cycle : 0;
  if (at < holdSeconds) return smoothstep(Math.min(1, at / Math.min(fade, holdSeconds)));
  const restInto = at - holdSeconds;
  return 1 - smoothstep(Math.min(1, restInto / Math.min(fade, restSeconds)));
}

/**
 * B by the end of a short fade on the inhale, A by the end of the same fade on the exhale.
 * `phaseSeconds` is the length of the current breath so the fade stays near half a second.
 */
export function breathPose(phase: 'inhale' | 'exhale', local: number, phaseSeconds = 4): number {
  const seconds = phaseSeconds > 0.05 ? phaseSeconds : 4;
  const portion = Math.min(SWAP_SECONDS, seconds) / seconds;
  const t = local <= 0 ? 0 : local >= portion ? 1 : smoothstep(local / portion);
  return phase === 'inhale' ? t : 1 - t;
}
