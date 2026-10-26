export interface TempoEstimate {
  bpm: number;
  offsetSeconds: number;
  confident: boolean;
}

export interface ClickTrack {
  bpm: number;
  offsetSeconds: number;
  durationSeconds: number;
  sampleRate: number;
}

const MIN_BPM = 60;
const MAX_BPM = 140;
const HOP = 128;

/** A short click train, used to check the detector and to explain the grid. */
export function renderClicks(track: ClickTrack): Float32Array {
  const total = Math.max(1, Math.floor(track.durationSeconds * track.sampleRate));
  const samples = new Float32Array(total);
  const interval = 60 / track.bpm;
  const click = Math.min(180, Math.floor(track.sampleRate * 0.012));
  for (let time = track.offsetSeconds; time < track.durationSeconds - 0.02; time += interval) {
    const start = Math.floor(time * track.sampleRate);
    for (let index = 0; index < click && start + index < samples.length; index += 1) {
      const decay = Math.exp(-index / 28);
      const at = start + index;
      samples[at] = (samples[at] ?? 0) + Math.sin((2 * Math.PI * 1000 * index) / track.sampleRate) * decay;
    }
  }
  return samples;
}

function envelope(samples: Float32Array): Float32Array {
  const frames = Math.max(0, Math.floor(samples.length / HOP));
  const energy = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0;
    const start = frame * HOP;
    for (let index = 0; index < HOP; index += 1) {
      const sample = samples[start + index] ?? 0;
      sum += sample * sample;
    }
    energy[frame] = sum / HOP;
  }
  const onset = new Float32Array(frames);
  for (let frame = 1; frame < frames; frame += 1) {
    const diff = (energy[frame] ?? 0) - (energy[frame - 1] ?? 0);
    onset[frame] = diff > 0 ? diff : 0;
  }
  let peak = 0;
  for (const value of onset) if (value > peak) peak = value;
  if (peak > 0) {
    for (let frame = 0; frame < onset.length; frame += 1) onset[frame] = (onset[frame] ?? 0) / peak;
  }
  return onset;
}

function sampleAt(values: Float32Array, index: number): number {
  if (index <= 0) return values[0] ?? 0;
  if (index >= values.length - 1) return values[values.length - 1] ?? 0;
  const left = Math.floor(index);
  const mix = index - left;
  return (values[left] ?? 0) * (1 - mix) + (values[left + 1] ?? 0) * mix;
}

function correlation(onset: Float32Array, lag: number): number {
  if (lag < 1 || onset.length < lag + 2) return 0;
  const left = Math.floor(lag);
  const mix = lag - left;
  let sum = 0;
  let count = 0;
  const end = onset.length - left - 1;
  for (let index = 0; index < end; index += 1) {
    const here = onset[index] ?? 0;
    const there = (onset[index + left] ?? 0) * (1 - mix) + (onset[index + left + 1] ?? 0) * mix;
    sum += here * there;
    count += 1;
  }
  return count > 0 ? sum / count : 0;
}

function scoreBpm(onset: Float32Array, bpm: number, sampleRate: number): number {
  const lag = (60 / bpm) * (sampleRate / HOP);
  const atTempo = correlation(onset, lag);
  const atDouble = correlation(onset, lag / 2);
  const atHalf = correlation(onset, lag * 2);
  return atTempo + atDouble * 0.15 + atHalf * 0.45;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/**
 * Onset autocorrelation over 60–140 BPM.
 * A tempo outside that range is folded in by scoring its half or double.
 */
export function estimateTempo(samples: Float32Array, sampleRate: number): TempoEstimate {
  const limit = Math.min(samples.length, Math.floor(sampleRate * 30));
  const onset = envelope(samples.subarray(0, limit));
  if (onset.length < 8 || sampleRate < 1000) {
    return { bpm: 96, offsetSeconds: 0, confident: false };
  }

  let bestBpm = 96;
  let bestScore = -Infinity;
  const scores: number[] = [];
  for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm += 0.5) {
    const score = scoreBpm(onset, bpm, sampleRate);
    scores.push(score);
    if (score > bestScore) {
      bestScore = score;
      bestBpm = bpm;
    }
  }

  let chosen = bestBpm;
  const near = bestScore * 0.92;
  for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm += 0.5) {
    const score = scoreBpm(onset, bpm, sampleRate);
    if (score >= near && bpm > chosen) chosen = bpm;
  }

  const periodFrames = (60 / chosen) * (sampleRate / HOP);
  const steps = Math.max(32, Math.round(periodFrames));
  let bestPhase = 0;
  let bestEnergy = -1;
  for (let step = 0; step < steps; step += 1) {
    const phase = (step / steps) * periodFrames;
    let energy = 0;
    let count = 0;
    for (let frame = phase; frame < onset.length - 1; frame += periodFrames) {
      energy += sampleAt(onset, frame);
      count += 1;
    }
    const average = count > 0 ? energy / count : 0;
    if (average > bestEnergy) {
      bestEnergy = average;
      bestPhase = phase;
    }
  }

  const midpoint = median(scores);
  const confident = bestScore > 0.0008 && bestScore > midpoint * 1.35 && bestEnergy > 0.08;
  return {
    bpm: Math.round(chosen),
    offsetSeconds: Math.round(((bestPhase * HOP) / sampleRate) * 1000) / 1000,
    confident,
  };
}

export async function detectTempoFromBlob(blob: Blob): Promise<TempoEstimate | null> {
  try {
    const bytes = await blob.arrayBuffer();
    const host = window as Window & { webkitOfflineAudioContext?: typeof OfflineAudioContext };
    const Ctx = window.OfflineAudioContext ?? host.webkitOfflineAudioContext;
    if (!Ctx) return null;
    const context = new Ctx(1, 1, 44100);
    const audio = await context.decodeAudioData(bytes.slice(0));
    const mono = new Float32Array(audio.length);
    const channels = audio.numberOfChannels;
    for (let channel = 0; channel < channels; channel += 1) {
      const data = audio.getChannelData(channel);
      for (let index = 0; index < audio.length; index += 1) {
        mono[index] = (mono[index] ?? 0) + (data[index] ?? 0) / channels;
      }
    }
    return estimateTempo(mono, audio.sampleRate);
  } catch {
    return null;
  }
}
