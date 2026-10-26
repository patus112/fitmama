import hipsUp from './assets/character/hips-up.webp';
import hipsDown from './assets/character/hips-down.webp';
import heelSlides from './assets/exercises/heel-slides.webp';
import deadBug from './assets/exercises/dead-bug.webp';
import bellyDrawIn from './assets/exercises/belly-draw-in.webp';
import shortPlank from './assets/exercises/short-plank.webp';
import sideLegRaise from './assets/exercises/side-leg-raise.webp';
import clamshells from './assets/exercises/clamshells.webp';
import squat from './assets/exercises/squat-dumbbell.webp';
import birdDog from './assets/exercises/bird-dog.webp';
import kneesToChest from './assets/exercises/knees-to-chest.webp';
import pelvicFloor from './assets/exercises/pelvic-floor.webp';
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

export const exercisePhotos: Record<string, string> = {
  'heel-slides': heelSlides,
  'dead-bug': deadBug,
  'belly-draw-in': bellyDrawIn,
  'short-plank': shortPlank,
  'side-leg-raise': sideLegRaise,
  clamshells,
  'squat-dumbbell': squat,
  'bird-dog': birdDog,
  'knees-to-chest': kneesToChest,
  'pelvic-floor': pelvicFloor,
  ...illustrationPhotos(),
};
