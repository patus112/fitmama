export interface Phase {
  id: string;
  name: string;
  tagline: string;
  blurb: string;
  placeholder: boolean;
}

export const DAYS_PER_PHASE = 28;

export const PHASES: readonly Phase[] = [
  {
    id: 'body-adaptation',
    name: 'Body Adaptation',
    tagline: 'Gentle start, lying down',
    blurb: 'About ten calm minutes, matched to the zones you picked.',
    placeholder: false,
  },
  {
    id: 'strength-foundation',
    name: 'Strength Foundation',
    tagline: 'A little steadier',
    blurb: 'A little longer, with a few more reps and holds. Still slow.',
    placeholder: true,
  },
  {
    id: 'fitness-progression',
    name: 'Fitness Progression',
    tagline: 'Easy momentum',
    blurb: 'Sessions grow across the month. A plank never passes thirty seconds.',
    placeholder: true,
  },
  {
    id: 'performance-breakthrough',
    name: 'Performance Breakthrough',
    tagline: 'Your rhythm, unhurried',
    blurb: 'More holds and a longer day. Nothing here asks you to rush.',
    placeholder: true,
  },
  {
    id: 'everyday-ease',
    name: 'Everyday Ease',
    tagline: 'Keep it kind',
    blurb: 'The longest phase, still gentle. Light days stay light.',
    placeholder: true,
  },
];

const PHASE_ONE_TITLES = [
  'Gentle start',
  'Soft bridges',
  'Bridge Groove',
  'Easy rhythm',
  'Quiet lifts',
  'Couch flow',
  'Slow and steady',
  'Little bridges',
  'Restful strength',
  'Kind tempo',
  'Sunday pace',
  'Soft landing',
  'Unhurried',
  'Warm bridges',
  'Lying-down groove',
  'Calm repeats',
  'Pillow practice',
  'Easy does it',
  'Gentle groove',
  'Quiet power',
  'Bed-day bridges',
  'Smooth lifts',
  'No rush',
  'Soft cadence',
  'Steady hips',
  'Light and easy',
  'Almost a habit',
  'Still gentle',
];

export interface DayRef {
  phaseIndex: number;
  day: number;
}

export function dayKey(day: DayRef): string {
  return `p${day.phaseIndex + 1}d${day.day}`;
}

export function isValidDay(day: DayRef): boolean {
  return (
    Number.isInteger(day.phaseIndex) &&
    Number.isInteger(day.day) &&
    day.phaseIndex >= 0 &&
    day.phaseIndex < PHASES.length &&
    day.day >= 1 &&
    day.day <= DAYS_PER_PHASE
  );
}

export function parseDayKey(key: string): DayRef | null {
  const match = /^p(\d+)d(\d+)$/.exec(key);
  if (!match) return null;
  const phaseNumber = match[1];
  const dayNumber = match[2];
  if (!phaseNumber || !dayNumber) return null;
  const day = { phaseIndex: Number(phaseNumber) - 1, day: Number(dayNumber) };
  return isValidDay(day) ? day : null;
}

export function dayIndex(day: DayRef): number {
  return day.phaseIndex * DAYS_PER_PHASE + (day.day - 1);
}

export function nextDay(day: DayRef): DayRef | null {
  if (!isValidDay(day)) return null;
  if (day.day < DAYS_PER_PHASE) return { phaseIndex: day.phaseIndex, day: day.day + 1 };
  if (day.phaseIndex < PHASES.length - 1) return { phaseIndex: day.phaseIndex + 1, day: 1 };
  return null;
}

export function dayTitle(day: DayRef): string {
  if (day.phaseIndex === 0) return PHASE_ONE_TITLES[day.day - 1] ?? `Day ${day.day}`;
  return `Quiet day ${day.day}`;
}

/** The first day that is not finished yet. Day 1 starts open. */
export function frontierDay(completed: ReadonlySet<string>): DayRef {
  let cursor: DayRef = { phaseIndex: 0, day: 1 };
  while (completed.has(dayKey(cursor))) {
    const upcoming = nextDay(cursor);
    if (!upcoming) return cursor;
    cursor = upcoming;
  }
  return cursor;
}

export function planComplete(completed: ReadonlySet<string>): boolean {
  const last: DayRef = { phaseIndex: PHASES.length - 1, day: DAYS_PER_PHASE };
  return completed.has(dayKey(last)) && dayKey(frontierDay(completed)) === dayKey(last);
}

export type DayState = 'done' | 'current' | 'locked';

export function dayState(day: DayRef, completed: ReadonlySet<string>): DayState {
  const frontier = frontierDay(completed);
  if (dayKey(day) === dayKey(frontier)) {
    return completed.has(dayKey(day)) ? 'done' : 'current';
  }
  return dayIndex(day) < dayIndex(frontier) ? 'done' : 'locked';
}

export function completedDayKeys(sessions: readonly { dayKey: string; completed: boolean }[]): Set<string> {
  const keys = new Set<string>();
  for (const session of sessions) {
    if (session.completed) keys.add(session.dayKey);
  }
  return keys;
}

export function canPlayDay(day: DayRef, sessions: readonly { dayKey: string; completed: boolean }[]): boolean {
  if (!isValidDay(day)) return false;
  const keys = completedDayKeys(sessions);
  if (dayState(day, keys) === 'current') return true;
  return planComplete(keys) && dayKey(day) === dayKey(frontierDay(keys));
}

export function completedInPhase(phaseIndex: number, completed: ReadonlySet<string>): number {
  let count = 0;
  for (let day = 1; day <= DAYS_PER_PHASE; day += 1) {
    if (completed.has(dayKey({ phaseIndex, day }))) count += 1;
  }
  return count;
}
