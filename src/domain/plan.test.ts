import { describe, expect, it } from 'vitest';
import {
  DAYS_PER_PHASE,
  PHASES,
  canPlayDay,
  completedDayKeys,
  dayKey,
  dayState,
  dayTitle,
  frontierDay,
  nextDay,
  planComplete,
} from './plan';

describe('plan', () => {
  it('names five phases and 28 days, with a calm fifth phase', () => {
    expect(PHASES.map((phase) => phase.name)).toEqual([
      'Body Adaptation',
      'Strength Foundation',
      'Fitness Progression',
      'Performance Breakthrough',
      'Everyday Ease',
    ]);
    expect(DAYS_PER_PHASE).toBe(28);
    expect(PHASES[4]?.placeholder).toBe(true);
  });

  it('lets her play only the open day', () => {
    expect(canPlayDay({ phaseIndex: 0, day: 1 }, [])).toBe(true);
    expect(canPlayDay({ phaseIndex: 0, day: 2 }, [])).toBe(false);
    expect(canPlayDay({ phaseIndex: 0, day: 2 }, [{ dayKey: 'p1d1', completed: true }])).toBe(true);
  });

  it('opens day 1 and unlocks the next day only after a finish', () => {
    expect(frontierDay(new Set())).toEqual({ phaseIndex: 0, day: 1 });
    const done = completedDayKeys([{ dayKey: 'p1d1', completed: true }, { dayKey: 'p1d2', completed: false }]);
    expect(frontierDay(done)).toEqual({ phaseIndex: 0, day: 2 });
    expect(dayState({ phaseIndex: 0, day: 1 }, done)).toBe('done');
    expect(dayState({ phaseIndex: 0, day: 2 }, done)).toBe('current');
    expect(dayState({ phaseIndex: 0, day: 3 }, done)).toBe('locked');
  });

  it('does not skip ahead if a later day is marked done', () => {
    expect(frontierDay(new Set(['p1d3']))).toEqual({ phaseIndex: 0, day: 1 });
  });

  it('rolls into the next phase after day 28', () => {
    const keys = new Set<string>();
    for (let day = 1; day <= 28; day += 1) keys.add(dayKey({ phaseIndex: 0, day }));
    expect(nextDay({ phaseIndex: 0, day: 28 })).toEqual({ phaseIndex: 1, day: 1 });
    expect(frontierDay(keys)).toEqual({ phaseIndex: 1, day: 1 });
    expect(dayTitle({ phaseIndex: 0, day: 3 })).toBe('Bridge Groove');
  });

  it('knows when the whole round is finished', () => {
    const keys = new Set<string>();
    for (let phaseIndex = 0; phaseIndex < PHASES.length; phaseIndex += 1) {
      for (let day = 1; day <= DAYS_PER_PHASE; day += 1) keys.add(dayKey({ phaseIndex, day }));
    }
    expect(planComplete(keys)).toBe(true);
    expect(nextDay({ phaseIndex: 4, day: 28 })).toBeNull();
    expect(planComplete(new Set(['p1d1']))).toBe(false);
  });
});
