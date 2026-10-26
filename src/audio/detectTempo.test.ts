import { describe, expect, it } from 'vitest';
import { estimateTempo, renderClicks } from './detectTempo';

describe('offline tempo detection', () => {
  it('reads the tempo and the first click on a generated track', () => {
    const samples = renderClicks({
      bpm: 100,
      offsetSeconds: 0.35,
      durationSeconds: 12,
      sampleRate: 22050,
    });
    const estimate = estimateTempo(samples, 22050);
    expect(estimate.confident).toBe(true);
    expect(estimate.bpm).toBeGreaterThanOrEqual(98);
    expect(estimate.bpm).toBeLessThanOrEqual(102);
    expect(Math.abs(estimate.offsetSeconds - 0.35)).toBeLessThanOrEqual(0.04);
  });

  it('reads a slower calm tempo', () => {
    const samples = renderClicks({
      bpm: 72,
      offsetSeconds: 0.2,
      durationSeconds: 12,
      sampleRate: 22050,
    });
    const estimate = estimateTempo(samples, 22050);
    expect(estimate.confident).toBe(true);
    expect(estimate.bpm).toBeGreaterThanOrEqual(70);
    expect(estimate.bpm).toBeLessThanOrEqual(74);
    expect(Math.abs(estimate.offsetSeconds - 0.2)).toBeLessThanOrEqual(0.04);
  });

  it('folds a fast click track into the 60–140 range', () => {
    const samples = renderClicks({
      bpm: 180,
      offsetSeconds: 0.15,
      durationSeconds: 12,
      sampleRate: 22050,
    });
    const estimate = estimateTempo(samples, 22050);
    expect(estimate.bpm).toBeGreaterThanOrEqual(86);
    expect(estimate.bpm).toBeLessThanOrEqual(94);
  });

  it('does not invent a beat for silence', () => {
    const estimate = estimateTempo(new Float32Array(22050 * 4), 22050);
    expect(estimate.confident).toBe(false);
  });
});
