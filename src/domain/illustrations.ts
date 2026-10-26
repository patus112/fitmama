/** Style-3 illustration file, keyed by exercise id. Filenames stay the art slugs. */
export const ILLUSTRATION_FILE_BY_ID: Record<string, string> = {
  'alternating-leg-raises': 'alternating-leg-raises.webp',
  'knees-apart': 'knees-together-apart.webp',
  'leg-circles': 'leg-circles.webp',
  'legs-up-the-wall': 'legs-up-the-wall.webp',
  'ankle-pumps': 'ankle-pumps-circles.webp',
  'walk-in-place': 'walk-in-place.webp',
  'neck-lymph-stroke': 'neck-lymph-stroke.webp',
  'shoulder-rolls': 'shoulder-rolls.webp',
  'knee-rocks': 'knee-rocks.webp',
  'roller-thighs': 'foam-roller-thighs.webp',
  'roller-glutes': 'foam-roller-glutes.webp',
  'roller-calves': 'foam-roller-calves.webp',
  'roller-upper-back': 'foam-roller-upper-back.webp',
  'breath-46': 'breathing-4-6.webp',
  'humming-breath': 'humming-breath.webp',
  'pelvic-floor-release-breath': 'pelvic-floor-release-breath.webp',
  'chin-tuck': 'chin-tuck.webp',
  'tongue-press': 'tongue-press.webp',
  'jaw-jut': 'jaw-jut.webp',
  'vowel-faces': 'vowel-faces.webp',
  'neck-tilt': 'side-neck-tilt.webp',
};

export function illustrationPath(id: string): string | undefined {
  const file = ILLUSTRATION_FILE_BY_ID[id];
  return file ? `illustrations/${file}` : undefined;
}
