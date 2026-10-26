import { describe, expect, it } from 'vitest';
import { exerciseById, exercises } from './catalog';
import { buildPlan, dayBudget } from './generator';
import { DAYS_PER_PHASE, PHASES } from './plan';

function movementIds(zones: string[], phaseIndex = 0) {
  const days = buildPlan(zones).filter((day) => day.phaseIndex === phaseIndex);
  return days.flatMap((day) => day.blocks.slice(0, -1).map((block) => block.exerciseId));
}

describe('zone plan', () => {
  it('uses only matching exercises, plus one calm breath every day', () => {
    const zones = ['neck'];
    const plan = buildPlan(zones);
    expect(plan).toHaveLength(PHASES.length * DAYS_PER_PHASE);
    for (const day of plan) {
      expect(day.blocks.length).toBeGreaterThanOrEqual(2);
      const breath = day.blocks[day.blocks.length - 1];
      expect(exerciseById(breath?.exerciseId ?? '')?.mode).toBe('breath');
      for (const block of day.blocks.slice(0, -1)) {
        const exercise = exerciseById(block.exerciseId);
        expect(exercise?.zones).toContain('neck');
      }
    }
  });

  it('stays inside the safety rules and the daily time window', () => {
    const plan = buildPlan(['belly', 'hips', 'thighs', 'relax']);
    for (const day of plan) {
      const total = day.blocks.reduce((sum, block) => sum + block.seconds, 0);
      expect(total).toBeGreaterThanOrEqual(600);
      expect(total).toBeLessThanOrEqual(1200);
      for (const block of day.blocks) {
        const exercise = exerciseById(block.exerciseId);
        expect(exercise).toBeDefined();
        if (exercise?.id === 'short-plank') expect(block.seconds).toBeLessThanOrEqual(30);
        expect(block.seconds).toBeLessThanOrEqual(900);
      }
    }
    const text = JSON.stringify(exercises).toLowerCase();
    expect(text).not.toContain('crunch');
    expect(text).not.toContain('sit-up');
    expect(text).not.toContain('fast head');
  });

  it('grows across the five phases and keeps plank at thirty seconds', () => {
    const zones = ['belly', 'hips', 'thighs'];
    const plan = buildPlan(zones);
    const total = (phaseIndex: number) =>
      plan
        .filter((day) => day.phaseIndex === phaseIndex && !day.light)
        .reduce((sum, day) => sum + day.blocks.reduce((inner, block) => inner + block.seconds, 0), 0);
    expect(total(4)).toBeGreaterThan(total(0));
    expect(dayBudget(4, false)).toBeGreaterThan(dayBudget(0, false));
    const earlySquat = plan.some(
      (day) => day.phaseIndex === 0 && day.blocks.some((block) => block.exerciseId === 'squat-dumbbell'),
    );
    const laterSquat = plan.some(
      (day) => day.phaseIndex >= 2 && day.blocks.some((block) => block.exerciseId === 'squat-dumbbell'),
    );
    expect(earlySquat).toBe(false);
    expect(laterSquat).toBe(true);
    for (const day of plan) {
      const plank = day.blocks.find((block) => block.exerciseId === 'short-plank');
      if (plank) expect(plank.seconds).toBeLessThanOrEqual(30);
    }
  });

  it('is deterministic, marks light days, and spreads the chosen zones', () => {
    const zones = ['belly', 'hips', 'neck'];
    expect(buildPlan(zones)).toEqual(buildPlan(['neck', 'belly', 'hips']));
    const plan = buildPlan(zones);
    for (const dayNumber of [7, 14, 21, 28]) {
      expect(plan.find((day) => day.phaseIndex === 0 && day.day === dayNumber)?.light).toBe(true);
    }
    const seen = new Set(movementIds(zones));
    expect(seen.has('glute-bridge') || [...seen].some((id) => exerciseById(id)?.zones.includes('hips'))).toBe(true);
    expect([...seen].some((id) => exerciseById(id)?.zones.includes('belly'))).toBe(true);
    expect([...seen].some((id) => exerciseById(id)?.zones.includes('neck'))).toBe(true);
    const first = plan[0];
    expect(first?.blocks[0]?.exerciseId).toBe('glute-bridge');
  });
});
