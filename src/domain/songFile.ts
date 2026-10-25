/** Extensions and MIME types the picker should offer, including video/mp4 downloads. */
export const SONG_ACCEPT = [
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
].join(',');

export const UNPLAYABLE_SONG = "This phone can't play that file. An mp3 or m4a usually works.";

/**
 * iOS maps `audio/*` to “public.audio” and greys out downloads it filed as data or video
 * (mp4, webm, opus, and some m4a). Leaving `accept` off is what lets her tap the file.
 */
export function isIosPicker(userAgent: string, platform = '', touchPoints = 0): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;
  return platform === 'MacIntel' && touchPoints > 1;
}

export function songAcceptAttribute(userAgent: string, platform = '', touchPoints = 0): string | undefined {
  if (isIosPicker(userAgent, platform, touchPoints)) return undefined;
  return SONG_ACCEPT;
}
