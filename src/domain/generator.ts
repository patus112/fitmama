import { exercises, type Exercise } from './catalog';
import { DAYS_PER_PHASE, PHASES, dayKey, type DayRef } from './plan';
import { sortZones, type ZoneId } from './zones';

export interface PlanBlock {
  exerciseId: string;
  seconds: number;
}

export interface PlannedDay {
  phaseIndex: number;
  day: number;
  light: boolean;
  blocks: PlanBlock[];
}

const NORMAL_SECONDS = [660, 780, 900, 1020, 1140];
const LIGHT_SECONDS = [600, 600, 720, 720, 840];

export function dayBudget(phaseIndex: number, light: boolean): number {
  const table = light ? LIGHT_SECONDS : NORMAL_SECONDS;
  return table[phaseIndex] ?? table[0] ?? 660;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function phaseAllows(exercise: Exercise, phaseIndex: number): boolean {
  if (exercise.id === 'squat-dumbbell' && phaseIndex < 2) return false;
  if (exercise.id === 'short-plank' && phaseIndex < 1) return false;
  if (exercise.position === 'Standing' && phaseIndex < 1) return false;
  if (exercise.id.startsWith('roller-') && phaseIndex < 2) return false;
  return true;
}

function matchesZone(exercise: Exercise, zones: readonly ZoneId[]): boolean {
  return exercise.zones.some((zone) => zones.includes(zone));
}

function plankSeconds(phaseIndex: number): number {
  return Math.min(30, 15 + phaseIndex * 5);
}

function capFor(exercise: Exercise, phaseIndex: number): number {
  if (exercise.id === 'short-plank') return plankSeconds(phaseIndex);
  if (exercise.id === 'legs-up-the-wall') return 300;
  return 900;
}

function allocate(chosen: Exercise[], total: number, phaseIndex: number): PlanBlock[] {
  const amounts = chosen.map((exercise) => {
    if (exercise.id === 'short-plank') return plankSeconds(phaseIndex);
    return 180;
  });
  let spare = total - amounts.reduce((sum, value) => sum + value, 0);
  const order = amounts
    .map((value, index) => ({ index, room: capFor(chosen[index]!, phaseIndex) - value }))
    .filter((item) => item.room > 0)
    .map((item) => item.index);
  let guard = 0;
  while (spare > 0 && order.length > 0 && guard < 5000) {
    const index = order[guard % order.length] ?? 0;
    const exercise = chosen[index];
    const current = amounts[index] ?? 0;
    if (!exercise || current >= capFor(exercise, phaseIndex)) {
      order.splice(order.indexOf(index), 1);
      continue;
    }
    amounts[index] = current + 1;
    spare -= 1;
    guard += 1;
  }
  while (spare < 0) {
    let largest = 0;
    for (let index = 1; index < amounts.length; index += 1) {
      if ((amounts[index] ?? 0) > (amounts[largest] ?? 0) && chosen[index]?.id !== 'short-plank') largest = index;
    }
    if ((amounts[largest] ?? 0) <= 60) break;
    amounts[largest] = (amounts[largest] ?? 0) - 1;
    spare += 1;
  }
  return chosen.map((exercise, index) => ({
    exerciseId: exercise.id,
    seconds: amounts[index] ?? 180,
  }));
}

function pickOne(pool: Exercise[], random: () => number, avoid: ReadonlySet<string>): Exercise | undefined {
  const fresh = pool.filter((exercise) => !avoid.has(exercise.id));
  const source = fresh.length > 0 ? fresh : pool;
  if (source.length === 0) return undefined;
  const index = Math.min(source.length - 1, Math.floor(random() * source.length));
  return source[index];
}

function preferCharacter(pool: Exercise[]): Exercise[] {
  return [...pool].sort((a, b) => {
    if (a.hasCharacter !== b.hasCharacter) return a.hasCharacter ? -1 : 1;
    if (a.mode !== b.mode) return a.mode === 'rep' ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

export function buildPlan(zones: readonly string[]): PlannedDay[] {
  const selected = sortZones(zones);
  const active = selected.length > 0 ? selected : (['relax'] as ZoneId[]);
  const days: PlannedDay[] = [];
  for (let phaseIndex = 0; phaseIndex < PHASES.length; phaseIndex += 1) {
    for (let day = 1; day <= DAYS_PER_PHASE; day += 1) {
      const light = day % 7 === 0;
      const random = mulberry32(hashString(`${active.join('|')}|${phaseIndex}|${day}`));
      const movement = preferCharacter(
        exercises.filter(
          (exercise) =>
            exercise.mode !== 'breath' && matchesZone(exercise, active) && phaseAllows(exercise, phaseIndex),
        ),
      );
      const breaths = exercises.filter((exercise) => exercise.mode === 'breath');
      const gentle = movement.filter((exercise) => exercise.mode === 'hold' || exercise.onCouch || exercise.position !== 'Standing');
      const movementPool = light && gentle.length > 0 ? gentle : movement;
      const wanted = light ? 1 : 2;
      const chosen: Exercise[] = [];
      const used = new Set<string>();
      if (!light && movementPool.some((exercise) => exercise.hasCharacter)) {
        const hero = movementPool.find((exercise) => exercise.hasCharacter);
        if (hero) {
          chosen.push(hero);
          used.add(hero.id);
        }
      }
      let zoneCursor = Math.floor(random() * active.length);
      while (chosen.length < wanted) {
        const zone = active[zoneCursor % active.length] ?? active[0];
        zoneCursor += 1;
        const bucket = movementPool.filter((exercise) => zone && exercise.zones.includes(zone));
        const next = pickOne(bucket.length > 0 ? bucket : movementPool, random, used);
        if (!next) break;
        chosen.push(next);
        used.add(next.id);
        if (used.size >= movementPool.length && chosen.length < wanted) used.clear();
      }
      const breath = pickOne(breaths, random, new Set());
      if (breath) chosen.push(breath);
      const blocks = allocate(chosen, dayBudget(phaseIndex, light), phaseIndex);
      days.push({ phaseIndex, day, light, blocks });
    }
  }
  return days;
}

const planCache = new Map<string, PlannedDay[]>();

export function planForZones(zones: readonly string[]): PlannedDay[] {
  const key = sortZones(zones).join('|') || 'relax';
  const cached = planCache.get(key);
  if (cached) return cached;
  const plan = buildPlan(zones);
  planCache.set(key, plan);
  return plan;
}

export function plannedDay(zones: readonly string[], day: DayRef): PlannedDay | undefined {
  return planForZones(zones).find((item) => item.phaseIndex === day.phaseIndex && item.day === day.day);
}

export function blocksForDay(zones: readonly string[], day: DayRef): PlanBlock[] {
  return plannedDay(zones, day)?.blocks ?? [];
}

export function dayKeyStillValid(key: string): boolean {
  return /^p[1-5]d([1-9]|1\d|2[0-8])$/.test(key) && dayKey({ phaseIndex: 0, day: 1 }).startsWith('p');
}
