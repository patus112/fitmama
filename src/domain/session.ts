import { z } from 'zod';
import { clampSpeed } from './tempo';
import type { TrackId } from './tracks';

export const sessionExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  seconds: z.number().int().nonnegative(),
});

export const sessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startedAt: z.string().min(1),
  exercises: z.array(sessionExerciseSchema).min(1),
  totalSeconds: z.number().int().nonnegative(),
  score: z.number().int().nonnegative(),
  maxCombo: z.number().int().min(0).max(5),
  completed: z.boolean(),
  dayKey: z.string().regex(/^p\d+d\d+$/),
});

export type SessionExercise = z.infer<typeof sessionExerciseSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;

export interface SavedSession extends SessionInput {
  id: number;
}

export const SPEED_IDS = ['sunday-stretch', 'couch-lullaby', 'quiet-grove', 'custom'] as const;
export type SpeedId = (typeof SPEED_IDS)[number];
export type SongSpeeds = Record<SpeedId, number>;

export const DEFAULT_SPEEDS: SongSpeeds = {
  'sunday-stretch': 1,
  'couch-lullaby': 1,
  'quiet-grove': 1,
  custom: 1,
};

const storedSettingsSchema = z.object({
  volume: z.number().min(0).max(1),
  muted: z.boolean(),
  trackId: z.enum(['sunday-stretch', 'couch-lullaby', 'quiet-grove', 'custom']),
  customBpm: z.number().int().min(40).max(160),
  bpmManual: z.boolean().optional(),
  speeds: z.record(z.string(), z.number()).optional(),
});

export interface Settings {
  volume: number;
  muted: boolean;
  trackId: TrackId;
  customBpm: number;
  bpmManual: boolean;
  speeds: SongSpeeds;
}

export function normalizeSpeeds(value: Record<string, number> | undefined): SongSpeeds {
  const speeds = { ...DEFAULT_SPEEDS };
  for (const id of SPEED_IDS) {
    const raw = value?.[id];
    if (typeof raw === 'number') speeds[id] = clampSpeed(raw);
  }
  return speeds;
}

export function normalizeSettings(input: unknown): Settings | null {
  const parsed = storedSettingsSchema.safeParse(input);
  if (!parsed.success) return null;
  return {
    volume: parsed.data.volume,
    muted: parsed.data.muted,
    trackId: parsed.data.trackId,
    customBpm: parsed.data.customBpm,
    bpmManual: parsed.data.bpmManual ?? false,
    speeds: normalizeSpeeds(parsed.data.speeds),
  };
}

export function settingsForStorage(settings: Settings): Settings {
  const parsed = normalizeSettings(settings);
  if (!parsed) throw new Error('Settings are not valid');
  return parsed;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.35,
  muted: false,
  trackId: 'sunday-stretch',
  customBpm: 96,
  bpmManual: false,
  speeds: { ...DEFAULT_SPEEDS },
};
