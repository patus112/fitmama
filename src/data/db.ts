import Dexie, { type Table } from 'dexie';
import {
  DEFAULT_SETTINGS,
  sessionSchema,
  settingsSchema,
  type SavedSession,
  type SessionInput,
  type Settings,
} from '../domain/session';

interface SessionRow extends SessionInput {
  id?: number;
}

interface SettingsRow extends Settings {
  id: 'app';
}

export interface AudioRow {
  id: 'custom';
  name: string;
  blob: Blob;
}

interface FavoriteRow {
  exerciseId: string;
}

class FitMamaDB extends Dexie {
  sessions!: Table<SessionRow, number>;
  settings!: Table<SettingsRow, string>;
  audio!: Table<AudioRow, string>;
  favorites!: Table<FavoriteRow, string>;

  constructor() {
    super('fitmama');
    this.version(1).stores({
      sessions: '++id, date, dayKey, completed',
      settings: 'id',
      audio: 'id',
      favorites: 'exerciseId',
    });
  }
}

export const db = new FitMamaDB();

export async function loadSessions(): Promise<SavedSession[]> {
  const rows = await db.sessions.toArray();
  const saved: SavedSession[] = [];
  for (const row of rows) {
    if (typeof row.id !== 'number') continue;
    const { id, ...rest } = row;
    const parsed = sessionSchema.safeParse(rest);
    if (parsed.success) saved.push({ ...parsed.data, id });
  }
  saved.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  return saved;
}

export async function addSession(input: SessionInput): Promise<number> {
  const parsed = sessionSchema.parse(input);
  const id = await db.sessions.add(parsed);
  if (typeof id !== 'number') throw new Error('Could not save the session');
  return id;
}

export async function loadSettings(): Promise<Settings> {
  const row = await db.settings.get('app');
  if (!row) return DEFAULT_SETTINGS;
  const parsed = settingsSchema.safeParse({
    volume: row.volume,
    muted: row.muted,
    trackId: row.trackId,
    customBpm: row.customBpm,
  });
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await db.settings.put({ ...settingsSchema.parse(settings), id: 'app' });
}

export async function loadCustomAudio(): Promise<AudioRow | undefined> {
  return db.audio.get('custom');
}

export async function saveCustomAudio(file: Blob, name: string): Promise<void> {
  await db.audio.put({ id: 'custom', name, blob: file });
}

export async function clearCustomAudio(): Promise<void> {
  await db.audio.delete('custom');
}

export async function loadFavorites(): Promise<string[]> {
  const rows = await db.favorites.toArray();
  return rows.map((row) => row.exerciseId);
}

export async function setFavorite(exerciseId: string, on: boolean): Promise<void> {
  if (on) await db.favorites.put({ exerciseId });
  else await db.favorites.delete(exerciseId);
}
