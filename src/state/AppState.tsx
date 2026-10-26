import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { detectTempoFromBlob } from '../audio/detectTempo';
import { music, unlockAudio } from '../audio/engine';
import { probePlayable } from '../audio/probeSong';
import { UNPLAYABLE_SONG } from '../domain/songFile';
import {
  clearCustomAudio,
  loadCustomAudio,
  loadFavorites,
  loadSessions,
  loadSettings,
  saveCustomAudio,
  saveCustomSpeed,
  saveDetectedTempo,
  saveSettings,
  setFavorite,
} from '../data/db';
import { clampSpeed } from '../domain/tempo';
import { clampBpm, clampVolume, type TrackId } from '../domain/tracks';
import { DEFAULT_SETTINGS, type SavedSession, type Settings } from '../domain/session';
import { sortZones, type ZoneId } from '../domain/zones';

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

interface AppStateValue {
  ready: boolean;
  storageError: string | null;
  settings: Settings;
  sessions: SavedSession[];
  favorites: ReadonlySet<string>;
  customName: string | null;
  customUrl: string | null;
  detectedBpm: number | null;
  beatOffset: number;
  beatMessage: string | null;
  notice: string | null;
  setNotice: (notice: string | null) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setTrack: (trackId: TrackId) => void;
  setCustomBpm: (bpm: number) => void;
  setSongSpeed: (speed: number) => void;
  saveCustomFile: (file: File) => Promise<void>;
  removeCustomFile: () => Promise<void>;
  toggleFavorite: (exerciseId: string) => void;
  refreshSessions: () => Promise<void>;
  setZones: (zones: readonly ZoneId[]) => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(new Set());
  const [customName, setCustomName] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);
  const [beatOffset, setBeatOffset] = useState(0);
  const [beatMessage, setBeatMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const settingsRef = useRef(settings);
  const detectToken = useRef(0);
  settingsRef.current = settings;

  function replaceUrl(next: string | null) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next;
    setCustomUrl(next);
  }

  function persist(patch: Partial<Settings>) {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    music.apply(next.volume, next.muted);
    void saveSettings(next).catch(() => {
      setNotice('Could not remember that setting on this phone.');
    });
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [storedSettings, storedSessions, storedFavorites, audio] = await Promise.all([
          loadSettings(),
          loadSessions(),
          loadFavorites(),
          loadCustomAudio(),
        ]);
        if (cancelled) return;
        let next = storedSettings;
        if (typeof audio?.speed === 'number') {
          next = { ...next, speeds: { ...next.speeds, custom: clampSpeed(audio.speed) } };
        }
        settingsRef.current = next;
        setSettings(next);
        setSessions(storedSessions);
        setFavorites(new Set(storedFavorites));
        if (audio) {
          setCustomName(audio.name);
          replaceUrl(URL.createObjectURL(audio.blob));
          if (typeof audio.detectedBpm === 'number') {
            setDetectedBpm(audio.detectedBpm);
            setBeatOffset(audio.beatOffset ?? 0);
            setBeatMessage(
              next.bpmManual
                ? `Using your tempo, ${next.customBpm} BPM.`
                : `Beat found at ${Math.round(audio.detectedBpm)} BPM. The arrows follow it unless you set a tempo yourself.`,
            );
          }
        }
      } catch {
        if (!cancelled) {
          setStorageError('This phone blocked local storage. Fit Mama keeps everything on the device, so saving needs it.');
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const value = useMemo<AppStateValue>(() => {
    return {
      ready,
      storageError,
      settings,
      sessions,
      favorites,
      customName,
      customUrl,
      detectedBpm,
      beatOffset,
      beatMessage,
      notice,
      setNotice,
      setVolume: (volume) => persist({ volume: clampVolume(volume) }),
      setMuted: (muted) => persist({ muted }),
      setTrack: (trackId) => persist({ trackId }),
      setCustomBpm: (bpm) => {
        const next = clampBpm(bpm);
        persist({ customBpm: next, bpmManual: true });
        setBeatMessage(`Using your tempo, ${next} BPM.`);
      },
      setSongSpeed: (speed) => {
        const next = clampSpeed(speed);
        const trackId = settingsRef.current.trackId;
        persist({ speeds: { ...settingsRef.current.speeds, [trackId]: next } });
        if (trackId === 'custom') void saveCustomSpeed(next);
      },
      saveCustomFile: async (file) => {
        if (file.size > MAX_AUDIO_BYTES) {
          setNotice('That file is over 20 MB. A shorter song is easier to keep on this phone.');
          return;
        }
        const url = URL.createObjectURL(file);
        unlockAudio();
        const previous = music.holdFile(url);
        setNotice('Checking that song…');
        const playable = await probePlayable(file);
        if (!playable) {
          music.releaseFile(previous);
          URL.revokeObjectURL(url);
          setNotice(UNPLAYABLE_SONG);
          return;
        }
        replaceUrl(url);
        setCustomName(file.name);
        setDetectedBpm(null);
        setBeatOffset(0);
        persist({
          trackId: 'custom',
          bpmManual: false,
          speeds: { ...settingsRef.current.speeds, custom: 1 },
        });
        try {
          await saveCustomAudio(file, file.name);
          setNotice(null);
        } catch {
          setNotice('Could not keep that file on this phone.');
          return;
        }
        const token = ++detectToken.current;
        setBeatMessage('Finding the beat…');
        try {
          const estimate = await detectTempoFromBlob(file);
          if (detectToken.current !== token) return;
          if (!estimate?.confident) {
            setBeatMessage('No clear beat in that song. Tap along or set the tempo.');
            return;
          }
          await saveDetectedTempo(estimate.bpm, estimate.offsetSeconds);
          if (detectToken.current !== token) return;
          setDetectedBpm(estimate.bpm);
          setBeatOffset(estimate.offsetSeconds);
          if (!settingsRef.current.bpmManual) {
            persist({ customBpm: clampBpm(estimate.bpm), bpmManual: false });
          }
          setBeatMessage(
            `Beat found at ${estimate.bpm} BPM. The arrows follow it unless you set a tempo yourself.`,
          );
        } catch {
          if (detectToken.current === token) {
            setBeatMessage('Could not read a beat from that song. Tap along or set the tempo.');
          }
        }
      },
      removeCustomFile: async () => {
        detectToken.current += 1;
        await clearCustomAudio();
        setCustomName(null);
        setDetectedBpm(null);
        setBeatOffset(0);
        setBeatMessage(null);
        replaceUrl(null);
        if (settingsRef.current.trackId === 'custom') persist({ trackId: 'sunday-stretch' });
      },
      setZones: async (zones) => {
        const next = sortZones(zones);
        if (next.length === 0) return;
        const updated = { ...settingsRef.current, zones: next, disclaimerAck: true };
        settingsRef.current = updated;
        await saveSettings(updated);
        setSettings(updated);
      },
      toggleFavorite: (exerciseId) => {
        const on = !favorites.has(exerciseId);
        const next = new Set(favorites);
        if (on) next.add(exerciseId);
        else next.delete(exerciseId);
        setFavorites(next);
        void setFavorite(exerciseId, on);
      },
      refreshSessions: async () => {
        setSessions(await loadSessions());
      },
    };
  }, [
    ready,
    storageError,
    settings,
    sessions,
    favorites,
    customName,
    customUrl,
    detectedBpm,
    beatOffset,
    beatMessage,
    notice,
  ]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppProvider');
  return value;
}
