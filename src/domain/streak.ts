import { differenceInCalendarDays, format, parseISO } from 'date-fns';

export interface Badge {
  id: 'first-game' | 'streak-3' | 'streak-7';
  name: string;
  hint: string;
  earned: boolean;
}

function uniqueSorted(dates: readonly string[], todayKey?: string): string[] {
  const filtered = dates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && (todayKey === undefined || date <= todayKey));
  return [...new Set(filtered)].sort();
}

function gap(later: string, earlier: string): number {
  return differenceInCalendarDays(parseISO(later), parseISO(earlier));
}

/** Longest run of consecutive calendar days with a finished game. */
export function bestStreak(dates: readonly string[]): number {
  const unique = uniqueSorted(dates);
  if (unique.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let index = 1; index < unique.length; index += 1) {
    const previous = unique[index - 1];
    const current = unique[index];
    if (!previous || !current) continue;
    const days = gap(current, previous);
    run = days === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/**
 * Finished days in a row, ending today or yesterday.
 * Yesterday still counts so a morning without a game is not a break yet.
 */
export function currentStreak(dates: readonly string[], today: Date): number {
  const todayKey = format(today, 'yyyy-MM-dd');
  const unique = uniqueSorted(dates, todayKey);
  const last = unique[unique.length - 1];
  if (!last) return 0;
  const since = gap(todayKey, last);
  if (since > 1) return 0;
  let run = 1;
  for (let index = unique.length - 1; index > 0; index -= 1) {
    const current = unique[index];
    const previous = unique[index - 1];
    if (!current || !previous) break;
    if (gap(current, previous) !== 1) break;
    run += 1;
  }
  return run;
}

export function badgesFor(dates: readonly string[]): Badge[] {
  const best = bestStreak(dates);
  return [
    { id: 'first-game', name: 'First game', hint: 'Finish one game', earned: dates.length > 0 },
    { id: 'streak-3', name: '3-day streak', hint: 'Three finished days in a row', earned: best >= 3 },
    { id: 'streak-7', name: '7-day streak', hint: 'Seven finished days in a row', earned: best >= 7 },
  ];
}
