/** Style-3 illustration file, keyed by exercise id. Filenames stay the art slugs. */
export const ILLUSTRATION_FILE_BY_ID: Record<string, string> = {
  'heel-slides': 'heel-slides-a.webp',
  'dead-bug': 'dead-bug-a.webp',
  'belly-draw-in': 'belly-draw-in-a.webp',
  'short-plank': 'short-plank-a.webp',
  'glute-bridge': 'glute-bridge-a.webp',
  'side-leg-raise': 'side-lying-leg-raise-a.webp',
  clamshells: 'clamshells-a.webp',
  'squat-dumbbell': 'dumbbell-squat-a.webp',
  'bird-dog': 'bird-dog-a.webp',
  'knees-to-chest': 'knees-to-chest-a.webp',
  'pelvic-floor': 'pelvic-floor-a.webp',
  'alternating-leg-raises': 'alternating-leg-raises-a.webp',
  'knees-apart': 'knees-together-apart-a.webp',
  'leg-circles': 'leg-circles-a.webp',
  'legs-up-the-wall': 'legs-up-the-wall-a.webp',
  'ankle-pumps': 'ankle-pumps-circles-a.webp',
  'walk-in-place': 'walk-in-place-a.webp',
  'neck-lymph-stroke': 'neck-lymph-stroke-a.webp',
  'shoulder-rolls': 'shoulder-rolls-a.webp',
  'knee-rocks': 'knee-rocks-a.webp',
  'roller-thighs': 'foam-roller-thighs-a.webp',
  'roller-glutes': 'foam-roller-glutes-a.webp',
  'roller-calves': 'foam-roller-calves-a.webp',
  'roller-upper-back': 'foam-roller-upper-back-a.webp',
  'breath-46': 'breathing-4-6-a.webp',
  'humming-breath': 'humming-breath-a.webp',
  'pelvic-floor-release-breath': 'pelvic-floor-release-breath-a.webp',
  'chin-tuck': 'chin-tuck-a.webp',
  'tongue-press': 'tongue-press-a.webp',
  'jaw-jut': 'jaw-jut-a.webp',
  'vowel-faces': 'vowel-faces-a.webp',
  'neck-tilt': 'side-neck-tilt-a.webp',
};

export function illustrationPath(id: string): string | undefined {
  const file = ILLUSTRATION_FILE_BY_ID[id];
  return file ? `illustrations/${file}` : undefined;
}
