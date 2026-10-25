import { describe, expect, it } from 'vitest';
import { probePlayable } from './probeSong';

describe('probePlayable', () => {
  it('accepts a file the audio element can read', async () => {
    const audio = fakeAudio();
    const pending = probePlayable(new Blob(['song']), () => audio, () => 'blob:song', () => undefined);
    audio.duration = 12;
    audio.onloadedmetadata?.();
    await expect(pending).resolves.toBe(true);
  });

  it('rejects a file the audio element cannot read', async () => {
    const audio = fakeAudio();
    const pending = probePlayable(new Blob(['notes']), () => audio, () => 'blob:notes', () => undefined);
    audio.onerror?.();
    await expect(pending).resolves.toBe(false);
  });
});

function fakeAudio() {
  return {
    src: '',
    preload: '',
    duration: NaN,
    onloadedmetadata: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };
}
