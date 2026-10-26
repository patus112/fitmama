import Dexie, { type Table } from 'dexie';
import { migrateSessionRow, migrateSettingsRow } from '../domain/migrate';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  sessionSchema,
  settingsForStorage,
  type SavedSession,
  type SessionInput,
  type Settings,
} from '../domain/session';

export const FITMAMA_STORES = {
  sessions: '++id, date, dayKey, completed',
  settings: 'id',
  audio: 'id',
  favorites: 'exerciseId',
} as const;

export function registerFitMamaSchema(database: Dexie): void {
  database.version(1).stores(FITMAMA_STORES);
  database.version(2)
    .stores(FITMAMA_STORES)
    .upgrade(async (tx) => {
      await tx.table('sessions').toCollection().modify((row: object) => {
        const next = migrateSessionRow(row);
        if (!next) return;
        Object.assign(row, next);
      });
      await tx.table('settings').toCollection().modify((row: object) => {
        Object.assign(row, migrateSettingsRow(row));
      });
    });
}

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
  detectedBpm?: number;
  beatOffset?: number;
  speed?: number;
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
    registerFitMamaSchema(this);
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
  return (
    normalizeSettings({
      volume: row.volume,
      muted: row.muted,
      trackId: row.trackId,
      customBpm: row.customBpm,
      bpmManual: row.bpmManual,
      speeds: row.speeds,
      zones: row.zones,
      disclaimerAck: row.disclaimerAck,
    }) ?? DEFAULT_SETTINGS
  );
}

export async function saveSettings(settings: Settings): Promise<void> {
  await db.settings.put({ ...settingsForStorage(settings), id: 'app' });
}

export async function loadCustomAudio(): Promise<AudioRow | undefined> {
  return db.audio.get('custom');
}

export async function saveCustomAudio(file: Blob, name: string): Promise<void> {
  await db.audio.put({ id: 'custom', name, blob: file });
}

export async function saveDetectedTempo(bpm: number, offset: number): Promise<void> {
  const existing = await db.audio.get('custom');
  if (!existing) return;
  await db.audio.put({ ...existing, detectedBpm: bpm, beatOffset: offset });
}

export async function saveCustomSpeed(speed: number): Promise<void> {
  const existing = await db.audio.get('custom');
  if (!existing) return;
  await db.audio.put({ ...existing, speed });
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
