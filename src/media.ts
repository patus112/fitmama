import { ILLUSTRATION_FILE_BY_ID } from './domain/illustrations';

export interface ExerciseFrame {
  a: string;
  b: string;
}

const illustrationModules = import.meta.glob('./assets/illustrations/*.webp', {
  eager: true,
  import: 'default',
});

function loadFrames(): { photos: Record<string, string>; frames: Record<string, ExerciseFrame> } {
  const byFile = new Map<string, string>();
  for (const [path, src] of Object.entries(illustrationModules)) {
    if (typeof src !== 'string') continue;
    const file = path.split('/').pop();
    if (file) byFile.set(file, src);
  }
  const photos: Record<string, string> = {};
  const frames: Record<string, ExerciseFrame> = {};
  for (const [id, file] of Object.entries(ILLUSTRATION_FILE_BY_ID)) {
    const frameA = byFile.get(file);
    const frameB = byFile.get(file.replace(/-a\.webp$/, '-b.webp'));
    if (frameA) photos[id] = frameA;
    if (frameA && frameB) frames[id] = { a: frameA, b: frameB };
  }
  return { photos, frames };
}

const loaded = loadFrames();

/** Frame A, the still picture. */
export const exercisePhotos: Record<string, string> = loaded.photos;

export const exerciseFrames: Record<string, ExerciseFrame> = loaded.frames;
