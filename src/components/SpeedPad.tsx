import { clampSpeed, SPEED_MAX, SPEED_MIN, SPEED_STEP, type TempoFeel } from '../domain/tempo';

export function SpeedPad({
  speed,
  feel,
  onChange,
}: {
  speed: number;
  feel: TempoFeel;
  onChange: (speed: number) => void;
}) {
  return (
    <div className="speed-pad" role="group" aria-label="Song speed" data-testid="speed-pad">
      <button
        type="button"
        data-testid="speed-slower"
        aria-label="Slow the song"
        disabled={speed <= SPEED_MIN + 0.001}
        onClick={() => onChange(clampSpeed(speed - SPEED_STEP))}
      >
        −
      </button>
      <p>
        <strong>{feel}</strong>
        <span>{speed.toFixed(2)}×</span>
      </p>
      <button
        type="button"
        data-testid="speed-faster"
        aria-label="Speed the song"
        disabled={speed >= SPEED_MAX - 0.001}
        onClick={() => onChange(clampSpeed(speed + SPEED_STEP))}
      >
        +
      </button>
      <button type="button" data-testid="speed-reset" aria-label="Reset song speed" onClick={() => onChange(1)}>
        Reset
      </button>
    </div>
  );
}
