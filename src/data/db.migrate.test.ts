import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { FITMAMA_STORES, registerFitMamaSchema } from './db';

const names: string[] = [];

afterEach(async () => {
  await Promise.all(names.splice(0).map((name) => Dexie.delete(name)));
});

describe('Dexie migration', () => {
  it('keeps sessions, songs, favorites, and settings when the schema moves to version 2', async () => {
    const name = `fitmama-migrate-${Date.now()}`;
    names.push(name);
    const original = new Dexie(name);
    original.version(1).stores(FITMAMA_STORES);
    await original.table('sessions').add({
      date: '2026-10-25',
      startedAt: '2026-10-25T09:00:00.000Z',
      exercises: [{ exerciseId: 'glute-bridge', seconds: 180 }],
      totalSeconds: 180,
      score: 40,
      maxCombo: 2,
      completed: true,
      dayKey: 'p1d1',
    });
    await original.table('settings').add({
      id: 'app',
      volume: 0.5,
      muted: false,
      trackId: 'quiet-grove',
      customBpm: 84,
    });
    await original.table('audio').add({
      id: 'custom',
      name: 'lullaby.wav',
      blob: new Blob(['song']),
      detectedBpm: 72,
      beatOffset: 0.2,
      speed: 0.9,
    });
    await original.table('favorites').add({ exerciseId: 'glute-bridge' });
    original.close();

    const upgraded = new Dexie(name);
    registerFitMamaSchema(upgraded);
    const sessions = await upgraded.table('sessions').toArray();
    const settings = await upgraded.table('settings').get('app');
    const audio = await upgraded.table('audio').get('custom');
    const favorites = await upgraded.table('favorites').toArray();
    upgraded.close();

    expect(sessions).toEqual([
      expect.objectContaining({
        dayKey: 'p1d1',
        completed: true,
        score: 40,
        exercises: [{ exerciseId: 'glute-bridge', seconds: 180 }],
      }),
    ]);
    expect(settings).toMatchObject({
      volume: 0.5,
      trackId: 'quiet-grove',
      customBpm: 84,
      disclaimerAck: false,
      zones: [],
    });
    expect(audio).toMatchObject({ name: 'lullaby.wav', detectedBpm: 72, speed: 0.9 });
    expect(favorites).toEqual([{ exerciseId: 'glute-bridge' }]);
  });
});