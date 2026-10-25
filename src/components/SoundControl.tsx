import { useState } from 'react';
import { EighthNote, Volume2, VolumeX } from 'lucide-react';
import { trackLabel } from '../domain/tracks';
import { useAppState } from '../state/AppState';

export function SoundControl({ variant = 'menu' }: { variant?: 'menu' | 'inline' }) {
  const { settings, customName, setVolume, setMuted } = useAppState();
  const [open, setOpen] = useState(false);
  const percent = Math.round(settings.volume * 100);
  const label = trackLabel(settings.trackId, settings.customBpm, customName);

  const mute = (
    <button
      type="button"
      className="icon-btn"
      aria-pressed={settings.muted}
      aria-label={settings.muted ? 'Unmute music' : 'Mute music'}
      onClick={() => setMuted(!settings.muted)}
    >
      {settings.muted ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
    </button>
  );

  const slider = (
    <label className="volume">
      <span className="visually-hidden">Music volume</span>
      <input
        type="range"
        min={0}
        max={100}
        value={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent} percent`}
        onChange={(event) => setVolume(Number(event.target.value) / 100)}
      />
    </label>
  );

  if (variant === 'inline') {
    return (
      <div className="sound-inline">
        {mute}
        {slider}
        <span className="volume-readout">{percent}%</span>
      </div>
    );
  }

  return (
    <div className={open ? 'sound open' : 'sound'}>
      <button
        type="button"
        className="icon-btn music-btn"
        aria-expanded={open}
        aria-label="Music and volume"
        data-testid="music-button"
        onClick={() => setOpen((value) => !value)}
      >
        <EighthNote size={20} aria-hidden="true" />
      </button>
      {open ? (
        <div className="sound-pop">
          {mute}
          {slider}
          <p>{label}</p>
        </div>
      ) : null}
    </div>
  );
}
