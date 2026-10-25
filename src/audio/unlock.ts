/** A one-sample silent WAV. Looping it keeps iOS on the playback audio session. */
export const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

/** Master level. Default volume 0.35 stays soft, and mute is the only way to reach 0. */
export function audibleGain(volume: number, muted: boolean): number {
  if (muted) return 0;
  const level = Math.min(1, Math.max(0, volume));
  return level * 0.2;
}

export interface UnlockContext {
  state: string;
  destination: unknown;
  resume: () => Promise<void> | void;
  createBuffer: (channels: number, length: number, sampleRate: number) => unknown;
  createBufferSource: () => {
    buffer: unknown;
    connect: (dest: unknown) => void;
    start: (when?: number) => void;
  };
}

/**
 * Resume and play a silent buffer before returning.
 * Both happen in the caller’s turn so an iOS tap is still the user gesture.
 */
export function unlockWebAudio(audio: UnlockContext): void {
  if (audio.state !== 'running') void audio.resume();
  try {
    const buffer = audio.createBuffer(1, 1, 22050);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.destination);
    source.start(0);
  } catch {
    /* resume already ran; a buffer failure must not swallow the gesture */
  }
}

export interface ArmableAudio {
  src: string;
  loop: boolean;
  volume: number;
  setAttribute: (name: string, value: string) => void;
  play: () => Promise<void>;
}

/** `play()` runs before this returns. iOS ignores a play() that waits on a timer. */
export function playInGesture(el: ArmableAudio, src: string, volume: number): Promise<void> {
  if (el.src !== src) el.src = src;
  el.loop = true;
  (el as { playsInline?: boolean }).playsInline = true;
  el.volume = volume;
  el.setAttribute('playsinline', '');
  el.setAttribute('webkit-playsinline', 'true');
  try {
    return Promise.resolve(el.play());
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error('play failed'));
  }
}

export function preferPlaybackSession(nav: { audioSession?: { type: string } }): void {
  if (nav.audioSession) nav.audioSession.type = 'playback';
}

export interface ToneOscillator {
  type: OscillatorType;
  frequency: { setValueAtTime: (value: number, time: number) => void };
  connect: (dest: unknown) => void;
  start: (when?: number) => void;
  stop: (when?: number) => void;
}

export interface ToneGain {
  gain: {
    value: number;
    setValueAtTime: (value: number, time: number) => void;
    exponentialRampToValueAtTime: (value: number, time: number) => void;
  };
  connect: (dest: unknown) => void;
}

export interface ToneContext {
  currentTime: number;
  createOscillator: () => ToneOscillator;
  createGain: () => ToneGain;
}

/** Connect oscillator → gain → destination and start it. Peak is always above 0. */
export function startTone(
  ctx: ToneContext,
  destination: unknown,
  options: { frequency: number; peak: number; when: number; wave: OscillatorType; duration: number },
): number {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const peak = Math.max(options.peak, 0.0001);
  const when = options.when;
  const duration = Math.max(options.duration, 0.05);
  osc.type = options.wave;
  osc.frequency.setValueAtTime(options.frequency, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(when);
  osc.stop(when + duration + 0.04);
  return peak;
}
