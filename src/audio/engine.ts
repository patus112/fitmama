import type { TrackId } from '../domain/tracks';

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
  trackId: TrackId | string;
  customUrl?: string | null;
  getTime: () => number;
}

let shared: AudioContext | null = null;

export function primeAudioFromGesture(): void {
  const audio = shared ?? new AudioContext();
  shared = audio;
  if (audio.state === 'suspended') void audio.resume();
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
  private bpm = 96;
  private trackId = 'sunday-stretch';
  private custom: HTMLAudioElement | null = null;
  private getTime: () => number = () => 0;

  apply(volume: number, muted: boolean): void {
    this.volume = volume;
    this.muted = muted;
    if (this.custom) this.custom.volume = this.elementVolume();
    this.pushGain();
  }

  async start(options: MusicStart): Promise<void> {
    this.stopNodes();
    this.volume = options.volume;
    this.muted = options.muted;
    this.bpm = options.bpm;
    this.trackId = options.trackId;
    this.getTime = options.getTime;
    if (options.trackId === 'custom' && options.customUrl) {
      await this.startFile(options.customUrl);
      return;
    }
    await this.startProcedural();
  }

  async preview(options: MusicStart, ms = 5000): Promise<void> {
    await this.start(options);
    this.previewTimer = window.setTimeout(() => this.stop(), ms);
  }

  pause(): void {
    this.running = false;
    window.clearTimeout(this.timer);
    if (this.custom) this.custom.pause();
    if (shared && shared.state === 'running') void shared.suspend();
  }

  async resume(): Promise<void> {
    if (this.custom) {
      try {
        await this.custom.play();
      } catch {
        /* Autoplay can fail; the chart still moves. */
      }
      return;
    }
    if (shared && shared.state === 'suspended') {
      try {
        await shared.resume();
      } catch {
        return;
      }
    }
    this.running = true;
    this.pump();
  }

  stop(): void {
    this.stopNodes();
    if (shared && shared.state === 'suspended') void shared.resume();
  }

  private elementVolume(): number {
    return this.muted ? 0 : Math.min(1, Math.max(0, this.volume));
  }

  private outputGain(): number {
    return this.muted ? 0 : this.volume * 0.2;
  }

  private context(): AudioContext {
    if (!shared) shared = new AudioContext();
    return shared;
  }

  private ensureMaster(): AudioContext {
    const audio = this.context();
    if (!this.master) {
      const master = audio.createGain();
      master.gain.value = this.outputGain();
      master.connect(audio.destination);
      this.master = master;
    }
    return audio;
  }

  private pushGain(): void {
    if (!this.master || !shared) return;
    this.master.gain.setTargetAtTime(this.outputGain(), shared.currentTime, 0.04);
  }

  private async startProcedural(): Promise<void> {
    const audio = this.ensureMaster();
    if (audio.state === 'suspended') await audio.resume();
    const timbre = TIMBRES[this.trackId] ?? TIMBRES['sunday-stretch'];
    if (!timbre || !this.master) return;
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
    this.beatIndex = Math.floor(this.getTime() / (60 / this.bpm));
    this.pump();
  }

  private async startFile(url: string): Promise<void> {
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = this.elementVolume();
    this.custom = audio;
    await audio.play();
  }

  private pump = (): void => {
    if (!this.running || !shared || !this.master) return;
    const timbre = TIMBRES[this.trackId] ?? TIMBRES['sunday-stretch'];
    if (!timbre) return;
    const beat = 60 / this.bpm;
    const now = this.getTime();
    const horizon = now + 0.4;
    while (this.beatIndex * beat < horizon) {
      const when = this.beatIndex * beat;
      const delay = Math.max(0, when - now);
      this.blip(shared.currentTime + delay, this.beatIndex, timbre);
      this.beatIndex += 1;
    }
    this.timer = window.setTimeout(this.pump, 80);
  };

  private blip(time: number, beat: number, timbre: Timbre): void {
    if (!shared || !this.master) return;
    const osc = shared.createOscillator();
    const gain = shared.createGain();
    osc.type = timbre.wave;
    osc.frequency.setValueAtTime(beat % 2 === 0 ? timbre.low : timbre.high, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(beat % 4 === 0 ? 0.5 : 0.26, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.42);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + 0.46);
  }

  private stopNodes(): void {
    this.running = false;
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
    if (this.custom) {
      this.custom.pause();
      this.custom.src = '';
      this.custom = null;
    }
  }
}

export const music = new MusicEngine();
