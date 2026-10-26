import { normalizeSettings, sessionSchema, type SessionInput, type Settings } from './session';

/** Keep a saved session exactly as it was. Unknown rows are left for the caller to skip. */
export function migrateSessionRow(row: object): (SessionInput & { id?: number }) | null {
  const record = row as { id?: number };
  const { id, ...rest } = record;
  const parsed = sessionSchema.safeParse(rest);
  if (!parsed.success) return null;
  return typeof id === 'number' ? { ...parsed.data, id } : parsed.data;
}

/** Keep songs, volume, and tempo, and add the new zone fields without wiping the row. */
export function migrateSettingsRow(row: object): Settings & { id?: string } {
  const record = row as { id?: string; zones?: unknown; disclaimerAck?: unknown };
  const settings = normalizeSettings(row) ?? normalizeSettings({
    volume: 0.35,
    muted: false,
    trackId: 'sunday-stretch',
    customBpm: 96,
  });
  if (!settings) {
    throw new Error('Settings could not be kept');
  }
  return {
    ...settings,
    ...(typeof record.id === 'string' ? { id: record.id } : {}),
  };
}
