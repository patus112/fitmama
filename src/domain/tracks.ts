export const TRACKS = [
  { id: 'sunday-stretch', name: 'Sunday Stretch', bpm: 96 },
  { id: 'couch-lullaby', name: 'Couch Lullaby', bpm: 72 },
  { id: 'quiet-grove', name: 'Quiet Grove', bpm: 84 },
] as const;

export type PresetTrackId = (typeof TRACKS)[number]['id'];
export type TrackId = PresetTrackId | 'custom';

export function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) return 0.35;
  return Math.min(1, Math.max(0, volume));
}

/** Manual tempo stays in the range the detector and the slider share. */
export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return 96;
  return Math.min(160, Math.max(40, Math.round(bpm)));
}

export function trackById(id: string): (typeof TRACKS)[number] | undefined {
  return TRACKS.find((track) => track.id === id);
}

export function resolveBpm(trackId: string, customBpm: number): number {
  const preset = trackById(trackId);
  if (preset) return preset.bpm;
  return clampBpm(customBpm);
}

export function songName(trackId: string, customName: string | null): string {
  if (trackId === 'custom') return customName ?? 'Your song';
  return trackById(trackId)?.name ?? 'Sunday Stretch';
}

/** Detected tempo is used until she moves the slider or taps a beat. */
export function resolveSongBpm(
  trackId: string,
  customBpm: number,
  detectedBpm: number | null,
  manual: boolean,
): number {
  if (trackById(trackId)) return trackById(trackId)?.bpm ?? 96;
  if (!manual && detectedBpm != null && Number.isFinite(detectedBpm) && detectedBpm > 0) {
    return clampBpm(detectedBpm);
  }
  return clampBpm(customBpm);
}

export function resolveBeatOffset(trackId: string, manual: boolean, offset: number): number {
  if (trackId !== 'custom' || manual) return 0;
  if (!Number.isFinite(offset) || offset < 0) return 0;
  return Math.min(offset, 5);
}

export function trackLabel(trackId: string, customBpm: number, customName: string | null): string {
  const bpm = resolveBpm(trackId, customBpm);
  if (trackId === 'custom') {
    return `${customName ?? 'Your song'} · ${bpm} BPM`;
  }
  const preset = trackById(trackId);
  return `${preset?.name ?? 'Sunday Stretch'} · ${bpm} BPM`;
}
