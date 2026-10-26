import hipsUp from './assets/character/hips-up.webp';
import hipsDown from './assets/character/hips-down.webp';
import { ILLUSTRATION_FILE_BY_ID } from './domain/illustrations';

export const characterFrames = { up: hipsUp, down: hipsDown };

const illustrationModules = import.meta.glob('./assets/illustrations/*.webp', {
  eager: true,
  import: 'default',
});

function illustrationPhotos(): Record<string, string> {
  const byFile = new Map<string, string>();
  for (const [path, src] of Object.entries(illustrationModules)) {
    if (typeof src !== 'string') continue;
    const file = path.split('/').pop();
    if (file) byFile.set(file, src);
  }
  const photos: Record<string, string> = {};
  for (const [id, file] of Object.entries(ILLUSTRATION_FILE_BY_ID)) {
    const src = byFile.get(file);
    if (src) photos[id] = src;
  }
  return photos;
}

export const exercisePhotos: Record<string, string> = illustrationPhotos();
