import { clampSpeed } from '../domain/tempo';
import type { TrackId } from '../domain/tracks';
import {
  SILENT_WAV,
  audibleGain,
  playInGesture,
  preferPlaybackSession,
  startTone,
  unlockWebAudio,
} from './unlock';

interface Timbre {
  wave: OscillatorType;
  low: number;
  high: number;
  drone: number;
}

const TIMBRES: Record<string, Timbre> = {
  'sunday-stretch': { wave: 'sine', low: 392, high: 523.25, drone: 196 },
  'couch-lullaby': { wave: 'triangle', low: 329.63, high: 440, drone: 164.81 },
  'quiet-grove': { wave: 'sine', low: 349.23, high: 523.25, drone: 174.61 },
};

export interface MusicStart {
  volume: number;
  muted: boolean;
  bpm: number;
  rate?: number;
  trackId: TrackId | string;
  customUrl?: string | null;
  getTime: () => number;
}

let shared: AudioContext | null = null;
let keeper: HTMLAudioElement | null = null;
let watching = false;

function trace(step: string): void {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return;
  const host = window as Window & { __fitmamaAudioLog?: string[] };
  host.__fitmamaAudioLog ??= [];
  host.__fitmamaAudioLog.push(step);
}

function createContext(): AudioContext {
  const host = window as Window & { webkitAudioContext?: typeof AudioContext };
  const Ctx = window.AudioContext ?? host.webkitAudioContext;
  if (!Ctx) throw new Error('This phone has no Web Audio.');
  return new Ctx();
}

function context(): AudioContext {
  if (!shared) shared = createContext();
  return shared;
}

function silentKeeper(): HTMLAudioElement {
  if (!keeper) {
    keeper = document.createElement('audio');
    keeper.setAttribute('aria-hidden', 'true');
    keeper.preload = 'auto';
    keeper.style.position = 'absolute';
    keeper.style.width = '0';
    keeper.style.height = '0';
    keeper.style.opacity = '0';
    keeper.style.pointerEvents = 'none';
    document.body.append(keeper);
  }
  return keeper;
}

function watchInterruptions(audio: AudioContext): void {
  if (watching) return;
  watching = true;
  audio.addEventListener('statechange', () => {
    if ((audio.state as string) === 'interrupted') {
      trace('resume-interrupted');
      void audio.resume();
      const loop = keeper;
      if (loop?.paused) void loop.play().catch(() => undefined);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (audio.state !== 'running') {
      trace('resume-visible');
      void audio.resume();
    }
    const loop = keeper;
    if (loop?.paused) void loop.play().catch(() => undefined);
  });
}

/**
 * Call this directly inside a tap or click, before any await.
 * iOS only unlocks audio in that same turn.
 */
export function unlockAudio(): void {
  preferPlaybackSession(navigator as Navigator & { audioSession?: { type: string } });
  const audio = context();
  watchInterruptions(audio);
  unlockWebAudio(audio as unknown as Parameters<typeof unlockWebAudio>[0]);
  trace('resume');
  trace('silent-buffer');
  void playInGesture(silentKeeper(), SILENT_WAV, 0.001).catch(() => undefined);
  trace('silent-html');
}

/**
 * Quiet procedural music. Gains are scaled so the default volume stays soft,
 * and 100% is still a gentle beat rather than a loud track.
 */
export class MusicEngine {
  private master: GainNode | null = null;
  private drone: OscillatorNode | null = null;
  private timer = 0;
  private previewTimer = 0;
  private beatIndex = 0;
  private running = false;
  private volume = 0.35;
  private muted = false;
  private songBpm = 96;
  private rate = 1;
  private segmentReal = 0;
  private segmentSong = 0;
  private trackId = 'sunday-stretch';
  private custom: HTMLAudioElement | null = null;
  private fileAudible = false;
  private armToken = 0;
  private getTime: () => number = () => 0;

  apply(volume: number, muted: boolean): void {
    this.volume = volume;
    this.muted = muted;
    if (this.custom) this.custom.volume = this.elementVolume();
    this.pushGain();
  }

  /**
   * Starts nodes or calls `play()` before returning. The promise only reports
   * a later file-playback failure; it is not awaited before sound begins.
   */
  start(options: MusicStart): Promise<void> {
    this.stopNodes();
    this.volume = options.volume;
    this.muted = options.muted;
    this.songBpm = options.bpm > 0 ? options.bpm : 96;
    this.rate = clampSpeed(options.rate ?? 1);
    this.trackId = options.trackId;
    this.getTime = options.getTime;
    this.segmentReal = this.getTime();
    this.segmentSong = 0;
    if (options.trackId === 'custom' && options.customUrl) {
      return this.startFile(options.customUrl);
    }
    this.startProcedural();
    return Promise.resolve();
  }

  preview(options: MusicStart, ms = 5000): Promise<void> {
    const pending = this.start(options);
    this.previewTimer = window.setTimeout(() => this.stop(), ms);
    return pending;
  }

  /** A short beep through the same master bus, loud enough to hear on a phone. */
  playTestTone(): void {
    const audio = this.ensureMaster();
    if (audio.state !== 'running') void audio.resume();
    const previous = this.outputGain();
    const bus = Math.max(previous, 0.12);
    if (this.master) this.master.gain.value = bus;
    startTone(audio as unknown as Parameters<typeof startTone>[0], this.master, {
      frequency: 523.25,
      peak: 0.45,
      when: audio.currentTime,
      wave: 'sine',
      duration: 0.4,
    });
    trace('tone');
    window.setTimeout(() => {
      if (this.master) this.master.gain.value = this.outputGain();
    }, 500);
  }

  /** Remember the current song, then `play()` the new file in this turn. */
  holdFile(url: string): string {
    const previous = this.custom?.getAttribute('src') ?? '';
    this.armFile(url, false);
    return previous;
  }

  releaseFile(previousSrc: string): void {
    if (!this.custom) return;
    this.armToken += 1;
    this.fileAudible = false;
    this.custom.pause();
    if (previousSrc) this.custom.src = previousSrc;
    else {
      this.custom.removeAttribute('src');
      this.custom.src = '';
    }
  }

  armFile(url: string, audible: boolean): void {
    const token = ++this.armToken;
    const el = this.prepareFile(url);
    this.fileAudible = audible;
    const pending = playInGesture(el, url, audible ? this.elementVolume() : 0.001);
    if (!audible) {
      void pending.then(() => {
        if (this.armToken !== token || this.fileAudible) return;
        el.pause();
        try {
          el.currentTime = 0;
        } catch {
          /* The file may not be seekable yet. */
        }
      });
    }
  }

  /** Speed up or slow down without moving the playhead. Pitch stays put for files. */
  setRate(rate: number): void {
    const now = this.getTime();
    const song = this.segmentSong + (now - this.segmentReal) * this.rate;
    this.rate = clampSpeed(rate);
    this.segmentReal = now;
    this.segmentSong = song;
    this.applyRate();
    const beat = 60 / this.songBpm;
    this.beatIndex = Math.floor(song / beat) + 1;
  }

  pause(): void {
    this.running = false;
    this.fileAudible = false;
    window.clearTimeout(this.timer);
    if (this.custom) this.custom.pause();
    if (shared && shared.state === 'running') void shared.suspend();
  }

  resume(): void {
    if (shared && shared.state !== 'running') void shared.resume();
    if (this.trackId === 'custom' && this.custom?.src) {
      this.fileAudible = true;
      this.armToken += 1;
      void playInGesture(this.custom, this.custom.src, this.elementVolume()).catch(() => undefined);
      return;
    }
    if (this.running) return;
    this.running = true;
    this.pushGain();
    this.pump();
  }

  stop(): void {
    this.stopNodes();
  }

  private elementVolume(): number {
    return this.muted ? 0 : Math.min(1, Math.max(0, this.volume));
  }

  private outputGain(): number {
    return audibleGain(this.volume, this.muted);
  }

  private ensureMaster(): AudioContext {
    const audio = context();
    if (!this.master) {
      const master = audio.createGain();
      master.gain.value = this.outputGain();
      master.connect(audio.destination);
      this.master = master;
    }
    return audio;
  }

  private pushGain(): void {
    if (!this.master) return;
    const next = this.outputGain();
    this.master.gain.value = next;
  }

  private startProcedural(): void {
    const audio = this.ensureMaster();
    if (audio.state !== 'running') void audio.resume();
    const timbre = TIMBRES[this.trackId] ?? TIMBRES['sunday-stretch'];
    if (!timbre || !this.master) return;
    this.pushGain();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = timbre.drone / 2;
    gain.gain.value = 0.045;
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    this.drone = osc;
    this.running = true;
    this.beatIndex = Math.floor(this.songNow() / (60 / this.songBpm));
    this.pump();
    trace('synth');
  }

  private startFile(url: string): Promise<void> {
    this.fileAudible = true;
    this.armToken += 1;
    const el = this.prepareFile(url);
    return playInGesture(el, url, this.elementVolume()).then(
      () => undefined,
      () => Promise.reject(new Error('file audio did not play')),
    );
  }

  private prepareFile(url: string): HTMLAudioElement {
    if (!this.custom) this.custom = document.createElement('audio');
    this.custom.loop = true;
    (this.custom as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    this.custom.setAttribute('playsinline', '');
    this.custom.setAttribute('webkit-playsinline', 'true');
    if (this.custom.src !== url) this.custom.src = url;
    this.custom.volume = this.elementVolume();
    this.applyRate(this.custom);
    return this.custom;
  }

  private songNow(): number {
    return this.segmentSong + (this.getTime() - this.segmentReal) * this.rate;
  }

  private applyRate(element: HTMLAudioElement | null = this.custom): void {
    if (!element) return;
    const rate = clampSpeed(this.rate);
    element.playbackRate = rate;
    element.preservesPitch = true;
    const vendor = element as HTMLAudioElement & { webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean };
    vendor.webkitPreservesPitch = true;
    vendor.mozPreservesPitch = true;
  }

  private pump = (): void => {
    if (!this.running || !shared || !this.master) return;
    const timbre = TIMBRES[this.trackId] ?? TIMBRES['sunday-stretch'];
    if (!timbre) return;
    const beat = 60 / this.songBpm;
    const nowSong = this.songNow();
    const horizon = nowSong + 0.4 * this.rate;
    while (this.beatIndex * beat < horizon) {
      const songWhen = this.beatIndex * beat;
      const realWhen = this.segmentReal + (songWhen - this.segmentSong) / this.rate;
      const delay = Math.max(0, realWhen - this.getTime());
      this.blip(shared.currentTime + delay, this.beatIndex, timbre);
      this.beatIndex += 1;
    }
    this.timer = window.setTimeout(this.pump, 80);
  };

  private blip(time: number, beat: number, timbre: Timbre): void {
    if (!shared || !this.master) return;
    startTone(shared as unknown as Parameters<typeof startTone>[0], this.master, {
      frequency: beat % 2 === 0 ? timbre.low : timbre.high,
      peak: beat % 4 === 0 ? 0.5 : 0.26,
      when: time,
      wave: timbre.wave,
      duration: 0.42,
    });
  }

  private stopNodes(): void {
    this.running = false;
    this.fileAudible = false;
    window.clearTimeout(this.timer);
    window.clearTimeout(this.previewTimer);
    if (this.drone) {
      try {
        this.drone.stop();
      } catch {
        /* already stopped */
      }
      this.drone.disconnect();
      this.drone = null;
    }
    if (this.custom) this.custom.pause();
  }
}

export const music = new MusicEngine();
