import { describe, expect, it } from 'vitest';
import { badgesFor, bestStreak, currentStreak } from './streak';

const today = new Date(2026, 9, 25);

describe('currentStreak', () => {
  it('is zero with no finished days', () => {
    expect(currentStreak([], today)).toBe(0);
  });

  it('counts today and walks backward through consecutive days', () => {
    expect(currentStreak(['2026-10-25'], today)).toBe(1);
    expect(currentStreak(['2026-10-23', '2026-10-25', '2026-10-24', '2026-10-24'], today)).toBe(3);
  });

  it('keeps yesterday so this morning is not a break yet', () => {
    expect(currentStreak(['2026-10-24', '2026-10-23'], today)).toBe(2);
  });

  it('resets when the last finish is older than yesterday', () => {
    expect(currentStreak(['2026-10-23', '2026-10-22'], today)).toBe(0);
  });

  it('ignores future dates', () => {
    expect(currentStreak(['2026-10-26'], today)).toBe(0);
  });
});

describe('badges', () => {
  it('earns the first game, then 3 and 7 from the best run', () => {
    expect(badgesFor([]).map((badge) => badge.earned)).toEqual([false, false, false]);
    const three = badgesFor(['2026-10-01', '2026-10-02', '2026-10-03']);
    expect(three.find((badge) => badge.id === 'first-game')?.earned).toBe(true);
    expect(three.find((badge) => badge.id === 'streak-3')?.earned).toBe(true);
    expect(three.find((badge) => badge.id === 'streak-7')?.earned).toBe(false);
    const week = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07'];
    expect(bestStreak(week)).toBe(7);
    expect(badgesFor(week).every((badge) => badge.earned)).toBe(true);
    expect(currentStreak(week, today)).toBe(0);
  });
});
