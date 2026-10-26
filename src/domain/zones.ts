export const ZONES = [
  { id: 'belly', name: 'Belly', hint: 'Diastasis-safe core' },
  { id: 'pelvic-floor', name: 'Pelvic floor', hint: 'Gentle only' },
  { id: 'lymph', name: 'Lymph & feeling light', hint: 'Easy flow' },
  { id: 'hips', name: 'Hips & bottom', hint: 'Glutes' },
  { id: 'thighs', name: 'Thighs', hint: 'Light legs' },
  { id: 'lower-back', name: 'Lower back', hint: 'Ease, not force' },
  { id: 'neck', name: 'Neck & chin', hint: 'Slow and small' },
  { id: 'relax', name: 'Relax & breathe', hint: 'Calm the system' },
] as const;

export type ZoneId = (typeof ZONES)[number]['id'];

export const ZONE_IDS = ZONES.map((zone) => zone.id) as [ZoneId, ...ZoneId[]];

export const DISCLAIMER =
  'Not medical advice. Postpartum or with pain, check with your doctor or a physio first.';

export const CHIN_NOTE =
  'These tone the neck and help posture. A visible change also depends on overall weight loss.';

export function zoneById(id: string): (typeof ZONES)[number] | undefined {
  return ZONES.find((zone) => zone.id === id);
}

export function sortZones(zones: readonly string[]): ZoneId[] {
  const known = new Set<string>(ZONE_IDS);
  return ZONE_IDS.filter((id) => zones.includes(id) && known.has(id));
}
