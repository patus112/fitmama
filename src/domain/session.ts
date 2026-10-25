import { z } from 'zod';

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

export const settingsSchema = z.object({
  volume: z.number().min(0).max(1),
  muted: z.boolean(),
  trackId: z.enum(['sunday-stretch', 'couch-lullaby', 'quiet-grove', 'custom']),
  customBpm: z.number().int().min(40).max(120),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.35,
  muted: false,
  trackId: 'sunday-stretch',
  customBpm: 96,
};
