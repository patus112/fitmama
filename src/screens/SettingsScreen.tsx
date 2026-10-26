import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { music, unlockAudio } from '../audio/engine';
import { GameClock } from '../audio/clock';
import { SoundControl } from '../components/SoundControl';
import { sessionsToCsv, sessionsToJson } from '../domain/exportData';
import { songAcceptAttribute } from '../domain/songFile';
import { exerciseById, GLUTE_BRIDGE_ID } from '../domain/catalog';
import { planRep } from '../domain/tempo';
import { TRACKS, clampBpm, resolveSongBpm } from '../domain/tracks';
import { SpeedPad } from '../components/SpeedPad';
import { downloadText } from '../lib/download';
import { useAppState } from '../state/AppState';

export function SettingsScreen() {
  const {
    settings,
    sessions,
    customName,
    customUrl,
    detectedBpm,
    beatMessage,
    notice,
    setNotice,
    setTrack,
    setCustomBpm,
    setSongSpeed,
    saveCustomFile,
    removeCustomFile,
  } = useAppState();
  const taps = useRef<number[]>([]);
  const [tapHint, setTapHint] = useState('Tap the beat a few times');

  function preview() {
    unlockAudio();
    if (settings.muted) {
      setNotice('Music is muted, so this preview stays quiet. Unmute whenever you like.');
      return;
    }
    const clock = new GameClock();
    clock.start();
    void music.preview({
      volume: settings.volume,
      muted: settings.muted,
      bpm: resolveSongBpm(settings.trackId, settings.customBpm, detectedBpm, settings.bpmManual),
      rate: settings.speeds[settings.trackId],
      trackId: settings.trackId,
      customUrl,
      getTime: () => clock.now(),
    });
    setNotice('A few seconds, quietly.');
  }

  function testSound() {
    unlockAudio();
    music.playTestTone();
    setNotice('A short tone.');
  }

  function onTapTempo() {
    const now = performance.now();
    const recent = taps.current.filter((tap) => now - tap < 4000);
    recent.push(now);
    taps.current = recent;
    if (recent.length < 4) {
      setTapHint(`${recent.length} tap${recent.length === 1 ? '' : 's'} — a couple more`);
      return;
    }
    const intervals: number[] = [];
    for (let index = 1; index < recent.length; index += 1) {
      const current = recent[index];
      const previous = recent[index - 1];
      if (current !== undefined && previous !== undefined) intervals.push(current - previous);
    }
    const average = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    const bpm = clampBpm(Math.round(60000 / average));
    setCustomBpm(bpm);
    setTrack('custom');
    setTapHint(`Tempo set to ${bpm} BPM`);
  }

  const bridge = exerciseById(GLUTE_BRIDGE_ID);
  const songBpm = resolveSongBpm(settings.trackId, settings.customBpm, detectedBpm, settings.bpmManual);
  const speed = settings.speeds[settings.trackId];
  const feel = planRep(songBpm, speed, {
    minSeconds: bridge?.minRepSeconds ?? 2,
    maxSeconds: bridge?.maxRepSeconds ?? 4,
  }).feel;

  const stamp = format(new Date(), 'yyyy-MM-dd');
  const songAccept = songAcceptAttribute(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);

  return (
    <div className="screen">
      <header className="top block-top">
        <p className="hello">On this phone only</p>
        <h1>Profile</h1>
      </header>
      <p className="lede">No account, no cloud. Volume, songs, and sessions stay here.</p>
      {notice ? (
        <p className="notice" role="status">
          {notice}
        </p>
      ) : null}

      <section className="card">
        <h2>Music</h2>
        <p className="help">Quiet by default. The beat is generated on this phone.</p>
        <SoundControl variant="inline" />
        <div className="track-list" role="radiogroup" aria-label="Built-in tracks">
          {TRACKS.map((track) => (
            <button
              key={track.id}
              type="button"
              role="radio"
              aria-checked={settings.trackId === track.id}
              className={settings.trackId === track.id ? 'track on' : 'track'}
              onClick={() => setTrack(track.id)}
            >
              <strong>{track.name}</strong>
              <span>{track.bpm} BPM</span>
            </button>
          ))}
        </div>
        <div className="export-row">
          <button type="button" className="btn btn-quiet" onClick={preview}>
            Hear a little
          </button>
          <button type="button" className="btn btn-quiet" data-testid="test-sound" onClick={testSound}>
            Test sound
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Your own song</h2>
        <p className="help">
          Pick a song from this phone, including one you downloaded. Nothing is uploaded. Fit Mama finds the beat on this phone. The slider and the taps still win if you set a tempo yourself.
        </p>
        <label className="file-btn">
          Choose an audio file
          <input
            type="file"
            accept={songAccept}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void saveCustomFile(file);
            }}
          />
        </label>
        {customName ? (
          <p className="file-name">
            {customName}
            <button type="button" onClick={() => void removeCustomFile()}>
              Remove
            </button>
          </p>
        ) : null}
        {beatMessage ? (
          <p className="help" data-testid="beat-message">
            {beatMessage}
          </p>
        ) : null}
        <label className="bpm">
          Tempo {settings.customBpm} BPM
          <input
            type="range"
            min={40}
            max={160}
            value={settings.customBpm}
            onChange={(event) => {
              setCustomBpm(Number(event.target.value));
              if (customName) setTrack('custom');
            }}
          />
        </label>
        <button type="button" className="btn btn-quiet inline" onClick={onTapTempo}>
          {tapHint}
        </button>
        <h3>Song speed</h3>
        <p className="help">Slow it down or speed it up. The bridge follows, and it stays calm. This choice is remembered for the song.</p>
        <SpeedPad speed={speed} feel={feel} onChange={setSongSpeed} />
      </section>

      <section className="card">
        <h2>Your sessions</h2>
        <p className="help">
          {sessions.length === 0
            ? 'No sessions yet. An export will be an empty file, and that is okay.'
            : `${sessions.length} saved on this phone. The file downloads here. It is not uploaded.`}
        </p>
        <div className="export-row">
          <button
            type="button"
            className="btn btn-coral"
            onClick={() => downloadText(`fit-mama-${stamp}.json`, sessionsToJson(sessions), 'application/json')}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => downloadText(`fit-mama-${stamp}.csv`, sessionsToCsv(sessions), 'text/csv')}
          >
            Export CSV
          </button>
        </div>
      </section>

      <p className="footnote">Fit Mama is a gentle practice, not medical advice. Stop if something hurts.</p>
    </div>
  );
}
