import { describe, expect, it } from 'vitest';
import { SONG_ACCEPT, isIosPicker, songAcceptAttribute } from './songFile';

const REQUIRED = [
  'audio/*',
  '.mp3',
  '.m4a',
  '.aac',
  '.wav',
  '.ogg',
  '.oga',
  '.opus',
  '.webm',
  '.mp4',
  '.flac',
  '.caf',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'video/mp4',
];

describe('song file picker', () => {
  it('lists audio and the download types iOS otherwise greys out', () => {
    for (const token of REQUIRED) expect(SONG_ACCEPT.split(',')).toContain(token);
  });

  it('drops the accept filter on iPhone so Files does not grey the song out', () => {
    const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
    expect(isIosPicker(iphone)).toBe(true);
    expect(songAcceptAttribute(iphone)).toBeUndefined();
    expect(songAcceptAttribute('Mozilla/5.0 (Linux; Android 14)')).toBe(SONG_ACCEPT);
    expect(songAcceptAttribute('Mozilla/5.0 (Macintosh)', 'MacIntel', 5)).toBeUndefined();
  });
});
