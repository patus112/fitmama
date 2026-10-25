export const MAX_COMBO = 5;
export const POINTS_PER_UP = 10;

export interface ScoreState {
  score: number;
  combo: number;
  maxCombo: number;
}

export function initialScore(): ScoreState {
  return { score: 0, combo: 1, maxCombo: 0 };
}

export function comboMessage(combo: number): string {
  switch (Math.min(MAX_COMBO, Math.max(1, combo))) {
    case 1:
      return 'Find the groove';
    case 2:
      return 'Nice and easy';
    case 3:
      return 'Nice rhythm!';
    case 4:
      return 'Smooth and slow';
    default:
      return 'In the flow';
  }
}

/**
 * Each up beat scores automatically. The multiplier starts at x1 and climbs to x5.
 * Down beats are the return half of the rep and do not score.
 */
export function scoreUpBeats(upBeats: number): { score: number; maxCombo: number } {
  const count = Math.max(0, Math.floor(upBeats));
  let score = 0;
  let maxCombo = 0;
  for (let hit = 1; hit <= count; hit += 1) {
    const combo = Math.min(MAX_COMBO, hit);
    score += POINTS_PER_UP * combo;
    maxCombo = combo;
  }
  return { score, maxCombo };
}

export interface TimedNote {
  time: number;
  direction: 'up' | 'down';
}

/**
 * Apply every up note whose time falls in (prevTime, now].
 * A long frame still scores the crossed notes in order.
 */
export function advanceScore(
  state: ScoreState,
  notes: readonly TimedNote[],
  prevTime: number,
  now: number,
): { state: ScoreState; gained: number[] } {
  let { score, combo, maxCombo } = state;
  const gained: number[] = [];
  for (const note of notes) {
    if (note.direction !== 'up') continue;
    if (note.time <= prevTime || note.time > now) continue;
    const points = POINTS_PER_UP * combo;
    score += points;
    gained.push(points);
    maxCombo = Math.max(maxCombo, combo);
    combo = Math.min(MAX_COMBO, combo + 1);
  }
  return { state: { score, combo, maxCombo }, gained };
}
